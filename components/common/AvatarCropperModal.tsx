import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, ZoomIn, ZoomOut, RotateCw, Trash2, Check, RefreshCw, Loader2 } from 'lucide-react';
import { BaseModal } from './BaseModal';

import { useAvatars } from '../../context/AvatarContext';
import { useToast } from '../../hooks/useToast';
import { useHaptics } from '../../hooks/useHaptics';

export interface AvatarCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'player' | 'hero';
  entityId: string;
  entityName: string;
}

export const AvatarCropperModal: React.FC<AvatarCropperModalProps> = ({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityName,
}) => {
  const { getAvatar, setAvatar, removeAvatar } = useAvatars();
  const { addToast } = useToast();
  const { trigger } = useHaptics();


  const currentAvatar = getAvatar(entityType, entityId || entityName);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string>('Загрузка...');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setImageSrc(null);
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setIsProcessing(false);
    }
    return () => {
      if (imageSrc && imageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [isOpen]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isHeic =
      file.name.toLowerCase().endsWith('.heic') ||
      file.name.toLowerCase().endsWith('.heif') ||
      file.type.toLowerCase().includes('heic') ||
      file.type.toLowerCase().includes('heif');

    const isImageType =
      isHeic ||
      !file.type ||
      file.type.startsWith('image/') ||
      /\.(jpe?g|png|webp|heic|heif|gif|bmp|svg)$/i.test(file.name);

    if (!isImageType) {
      addToast('Пожалуйста, выберите изображение', 'error');
      return;
    }

    setIsProcessing(true);
    setLoadingText(isHeic ? 'Конвертация HEIC фото...' : 'Загрузка фото...');

    try {
      let blobToLoad: Blob = file;

      if (isHeic) {
        try {
          const heic2any = (await import('heic2any')).default;
          const converted = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.96,
          });
          blobToLoad = Array.isArray(converted) ? converted[0] : converted;
        } catch (heicErr) {
          console.warn('[AvatarCropper] HEIC conversion fallback:', heicErr);
        }
      }


      const objectUrl = URL.createObjectURL(blobToLoad);
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        imageRef.current = img;
        setImageSrc(objectUrl);
        setZoom(1);
        setRotation(0);
        setOffset({ x: 0, y: 0 });
        setIsProcessing(false);
        trigger('light');
      };

      img.onerror = () => {
        // Fallback to FileReader if objectURL fails
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            const fallbackImg = new Image();
            fallbackImg.onload = () => {
              imageRef.current = fallbackImg;
              setImageSrc(reader.result as string);
              setZoom(1);
              setRotation(0);
              setOffset({ x: 0, y: 0 });
              setIsProcessing(false);
              trigger('light');
            };
            fallbackImg.onerror = () => {
              setIsProcessing(false);
              addToast('Не удалось отобразить выбранное фото', 'error');
            };
            fallbackImg.src = reader.result as string;
          }
        };
        reader.onerror = () => {
          setIsProcessing(false);
          addToast('Не удалось прочитать файл изображения', 'error');
        };
        reader.readAsDataURL(blobToLoad);
      };

      img.src = objectUrl;
    } catch (err) {
      console.error('Error opening image:', err);
      setIsProcessing(false);
      addToast('Ошибка открытия файла', 'error');
    } finally {
      e.target.value = '';
    }
  };




  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);

  const handlePointerDown = (clientX: number, clientY: number) => {
    if (!imageSrc) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: clientX - offset.x,
      y: clientY - offset.y,
    };
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging || !imageSrc) return;
    setOffset({
      x: clientX - dragStartRef.current.x,
      y: clientY - dragStartRef.current.y,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Pinch-to-zoom touch handlers for mobile smartphones
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!imageSrc) return;
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDistRef.current = dist;
      pinchStartZoomRef.current = zoom;
      setIsDragging(false);
    } else if (e.touches.length === 1) {
      pinchStartDistRef.current = null;
      handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!imageSrc) return;
    if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (pinchStartDistRef.current > 0) {
        const factor = currentDist / pinchStartDistRef.current;
        const newZoom = Math.min(3.5, Math.max(0.5, pinchStartZoomRef.current * factor));
        setZoom(newZoom);
      }
    } else if (e.touches.length === 1 && pinchStartDistRef.current === null) {
      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      pinchStartDistRef.current = null;
    }
    if (e.touches.length === 0) {
      handlePointerUp();
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!imageSrc) return;
    const delta = e.deltaY < 0 ? 0.12 : -0.12;
    setZoom((prev) => Math.min(3.5, Math.max(0.5, prev + delta)));
  };


  // Draw crop preview on Canvas (High DPI 560x560 canvas for smooth preview)
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageSrc) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const displaySize = 280;
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 2, 2) : 2;
    const canvasSize = displaySize * dpr;

    canvas.width = canvasSize;
    canvas.height = canvasSize;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    ctx.save();
    // Move origin to canvas center
    ctx.translate(canvasSize / 2, canvasSize / 2);
    ctx.translate(offset.x * dpr, offset.y * dpr);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom * dpr, zoom * dpr);

    // Calculate image render dimensions preserving aspect ratio
    const aspect = img.width / img.height;
    let renderW = displaySize;
    let renderH = displaySize;
    if (aspect > 1) {
      renderH = displaySize / aspect;
    } else {
      renderW = displaySize * aspect;
    }

    ctx.drawImage(img, -renderW / 2, -renderH / 2, renderW, renderH);
    ctx.restore();
  }, [imageSrc, zoom, rotation, offset]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
    trigger('light');
  };

  const handleSave = async () => {
    const img = imageRef.current;
    if (!imageSrc || !img) return;

    setIsSaving(true);
    try {
      // Create output canvas 512x512 for HD sharpness on Retina screens
      const outCanvas = document.createElement('canvas');
      const outSize = 512;
      outCanvas.width = outSize;
      outCanvas.height = outSize;
      const ctx = outCanvas.getContext('2d');

      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image scaled and cropped
        ctx.save();
        ctx.translate(outSize / 2, outSize / 2);
        const scaleFactor = outSize / 280;
        ctx.translate(offset.x * scaleFactor, offset.y * scaleFactor);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(zoom * scaleFactor, zoom * scaleFactor);

        const aspect = img.width / img.height;
        let renderW = 280;
        let renderH = 280;
        if (aspect > 1) {
          renderH = 280 / aspect;
        } else {
          renderW = 280 * aspect;
        }

        ctx.drawImage(img, -renderW / 2, -renderH / 2, renderW, renderH);
        ctx.restore();

        // Convert canvas to WebP (HD quality 0.92) or JPEG (0.93)
        let dataUrl = outCanvas.toDataURL('image/webp', 0.92);
        if (!dataUrl || !dataUrl.startsWith('data:image/webp')) {
          dataUrl = outCanvas.toDataURL('image/jpeg', 0.93);
        }

        await setAvatar(entityType, entityId || entityName, dataUrl);
        trigger('medium');
        addToast(`Аватар для "${entityName}" сохранен`, 'success');
        onClose();
      }
    } catch (e) {
      console.error('Failed to crop avatar:', e);
      addToast('Ошибка при сохранении аватарки', 'error');
    } finally {
      setIsSaving(false);
    }
  };


  const handleRemove = async () => {
    try {
      await removeAvatar(entityType, entityId || entityName);
      trigger('medium');
      addToast(`Аватар для "${entityName}" удален`, 'info');
      onClose();
    } catch (e) {
      addToast('Ошибка при удалении аватарки', 'error');
    }
  };


  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={imageSrc ? 'Кадрирование аватарки' : 'Выбор аватарки'}
      subtitle={entityName ? `Для ${entityType === 'player' ? 'игрока' : 'героя'} ${entityName}` : undefined}
      maxWidth="sm"
      priority={30}
    >
      <div className="flex flex-col items-center space-y-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,image/heic,image/heif,.heic,.heif,.jpg,.jpeg,.png,.webp"
          className="hidden"
        />


        {!imageSrc ? (
          <div className="w-full flex flex-col items-center py-6 px-4 space-y-4">
            {isProcessing ? (
              <div className="w-40 h-40 rounded-full border-2 border-indigo-500/40 flex flex-col items-center justify-center bg-indigo-50/50 dark:bg-indigo-950/30 animate-pulse shadow-inner">
                <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin mb-2" />
                <span className="text-xs text-indigo-600 dark:text-indigo-300 font-bold text-center px-2">{loadingText}</span>
              </div>
            ) : currentAvatar ? (
              <div className="flex flex-col items-center space-y-2">
                <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-indigo-500/60 shadow-xl ring-4 ring-indigo-500/20 bg-slate-900 group transition-transform active:scale-98">
                  <img
                    src={currentAvatar}
                    alt={entityName}
                    className="w-full h-full object-cover rounded-full"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold pointer-events-none">
                    Текущая аватарка
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Установленная аватарка</span>
              </div>
            ) : (
              <div className="w-36 h-36 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50">
                <Upload className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-2" />
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Выберите фото</span>
              </div>
            )}

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              {isProcessing ? loadingText : currentAvatar ? 'Сменить фото' : 'Загрузить фото'}
            </button>


            {currentAvatar && (
              <button
                type="button"
                onClick={handleRemove}
                className="w-full py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                Удалить текущий аватар
              </button>
            )}
          </div>
        ) : (
          <div className="w-full flex flex-col items-center space-y-4">
            {/* Interactive Viewport Area */}
            <div
              className="relative w-[280px] h-[280px] rounded-full overflow-hidden border-4 border-indigo-500/50 shadow-xl bg-slate-900 cursor-grab active:cursor-grabbing touch-none select-none"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
              onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onWheel={handleWheel}
            >
              <canvas ref={canvasRef} className="w-full h-full block" />
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              Двигайте пальцем для перемещения, сводите двумя пальцами для зума
            </p>


            {/* Controls Toolbar */}
            <div className="w-full flex items-center justify-between px-2 py-2 bg-slate-100 dark:bg-slate-800/80 rounded-2xl gap-3">
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(0.6, prev - 0.15))}
                className="p-2 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                title="Уменьшить"
              >
                <ZoomOut size={18} />
              </button>

              <div className="flex-1 flex items-center gap-2">
                <input
                  type="range"
                  min="0.6"
                  max="3.0"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(3.0, prev + 0.15))}
                className="p-2 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                title="Увеличить"
              >
                <ZoomIn size={18} />
              </button>

              <button
                type="button"
                onClick={handleRotate}
                className="p-2 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                title="Повернуть"
              >
                <RotateCw size={18} />
              </button>
            </div>

            {/* Bottom Actions */}
            <div className="w-full grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all"
              >
                <RefreshCw size={16} />
                Другое фото
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-semibold text-xs sm:text-sm shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Check size={16} />
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  );
};
