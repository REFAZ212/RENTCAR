import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, RotateCcw, RefreshCw, Smartphone, X } from 'lucide-react';

interface CameraModalProps {
  open: boolean;
  mode: 'photo' | 'video';
  onClose: () => void;
  onCapture: (file: File) => void;
  onFallback?: () => void;
}

const VIDEO_MIMES = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];

function pickVideoMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return VIDEO_MIMES.find((mime) => MediaRecorder.isTypeSupported(mime));
}

export default function CameraModal({ open, mode, onClose, onCapture, onFallback }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [status, setStatus] = useState<'idle' | 'starting' | 'live' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [recording, setRecording] = useState(false);
  const [captured, setCaptured] = useState<{ url: string; file: File } | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const startStream = useCallback(async () => {
    setStatus('starting');
    setErrorMsg('');
    setCaptured(null);
    setRecording(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: false,
      });
      stopStream();
      streamRef.current = stream;
      setStatus('live');
    } catch (err) {
      const message = err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Izin kamera ditolak. Izinkan akses kamera di browser, atau gunakan kamera HP.'
        : 'Kamera tidak tersedia di perangkat ini. Gunakan kamera HP, atau upload dari galeri.';
      setStatus('error');
      setErrorMsg(message);
    }
  }, [facing, stopStream]);

  useEffect(() => {
    if (open) {
      void startStream();
    } else {
      stopStream();
      setStatus('idle');
      setCaptured(null);
      setRecording(false);
    }

    return stopStream;
  }, [open, facing, startStream, stopStream]);

  useEffect(() => {
    if (status === 'live' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [status]);

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) return;

    setCaptured({ url: URL.createObjectURL(blob), file: new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' }) });
  };

  const toggleRecording = () => {
    if (!streamRef.current) return;

    if (recording) {
      recorderRef.current?.stop();
      return;
    }

    const mime = pickVideoMime();
    const recorder = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const chunks = chunksRef.current;
      if (chunks.length === 0) return;
      const type = recorder.mimeType || 'video/webm';
      const ext = type.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunks, { type });
      setRecording(false);
      setCaptured((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return { url: URL.createObjectURL(blob), file: new File([blob], `video-${Date.now()}.${ext}`, { type }) };
      });
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
  };

  const handleUse = () => {
    if (!captured) return;
    const { url, file } = captured;
    setCaptured(null);
    URL.revokeObjectURL(url);
    onCapture(file);
    onClose();
  };

  const handleRetake = () => {
    if (captured) {
      URL.revokeObjectURL(captured.url);
      setCaptured(null);
    }
  };

  const handleClose = () => {
    if (captured) URL.revokeObjectURL(captured.url);
    setCaptured(null);
    onClose();
  };

  const handleFallback = () => {
    if (captured) URL.revokeObjectURL(captured.url);
    setCaptured(null);
    onFallback?.();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/90 p-4">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-black shadow-2xl">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/15 p-2 text-white transition-colors hover:bg-white/30"
          aria-label="Tutup kamera"
        >
          <X size={18} />
        </button>

        <div className="relative aspect-video w-full bg-black">
          {status === 'live' && !captured && (
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          )}

          {status === 'live' && captured && (
            captured.file.type.startsWith('image/') ? (
              <img src={captured.url} alt="Hasil jepretan" className="h-full w-full object-cover" />
            ) : (
              <video src={captured.url} controls autoPlay className="h-full w-full object-cover" />
            )
          )}

          {status === 'starting' && (
            <div className="flex h-full items-center justify-center text-white/80">
              <RefreshCw size={28} className="animate-spin" />
            </div>
          )}

          {status === 'error' && (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertTriangle size={32} className="text-amber-400" />
              <p className="text-sm text-white/90">{errorMsg}</p>
              {onFallback && (
                <button
                  type="button"
                  onClick={handleFallback}
                  className="mt-1 flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
                >
                  <Smartphone size={16} /> Buka Kamera HP (native)
                </button>
              )}
              <button
                type="button"
                onClick={() => void startStream()}
                className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Coba Lagi
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 bg-black px-4 py-4">
          {status === 'live' && !captured && (
            <>
              {mode === 'photo' ? (
                <button
                  type="button"
                  onClick={() => void capturePhoto()}
                  className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-transparent transition-transform hover:scale-105"
                  aria-label="Ambil foto"
                >
                  <span className="h-12 w-12 rounded-full bg-white" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-colors ${
                    recording ? 'bg-error-600 hover:bg-error-700' : 'bg-primary-600 hover:bg-primary-700'
                  }`}
                >
                  <span className={`h-3 w-3 rounded-full ${recording ? 'animate-pulse bg-white' : 'bg-white'}`} />
                  {recording ? 'Stop Rekam' : 'Mulai Rekam'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
                className="rounded-lg border border-white/30 p-3 text-white transition-colors hover:bg-white/10"
                aria-label="Balik kamera"
              >
                <RotateCcw size={18} />
              </button>
            </>
          )}

          {status === 'live' && captured && (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex items-center gap-2 rounded-lg border border-white/30 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                <RotateCcw size={16} /> Ulangi
              </button>
              <button
                type="button"
                onClick={handleUse}
                className="flex items-center gap-2 rounded-lg bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600"
              >
                <Check size={16} /> Pakai {mode === 'photo' ? 'Foto' : 'Video'}
              </button>
            </>
          )}

          {status === 'error' && !onFallback && null}
        </div>

        {mode === 'video' && status === 'live' && !captured && (
          <p className="bg-black pb-3 text-center text-xs text-white/60">
            {recording ? 'Sedang merekam... hentikan untuk menyimpan video.' : 'Tekan "Mulai Rekam" lalu hentikan untuk menyimpan.'}
          </p>
        )}
      </div>
    </div>
  );
}