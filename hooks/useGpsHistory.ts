# hooks/useGpsHistory.ts

import { useState, useEffect, useCallback } from 'react';

export interface GpsPosition {
  id: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  source: 'gps' | 'network' | 'cache';
}

export function useGpsHistory() {
  const [positions, setPositions] = useState<GpsPosition[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('ztl-gps-history');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPositions(parsed);
        console.log('📍 Loaded', parsed.length, 'GPS positions from localStorage');
      } catch (e) {
        console.error('❌ Failed to parse GPS history:', e);
      }
    }
  }, []);

  // Save to localStorage whenever positions change
  useEffect(() => {
    const limited = positions.length >= 100 ? positions.slice(-100) : positions;
    localStorage.setItem('ztl-gps-history', JSON.stringify(limited));
  }, [positions]);

  const addPosition = useCallback((latitude: number, longitude: number, accuracy: number = 0, source: GpsPosition['source'] = 'gps') => {
    const newPosition: GpsPosition = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      latitude,
      longitude,
      accuracy,
      source,
    };

    setPositions(prev => {
      // Keep last 1000 positions
      const limited = prev.length >= 1000 ? prev.slice(-1000) : [...prev, newPosition];
      return limited;
    });
  }, []);

  const clearPositions = useCallback(() => {
    setPositions([]);
    localStorage.removeItem('ztl-gps-history');
  }, []);

  const getPositionsInZone = useCallback(() => {
    // Find positions where user was in ZTL zone
    const storedZones = localStorage.getItem('ztl-zones-entered');
    const zonesEntered = storedZones ? JSON.parse(storedZones) : [];

    return positions.filter(p => zonesEntered.includes(p.id));
  }, [positions]);

  return {
    positions,
    addPosition,
    clearPositions,
    getPositionsInZone,
  };
}
