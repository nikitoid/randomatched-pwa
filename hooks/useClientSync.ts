import { useState, useEffect, useCallback, useRef } from 'react';
import { db, isTestEnvironment } from '../firebase';
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
      if (db && typeof db.collection === 'function') {
        const clientDocRef = db.collection('clients').doc(clientId);

        unsubscribe = clientDocRef.onSnapshot(
          (docSnap: any) => {
            if (!docSnap) return;

            if (docSnap.exists) {
              const data = docSnap.data() as ClientData;
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

              clientDocRef.set(initialData).catch((err: any) => {
                console.warn('[useClientSync] Failed to register client doc:', err);
              });
              setClientData(initialData);
            }
          },
          (err: any) => {
            console.warn('[useClientSync] Snapshot offline or blocked:', err);
          }
        );
      }
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
        if (!db || typeof db.collection !== 'function') return;
        const device = getDeviceInfo();
        await db.collection('clients').doc(clientId).set(
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

    // Обновляем статус сразу при появлении сети
    updatePresence();

    // Heartbeat каждые 60 секунд
    const intervalId = setInterval(updatePresence, 60000);

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
    if (!db || typeof db.collection !== 'function') return () => {};

    setIsLoadingAllClients(true);
    try {
      const clientsRef = db.collection('clients').orderBy('lastSeen', 'desc');
      const unsubscribe = clientsRef.onSnapshot(
        (snapshot: any) => {
          setIsLoadingAllClients(false);
          if (!snapshot || !snapshot.docs) return;

          const clients: ClientData[] = snapshot.docs.map((d: any) => {
            const data = d.data() || {};
            return {
              ...data,
              clientId: data.clientId || d.id
            } as ClientData;
          });
          setAllClients(clients);
        },
        (err: any) => {
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
      if (!db || typeof db.collection !== 'function') return false;
      await db.collection('clients').doc(targetClientId).set(
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
      if (!db || typeof db.collection !== 'function') return false;
      await db.collection('clients').doc(targetClientId).set(
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
      if (!db || typeof db.collection !== 'function') return false;
      await db.collection('clients').doc(targetClientId).set(
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
      if (!db || typeof db.collection !== 'function') return false;
      await db.collection('clients').doc(targetClientId).delete();
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
