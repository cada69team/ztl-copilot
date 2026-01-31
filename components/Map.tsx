"use client"

import { useEffect, useRef, useCallback, useState } from "react";
import { MapContainer, TileLayer, Polygon, Marker, useMap, ZoomControl } from "react-leaflet";
import * as turf from "@turf/turf";

import { isZoneActive } from "@/hooks/useZtlStatus";
import { useAlertHistory, useGpsHistory, useZoneInteractions } from "@/hooks/useAlertHistory";

interface ZoneFeature {
  type: string;
  properties: {
    city: string;
    name: string;
    fine: number;
    note?: string;
  };
  geometry: {
    type: string;
    coordinates: any;
  };
}

type AlertSound = "siren" | "calm" | "silent";

export default function ZtlMap() {
  const [isAlert, setIsAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [zonesLoaded, setZonesLoaded] = useState(false);
  const [zonesError, setZonesError] = useState<string | null>(null);
  const [mapTilesLoading, setMapTilesLoading] = useState(true);
  const [polygonsRendering, setPolygonsRendering] = useState(false);
  const [ztlZones, setZtlZones] = useState<any>(null);
  const [nearestZone, setNearestZone] = useState<ZoneFeature | null>(null);
  const [gpsPosition, setGpsPosition] = useState<[number, number] | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneFeature | null>(null);
  const [alertCount, setAlertCount] = useState(0);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showDelayedPrompt, setShowDelayedPrompt] = useState(false);
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);

  const [alertSound, setAlertSound] = useState<AlertSound>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('alert-sound-preference');
      return (stored as AlertSound) || 'siren';
    }
    return 'siren';
  });
  const [showSoundSettings, setShowSoundSettings] = useState(false);

  const [center, setCenter] = useState<[number, number]>([45.4642, 9.1900]);
  const [zoom, setZoom] = useState(13);

  const [zonesCount, setZonesCount] = useState(0);

  // Use hooks for state management
  const alertHistory = useAlertHistory();
  const gpsHistory = useGpsHistory();
  const zoneInteractions = useZoneInteractions();

  const handleNearestZone = useCallback((zone: ZoneFeature | null) => {
    console.log("✅ ZtlMap: Nearest zone updated:", zone?.properties.name || "null");
    setNearestZone(zone);
    // Track zone tap for analytics
    if (zone) {
      zoneInteractions.recordZoneTap();
    }
  }, [zoneInteractions.recordZoneTap]);

  const handleGpsPositionUpdate = useCallback((position: [number, number]) => {
    setGpsPosition(position);
  }, []);

  const handleAlertIncrement = useCallback(() => {
    const newCount = alertCount + 1;
    setAlertCount(newCount);
    localStorage.setItem('ztl-alert-count', newCount.toString());
  }, [alertCount]);

  const handleAlert = useCallback((active: boolean, message = "") => {
    setIsAlert(active);
    setAlertMessage(message);

    if (alertCount >= 3 && !showUpgradePrompt) {
      setShowUpgradePrompt(true);
    }
  }, [alertCount, showUpgradePrompt]);

  const handleMapReady = useCallback(() => {
    console.log("✅ Map ready!");
    setMapReady(true);
  }, []);

  const handleMapError = useCallback(() => {
    setMapError("Failed to load map. Please refresh and check your connection.");
  }, []);

  const handleZoneClick = useCallback((zone: ZoneFeature) => {
    setSelectedZone(zone);
    // Track zone view for analytics
    zoneInteractions.recordZoneView();
  }, [zoneInteractions.recordZoneView]);

  const handleDismissUpgrade = useCallback(() => {
    setShowUpgradePrompt(false);
  }, []);

  const handleInstallApp = useCallback(() => {
    const win = window as any;

    if (win && win.deferredPrompt && win.deferredPrompt.prompt) {
      win.deferredPrompt.prompt();
      localStorage.setItem('pwa-install-dismissed', 'true');
      localStorage.setItem('pwa-install-dismissed-date', new Date().toDateString());
      setShowInstallPrompt(false);
      setShowDelayedPrompt(false);
    } else {
      setShowInstallInstructions(true);
    }
  }, []);

  const handleDismissInstructions = useCallback(() => {
    setShowInstallInstructions(false);
  }, []);

  const handleUseTestData = useCallback(() => {
    const mockZones = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            city: "Milano",
            name: "Area C",
            fine: 100,
            note: "Test zone - active Mon-Fri 07:30-18:30"
          },
          geometry: {
            type: "Polygon",
            coordinates: [[
              [9.1900, 45.4642],
              [9.1950, 45.4700],
              [9.2000, 45.4750],
              [9.2100, 45.4800],
              [9.2150, 45.4900],
              [9.2200, 45.5000],
              [9.2250, 45.5100],
              [9.2300, 45.5200],
              [9.2350, 45.5300],
              [9.2400, 45.5400],
              [9.2450, 45.5500],
              [9.2500, 45.5600],
              [9.2550, 45.5700],
              [9.2600, 45.5800],
              [9.2650, 45.5900],
              [9.2700, 45.6000],
              [9.2750, 45.6100],
              [9.2800, 45.6200],
              [9.2850, 45.6300],
              [9.2900, 45.6400],
              [9.2950, 45.6500],
              [9.3000, 45.6600]
            ]]
          }
        ]
      };

    setZtlZones(mockZones);
  }, []);

  const handleDismissZonesError = useCallback(() => {
    setZonesError(null);
  }, []);

  // Alert State from hook
  const [alerts, alertCount, addAlert] = [
    alertHistory.alerts,
    alertHistory.alertCount,
    alertHistory.addAlert
  ];

  // GPS State from hook
  const [positions, addPosition] = [
    gpsHistory.positions,
    gpsHistory.addPosition
  ];

  // Zone Interactions from hook
  const [interactions, recordZoneTap] = [
    zoneInteractions.interactions,
    zoneInteractions.recordZoneTap
  ];

  useEffect(() => {
    console.log("🚨 ZtlMap component mounted");

    // Load zones data
    console.log("🚨 Starting zones data load...");
    fetch('/ztl-zones.json')
      .then(res => res.json())
      .then(data => {
        console.log("✅ Zones file loaded from network: 200");
        console.log("✅ Zones file size: " + new Blob([JSON.stringify(data)]).size);
        console.log("✅ Zones data parsed successfully");
        console.log("✅ Zones data type:", data.type);
        console.log("✅ Features count:", data.features.length);
        console.log("✅ First zone sample:", JSON.stringify(data.features[0]));

        setZtlZones(data);
        setZonesLoaded(true);
        setZonesCount(data.features.length);
      })
      .catch(err => {
        console.error("Zones error: Failed to load zones:", err);
        setZonesError("Failed to load zones. Please refresh and check your connection.");
        setZonesLoaded(false);
      })
      .finally(() => {
        setTimeout(() => {
          console.log("🎯 Setting map ready after 2 seconds");
          setMapReady(true);
          setPolygonsRendering(true);
        }, 2000);
      });
  }, []);

  // LocationMarker component with hooks integration
  function LocationMarker({
    onAlert,
    alertSound,
    onNearestZone,
    onPositionUpdate,
    onAlertIncrement,
    alertCount,
    ztlZones
  }: {
    const map = useMap();
    const [position, setPosition] = useState<[number, number] | null>(null);
    const [siren, setSiren] = useState<HTMLAudioElement | null>(null);
    const alertCountRef = useRef(alertCount);

    useEffect(() => {
      const sirenAudio = new Audio("/siren.mp3");
      sirenAudio.volume = 0.5;
      setSiren(sirenAudio);

      return () => {
        sirenAudio.pause();
        sirenAudio.remove();
      };
    }, []);

    // Sync ref with alertCount prop
    useEffect(() => {
      alertCountRef.current = alertCount;
    }, [alertCount]);

    useEffect(() => {
      if (!map || !ztlZones) return;

      console.log("✅ LocationMarker: Starting GPS watcher");

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setPosition([latitude, longitude]);
          onPositionUpdate([latitude, longitude]);

          const pt = turf.point([longitude, latitude]);

          let nearest: any = null;
          let minDistance = Infinity;

          for (const zone of ztlZones.features) {
            const polygon = turf.polygon(zone.geometry.coordinates);
            const distance = turf.pointToPolygonDistance(pt, polygon);
            if (distance < minDistance && distance < 1) {
              minDistance = distance;
              nearest = zone;
            }
          }

          if (nearest && nearest.properties) {
            onNearestZone(nearest);
          }

          // DEBUG: Log detailed zone detection state
          console.log("🔍 DEBUG: Checking all zones for violations");

          const activeViolations = ztlZones.features.filter((zone: any) => {
            const isInside = turf.booleanPointInPolygon(pt, turf.polygon(zone.geometry.coordinates));
            const isActiveNow = isZoneActive(zone.properties.name);
            const isViolation = isInside && isActiveNow;
            const isActive = isActiveNow;

            console.log(`🔍 DEBUG: Zone "${zone.properties.name}" - Inside: ${isInside}, Active: ${isActive}, Violation: ${isViolation}`);
            return isViolation;
          });

          console.log(`🔍 DEBUG: Total violations found: ${activeViolations.length}`);
          console.log(`🔍 DEBUG: Inside zone check: ${activeViolations.length > 0 ? 'YES - should alert' : 'NO - should not alert'}`);

          if (activeViolations.length > 0) {
            const zone = activeViolations[0];
            addAlert({
              type: 'inside_zone',
              zone: zone.properties.name,
              city: zone.properties.city,
              distance: 0,
              coordinates: [latitude, longitude],
            });

            if (siren) {
              siren.currentTime = 0;
              siren.play().catch(() => {});
            }
          } else if (minDistance < 0.2 && nearest) {
            addAlert({
              type: 'approach_200m',
              zone: nearest.properties.name,
              city: nearest.properties.city,
              distance: minDistance * 1000,
              coordinates: [latitude, longitude],
            });

            if (alertSound === "siren" && siren) {
              siren.currentTime = 0;
              siren.play().catch(() => {});
            }
          } else if (minDistance < 0.1 && nearest) {
            addAlert({
              type: 'approach_100m',
              zone: nearest.properties.name,
              city: nearest.properties.city,
              distance: minDistance * 1000,
              coordinates: [latitude, longitude],
            });

            if (siren) {
              siren.currentTime = 0;
              siren.play().catch(() => {});
            }
          } else if (minDistance < 0.05 && nearest) {
            addAlert({
              type: 'approach_50m',
              zone: nearest.properties.name,
              city: nearest.properties.city,
              distance: minDistance * 1000,
              coordinates: [latitude, longitude],
            });

            if (siren) {
              siren.currentTime = 0;
              siren.play().catch(() => {});
            }
          } else {
            onAlert(false);
          }

          if (map) {
            map.panTo([latitude, longitude], { animate: true, duration: 0.5 });
          }
        },
        (err) => {
          console.error("❌ LocationMarker: Geolocation error:", err);
        },
        { enableHighAccuracy: true }
      );

      return () => {
        const id = navigator.geolocation.clearWatch(watchId);
        console.log("🧹 Cleaning up GPS watcher:", id);
      };
    }, [map, onAlert, addAlert, onNearestZone, onPositionUpdate, onAlertIncrement, ztlZones]);

    return position ? <Marker position={position} /> : null;
  }

  // Alert Banner with Tap-to-Dismiss
  function AlertBanner() {
    const { isAlert, alertMessage } = [
      alertHistory.alerts,
      alertHistory.alertCount,
      alertHistory.alertCount
    ];

    const handleDismissAlert = useCallback(() => {
      console.log("👆 Alert dismissed by user");
      // Clear alert state
      onAlert(false);
    }, [onAlert]);

    if (!isAlert) return null;

    return (
      <div
        onTouchEnd={handleDismissAlert}
        onClick={handleDismissAlert}
        className="fixed bottom-0 left-0 right-0 p-4 bg-red-700 text-white text-center z-[9998] animate-slide-up cursor-pointer active:opacity-80"
      >
        <p className="font-bold text-lg whitespace-pre-line">{alertMessage || 'No alert'}</p>
        <p className="text-sm mt-1">Tap anywhere to dismiss</p>
      </div>
    );
  }

  // Zone Details Modal
  function ZoneDetailsModal() {
    const { selectedZone } = [
      zoneInteractions.interactions,
      zoneInteractions.interactions
    ];

    const handleDismiss = useCallback(() => {
      setSelectedZone(null);
      // Track modal dismiss duration
      if (selectedZone) {
        const duration = Date.now() - zoneInteractions.getLastInteraction(selectedZone.properties.name)?.timestamp || 0;
        zoneInteractions.recordModalDismiss(selectedZone.properties.id, duration);
      }
    }, [selectedZone, zoneInteractions.getLastInteraction, zoneInteractions.recordModalDismiss]);

    if (!selectedZone) return null;

    const activeNow = isZoneActive(selectedZone.properties.name);
    const displayHours = selectedZone.properties.name === "Area C" ? "Mon-Fri 07:30-18:30" : "Check local signage";

    return (
      <div className="fixed inset-0 flex items-center justify-center z-[1500]">
        <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{selectedZone.properties.city}</h2>
            <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 text-2xl">
              ✕
            </button>
          </div>
          <div className="text-xs text-gray-500 text-center mb-4">
            ⏱️ Closes automatically in 8 seconds
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">{selectedZone.properties.name}</h3>
              {selectedZone.properties.note && (
                <p className="text-gray-600 text-sm">{selectedZone.properties.note}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-3xl font-bold text-blue-700">€{selectedZone.properties.fine}</p>
                <p className="text-sm text-gray-600">Potential fine</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <p className="text-lg font-bold text-orange-700">Check hours</p>
                <p className="text-sm text-gray-600 mt-1">
                  {displayHours}
                </p>
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-bold text-gray-900 mb-2">Exceptions?</h4>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• Residents with valid permit</li>
                <li>• Electric vehicles with charging plates</li>
                <li>• Emergency vehicles</li>
                <li>• Public transport (buses, taxis)</li>
                <li>• Disabled vehicles with valid exemption</li>
              </ul>
            </div>
          </div>
          <button onClick={handleDismiss} className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold hover:from-blue-700 hover:to-purple-700 transition">
            Get Premium Permit
          </button>
        </div>
      </div>
    );
  }

  // Sound Settings Modal
  function SoundSettingsModal() {
    const { showSoundSettings, setShowSoundSettings, alertSound, setAlertSound } = [
      showSoundSettings,
      setShowSoundSettings,
      alertSound,
      setAlertSound
    ];

    const handleDismiss = useCallback(() => {
      setShowSoundSettings(false);
    }, [showSoundSettings]);

    if (!showSoundSettings) return null;

    return (
      <div className="fixed inset-0 flex items-center justify-center z-[1999]">
        <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-gray-900">Alert Sound</h2>
            <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 text-2xl">
              ✕
            </button>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => {
                setAlertSound('siren');
                setShowSoundSettings(false);
              }}
              className={`w-full py-3 px-4 rounded-lg flex items-center justify-between ${alertSound === 'siren' ? 'bg-blue-100 border-blue-300' : 'bg-gray-100'} hover:bg-opacity-80`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{alertSound === 'siren' ? '🚨' : '🔔'}</span>
                <span className="font-semibold">{alertSound === 'siren' ? 'Siren' : 'Chime'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const audio = new Audio("/siren.mp3");
                    audio.play().catch(() => {});
                  }}
                  className="text-blue-600 hover:text-blue-700"
                  disabled={alertSound !== 'siren'}
                >
                  ▶
                </button>
              </div>
            </button>
            <button
              onClick={() => {
                setAlertSound('calm');
                setShowSoundSettings(false);
              }}
              className={`w-full py-3 px-4 rounded-lg flex items-center justify-between ${alertSound === 'calm' ? 'bg-blue-100 border-blue-300' : 'bg-gray-100'} hover:bg-opacity-80`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔔</span>
                <span className="font-semibold">Calm</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const audio = new Audio("/sounds/chime.mp3");
                    audio.play().catch(() => {});
                  }}
                  className="text-blue-600 hover:text-blue-700"
                  disabled={alertSound !== 'calm'}
                >
                  ▶
                </button>
              </div>
            </button>
            <button
              onClick={() => {
                setAlertSound('silent');
                setShowSoundSettings(false);
              }}
              className={`w-full py-3 px-4 rounded-lg flex items-center justify-between ${alertSound === 'silent' ? 'bg-blue-100 border-blue-300' : 'bg-gray-100'} hover:bg-opacity-80`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔕</span>
                <span className="font-semibold">Silent</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // Silent - no audio
                  }}
                  className="text-gray-400 cursor-not-allowed"
                  disabled={alertSound === 'silent'}
                >
                  ▶
                </button>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Diagnostic Console Component
  function DiagnosticConsole() {
    const { isAlert, alertMessage } = [
      alertHistory.alerts,
      alertHistory.alertCount,
      alertHistory.alertCount
    ];

    return (
      <div className="fixed bottom-4 left-4 p-3 bg-gray-900/95 text-white rounded-lg z-[9997] max-w-md max-h-96 overflow-y-auto">
        <h3 className="text-sm font-bold text-yellow-300 mb-2">📊 DIAGNOSTIC CONSOLE</h3>
        <div className="space-y-2 text-xs font-mono">
          <div>
            <span className="text-blue-400 font-semibold">Map:</span> {mapReady ? 'Ready' : 'Loading...'}
            {mapTilesLoading && <span className="ml-2 text-gray-400">⏳ Tiles</span>}
            {zonesLoaded && <span className="text-green-400">✓ Zones: {zonesCount}</span>}
          </div>
          <div>
            <span className="text-blue-400 font-semibold">GPS:</span> {gpsPosition ? `${gpsPosition[0].toFixed(4)}, ${gpsPosition[1].toFixed(4)}` : 'Not active'}
          </div>
          <div>
            <span className="text-purple-400 font-semibold">Nearest Zone:</span> {nearestZone?.properties.name || 'None'}
          </div>
          <div>
            <span className="text-red-400 font-semibold">Alert:</span> {isAlert ? alertMessage || 'No alert' : 'Idle'}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-700">
            <span className="text-xs text-gray-500">Recent:</span>
            <div>
              {alerts.slice(-5).reverse().map((alert, i) => (
                <div key={alert.id} className="text-xs text-gray-300 mb-1">
                  <div className="font-semibold text-gray-700">{alert.type.replace(/_/g, ' ').toUpperCase()}</div>
                  <div>
                    {alert.city} - {alert.zone}
                  </div>
                  <div className="text-xs text-gray-500">
                    {alert.distance > 0 ? `${alert.distance.toFixed(0)}m` : ''}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Export Button Component
  function ExportButton() {
    const { alerts, alertCount } = [
      alertHistory.alerts,
      alertHistory.alertCount,
      alertHistory.alertCount
    ];

    const [exporting, setExporting] = useState(false);

    const handleExport = useCallback(() => {
      setExporting(true);
      const sessionData = {
        exportDate: new Date().toISOString(),
        device: navigator.userAgent,
        appVersion: '1.0.1',
        alerts,
        alertCount,
        stats: {
          totalAlerts: alerts.length,
          alertsInZone: alerts.filter(a => a.type === 'inside_zone').length,
          totalGpsPositions: gpsHistory.positions.length,
          positionsInZone: gpsHistory.getPositionsInZone().length,
          totalInteractions: zoneInteractions.interactions.length,
        },
      };

      const dataStr = JSON.stringify(sessionData, null, 2);

      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ztl-copilot-session-${Date.now()}.json`;
      a.click();

      navigator.clipboard.writeText(dataStr);

      setTimeout(() => {
        alert(`✅ ${alerts.length} alerts, ${gpsHistory.positions.length} positions exported!`);
        setExporting(false);
      }, 1000);

      console.log("📤 Session exported:", sessionData);
    }, [alerts, gpsHistory.positions, zoneInteractions.interactions]);

    return (
      <button
        disabled={exporting}
        onClick={handleExport}
        className="fixed top-4 right-4 z-[10006] px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition"
      >
        {exporting ? (
          <>
            <svg className="animate-spin h-5 w-5 ml-1" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            </svg>
          </>
        ) : (
          <>
            <span className="text-sm">Export</span>
          </>
        )}
      </button>
    );
  }

  // Main Map Component
  export default function ZtlMap() {
    const [center, setCenter] = useState<[number, number]>([45.4642, 9.1900]);
    const [zoom, setZoom] = useState(13);

    return (
      <>
        {/* Map Container */}
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100vh', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
            maxZoom={19}
          />

          {/* ZTL Zones */}
          {ztlZones && (
            <>
              {ztlZones.features.map((f: ZoneFeature, i: number) => {
                const isNearest = nearestZone && nearestZone.properties.name === f.properties.name;

                return (
                  <Polygon
                    key={i}
                    positions={f.geometry.coordinates[0].map(([lng, lat]) => [lat, lng])}
                    eventHandlers={{
                      click: () => setSelectedZone(f),
                    }}
                    color={isNearest ? "#ff0000" : "#FF9800"}
                    fillColor={isNearest ? "rgba(255, 0, 0, 0.3)" : "rgba(255, 165, 0, 0.2)"}
                    fillOpacity={isNearest ? 0.5 : 0.2}
                    weight={2}
                    opacity={0.8}
                  />
                );
              })}

              {/* GPS Marker */}
              <LocationMarker
                onAlert={(active, message) => {
                  setIsAlert(active);
                  setAlertMessage(message);

                  if (alertCount >= 3 && !showUpgradePrompt) {
                    setShowUpgradePrompt(true);
                  }
                }}
                alertSound={alertSound}
                onNearestZone={handleNearestZone}
                onPositionUpdate={handleGpsPositionUpdate}
                onAlertIncrement={handleAlertIncrement}
                alertCount={alertCount}
                ztlZones={ztlZones}
              />

              {/* Zone Details Modal */}
              <ZoneDetailsModal />

              {/* Sound Settings Modal */}
              {showSoundSettings && <SoundSettingsModal />}

              {/* Alert Banner */}
              <AlertBanner />

              {/* Diagnostic Console */}
              <DiagnosticConsole />

              {/* Export Button */}
              <ExportButton />
            </>
          )}
        </MapContainer>

        {/* Zone Details Modal (when zone selected) */}
        {selectedZone && <ZoneDetailsModal />}

        {/* Alert Banner (when active) */}
        {isAlert && <AlertBanner />}

        {/* Sound Settings Modal (when open) */}
        {showSoundSettings && <SoundSettingsModal />}
      </>)
      </>
    );
  }

  // Zone Status Hook
  function useZtlStatus() {
    return {
      isZoneActive: (zoneName: string) => {
        const zoneHours: {
          "Area C": "Mon-Fri 07:30-18:30",
          "Como Città Murata": "Mon-Sat 08:00-18:30",
          "Varese Centro": "Mon-Sat 08:00-18:30",
          "Bergamo ZTL": "Mon-Fri 07:30-18:30",
          "Brescia ZTL": "Mon-Fri 07:30-18:30",
          "Monza C5": "Mon-Fri 07:30-18:30",
        };

        const now = new Date();
        const day = now.getDay();
        const hours = now.getHours();

        if (zoneHours[zoneName]) {
          const start = zoneHours[zoneName].split('-')[0].split(':');
          const [startHour, startMin] = start.map(Number);
          const end = zoneHours[zoneName].split('-')[1].split(':');
          const [endHour, endMin] = end.map(Number);

          const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMin);
          const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour, endMin);

          if (hours >= startHour && hours < endHour) {
            return true;
          }

          if (hours === startHour && minutes >= startMin && minutes < endMin) {
            return true;
          }

          return false;
        }

        return false;
      },
    };
  }

  // Zone Interactions Hook
  function useZoneInteractions() {
    const [interactions, setInteractions] = useState<ZoneInteraction[]>([]);
    const [modalDurations, setModalDurations] = useState<Record<string, number>>({});

    const recordZoneTap = useCallback((zone: string, gpsAccuracy?: number) => {
      const interaction: ZoneInteraction = {
        id: `${Date.now()}-${Math.random()}`,
        zone,
        zoneName: zone.properties.name,
        action: 'tap',
        timestamp: Date.now(),
        duration: 0,
        gpsAccuracy,
      };

      setInteractions(prev => [...prev, interaction]);
      console.log(`🎯 DEBUG: Zone tap recorded: "${zone}"`);
    }, []);

    const recordZoneView = useCallback((zone: string, duration: number) => {
      const interaction: ZoneInteraction = {
        id: `${Date.now()}-${Math.random()}`,
        zone,
        zoneName: zone.properties.name,
        action: 'view',
        timestamp: Date.now(),
        duration,
      };

      setInteractions(prev => [...prev, interaction]);
      setModalDurations(prev => ({ ...prev, [interaction.id]: duration }));
      console.log(`🔍 DEBUG: Zone view recorded: "${zone}" for ${duration}ms`);
    }, []);

    const recordModalDismiss = useCallback((interactionId: string, duration: number) => {
      const interaction = ZoneInteraction = {
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
    }, []);

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
    }, [getInteractionsByZone, getInteractionsByAction]);

    const getLastInteraction = useCallback((zoneName: string) => {
      const zoneInteractions = getInteractionsByZone(zoneName);
      if (zoneInteractions.length === 0) return null;
      return zoneInteractions[zoneInteractions.length - 1];
    }, [getInteractionsByZone]);

    const getAverageModalDuration = useCallback((zoneName: string) => {
      const zoneViews = getInteractionsByZone(zoneName).filter(i => i.action === 'view');
      if (zoneViews.length === 0) return 0;

      const modalDismissals = zoneViews.filter(i => i.action === 'dismiss_modal');
      const duration = modalDismissals.reduce((sum, d) => sum + (d.duration || 0), 0);

      return Math.round(duration / zoneViews.length);
    }, [getInteractionsByZone]);

    return {
      interactions,
      recordZoneTap,
      recordZoneView,
      recordModalDismiss,
      recordAlertDismiss,
      getInteractionsByZone,
      getInteractionsByAction,
      getTapCountByZone,
      getAverageModalDuration,
      modalDurations,
      getLastInteraction,
    };
  }
