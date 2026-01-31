# App State Management - Quick Implementation Plan

## Overview
Comprehensive state tracking system to save ALL app events locally with structured UI for debugging.

## Phase 1: Core Hooks (30 min)

### 1. Alert History Hook
**File:** `hooks/useAlertHistory.ts`

```typescript
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
  const [alertCount, setAlertCount] = useState(0);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('ztl-alert-history');
    if (stored) {
      setAlerts(JSON.parse(stored));
    }
  }, []);

  // Save to localStorage whenever alerts change
  useEffect(() => {
    localStorage.setItem('ztl-alert-history', JSON.stringify(alerts));
  }, [alerts]);

  const addAlert = useCallback((type: Alert['type'], zone: ZoneFeature, distance: number, coordinates: [number, number]) => {
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
      const limited = prev.length >= MAX_ALERTS ? prev.slice(-MAX_ALERTS) : [...prev, newAlert];
      setAlertCount(limited.length);
      return limited;
    });
  }, []);

  const getAlertsInZone = useCallback(() => {
    return alerts.filter(a => a.type === 'inside_zone');
  }, [alerts]);

  return {
    alerts,
    alertCount,
    addAlert,
    getAlertsInZone,
  };
}
```

### 2. GPS History Hook
**File:** `hooks/useGpsHistory.ts`

```typescript
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

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('ztl-gps-history');
    if (stored) {
      setPositions(JSON.parse(stored));
    }
  }, []);

  // Save to localStorage whenever positions change
  useEffect(() => {
    const limited = positions.length >= 100 ? positions.slice(-100) : positions;
    localStorage.setItem('ztl-gps-history', JSON.stringify(limited));
  }, [positions]);

  const addPosition = useCallback((latitude: number, longitude: number, accuracy: number = 0, source: 'gps') => {
    const newPosition: GpsPosition = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      latitude,
      longitude,
      accuracy,
      source,
    };

    setPositions(prev => {
      const limited = prev.length >= 100 ? prev.slice(-100) : [...prev, newPosition];
      return limited;
    });
  }, []);

  const getPositionsInZone = useCallback(() => {
    // Find positions where user was inside ANY zone
    const storedZones = localStorage.getItem('ztl-zones-entered');
    const zonesEntered = storedZones ? JSON.parse(storedZones) : [];
    
    return positions.filter(p => {
      if (zonesEntered.includes(p.id)) {
        return true; // This position was recorded while inside a zone
      }
      return false;
    });
  }, [positions]);

  return {
    positions,
    addPosition,
    getPositionsInZone,
  };
}
```

## Phase 2: UI Components (30 min)

### 1. DebugPanel Component
**File:** `components/DebugPanel.tsx`

```typescript
import { useAlertHistory, useGpsHistory } from '@/hooks';
import { useState } from 'react';

export default function DebugPanel() {
  const { alerts, getAlertsInZone } = useAlertHistory();
  const { positions, getPositionsInZone } = useGpsHistory();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed bottom-4 left-4 bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-2xl z-[9999] max-w-md max-h-96 overflow-y-auto">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex justify-between items-center p-2 text-white/80 hover:bg-white/90 rounded"
      >
        <span className="text-sm font-semibold">📊 DEBUG PANEL</span>
        <span className="text-xs">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="p-4 space-y-3">
          {/* Alert History */}
          <div className="bg-white/95 rounded-lg p-3">
            <h3 className="text-sm font-bold text-gray-900 mb-2">📋 Alert History (Last {Math.min(alerts.length, 50)})</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {alerts.slice(-50).reverse().map((alert, i) => (
                <div key={alert.id} className="text-xs p-2 bg-gray-50 rounded">
                  <div className="font-semibold text-gray-700">{alert.type.replace(/_/g, ' ').toUpperCase()}</div>
                  <div className="text-gray-600">
                    <div>📍 {alert.city} - {alert.zone}</div>
                    <div>⏱️ {alert.distance.toFixed(0)}m</div>
                    <div className="text-xs text-gray-500">{new Date(alert.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-2">
              <button
                onClick={() => {
                  const dataStr = JSON.stringify(alerts, null, 2);
                  navigator.clipboard.writeText(dataStr);
                  alert('Copied! ' + alerts.length + ' alerts copied to clipboard');
                }}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                📋 Copy All Alerts
              </button>
            </div>
          </div>

          {/* GPS History */}
          <div className="bg-white/95 rounded-lg p-3">
            <h3 className="text-sm font-bold text-gray-900 mb-2">📍 GPS History (Last {Math.min(positions.length, 50)})</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {positions.slice(-20).reverse().map((pos, i) => (
                <div key={pos.id} className="text-xs p-2 bg-gray-50 rounded">
                  <div className="font-semibold text-gray-700">
                    {pos.latitude.toFixed(4)}, {pos.longitude.toFixed(4)}
                  </div>
                  <div className="text-gray-600">
                    <div>🎯 {pos.source === 'gps' ? 'GPS' : pos.source.toUpperCase()}</div>
                    <div className="text-xs text-gray-500">Acc: {pos.accuracy ? pos.accuracy.toFixed(0) + 'm' : 'N/A'}</div>
                    <div className="text-xs text-gray-500">{new Date(pos.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-2">
              <button
                onClick={() => {
                  const dataStr = JSON.stringify(positions, null, 2);
                  navigator.clipboard.writeText(dataStr);
                  alert('Copied! ' + positions.length + ' positions copied to clipboard');
                }}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                📍 Copy GPS Positions
              </button>
            </div>
          </div>

          {/* Session Stats */}
          <div className="bg-blue-50/95 p-3 rounded-lg">
            <h3 className="text-sm font-bold text-blue-900 mb-2">📊 Session Stats</h3>
            <div className="space-y-1 text-sm text-blue-900">
              <div>🚨 Alerts fired: {alerts.length} today</div>
              <div>📍 Positions recorded: {positions.length}</div>
              <div>🎯 Time in zones: {positions.filter(p => getPositionsInZone().includes(p.id)).length} min</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 2. ExportButton Component
**File:** `components/ExportButton.tsx`

```typescript
import { useAlertHistory, useGpsHistory } from '@/hooks';

