import { useState, useRef, useCallback, useEffect } from 'react';
import { notifSoundAPI } from '../services/api';

const PREF_KEY = 'notification_sound_pref';

export type SoundPreset = 'classic' | 'pop' | 'bell' | 'pulse';

interface SoundPref {
  muted: boolean;
  sound: SoundPreset;
}

export const SOUND_LABELS: Record<SoundPreset, string> = {
  classic: 'Classic Ding',
  pop: 'Soft Pop',
  bell: 'Bell Harmonic',
  pulse: 'Tech Pulse',
};

export const SOUND_PRESETS: SoundPreset[] = ['classic', 'pop', 'bell', 'pulse'];

const DEFAULT_PREF: SoundPref = { muted: false, sound: 'classic' };

function loadPref(): SoundPref {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return DEFAULT_PREF;
    const parsed = JSON.parse(raw) as Partial<SoundPref>;
    return {
      muted: typeof parsed.muted === 'boolean' ? parsed.muted : DEFAULT_PREF.muted,
      sound: SOUND_PRESETS.includes(parsed.sound as SoundPreset) ? (parsed.sound as SoundPreset) : DEFAULT_PREF.sound,
    };
  } catch {
    return DEFAULT_PREF;
  }
}

function savePref(pref: SoundPref): void {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(pref));
  } catch {
    // silent
  }
}

type PresetPlayer = (ctx: AudioContext, masterGain: GainNode, t: number) => void;

const tone = (
  ctx: AudioContext,
  dest: AudioNode,
  frequency: number,
  startAt: number,
  attack: number,
  decay: number,
  peak = 0.8,
  type: OscillatorType = 'sine'
) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(peak, startAt + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + decay);
  osc.connect(gain).connect(dest);
  osc.start(startAt);
  osc.stop(startAt + decay + 0.02);
};

const presets: Record<SoundPreset, PresetPlayer> = {
  classic: (ctx, master, t) => {
    tone(ctx, master, 880, t, 0.008, t + 0.1, 0.8);
    tone(ctx, master, 1175, t + 0.08, 0.008, t + 0.22, 0.8);
  },
  pop: (ctx, master, t) => {
    tone(ctx, master, 659, t, 0.004, t + 0.14, 0.7, 'sine');
  },
  bell: (ctx, master, t) => {
    tone(ctx, master, 784, t, 0.005, t + 0.24, 0.7, 'sine');
    tone(ctx, master, 1175, t, 0.005, t + 0.16, 0.25, 'sine');
  },
  pulse: (ctx, master, t) => {
    tone(ctx, master, 523, t, 0.003, t + 0.06, 0.6, 'square');
    tone(ctx, master, 523, t + 0.08, 0.003, t + 0.06, 0.6, 'square');
    tone(ctx, master, 523, t + 0.16, 0.003, t + 0.06, 0.6, 'square');
  },
};

/**
 * Custom hook untuk suara notifikasi.
 *
 * Sumber suara global (dari backend, dipilih admin di Pengaturan):
 * - Built-in preset (classic/pop/bell/pulse) lewat Web Audio API, atau
 * - File audio custom yang diunggah admin — file didecode & dimainkan
 *   lewat Web Audio yang sama supaya bisa diputar andal (termasuk preview).
 *
 * Pemutaran selalu lewat AudioContext yang di-unlock pada interaksi user
 * pertama (kebijakan autoplay browser). Mute/pilihan preset per-pengguna
 * tetap tersimpan di localStorage.
 */
