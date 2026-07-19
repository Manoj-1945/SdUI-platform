import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBackendUrl } from './api';

export interface RealtimeReading {
  voltage: number;
  current: number;
  power: number;
  energy: number;
  timestamp: string;
}

export function useRealtimeReading(userId: string | undefined, onReading: (reading: RealtimeReading) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(true);
  const onReadingRef = useRef(onReading);
  onReadingRef.current = onReading;

  useEffect(() => {
    if (!userId) return;
    shouldReconnectRef.current = true;

    const connect = async () => {
      const token = await AsyncStorage.getItem('session_token');
      if (!token || !shouldReconnectRef.current) return;

      const httpUrl = getBackendUrl();
      const wsUrl = httpUrl.replace(/^http/, 'ws') + `/ws/${userId}?token=${token}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'reading') {
            onReadingRef.current(data);
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        if (shouldReconnectRef.current) {
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [userId]);
}