import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type AppDocSnapshot,
  type AppQuerySnapshot,
  type AppQueryDocSnapshot,
} from '../services/firestore';
import { ClientData, ClientPrank } from '../types';
import { getOrCreateClientId, getDeviceInfo, generateDefaultClientName } from '../utils/clientId';
import { APP_VERSION } from '../utils/changelog';
import { useConnectivityContext } from '../context/ConnectivityContext';

export interface UseClientSyncReturn {
  clientId: string;
  clientData: ClientData | null;
  isAdmin: boolean;
  activePrank: ClientPrank | null;
  allClients: ClientData[];
  isLoadingAllClients: boolean;
  subscribeToAllClients: () => () => void;
  updateClientName: (targetClientId: string, newName: string) => Promise<boolean>;
  setClientAdmin: (targetClientId: string, isAdmin: boolean) => Promise<boolean>;
  setClientPrank: (targetClientId: string, prank: ClientPrank | null) => Promise<boolean>;
  clearClientPrank: (targetClientId: string) => Promise<boolean>;
  deleteClient: (targetClientId: string) => Promise<boolean>;
}

export const useClientSync = (): UseClientSyncReturn => {
  const { isOnline } = useConnectivityContext();
  const [clientId] = useState<string>(() => getOrCreateClientId());
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [allClients, setAllClients] = useState<ClientData[]>([]);
  const [isLoadingAllClients, setIsLoadingAllClients] = useState<boolean>(false);
  const hasRegisteredRef = useRef<boolean>(false);

  // 1. Подписка на собственный документ в Firestore
  useEffect(() => {
    if (!clientId) return;

    let unsubscribe: (() => void) | undefined;
    try {
      const clientDocRef = doc('clients', clientId);

      unsubscribe = onSnapshot(
        clientDocRef,
        (docSnap: AppDocSnapshot) => {
          if (!docSnap) return;

          if (docSnap.exists()) {
            const data = docSnap.data() as ClientData | undefined;
            if (!data) return;
            setClientData({
              ...data,
              clientId: data?.clientId || docSnap.id || clientId
            });
          } else if (!hasRegisteredRef.current && isOnline) {
            // Документа ещё нет в базе — регистрируем новое устройство
            hasRegisteredRef.current = true;
            const device = getDeviceInfo();
            const initialData: ClientData = {
              clientId,
              customName: generateDefaultClientName(device, clientId),
              device,
              firstSeen: Date.now(),
              lastSeen: Date.now(),
              isAdmin: false,
              appVersion: APP_VERSION,
              activePrank: null
            };

            setDoc(clientDocRef, initialData).catch((err: unknown) => {
              console.warn('[useClientSync] Failed to register client doc:', err);
            });
            setClientData(initialData);
          }
        },
        (err: unknown) => {
          console.warn('[useClientSync] Snapshot offline or blocked:', err);
        }
      );
    } catch (e) {
      console.warn('[useClientSync] Firebase initialization error:', e);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [clientId, isOnline]);

  // 2. Heartbeat & актуализация данных устройства при наличии сети
  useEffect(() => {
    if (!isOnline || !clientId) return;

    const updatePresence = async () => {
      try {
        const device = getDeviceInfo();
        await setDoc(
          doc('clients', clientId),
          {
            clientId,
            lastSeen: Date.now(),
            device,
            appVersion: APP_VERSION
          },
          { merge: true }
        );
      } catch (e) {
        // Ошибки соединения при блокировках глушим, чтобы не засорять консоль
      }
    };

    // Обновляем статус сразу при появлении сети, если вкладка видима
    if (document.visibilityState === 'visible') {
      updatePresence();
    }

    // Heartbeat каждые 60 секунд только для видимой вкладки
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updatePresence();
      }
    }, 60000);

    // Обновляем при возврате вкладки из фона
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [clientId, isOnline]);

  // 3. Подписка администратора на список всех клиентов
  const subscribeToAllClients = useCallback(() => {
    setIsLoadingAllClients(true);
    try {
      const clientsRef = query(collection('clients'), orderBy('lastSeen', 'desc'));
      const unsubscribe = onSnapshot(
        clientsRef,
        (snapshot: AppQuerySnapshot) => {
          setIsLoadingAllClients(false);
          if (!snapshot || !snapshot.docs) return;

          const clients: ClientData[] = snapshot.docs.map((d: AppQueryDocSnapshot) => {
            const data = (d.data() || {}) as Partial<ClientData>;
            return {
              ...data,
              clientId: data.clientId || d.id
            } as ClientData;
          });
          setAllClients(clients);
        },
        (err: unknown) => {
          setIsLoadingAllClients(false);
          console.warn('[useClientSync] All clients snapshot error/offline:', err);
        }
      );

      return unsubscribe;
    } catch (e) {
      setIsLoadingAllClients(false);
      console.warn('[useClientSync] Error subscribing to all clients:', e);
      return () => {};
    }
  }, []);

  // 4. Методы управления клиентами (для админа)
  const updateClientName = useCallback(async (targetClientId: string, newName: string): Promise<boolean> => {
    if (!targetClientId || !newName.trim()) return false;
    try {
      await setDoc(
        doc('clients', targetClientId),
        { customName: newName.trim() },
        { merge: true }
      );
      return true;
    } catch (e) {
      console.error('[useClientSync] Failed to update client name:', e);
      return false;
    }
  }, []);

  const setClientAdmin = useCallback(async (targetClientId: string, newIsAdmin: boolean): Promise<boolean> => {
    if (!targetClientId) return false;
    try {
      await setDoc(
        doc('clients', targetClientId),
        { isAdmin: newIsAdmin },
        { merge: true }
      );
      return true;
    } catch (e) {
      console.error('[useClientSync] Failed to set client admin status:', e);
      return false;
    }
  }, []);

  const setClientPrank = useCallback(async (targetClientId: string, prank: ClientPrank | null): Promise<boolean> => {
    if (!targetClientId) return false;
    try {
      await setDoc(
        doc('clients', targetClientId),
        { activePrank: prank },
        { merge: true }
      );
      return true;
    } catch (e) {
      console.error('[useClientSync] Failed to set prank for client:', e);
      return false;
    }
  }, []);

  const clearClientPrank = useCallback(async (targetClientId: string): Promise<boolean> => {
    return setClientPrank(targetClientId, null);
  }, [setClientPrank]);

  const deleteClient = useCallback(async (targetClientId: string): Promise<boolean> => {
    if (!targetClientId) return false;
    try {
      await deleteDoc(doc('clients', targetClientId));
      return true;
    } catch (e) {
      console.error('[useClientSync] Failed to delete client:', e);
      return false;
    }
  }, []);

  const isAdmin = Boolean(clientData?.isAdmin);
  const activePrank = clientData?.activePrank || null;

  return {
    clientId,
    clientData,
    isAdmin,
    activePrank,
    allClients,
    isLoadingAllClients,
    subscribeToAllClients,
    updateClientName,
    setClientAdmin,
    setClientPrank,
    clearClientPrank,
    deleteClient
  };
};
