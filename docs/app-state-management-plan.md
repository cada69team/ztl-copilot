# App State Management Plan

## Overview
Add comprehensive state tracking system that saves all important data locally in the browser.

## What to Track

| Category | What to Track | Why |
|-----------|-----------------|
| Alert History | Every alert fired (time, zone, distance) | Analyze patterns |
| GPS Position History | Location updates with timestamps | Track accuracy |
| Zone Interactions | Zones tapped, time spent | Analyze usage |
| App Sessions | App open/close times | Track engagement |
| Zone Events | Entering/leaving zones with timestamps | Critical for compliance |

## Technical Implementation

### 1. AlertHistory Hook

```typescript
// hooks/useAlertHistory.ts
interface Alert {
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

  const addAlert = useCallback((alert: Omit<Alert, 'timestamp'>) => {
    const newAlert = {
      ...alert,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };
    
    setAlerts(prev => {
      // Keep last MAX_ALERTS
      const limited = prev.length >= MAX_ALERTS ? prev.slice(-MAX_ALERTS) : [...prev, newAlert];
      return limited;
    });
  }, []);

  const getAlertsSince = useCallback((minutes: number) => {
    const since = Date.now() - (minutes * 60 * 1000);
    return alerts.filter(a => a.timestamp >= since);
  }, [alerts]);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const getAlertsInZone = useCallback(() => {
    return alerts.filter(a => a.type === 'inside_zone');
  }, [alerts]);

  const getApproachAlerts = useCallback(() => {
    return alerts.filter(a => a.type.startsWith('approach'));
  }, [alerts]);

  return {
    alerts,
    addAlert,
    getAlertsSince,
    getAlertsInZone,
    getApproachAlerts,
    clearAlerts,
  };
}
```

### 2. GPS History Hook

```typescript
// hooks/useGpsHistory.ts
interface GpsPosition {
  id: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  source: 'gps' | 'network' | 'cache';
}

export function useGpsHistory() {
  const [positions, setPositions] = useState<GpsPosition[]>([]);

  const addPosition = useCallback((position: Omit<GpsPosition, 'timestamp'>) => {
    const newPosition = {
      ...position,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };
    
    setPositions(prev => {
      // Keep last 1000 positions
      const limited = prev.length >= 1000 ? prev.slice(-1000) : [...prev, newPosition];
      return limited;
    });
  }, []);

  const clearPositions = useCallback(() => {
    setPositions([]);
  }, []);

  const getPositionsInZone = useCallback(() => {
    // Find positions when user was in ZTL zone
    return positions.filter(p => p.source === 'in_zone');
  }, [positions]);

  return {
    positions,
    addPosition,
    clearPositions,
    getPositionsInZone,
  };
}
```

### 3. Zone Interaction Hook

```typescript
// hooks/useZoneInteractions.ts
interface ZoneInteraction {
  id: string;
  zone: string;
  action: 'tap' | 'view' | 'dismiss_modal';
  timestamp: number;
  duration: number; // how long modal was open
}

export function useZoneInteractions() {
  const [interactions, setInteractions] = useState<ZoneInteraction[]>([]);

  const recordZoneTap = useCallback((zone: string) => {
    const interaction: ZoneInteraction = {
      id: `${Date.now()}-${Math.random()}`,
      zone,
      action: 'tap',
      timestamp: Date.now(),
      duration: 0,
    };
    
    setInteractions(prev => [...prev, interaction]);
  }, []);

  const recordZoneView = useCallback((zone: string) => {
    const interaction: ZoneInteraction = {
      id: `${Date.now()}-${Math.random()}`,
      zone,
      action: 'view',
      timestamp: Date.now(),
      duration: 0,
    };
    
    setInteractions(prev => [...prev, interaction]);
  }, []);

  const recordModalDuration = useCallback((interactionId: string, duration: number) => {
    setInteractions(prev => prev.map(i => {
      if (i.id === interactionId && i.action === 'dismiss_modal') {
        return { ...i, duration };
      }
      return i;
    }));
  }, [interactions]);

  return {
    interactions,
    recordZoneTap,
    recordZoneView,
    recordModalDuration,
    getInteractionsByZone,
  };
}
```

## How to Use in Map Component

```typescript
import { useAlertHistory, useGpsHistory, useZoneInteractions } from '@/hooks';

export default function ZtlMap() {
  const alertHistory = useAlertHistory();
  const gpsHistory = useGpsHistory();
  const zoneInteractions = useZoneInteractions();

  const handleInsideZone = useCallback((zone: ZoneFeature) => {
    console.log('🔍 Entered zone:', zone.properties.name);
    
    // Save to alert history
    alertHistory.addAlert({
      type: 'inside_zone',
      zone: zone.properties.name,
      city: zone.properties.city,
      coordinates: gpsHistory.positions[gpsHistory.positions.length - 1],
      distance: 0, // Just entered, calculate later
    });

    onAlert(true, alertMessage);
  }, [alertHistory, gpsHistory]);

  const handleApproachAlert = useCallback((distance: number, zone: ZoneFeature) => {
    alertHistory.addAlert({
      type: distance < 50 ? 'approach_50m' : distance < 100 ? 'approach_100m' : 'approach_200m',
      zone: zone.properties.name,
      city: zone.properties.city,
      distance,
      coordinates: gpsHistory.positions[gpsHistory.positions.length - 1],
    });

    onAlert(true, alertMessage);
  }, [alertHistory, gpsHistory]);

  return (
    <>
      {/* Debug Panel */}
      <DebugPanel
        alertHistory={alertHistory.alerts}
        gpsHistory={gpsHistory.positions}
        zoneInteractions={zoneInteractions.interactions}
      />
      
      {/* Map */}
      <Map />
      
      {/* Export Button */}
      <ExportButton
        alertHistory={alertHistory.alerts}
        gpsHistory={gpsHistory.positions}
      />
    </>
  );
}
```

## Benefits

### 1. Compliance & Auditing ✅
- Full alert history for each user
- GPS tracking accuracy verification
- Zone entry/exit timestamps
- Proof of warnings being shown

### 2. Pattern Analysis 📊
- Identify which zones users enter most
- Track common approach paths
- Measure alert effectiveness

### 3. User Support 💬
- Export full session data
- Identify GPS issues
- Verify alerts were received

### 4. Product Improvement 📈
- Most approached zones = feature request
- Alert frequency tuning
- UX improvements based on real data

## Priority: High

This provides much better visibility into what users are experiencing than console logs alone.