export default function useNotificationSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const lastPlayRef = useRef(0);
  const bufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const fallbackAudioRef = useRef<Set<HTMLAudioElement>>(new Set());
  const [isMuted, setIsMuted] = useState<boolean>(loadPref().muted);
  const [sound, setSound] = useState<SoundPreset>(loadPref().sound);
  const [source, setSource] = useState<'builtin' | 'custom' | 'none'>('none');
  const [builtinPreset, setBuiltinPreset] = useState<SoundPreset | null>(null);
  const [customUrl, setCustomUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Ambil konfigurasi suara global dari backend (diunggah admin)
  useEffect(() => {
    let active = true;
    notifSoundAPI
      .get()
      .then(({ data }) => {
        if (!active) return;
        setSource(data.source);
        setCustomUrl(data.source === 'custom' ? data.url : null);
        setBuiltinPreset(data.source === 'builtin' ? data.preset : null);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Sinkronkan state ke localStorage
  useEffect(() => {
    savePref({ muted: isMuted, sound });
  }, [isMuted, sound]);

  // Cleanup AudioContext saat unmount
  useEffect(() => {
    const ctx = ctxRef.current;
    const bufferCache = bufferCacheRef.current;
    const fallbackAudio = fallbackAudioRef.current;
    return () => {
      ctx?.close().catch(() => {});
      ctxRef.current = null;
      bufferCache.clear();
      fallbackAudio.forEach((audio) => {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch {
          // ignore
        }
      });
      fallbackAudio.clear();
    };
  }, []);

  const ensureCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }, []);

  // Buka/unlock AudioContext — WAJIB dipanggil pada user gesture
  // (klik) supaya pemutaran otomatis (poll notifikasi) tidak diblokir.
  const unlock = useCallback(() => {
    const ctx = ensureCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }, [ensureCtx]);

  // Unlock AudioContext secara otomatis pada interaksi user pertama (mis.
  // klik/ketuk di mana saja). Kebijakan autoplay browser hanya mengizinkan
  // pemutaran setelah ada user gesture, padahal notifikasi datang lewat poll
  // (bukan gesture). Dengan meng-unlock saat interaksi pertama, suara
  // notifikasi otomatis langsung bunyi begitu ada notifikasi baru.
  const didAutoUnlockRef = useRef(false);
  useEffect(() => {
    const onUserGesture = () => {
      if (didAutoUnlockRef.current) return;
      didAutoUnlockRef.current = true;
      unlock();
      window.removeEventListener('pointerdown', onUserGesture);
      window.removeEventListener('keydown', onUserGesture);
    };
    window.addEventListener('pointerdown', onUserGesture);
    window.addEventListener('keydown', onUserGesture);
    return () => {
      window.removeEventListener('pointerdown', onUserGesture);
      window.removeEventListener('keydown', onUserGesture);
    };
  }, [unlock]);

  // Guard bersama: tidak muted (kecuali force preview), tab terlihat, jeda ≥ 1 detik.
  // skipThrottle (untuk preview/aksi user eksplisit) melewati jeda 1 detik supaya
  // tiap klik Pilih/Putar selalu berbunyi meski berurutan cepat.
  const shouldPlay = useCallback(
    (force: boolean, skipThrottle = false) => {
      const now = performance.now();
      if ((!force && isMuted) || document.hidden) {
        return false;
      }
      if (!skipThrottle && now - lastPlayRef.current < 1000) {
        return false;
      }
      lastPlayRef.current = now;
      return true;
    },
    [isMuted]
  );

  const playPreset = useCallback(
    (preset: SoundPreset, force = false, skipThrottle = false) => {
      if (!shouldPlay(force, skipThrottle)) return;
      unlock();

      try {
        const ctx = ensureCtx();
        const master = ctx.createGain();
        master.gain.value = 0.35;
        master.connect(ctx.destination);

        const t = ctx.currentTime;
        const player = presets[preset];
        if (player) {
          player(ctx, master, t);
        }
      } catch {
        // Web Audio tidak didukung — silent fail
      }
    },
    [ensureCtx, shouldPlay, unlock]
  );

  // Memutar file audio custom. File di-fetch lalu didecode jadi AudioBuffer
  // dan dimainkan lewat Web Audio — sama seperti preset supaya autoplay
  // policy browser tidak memblokirnya saat preview/user gesture.
  const playCustom = useCallback(
    (url: string, force = false, skipThrottle = false) => {
      if (!shouldPlay(force, skipThrottle)) return;

      const ctx = ensureCtx();
      unlock();

      const playBuffer = (buffer: AudioBuffer) => {
        const master = ctx.createGain();
        master.gain.value = 0.7;
        master.connect(ctx.destination);

        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(master);
        src.start(ctx.currentTime);
      };

      const cached = bufferCacheRef.current.get(url);
      if (cached) {
        playBuffer(cached);
        return;
      }

      fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error('Gagal mengambil file suara (HTTP '.concat(String(r.status)).concat(')'));
          return r.arrayBuffer();
        })
        .then((buf) => ctx.decodeAudioData(buf))
        .then((buffer) => {
          bufferCacheRef.current.set(url, buffer);
          playBuffer(buffer);
        })
        .catch((err) => {
          console.error('Gagal memutar suara kustom lewat Web Audio:', err);
          // Fallback: mainkan lewat elemen audio native (andal saat user gesture)
          const audio = new Audio(url);
          fallbackAudioRef.current.add(audio);
          audio.play().catch((e) => console.error('Gagal memutar suara kustom (fallback):', e));
        });
    },
    [ensureCtx, shouldPlay, unlock]
  );

  // Hentikan SEMUA pemutaran yang sedang berlangsung (preset Web Audio,
  // buffer custom, maupun fallback elemen audio native) dan tutup AudioContext
  // supaya bunyi tidak terus berbunyi (mis. saat tombol Batalkan diklik).
  const stopAll = useCallback(() => {
    const ctx = ctxRef.current;
    if (ctx) {
      try {
        ctx.close();
      } catch {
        // ignore
      }
      ctxRef.current = null;
    }
    bufferCacheRef.current.clear();
    fallbackAudioRef.current.forEach((audio) => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // ignore
      }
    });
    fallbackAudioRef.current.clear();
  }, []);

  const play = useCallback(() => {
    if (source === 'custom' && customUrl) {
      playCustom(customUrl);
    } else if (source === 'builtin' && builtinPreset) {
      playPreset(builtinPreset);
    } else {
      playPreset(sound);
    }
  }, [source, customUrl, builtinPreset, playCustom, playPreset, sound]);

  const preview = useCallback(
    (preset: SoundPreset) => {
      playPreset(preset, true, true);
    },
    [playPreset]
  );

  const previewCustom = useCallback(
    (url: string) => {
      playCustom(url, true, true);
    },
    [playCustom]
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const selectSound = useCallback((preset: SoundPreset) => {
    setSound(preset);
  }, []);

  return {
    play,
    preview,
    previewCustom,
    stopAll,
    toggleMute,
    selectSound,
    unlock,
    isMuted,
    sound,
    source,
    builtinPreset,
    customUrl,
    loaded,
  } as const;
}
