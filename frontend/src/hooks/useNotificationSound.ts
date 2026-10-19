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

type TrackSource = (src: AudioScheduledSourceNode) => void;

type PresetPlayer = (ctx: AudioContext, masterGain: GainNode, t: number, track: TrackSource) => void;

const tone = (
  ctx: AudioContext,
  dest: AudioNode,
  frequency: number,
  startAt: number,
  attack: number,
  decay: number,
  peak = 0.8,
  type: OscillatorType = 'sine',
  track?: TrackSource
) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(peak, startAt + attack);
  // `decay` dikirim sebagai waktu absolut (mis. t + 0.1). TIDAK ditambah
  // startAt lagi — sebelumnya membuat suara bertahan ~durasi hidupnya
  // AudioContext (semakin lama halaman terbuka, bunyi makin panjang
  // dan "tidak berhenti-berhenti").
  gain.gain.exponentialRampToValueAtTime(0.001, decay);
  osc.connect(gain).connect(dest);
  track?.(osc);
  osc.start(startAt);
  osc.stop(decay + 0.02);
};

const presets: Record<SoundPreset, PresetPlayer> = {
  classic: (ctx, master, t, track) => {
    tone(ctx, master, 880, t, 0.008, t + 0.1, 0.8, 'sine', track);
    tone(ctx, master, 1175, t + 0.08, 0.008, t + 0.22, 0.8, 'sine', track);
  },
  pop: (ctx, master, t, track) => {
    tone(ctx, master, 659, t, 0.004, t + 0.14, 0.7, 'sine', track);
  },
  bell: (ctx, master, t, track) => {
    tone(ctx, master, 784, t, 0.005, t + 0.24, 0.7, 'sine', track);
    tone(ctx, master, 1175, t, 0.005, t + 0.16, 0.25, 'sine', track);
  },
  pulse: (ctx, master, t, track) => {
    tone(ctx, master, 523, t, 0.003, t + 0.06, 0.6, 'square', track);
    tone(ctx, master, 523, t + 0.08, 0.003, t + 0.06, 0.6, 'square', track);
    tone(ctx, master, 523, t + 0.16, 0.003, t + 0.06, 0.6, 'square', track);
  },
};

/**
 * "Silent Audio Keeper"
 *
 * Saat tab/window diminimize, browser (terutama Chrome) men-trouble interval
 * background dan membekukan AudioContext — akibatnya poll notifikasi melambat
 * dan suara tidak berbunyi. Trik yang dipakai: putar loop audio nyaris senyap
 * (amplitudo ~ -50 dB) via <audio> element selama tab tersembunyi. Tab yang
 * "memutar media" dianggap audible → interval tidak ditrouble & AudioContext
 * tidak dibekukan, sehingga suara notifikasi custom tetap bisa berbunyi.
 *
 * Amplitude dibuat sangat kecil (bukan volume 0) supaya browser benar-benar
 * menganggap tab sedang memutar audio (volume 0 bisa dianggap "senyap").
 */
const KEEPER_SAMPLE_RATE = 8000;
const KEEPER_DURATION_SECONDS = 0.5;
const KEEPER_FREQUENCY = 440;
const KEEPER_AMPLITUDE = 100;

function buildKeeperWavUrl(): string {
  const sampleCount = Math.floor(KEEPER_SAMPLE_RATE * KEEPER_DURATION_SECONDS);
  const dataSize = sampleCount * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, KEEPER_SAMPLE_RATE, true);
  view.setUint32(28, KEEPER_SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < sampleCount; i++) {
    const sample = Math.round(Math.sin((2 * Math.PI * KEEPER_FREQUENCY * i) / KEEPER_SAMPLE_RATE) * KEEPER_AMPLITUDE);
    view.setInt16(44 + i * 2, sample, true);
  }

  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

let keeperUrl: string | null = null;

