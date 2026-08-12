import { useState, useEffect, useCallback, useRef } from 'react';
import { ClientPrank } from '../types';

interface UsePranksProps {
  activePrank: ClientPrank | null;
  onClearPrank?: () => void;
}

export interface UsePranksReturn {
  isUpsideDown: boolean;
  isMirror: boolean;
  secretMessage: string | null;
  remainingSeconds: number | null;
  dismissSecretMessage: () => void;
}

export const usePranks = ({ activePrank, onClearPrank }: UsePranksProps): UsePranksReturn => {
  const [isUpsideDown, setIsUpsideDown] = useState<boolean>(false);
  const [isMirror, setIsMirror] = useState<boolean>(false);
  const [secretMessage, setSecretMessage] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const onClearPrankRef = useRef(onClearPrank);
  useEffect(() => {
    onClearPrankRef.current = onClearPrank;
  }, [onClearPrank]);

  // Обработка активного прикола и таймера
  useEffect(() => {
    if (!activePrank) {
      setIsUpsideDown(false);
      setIsMirror(false);
      setSecretMessage(null);
      setRemainingSeconds(null);
      return;
    }

    const now = Date.now();
    const expiresAt = activePrank.expiresAt;

    // Если срок действия уже истек
    if (expiresAt && now >= expiresAt) {
      setIsUpsideDown(false);
      setIsMirror(false);
      setSecretMessage(null);
      setRemainingSeconds(null);
      if (onClearPrankRef.current) {
        onClearPrankRef.current();
      }
      return;
    }

    // Активируем соответствующий тип прикола
    if (activePrank.type === 'upside_down') {
      setIsUpsideDown(true);
      setIsMirror(false);
      setSecretMessage(null);
    } else if (activePrank.type === 'mirror') {
      setIsMirror(true);
      setIsUpsideDown(false);
      setSecretMessage(null);
    } else if (activePrank.type === 'secret_message') {
      setSecretMessage(activePrank.text || 'Секретное послание от администратора');
      setIsUpsideDown(false);
      setIsMirror(false);
    }

    // Таймер обратного отсчета для эффектов с ограничением по времени
    if (expiresAt) {
      const updateTimer = () => {
        const currentNow = Date.now();
        const diff = Math.max(0, Math.ceil((expiresAt - currentNow) / 1000));
        setRemainingSeconds(diff);

        if (diff <= 0) {
          setIsUpsideDown(false);
          setIsMirror(false);
          setSecretMessage(null);
          setRemainingSeconds(null);
          if (onClearPrankRef.current) {
            onClearPrankRef.current();
          }
        }
      };

      updateTimer();
      const intervalId = setInterval(updateTimer, 500);

      return () => {
        clearInterval(intervalId);
      };
    } else {
      setRemainingSeconds(null);
    }
  }, [activePrank]);

  // Закрытие секретного послания пользователем
  const dismissSecretMessage = useCallback(() => {
    setSecretMessage(null);
    if (onClearPrankRef.current) {
      onClearPrankRef.current();
    }
  }, []);

  return {
    isUpsideDown,
    isMirror,
    secretMessage,
    remainingSeconds,
    dismissSecretMessage
  };
};
