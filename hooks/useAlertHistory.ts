# hooks/useAlertHistory.ts

import { useState, useEffect, useCallback } from 'react';

export interface Alert {
  id: string;
  timestamp: number;
  type: 'approach_200m' | 'approach_100m' | 'approach_50m' | 'inside_zone';
  zone: string;
  city: string;
  distance: number; // in meters
  coordinates: [number, number];
}

const MAX_ALERTS = 50;

export function useAlertHistory() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertCount, setAlertCount] = useState(0);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('ztl-alert-history');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setAlerts(parsed);
        setAlertCount(parsed.length);
        console.log('📊 Loaded', parsed.length, 'alerts from localStorage');
      } catch (e) {
        console.error('❌ Failed to parse alert history:', e);
        // Start fresh if corrupted
        setAlerts([]);
        setAlertCount(0);
      }
    }
  }, []);

  // Save to localStorage whenever alerts change
  useEffect(() => {
    localStorage.setItem('ztl-alert-history', JSON.stringify(alerts));
  }, [alerts]);

  const addAlert = useCallback((type: Alert['type'], zone: any, distance: number, coordinates: [number, number]) => {
    const newAlert: Alert = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      type,
      zone: zone.properties.name,
      city: zone.properties.city,
      distance,
      coordinates,
    };

    setAlerts(prev => {
      // Keep last MAX_ALERTS
      const limited = prev.length >= MAX_ALERTS ? prev.slice(-MAX_ALERTS) : [...prev, newAlert];
      setAlertCount(limited.length);
      return limited;
    });
  }, []);

  const getAlertsSince = useCallback((minutes: number) => {
    const since = Date.now() - (minutes * 60 * 1000);
    return alerts.filter(a => a.timestamp >= since);
  }, [alerts]);

  const getAlertsInZone = useCallback(() => {
    return alerts.filter(a => a.type === 'inside_zone');
  }, [alerts]);

  const getApproachAlerts = useCallback(() => {
    return alerts.filter(a => a.type.startsWith('approach'));
  }, [alerts]);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
    setAlertCount(0);
    localStorage.removeItem('ztl-alert-history');
  }, []);

  const getLastAlert = useCallback(() => {
    return alerts.length > 0 ? alerts[alerts.length - 1] : null;
  }, [alerts]);

  const getAlertsByType = useCallback((type: Alert['type']) => {
    return alerts.filter(a => a.type === type);
  }, [alerts]);

  return {
    alerts,
    alertCount,
    addAlert,
    getAlertsSince,
    getAlertsInZone,
    getApproachAlerts,
    clearAlerts,
    getLastAlert,
    getAlertsByType,
  };
}