function getKeeperUrl(): string {
  if (!keeperUrl) {
    keeperUrl = buildKeeperWavUrl();
  }
  return keeperUrl;
}

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
  // Elemen audio "silent keeper" yang diputar selama tab tersembunyi.
  const keeperAudioRef = useRef<HTMLAudioElement | null>(null);
  const fallbackAudioRef = useRef<Set<HTMLAudioElement>>(new Set());
  // Sumber Web Audio yang sedang aktif (oscillator/buffer source) — dipakai
  // untuk menghentikannya saat ada suara baru supaya tidak bertumpuk.
  const activeSourcesRef = useRef<Set<AudioScheduledSourceNode>>(new Set());
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

  // Guard bersama: tidak muted (kecuali force preview) dan jeda ≥ 1 detik.
  // Tab/minimize TIDAK lagi memblokir bunyi — dengan "silent keeper" aktif,
  // suara tetap berbunyi walau web sedang di-minimize/tab background.
  // skipThrottle (untuk preview/aksi user eksplisit) melewati jeda 1 detik supaya
  // tiap klik Pilih/Putar selalu berbunyi meski berurutan cepat.
  const shouldPlay = useCallback(
    (force: boolean, skipThrottle = false) => {
      const now = performance.now();
      if (!force && isMuted) {
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

  // Hentikan suara yang sedang berputar (tanpa menutup AudioContext dan tanpa
  // membuang cache buffer). Dipanggil otomatis sebelum memainkan suara baru
  // supaya beberapa notifikasi yang datang beruntun tidak berbunyi bertumpuk.
  const stopCurrent = useCallback(() => {
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch {
        // ignore — sumber sudah berhenti sebelumnya
      }
    });
    activeSourcesRef.current.clear();
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

  const playPreset = useCallback(
    (preset: SoundPreset, force = false, skipThrottle = false) => {
      if (!shouldPlay(force, skipThrottle)) return;
      stopCurrent();
      unlock();

      try {
        const ctx = ensureCtx();
        const master = ctx.createGain();
        master.gain.value = 0.35;
        master.connect(ctx.destination);

        const track = (src: AudioScheduledSourceNode) => {
          activeSourcesRef.current.add(src);
          src.onended = () => activeSourcesRef.current.delete(src);
        };

        const t = ctx.currentTime;
        const player = presets[preset];
        if (player) {
          player(ctx, master, t, track);
        }
      } catch {
        // Web Audio tidak didukung — silent fail
      }
    },
    [ensureCtx, shouldPlay, stopCurrent, unlock]
  );

  // Memutar file audio custom. File di-fetch lalu didecode jadi AudioBuffer
  // dan dimainkan lewat Web Audio — sama seperti preset supaya autoplay
  // policy browser tidak memblokirnya saat preview/user gesture.
  const playCustom = useCallback(
    (url: string, force = false, skipThrottle = false) => {
      if (!shouldPlay(force, skipThrottle)) return;
      stopCurrent();

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
        activeSourcesRef.current.add(src);
        src.onended = () => activeSourcesRef.current.delete(src);
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
          audio.onended = () => {
            fallbackAudioRef.current.delete(audio);
          };
          audio.play().catch((e) => console.error('Gagal memutar suara kustom (fallback):', e));
        });
    },
    [ensureCtx, shouldPlay, stopCurrent, unlock]
  );

  // Hentikan SEMUA pemutaran yang sedang berlangsung (preset Web Audio,
  // buffer custom, maupun fallback elemen audio native) dan tutup AudioContext
  // supaya bunyi tidak terus berbunyi (mis. saat tombol Batalkan diklik).
  const stopAll = useCallback(() => {
    stopCurrent();
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
  }, [stopCurrent]);

  // Nyalakan "silent keeper": loop audio nyaris-senyap berjalan terus supaya
  // browser tidak men-trouble interval / membekukan AudioContext selama
  // tab tersembunyi (di-minimize / background).
  const startSilentKeeper = useCallback(() => {
    const existing = keeperAudioRef.current;
    if (existing) {
      void existing.play().catch(() => {});
      return;
    }

    const audio = new Audio(getKeeperUrl());
    audio.loop = true;
    audio.volume = 1;
    keeperAudioRef.current = audio;
    void audio.play().catch(() => {});
  }, []);

  const stopSilentKeeper = useCallback(() => {
    const audio = keeperAudioRef.current;
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // ignore
    }
  }, []);

  // Aktifkan "silent keeper" saat tab pergi ke background/minimize, dan
  // hentikan saat kembali terlihat. Cleanup saat unmount.
  useEffect(() => {
    const syncKeeper = () => {
      if (document.hidden) {
        startSilentKeeper();
      } else {
        stopSilentKeeper();
      }
    };

    syncKeeper();
    document.addEventListener('visibilitychange', syncKeeper);
    return () => {
      document.removeEventListener('visibilitychange', syncKeeper);
      stopSilentKeeper();
    };
  }, [startSilentKeeper, stopSilentKeeper]);

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