export default function ExportButton() {
  const { alerts, alertCount } = useAlertHistory();
  const { positions } = useGpsHistory();

  const handleExport = useCallback(() => {
    const sessionData = {
      exportDate: new Date().toISOString(),
      device: navigator.userAgent,
      appVersion: '1.0.0',
      alerts,
      alertCount,
      positions,
      stats: {
        totalAlerts: alerts.length,
        alertsInZone: alerts.filter(a => a.type === 'inside_zone').length,
        totalPositions: positions.length,
        positionsInZone: positions.filter(p => getPositionsInZone().includes(p.id)).length,
      },
    };

    const dataStr = JSON.stringify(sessionData, null, 2);
    
    // Download file
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ztl-copilot-session-${Date.now()}.json`;
    a.click();
    
    // Copy to clipboard
    navigator.clipboard.writeText(dataStr);
    alert('Session exported! ' + alerts.length + ' alerts, ' + positions.length + ' positions');
  }, [alerts, positions]);

  return (
    <button
      onClick={handleExport}
      className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition z-[9999]"
    >
      📤 Export Session
    </button>
  );
}
```

## Phase 3: Map Integration (15 min)

### Update Map Component
**File:** `components/Map.tsx`

```typescript
import { useAlertHistory, useGpsHistory } from '@/hooks';

export default function ZtlMap() {
  const { alerts, addAlert } = useAlertHistory();
  const { addPosition } = useGpsHistory();

  // Update all GPS position updates to hook
  const handleNearestZone = useCallback((zone: ZoneFeature | null) => {
    console.log('✅ Nearest zone found:', zone?.properties.name || 'null');
    
    // Also track zone tap for analytics
    if (zone && zone.properties) {
      // Could add analytics call here
    }
  }, []);

  useEffect(() => {
    if (!map || !ztlZones) return;

    console.log("✅ LocationMarker: Starting GPS watcher");

    // ... existing GPS logic ...
        // When inside zone
        addAlert({
          type: 'inside_zone',
          zone: activeViolations[0],
          distance: 0,
          coordinates: [latitude, longitude],
        });

        // When approaching
        addAlert({
          type: distance < 50 ? 'approach_50m' : distance < 100 ? 'approach_100m' : 'approach_200m',
          zone: nearestZone as any,
          distance: distInMeters,
          coordinates: [latitude, longitude],
        });
    // ...

    return () => {
      const id = watcherIdRef.current;
      if (id !== null) {
        navigator.geolocation.clearWatch(id);
        watcherIdRef.current = null;
      }
    };
  }, [map, onAlert, addPosition, ztlZones]);

  return (
    <>
      <MapContainer>
        {/* ... existing components ... */}
        <DebugPanel />
        <ExportButton />
      </MapContainer>
    </>
  );
}
```

## What You Get ✅

### Immediate Benefits (Version 1)
- ✅ **Alert History** - See all 50 recent alerts with timestamps
- ✅ **GPS History** - See last 50 positions with accuracy
- ✅ **Debug Panel** - Structured, easy-to-read UI
- ✅ **Export Function** - Download complete session data as JSON
- ✅ **Real-time Tracking** - Every alert and GPS update saved

### Debug Capabilities
- See exact alert messages that fired
- View timestamps for each event
- See exact distances for each alert
- See coordinates for each GPS position
- See GPS accuracy for each position
- Copy data to clipboard for analysis

### For Your Testing
**Drive through ZTL zone and then:**
1. **Open DebugPanel** (click "📊 DEBUG PANEL")
2. **Check "Alert History"** - You'll see "ZTL in 200m - Turn right" with timestamp
3. **Check "GPS History"** - You'll see your exact path
4. **Click "Export Session"** - Download all data for analysis

**This will tell us:**
- Exactly when alerts fired
- Your exact GPS coordinates
- Alert distances in meters
- Zone accuracy
- Any patterns in your driving

## Time Estimate
- **Phase 1 (Core Hooks):** 30 min
- **Phase 2 (UI Components):** 30 min
- **Phase 3 (Integration):** 15 min

**Total:** ~1 hour 15 minutes

---

## Implementation Order

1. ✅ Create hooks (useAlertHistory, useGpsHistory)
2. ✅ Create DebugPanel component
3. ✅ Create ExportButton component
4. ✅ Update Map component to use hooks
5. ✅ Test and deploy

---

**Ready to implement when approved!** 🚀

This system provides 100% visibility into app behavior and will solve your "I don't see alert messages" issue by showing EXACT history!
