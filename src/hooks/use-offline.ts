import { useEffect, useState, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConnection } from './use-connection';
import uuid from 'react-native-uuid';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

export interface OfflineAction {
    id: string;
    url: string;
    method: 'POST' | 'PUT' | 'DELETE' | 'GET';
    data?: any;
    headers?: any;
    timestamp: number;
    syncStatus: 'PENDING' | 'SYNCING' | 'FAILED';
    title?: string; // For display purposes
    isMultipart?: boolean;
}

const OFFLINE_QUEUE_KEY = '@offline_queue';

export function useOffline() {
    const { t } = useTranslation();
    const [isOffline, setIsOffline] = useState(false);
    const [queue, setQueue] = useState<OfflineAction[]>([]);
    const { apiClient } = useConnection();
    const [isSyncing, setIsSyncing] = useState(false);
    const prevIsOfflineRef = useRef(isOffline);

    // Monitor network status
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOffline(state.isConnected === false);
        });
        return () => unsubscribe();
    }, []);

    // Load queue from storage on mount
    useEffect(() => {
        const loadQueue = async () => {
            try {
                const storedQueue = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
                if (storedQueue) {
                    setQueue(JSON.parse(storedQueue));
                }
            } catch (error) {
                console.error('Failed to load offline queue:', error);
            }
        };
        loadQueue();
    }, []);

    // Sync queue when online
    const processQueue = useCallback(async () => {
        if (isOffline || isSyncing || queue.length === 0) return;

        setIsSyncing(true);
        const currentQueue = [...queue];
        const remainingQueue: OfflineAction[] = [];

        for (const action of currentQueue) {
            try {
                let requestData = action.data;
                let requestHeaders = { ...action.headers };

                if (action.isMultipart && action.data) {
                    const formData = new FormData();
                    Object.keys(action.data).forEach(key => {
                        const value = action.data[key];
                        if (value && typeof value === 'object' && value.uri) {
                            // It's a file - ensure it's formatted for React Native FormData
                            formData.append(key, {
                                uri: value.uri,
                                type: value.type || 'image/jpeg',
                                name: value.name || 'upload.jpg',
                            } as any);
                        } else if (value !== undefined && value !== null) {
                            formData.append(key, String(value));
                        }
                    });
                    requestData = formData;
                }

                const config: any = { headers: requestHeaders };
                if (action.isMultipart) {
                    console.log(`Syncing multipart action ${action.id} (${action.title}). Headers:`, requestHeaders);
                }

                if (action.method === 'POST') {
                    console.log(`Syncing POST to: ${apiClient.defaults.baseURL}${action.url}`);
                    await apiClient.post(action.url, requestData, config);
                } else if (action.method === 'PUT') {
                    console.log(`Syncing PUT to: ${apiClient.defaults.baseURL}${action.url}`);
                    await apiClient.put(action.url, requestData, config);
                } else if (action.method === 'DELETE') {
                    console.log(`Syncing DELETE to: ${apiClient.defaults.baseURL}${action.url}`);
                    await apiClient.delete(action.url, config);
                } else if (action.method === 'GET') {
                    console.log(`Syncing GET to: ${apiClient.defaults.baseURL}${action.url}`);
                    await apiClient.get(action.url, config);
                }

                console.log(`Successfully synced action ${action.id} (${action.title})`);
                // Success: do nothing (it's removed from remainingQueue)
            } catch (error: any) {
                console.error(`Failed to sync action ${action.id}:`, error);
                if (error.response) {
                    console.error('Error response data:', error.response.data);
                    console.error('Error response status:', error.response.status);
                } else if (error.request) {
                    console.error('Error request (no response):', error.request);
                }

                remainingQueue.push({ ...action, syncStatus: 'FAILED' });

                // If it's a critical network error, stop processing rest of queue 
                // to avoid multiple "Network Error" alerts/logs
                if (!error.response && error.message === 'Network Error') {
                    const index = currentQueue.indexOf(action);
                    remainingQueue.push(...currentQueue.slice(index + 1));
                    break;
                }
            }
        }

        setQueue(remainingQueue);
        await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
        setIsSyncing(false);

        if (currentQueue.length > remainingQueue.length) {
            Alert.alert(
                t('element.syncComplete'),
                t('element.syncActionSuccess', { count: currentQueue.length - remainingQueue.length })
            );
        }
    }, [isOffline, isSyncing, queue, apiClient, t]);

    // Trigger sync ONLY when transitioning from offline to online
    useEffect(() => {
        const wasOffline = prevIsOfflineRef.current;
        const isNowOnline = !isOffline;

        // Only sync if we just came online AND have items in queue
        if (wasOffline && isNowOnline && queue.length > 0 && !isSyncing) {
            processQueue();
        }

        // Update ref for next comparison
        prevIsOfflineRef.current = isOffline;
    }, [isOffline]); // Only depend on isOffline to avoid infinite loop

    const addToQueue = async (
        url: string,
        method: 'POST' | 'PUT' | 'DELETE' | 'GET',
        data?: any,
        headers?: any,
        title?: string,
        isMultipart?: boolean,
    ) => {
        const newAction: OfflineAction = {
            id: uuid.v4().toString(),
            url,
            method,
            data,
            headers,
            timestamp: Date.now(),
            syncStatus: 'PENDING',
            title,
            isMultipart,
        };

        const newQueue = [...queue, newAction];
        setQueue(newQueue);
        await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(newQueue));

        return newAction;
    };

    const clearQueue = async () => {
        setQueue([]);
        await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
    }

    return {
        isOffline,
        queue,
        addToQueue,
        processQueue,
        clearQueue,
        isSyncing
    };
}
