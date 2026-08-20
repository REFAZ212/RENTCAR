import { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, PenLine } from 'lucide-react';

interface SignaturePadProps {
  label: string;
  onChange: (blob: Blob | null, preview: string | null) => void;
  placeholder?: string;
}

export default function SignaturePad({ label, onChange, placeholder = 'Tanda tangan di sini' }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const getCtx = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
    return ctx;
  };

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getPos(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDrawing(true);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx || !canvasRef.current) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = (_e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const ctx = getCtx();
    if (!ctx) return;
    ctx.closePath();
    setDrawing(false);
    setHasSignature(true);
    emitFile();
  };

  const emitFile = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `ttd-${Date.now()}.png`, { type: 'image/png' });
      onChange(file, canvas.toDataURL('image/png'));
    }, 'image/png');
  }, [onChange]);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onChange(null, null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0) return;
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };
    resize();
    const handleResize = () => {
      // Meresize canvas mengosongkan isinya — gambar ulang tanda tangan lama
      // alih-alih menghapusnya supaya pengguna tidak perlu menandatangani lagi.
      const data = canvas.toDataURL();
      resize();
      const ctx = getCtx();
      if (ctx) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        img.src = data;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-black-700">
        <PenLine size={14} />
        {label} <span className="text-error-500">*</span>
      </label>
      <div className="relative overflow-hidden rounded-xl border border-black-300 bg-white">
        <canvas
          ref={canvasRef}
          className="h-32 w-full touch-none"
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerCancel={endDraw}
        />
        {!hasSignature && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-black-300">
            {placeholder}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={clear}
        disabled={!hasSignature}
        className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-black-500 transition-colors hover:text-error-500 disabled:opacity-40"
      >
        <Eraser size={13} />
        Hapus Tanda Tangan
      </button>
    </div>
  );
}