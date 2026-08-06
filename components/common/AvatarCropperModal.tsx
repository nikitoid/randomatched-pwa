import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload, ZoomIn, ZoomOut, RotateCw, Trash2, Check, RefreshCw, Loader2, Image as ImageIcon, Sparkles as SparklesHeaderIcon,
  Swords, Shield, Wand2, Sparkles, Flame, Zap, Skull, Crown, Target, Ghost, Gem, Axe, Dice5, Bot, FlaskConical, Eye, Star, Trophy, Heart, Anchor, User
} from 'lucide-react';
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

export interface PresetIconItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  paths: string;
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const PRESET_ICONS: PresetIconItem[] = [
  { id: 'initials', label: 'Инициалы', icon: User, paths: '' },
  { id: 'Swords', label: 'Мечи', icon: Swords, paths: '<polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" y1="11" x2="11" y2="5"/><line x1="4" y1="8" x2="8" y2="4"/><line x1="3" y1="5" x2="5" y2="3"/>' },
  { id: 'Shield', label: 'Щит', icon: Shield, paths: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' },
  { id: 'Wand2', label: 'Магия', icon: Wand2, paths: '<path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.21 1.21 0 0 0 1.72 0L21.64 5.36a1.21 1.21 0 0 0 0-1.72z"/><path d="m14 7 3 3"/><path d="M5 6v1"/><path d="M19 17v1"/><path d="M10 2v1"/><path d="M7 8H6"/><path d="M21 16h-1"/><path d="M11 3H10"/>' },
  { id: 'Sparkles', label: 'Искры', icon: Sparkles, paths: '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>' },
  { id: 'Flame', label: 'Огонь', icon: Flame, paths: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>' },
  { id: 'Zap', label: 'Молния', icon: Zap, paths: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>' },
  { id: 'Skull', label: 'Череп', icon: Skull, paths: '<circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M8 20v2h8v-2"/><path d="m12.5 17-.5-1-.5 1"/><path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20z"/>' },
  { id: 'Crown', label: 'Корона', icon: Crown, paths: '<path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>' },
  { id: 'Target', label: 'Прицел', icon: Target, paths: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>' },
  { id: 'Ghost', label: 'Призрак', icon: Ghost, paths: '<path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/>' },
  { id: 'Gem', label: 'Кристалл', icon: Gem, paths: '<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M11 3 8 9l4 12 4-12-3-6"/><path d="M2 9h20"/>' },
  { id: 'Axe', label: 'Топор', icon: Axe, paths: '<path d="m14 12-8.5 8.5a2.12 2.12 0 0 1-3-3L11 9"/><path d="M15 13 9 7"/><path d="M18 6.5A4.5 4.5 0 0 0 13 2a4.5 4.5 0 0 0-4.5 4.5c0 1.6.83 3.01 2.08 3.84l4.58 4.58a4.5 4.5 0 0 0 6.84-2.08C22.84 11.59 22 9.17 18 6.5z"/>' },
  { id: 'Dice5', label: 'Кости', icon: Dice5, paths: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M16 8h.01"/><path d="M8 8h.01"/><path d="M8 16h.01"/><path d="M16 16h.01"/><path d="M12 12h.01"/>' },
  { id: 'Bot', label: 'Робот', icon: Bot, paths: '<rect width="18" height="12" x="3" y="6" rx="2"/><path d="M9 11h.01"/><path d="M15 11h.01"/><path d="M12 2v4"/><path d="M4 18v2"/><path d="M20 18v2"/>' },
  { id: 'FlaskConical', label: 'Зелье', icon: FlaskConical, paths: '<path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>' },
  { id: 'Eye', label: 'Око', icon: Eye, paths: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>' },
  { id: 'Star', label: 'Звезда', icon: Star, paths: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>' },
  { id: 'Trophy', label: 'Кубок', icon: Trophy, paths: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>' },
  { id: 'Heart', label: 'Сердце', icon: Heart, paths: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>' },
  { id: 'Anchor', label: 'Якорь', icon: Anchor, paths: '<circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><line x1="8" y1="12" x2="16" y2="12"/>' }
];

export const PRESET_GRADIENTS = [
  { id: 'indigo', label: 'Индиго', colors: ['#4f46e5', '#7c3aed'], css: 'from-indigo-600 to-violet-600' },
  { id: 'emerald', label: 'Изумруд', colors: ['#059669', '#0d9488'], css: 'from-emerald-600 to-teal-600' },
  { id: 'rose', label: 'Роза', colors: ['#e11d48', '#db2777'], css: 'from-rose-600 to-pink-600' },
  { id: 'amber', label: 'Янтарь', colors: ['#f59e0b', '#ea580c'], css: 'from-amber-500 to-orange-600' },
  { id: 'sky', label: 'Небо', colors: ['#0284c7', '#2563eb'], css: 'from-sky-600 to-blue-600' },
  { id: 'purple', label: 'Пурпур', colors: ['#9333ea', '#c026d3'], css: 'from-purple-600 to-fuchsia-600' },
  { id: 'cyan', label: 'Циан', colors: ['#0891b2', '#0d9488'], css: 'from-cyan-600 to-teal-600' },
  { id: 'slate', label: 'Тьма', colors: ['#334155', '#0f172a'], css: 'from-slate-700 to-slate-900' },
  { id: 'sunset', label: 'Закат', colors: ['#ff4e50', '#f9d423'], css: 'from-red-500 to-yellow-500' },
  { id: 'neon', label: 'Неон', colors: ['#11998e', '#38ef7d'], css: 'from-teal-500 to-emerald-400' }
];

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

  // Tab mode: 'upload' | 'preset'
  const [tab, setTab] = useState<'upload' | 'preset'>(() => entityType === 'hero' ? 'preset' : 'upload');

  // Preset Selection State
  const [selectedIconId, setSelectedIconId] = useState<string>('Swords');
  const [selectedGradientId, setSelectedGradientId] = useState<string>('indigo');

  // Photo Crop State
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
      setTab(entityType === 'hero' ? 'preset' : 'upload');
      setImageSrc(null);
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setIsProcessing(false);
      setSelectedIconId(entityType === 'player' ? 'initials' : 'Swords');
      setSelectedGradientId('indigo');
    }
    return () => {
      if (imageSrc && imageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [isOpen, entityType]);

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
        setTab('upload');
        trigger('light');
      };

      img.onerror = () => {
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
              setTab('upload');
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
    ctx.translate(canvasSize / 2, canvasSize / 2);
    ctx.translate(offset.x * dpr, offset.y * dpr);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom * dpr, zoom * dpr);

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
    if (tab === 'upload') {
      drawPreview();
    }
  }, [drawPreview, tab]);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
    trigger('light');
  };

  const handleSavePhoto = async () => {
    const img = imageRef.current;
    if (!imageSrc || !img) return;

    setIsSaving(true);
    try {
      const outCanvas = document.createElement('canvas');
      const outSize = 512;
      outCanvas.width = outSize;
      outCanvas.height = outSize;
      const ctx = outCanvas.getContext('2d');

      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

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

  const handleSavePresetIcon = async () => {
    setIsSaving(true);
    try {
      const iconObj = PRESET_ICONS.find((i) => i.id === selectedIconId) || PRESET_ICONS[0];
      const gradObj = PRESET_GRADIENTS.find((g) => g.id === selectedGradientId) || PRESET_GRADIENTS[0];

      const outCanvas = document.createElement('canvas');
      const outSize = 512;
      outCanvas.width = outSize;
      outCanvas.height = outSize;
      const ctx = outCanvas.getContext('2d');

      if (ctx) {
        // Draw background gradient
        const grad = ctx.createLinearGradient(0, 0, outSize, outSize);
        grad.addColorStop(0, gradObj.colors[0]);
        grad.addColorStop(1, gradObj.colors[1]);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(outSize / 2, outSize / 2, outSize / 2, 0, Math.PI * 2);
        ctx.fill();

        if (selectedIconId === 'initials') {
          const initials = getInitials(entityName);
          const fontSize = initials.length > 2 ? 160 : 210;
          ctx.font = `bold ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(initials, outSize / 2, outSize / 2 + 10);
        } else {
          // Render SVG Icon path on canvas
          const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${outSize}" height="${outSize}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconObj.paths}</svg>`;
          const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);

          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
          });

          const iconPadding = outSize * 0.22;
          const iconRenderSize = outSize * 0.56;
          ctx.drawImage(img, iconPadding, iconPadding, iconRenderSize, iconRenderSize);
          URL.revokeObjectURL(url);
        }

        let dataUrl = outCanvas.toDataURL('image/webp', 0.92);
        if (!dataUrl || !dataUrl.startsWith('data:image/webp')) {
          dataUrl = outCanvas.toDataURL('image/png');
        }

        await setAvatar(entityType, entityId || entityName, dataUrl);
        trigger('medium');
        addToast(`Иконка для "${entityName}" установлена`, 'success');
        onClose();
      }
    } catch (e) {
      console.error('Failed to set icon avatar:', e);
      addToast('Ошибка при сохранении иконки', 'error');
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

  const currentGradient = PRESET_GRADIENTS.find((g) => g.id === selectedGradientId) || PRESET_GRADIENTS[0];
  const CurrentIcon = PRESET_ICONS.find((i) => i.id === selectedIconId)?.icon || PRESET_ICONS[0].icon;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={imageSrc ? 'Кадрирование фото' : 'Выбор аватарки'}
      subtitle={entityName ? `Для ${entityType === 'player' ? 'игрока' : 'героя'} "${entityName}"` : undefined}
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

        {/* Tab Switcher */}
        {!imageSrc && (
          <div className="w-full flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => { setTab('preset'); trigger('light'); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                tab === 'preset'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <SparklesHeaderIcon size={14} />
              Иконка пресет
            </button>
            <button
              type="button"
              onClick={() => { setTab('upload'); trigger('light'); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                tab === 'upload'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <ImageIcon size={14} />
              Своё фото
            </button>
          </div>
        )}

        {/* TAB 1: PRESET ICON SELECTOR */}
        {!imageSrc && tab === 'preset' && (
          <div className="w-full flex flex-col items-center space-y-4 animate-in fade-in duration-200">
            {/* Live Interactive Avatar Preview */}
            <div className="flex flex-col items-center space-y-1">
              <div
                className={`w-32 h-32 rounded-full flex items-center justify-center text-white shadow-xl ring-4 ring-indigo-500/20 bg-gradient-to-br ${currentGradient.css} transition-all duration-300 transform active:scale-95`}
              >
                {selectedIconId === 'initials' ? (
                  <span className="text-4xl font-bold tracking-tight drop-shadow-md select-none">
                    {getInitials(entityName)}
                  </span>
                ) : (
                  <CurrentIcon size={64} className="drop-shadow-md" />
                )}
              </div>
              <span className="text-[11px] font-semibold text-slate-400">Предпросмотр иконки</span>
            </div>

            {/* Icons Grid */}
            <div className="w-full">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block text-left">
                Иконка ({PRESET_ICONS.length})
              </label>
              <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                {PRESET_ICONS.map((item) => {
                  const ItemIcon = item.icon;
                  const isSelected = selectedIconId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedIconId(item.id);
                        trigger('light');
                      }}
                      className={`p-2.5 rounded-xl flex flex-col items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400 scale-105'
                          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95'
                      }`}
                      title={item.label}
                    >
                      {item.id === 'initials' ? (
                        <span className="font-bold text-xs leading-none h-5 flex items-center justify-center">
                          {getInitials(entityName)}
                        </span>
                      ) : (
                        <ItemIcon size={20} />
                      )}
                      <span className="text-[9px] font-medium mt-1 truncate max-w-[42px]">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gradient Swatches */}
            <div className="w-full">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block text-left">
                Фоновый цвет
              </label>
              <div className="flex gap-2.5 overflow-x-auto p-1.5 pb-2 custom-scrollbar">
                {PRESET_GRADIENTS.map((g) => {
                  const isSelected = selectedGradientId === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        setSelectedGradientId(g.id);
                        trigger('light');
                      }}
                      className={`w-8 h-8 rounded-full shrink-0 bg-gradient-to-br ${g.css} transition-all flex items-center justify-center ${
                        isSelected ? 'ring-4 ring-indigo-500 scale-110 shadow-md' : 'hover:scale-105 opacity-80 hover:opacity-100'
                      }`}
                      title={g.label}
                    >
                      {isSelected && <Check size={14} className="text-white drop-shadow-sm" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="w-full flex flex-col gap-2 pt-1">
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSavePresetIcon}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                {isSaving ? 'Сохранение...' : 'Установить иконку'}
              </button>

              {currentAvatar && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="w-full py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-sm font-medium transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  Сбросить к стандарту
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PHOTO UPLOAD & CROP */}
        {!imageSrc && tab === 'upload' && (
          <div className="w-full flex flex-col items-center py-4 px-2 space-y-4 animate-in fade-in duration-200">
            {isProcessing ? (
              <div className="w-36 h-36 rounded-full border-2 border-indigo-500/40 flex flex-col items-center justify-center bg-indigo-50/50 dark:bg-indigo-950/30 animate-pulse shadow-inner">
                <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin mb-2" />
                <span className="text-xs text-indigo-600 dark:text-indigo-300 font-bold text-center px-2">{loadingText}</span>
              </div>
            ) : currentAvatar ? (
              <div className="flex flex-col items-center space-y-2">
                <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-indigo-500/60 shadow-xl ring-4 ring-indigo-500/20 bg-slate-900 group transition-transform active:scale-98">
                  <img
                    src={currentAvatar}
                    alt={entityName}
                    className="w-full h-full object-cover rounded-full"
                  />
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
              {isProcessing ? loadingText : currentAvatar ? 'Сменить фото' : 'Загрузить фото из файла'}
            </button>

            {currentAvatar && (
              <button
                type="button"
                onClick={handleRemove}
                className="w-full py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                Удалить аватар
              </button>
            )}
          </div>
        )}

        {/* IMAGE CROPPER INTERFACE */}
        {imageSrc && (
          <div className="w-full flex flex-col items-center space-y-4">
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
                onClick={handleSavePhoto}
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
