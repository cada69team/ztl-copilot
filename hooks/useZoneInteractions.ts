# hooks/useZoneInteractions.ts

import { useState, useCallback } from 'react';

export interface ZoneInteraction {
  id: string;
  zone: string;
  zoneName: string;
  action: 'tap' | 'view' | 'dismiss_modal' | 'dismiss_alert';
  timestamp: number;
  duration: number; // how long modal/view was open
  gpsAccuracy?: number; // GPS accuracy at time of interaction
}

export function useZoneInteractions() {
  const [interactions, setInteractions] = useState<ZoneInteraction[]>([]);
  const [modalDurations, setModalDurations] = useState<Record<string, number>>({});

  const recordZoneTap = useCallback((zone: string, gpsAccuracy?: number) => {
    const interaction: ZoneInteraction = {
      id: `${Date.now()}-${Math.random()}`,
      zone,
      zoneName: zone,
      action: 'tap',
      timestamp: Date.now(),
      duration: 0,
      gpsAccuracy,
    };

    setInteractions(prev => [...prev, interaction]);
    console.log(`🎯 DEBUG: Zone tap recorded: "${zone}" (GPS accuracy: ${gpsAccuracy ? gpsAccuracy.toFixed(0) + 'm' : 'N/A'})`);
  }, []);

  const recordZoneView = useCallback((zone: string, duration: number) => {
    const interaction: ZoneInteraction = {
      id: `${Date.now()}-${Math.random()}`,
      zone,
      zoneName: zone,
      action: 'view',
      timestamp: Date.now(),
      duration,
    };

    setInteractions(prev => [...prev, interaction]);
    setModalDurations(prev => ({ ...prev, [interaction.id]: duration }));
    console.log(`🔍 DEBUG: Zone view recorded: "${zone}" for ${duration}ms`);
  }, []);

  const recordModalDismiss = useCallback((interactionId: string, duration: number) => {
    const interaction: ZoneInteraction = {
      id: `${Date.now()}-${Math.random()}`,
      zone: 'unknown',
      zoneName: 'unknown',
      action: 'dismiss_modal',
      timestamp: Date.now(),
      duration,
    };

    setInteractions(prev => {
      const index = prev.findIndex(i => i.id === interactionId);
      if (index === -1) return prev;

      const updated = prev.slice(0, index);
      updated.push(interaction);
      return updated;
    });

    console.log('🔍 DEBUG: Modal dismiss recorded (duration: ' + duration + 'ms)');
  }, [modalDurations]);

  const recordAlertDismiss = useCallback(() => {
    const interaction: ZoneInteraction = {
      id: `${Date.now()}-${Math.random()}`,
      zone: 'unknown',
      zoneName: 'unknown',
      action: 'dismiss_alert',
      timestamp: Date.now(),
      duration: 0,
    };

    setInteractions(prev => [...prev, interaction]);
    console.log('🔍 DEBUG: Alert dismiss recorded');
  }, []);

  const getInteractionsByZone = useCallback((zoneName: string) => {
    return interactions.filter(i => i.zoneName === zoneName);
  }, [interactions]);

  const getInteractionsByAction = useCallback((action: ZoneInteraction['action']) => {
    return interactions.filter(i => i.action === action);
  }, [interactions, getInteractionsByZone]);

  const getTapCountByZone = useCallback((zoneName: string) => {
    return getInteractionsByZone(zoneName).filter(i => i.action === 'tap').length;
  }, [getInteractionsByZone]);

  const getViewCountByZone = useCallback((zoneName: string) => {
    return getInteractionsByZone(zoneName).filter(i => i.action === 'view').length;
  }, [getInteractionsByZone]);

  const getAverageModalDuration = useCallback((zoneName: string) => {
    const zoneViews = getInteractionsByZone(zoneName).filter(i => i.action === 'view');
    if (zoneViews.length === 0) return 0;

    const modalDismissals = getInteractionsByZone(zoneName).filter(i => i.action === 'dismiss_modal');
    const duration = modalDismissals.reduce((sum, d) => sum + (d.duration || 0), 0);

    return Math.round(duration / zoneViews.length);
  }, [getInteractionsByZone]);

  const getLastInteraction = useCallback((zoneName: string) => {
    const zoneInteractions = getInteractionsByZone(zoneName);
    if (zoneInteractions.length === 0) return null;
    return zoneInteractions[zoneInteractions.length - 1];
  }, [getInteractionsByZone]);

  return {
    interactions,
    recordZoneTap,
    recordZoneView,
    recordModalDismiss,
    recordAlertDismiss,
    getInteractionsByZone,
    getInteractionsByAction,
    getInteractionsByDate,
    getTapCountByZone,
    getViewCountByZone,
    getAverageModalDuration,
    getLastInteraction,
    modalDurations,
  };
}
