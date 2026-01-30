"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polygon, Marker, useMap } from "react-leaflet";
import * as turf from "@turf/turf";
import { isZoneActive } from "@/hooks/useZtlStatus";

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

function LocationMarker({ onAlert, alertSound }: {
  onAlert: (active: boolean, message?: string) => void;
  alertSound: AlertSound;
}) {
  const map = useMap();
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [siren, setSiren] = useState<HTMLAudioElement | null>(null);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const sirenAudio = new Audio("/siren.mp3");
    sirenAudio.volume = 0.5;
    setSiren(sirenAudio);

    return () => {
      sirenAudio.pause();
      sirenAudio.remove();
    };
  }, []);

  useEffect(() => {
    if (!map) return;

    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition([latitude, longitude]);

        const pt = turf.point([longitude, latitude]);

        let nearest: ZoneFeature | null = null;
        let minDistance = Infinity;

        ztlZones.features.forEach((zone: ZoneFeature) => {
          const polygon = turf.polygon(zone.geometry.coordinates);
          const distance = turf.pointToPolygonDistance(pt, polygon);
          if (distance < minDistance && distance < 1) {
            minDistance = distance;
            nearest = zone;
          }
        });

        const distInMeters = minDistance * 1000;

        const approaching200m = minDistance < 0.2;
        const approaching100m = minDistance < 0.1;
        const insideZone = minDistance < 0.02;

        const activeViolations = ztlZones.features.filter((zone: ZoneFeature) => {
          const isInside = turf.booleanPointInPolygon(pt, turf.polygon(zone.geometry.coordinates));
          const isActiveNow = isZoneActive(zone.properties.name);
          return isInside && isActiveNow;
        });

        if (activeViolations.length > 0 && alertCount < 3) {
          const zone = activeViolations[0];
          const newCount = alertCount + 1;
          setAlertCount(newCount);

          const city = zone.properties.city;
          const name = zone.properties.name;
          const fine = zone.properties.fine;
          const remaining = 3 - newCount;

          const alertMessage = `INSIDE ZTL in ${city}\nZone: ${name}\nFine: €${fine}\n${remaining} free alerts remaining today`;
          onAlert(true, alertMessage);
          if (siren) {
            siren.currentTime = 0;
            siren.play().catch(() => {});
          }
        } else if (approaching200m && alertCount < 3 && nearest) {
          const newCount = alertCount + 1;
          setAlertCount(newCount);

          const city = nearest.properties.city;
          const name = nearest.properties.name;
          const remaining = 3 - newCount;

          const alertMessage = `ZTL in ${distInMeters.toFixed(0)}m\n${city} - ${name}\nTurn right in 150m to avoid\n${remaining} free alerts remaining today`;
          onAlert(true, alertMessage);

          if (alertSound === "siren" && siren) {
            siren.currentTime = 0;
            siren.play().catch(() => {});
          }
        } else if (approaching100m && alertCount < 3) {
          const newCount = alertCount + 1;
          setAlertCount(newCount);

          const remaining = 3 - newCount;

          const alertMessage = `ZTL ${distInMeters.toFixed(0)}m ahead\nPrepare to turn\n${remaining} free alerts remaining today`;
          onAlert(true, alertMessage);

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
        console.error("Geolocation error:", err);
      },
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, [map, onAlert, siren, alertCount, nearest]);

  return position ? <Marker position={position} /> : null;
}

export default function ZtlMap() {
  const [isAlert, setIsAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [nearestZone, setNearestZone] = useState<ZoneFeature | null>(null);
  const [distanceToZone, setDistanceToZone] = useState<number | null>(null);
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

  useEffect(() => {
    console.log("🗺️ Zones loaded:", ztlZones.features.length);
    ztlZones.features.forEach((zone, i) => {
      console.log(`🗺️ Zone ${i}: ${zone.properties.name}, coords:`, zone.geometry.coordinates);
    });
  }, []);

  const handleNearestZone = (zone: ZoneFeature | null) => {
    setNearestZone(zone);
    if (zone) {
      const pt = turf.point([45.4642, 9.1900]);
      const polygon = turf.polygon(zone.geometry.coordinates);
      const distance = turf.pointToPolygonDistance(pt, polygon);
      setDistanceToZone(distance * 1000);
    } else {
      setDistanceToZone(null);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('ztl-alert-count');
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem('ztl-alert-date');

    if (savedDate !== today) {
      localStorage.setItem('ztl-alert-date', today);
      localStorage.setItem('ztl-alert-count', '0');
      setAlertCount(0);
    } else if (saved) {
      setAlertCount(parseInt(saved, 10));
    }
  }, []);

  useEffect(() => {
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches);
  }, []);

  useEffect(() => {
    const hasDismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedDate = localStorage.getItem('pwa-install-dismissed-date');
    const today = new Date().toDateString();
    const wasDismissedRecently = hasDismissed && dismissedDate === today;

    if (!isInstalled && !wasDismissedRecently && !showInstallPrompt && !showDelayedPrompt && !showSoundSettings) {
      const timer = setTimeout(() => {
        setShowDelayedPrompt(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isInstalled, showInstallPrompt, showDelayedPrompt, showSoundSettings]);

  const handleAlert = (active: boolean, message = "") => {
    setIsAlert(active);
    setAlertMessage(message);

    if (alertCount >= 3 && !showUpgradePrompt) {
      setShowUpgradePrompt(true);
    }
  };

  const handleMapReady = () => {
    setMapReady(true);
  };

  const handleMapError = () => {
    setMapError("Failed to load map. Please refresh and check your connection.");
  };

  const handleZoneClick = (zone: ZoneFeature) => {
    setSelectedZone(zone);
  };

  const handleUpgrade = () => {
    window.location.href = '/pricing';
  };

  const dismissUpgrade = () => {
    setShowUpgradePrompt(false);
  };

  const handleInstallApp = () => {
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
  };

  const handleInstallLater = () => {
    setShowInstallPrompt(false);
  };

  const handleDontShowAgain = () => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    localStorage.setItem('pwa-install-dismissed-date', new Date().toDateString());
    setShowInstallPrompt(false);
  };

  const handleDismissPrompt = () => {
    setShowDelayedPrompt(false);
  };

  const handleDismissInstructions = () => {
    setShowInstallInstructions(false);
  };

  const handleSoundChange = (sound: AlertSound) => {
    setAlertSound(sound);
    localStorage.setItem('alert-sound-preference', sound);
  };

  return (
    <div className="h-screen w-full bg-white">
      {/* Install Instructions Modal */}
      {showInstallInstructions && (
        <div className="fixed inset-0 flex items-center justify-center z-[2000] bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900">How to Install App</h2>
              <button onClick={handleDismissInstructions} className="text-gray-400 hover:text-gray-600 text-2xl">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">On Chrome (Android & Desktop)</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>Tap <strong>⋮</strong> in address bar</li>
                  <li>Select <strong>"Add Olympic Shield 2026 to Home Screen..."</strong></li>
                  <li>Tap <strong>"Add"</strong></li>
                </ol>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">On Safari (iPhone & iPad)</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>Tap <strong>Share</strong> icon in bottom toolbar</li>
                  <li>Tap <strong>"Add to Home Screen"</strong></li>
                  <li>Tap <strong>"Add"</strong> in top right corner</li>
                </ol>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">On Firefox (Android)</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>Tap <strong>⋮</strong> in address bar</li>
                  <li>Select <strong>"Install App"</strong></li>
                </ol>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-bold text-gray-900 mb-2">Why Install?</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• Get full-screen ZTL alerts while driving</li>
                  <li>• Never miss a ZTL warning</li>
                  <li>• Works offline (cached zone data)</li>
                  <li>• Faster loading with service worker caching</li>
                </ul>
              </div>

              <button onClick={handleDismissInstructions} className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition">
                Got it, thanks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sound Settings Modal */}
      {showSoundSettings && (
        <div className="fixed inset-0 flex items-center justify-center z-[1999] bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Alert Sound</h2>
              <button onClick={() => setShowSoundSettings(false)} className="text-gray-400 hover:text-gray-600 text-2xl">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => { handleSoundChange('siren'); setShowSoundSettings(false); }}
                className={`w-full p-4 rounded-lg font-medium transition border-2 flex items-center gap-3 ${
                  alertSound === 'siren' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 hover:border-red-300 text-gray-700'
                }`}
              >
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                  🚨
                </div>
                <div className="text-left">
                  <div className="font-semibold">Siren</div>
                  <div className="text-sm text-gray-600">For critical ZTL alerts</div>
                </div>
                {alertSound === 'siren' && (
                  <span className="text-2xl ml-auto">✓</span>
                )}
              </button>

              <button
                onClick={() => { handleSoundChange('calm'); setShowSoundSettings(false); }}
                className={`w-full p-4 rounded-lg font-medium transition border-2 flex items-center gap-3 ${
                  alertSound === 'calm' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-300 text-gray-700'
                }`}
              >
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  🔔
                </div>
                <div className="text-left">
                  <div className="font-semibold">Chime</div>
                  <div className="text-sm text-gray-600">Pleasant, not scary</div>
                </div>
                {alertSound === 'calm' && (
                  <span className="text-2xl ml-auto">✓</span>
                )}
              </button>

              <button
                onClick={() => { handleSoundChange('silent'); setShowSoundSettings(false); }}
                className={`w-full p-4 rounded-lg font-medium transition border-2 flex items-center gap-3 ${
                  alertSound === 'silent' ? 'border-gray-500 bg-gray-50 text-gray-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center">
                  🔕
                </div>
                <div className="text-left">
                  <div className="font-semibold">Silent</div>
                  <div className="text-sm text-gray-600">No alert sounds</div>
                </div>
                {alertSound === 'silent' && (
                  <span className="text-2xl ml-auto">✓</span>
                )}
              </button>
            </div>

            <div className="text-sm text-gray-500 mt-4 mb-4">
              Tap any sound to test it. Preference saved automatically.
            </div>
          </div>
        </div>
      )}

      {/* PWA Install Prompt - Bottom Sheet (Mobile-First) */}
      {showInstallPrompt && (
        <div className="fixed inset-x-0 bottom-0 z-[1998] animate-slide-up">
          <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4">
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <img src="/icons/icon-192.png" alt="App" className="w-12 h-12" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Install App</h3>
                    <p className="text-sm text-gray-600">Get full-screen ZTL alerts</p>
                  </div>
                </div>
                <button onClick={handleDontShowAgain} className="text-gray-400 hover:text-gray-600 text-sm">
                  Don't show again
                </button>
              </div>

              <p className="text-sm text-gray-700 mb-4">
                Add Olympic Shield 2026 to your home screen for best experience while driving. Full-screen mode ensures you never miss a ZTL alert.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleInstallLater} className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition">
                  Maybe later
                </button>
                <button onClick={handleInstallApp} className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg transition shadow-md hover:from-blue-700 hover:to-purple-700">
                  Add to Home Screen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delayed Install Prompt */}
      {showDelayedPrompt && (
        <div className="fixed bottom-4 right-4 z-[1997] animate-slide-up">
          <div className="bg-white/95 backdrop-blur-sm border border-gray-300 rounded-lg p-4 shadow-xl">
            <div className="flex items-center gap-3 max-w-sm mx-auto">
              <img src="/icons/icon-192.png" alt="App" className="w-8 h-8" />
              <div>
                <p className="text-sm font-medium text-gray-800">Add Olympic Shield to Home Screen?</p>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <button onClick={handleDismissPrompt} className="text-gray-500 hover:text-gray-700 text-xl">
                  ✕
                </button>
                <button onClick={handleInstallApp} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-md transition hover:from-blue-700 hover:to-purple-700">
                  Install
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map Error */}
      {mapError && (
        <div className="fixed inset-0 bg-red-50 flex items-center justify-center z-[2000]">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
            <h3 className="text-lg font-bold text-red-600 mb-2">Map Error</h3>
            <p className="text-gray-600">{mapError}</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              Reload
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {!mapReady && !showInstallPrompt && !showDelayedPrompt && !showSoundSettings && !showUpgradePrompt && !selectedZone && !showInstallInstructions && (
        <div className="fixed inset-0 bg-white/90 flex items-center justify-center z-[1000]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Map */}
      <MapContainer
        center={[45.4642, 9.1900]}
        zoom={13}
        className="h-[80%] w-full"
        style={{ height: "80vh", width: "100%" }}
        whenReady={handleMapReady}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {ztlZones.features.map((f: ZoneFeature, i: number) => {
          const isNearest = nearestZone && nearestZone.properties.name === f.properties.name;
          const color = isNearest ? "red" : "orange";
          const fillColor = isNearest ? "rgba(255, 0, 0, 0.3)" : "rgba(255, 165, 0, 0.2)";
          const fillOpacity = isNearest ? 0.5 : 0.2;

          // CRITICAL FIX: Handle coordinate structure properly
          // GeoJSON Polygon: [[[lon1, lat1], [lon2, lat2], ...]]]
          // React-Leaflet Polygon: [[[lat1, lon1], [lat2, lon2], ...]]]
          let positions: [number, number][] = [];
          
          try {
            // Log for debugging
            console.log(`🔷 Rendering zone ${i}: ${f.properties.name}, isNearest: ${isNearest}`);
            
            if (f.geometry.type === "Polygon" && Array.isArray(f.geometry.coordinates)) {
              f.geometry.coordinates.forEach((ring: any) => {
                if (Array.isArray(ring)) {
                  ring.forEach((coord: any) => {
                    if (Array.isArray(coord) && coord.length === 2) {
                      // GeoJSON format: [lon, lat] → React-Leaflet: [lat, lon]
                      positions.push([coord[1], coord[0]]);
                    }
                  });
                }
              });
            }
          } catch (err) {
            console.error("🔷 Error parsing coordinates for zone:", f.properties.name, err);
          }

          return (
            <Polygon
              key={i}
              positions={positions}
              eventHandlers={{ click: () => handleZoneClick(f) }}
              color={color}
              fillColor={fillColor}
              fillOpacity={fillOpacity}
            />
          );
        })}
      </MapContainer>

      {/* Alert Banner */}
      {isAlert && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-red-700 text-white text-center z-[1000] animate-slide-up">
          <p className="font-bold text-lg whitespace-pre-line">{alertMessage}</p>
          <p className="text-sm mt-1">Tap to dismiss</p>
        </div>
      )}

      {/* Distance Indicator */}
      {nearestZone && distanceToZone !== null && distanceToZone < 1000 && !isAlert && !showUpgradePrompt && !showInstallPrompt && !showDelayedPrompt && !showSoundSettings && !showInstallInstructions && !selectedZone && (
        <div className="fixed top-20 left-4 right-4 bg-blue-600 text-white p-3 rounded-lg shadow-lg z-[1000] max-w-xs animate-slide-up">
          <p className="font-bold text-sm">{nearestZone.properties.city}</p>
          <p className="text-xs">{nearestZone.properties.name}</p>
          <p className="font-semibold text-sm">
            {distanceToZone < 500 ? `${Math.round(distanceToZone)}m away` : `${Math.round(distanceToZone)}m warning`}
          </p>
        </div>
      )}

      {/* Zone Details Modal */}
      {selectedZone && (
        <div className="fixed inset-0 flex items-center justify-center z-[1500]">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900">{selectedZone.properties.city}</h2>
              <button onClick={() => setSelectedZone(null)} className="text-gray-400 hover:text-gray-600 text-2xl">
                ✕
              </button>
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
                    {selectedZone.properties.name === "Area C" ? "Mon-Fri 07:30-18:30" : "Check local signage"}
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

              <button onClick={handleUpgrade} className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold hover:from-blue-700 hover:to-purple-700 transition">
                Get Premium Permit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Prompt */}
      {showUpgradePrompt && !selectedZone && (
        <div className="fixed inset-0 flex items-center justify-center z-[2000] bg-black/80 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md">
            <div className="text-center">
              <div className="text-6xl mb-4">Free limit reached</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">You've used {3 - alertCount} free alerts today</h3>
              <p className="text-gray-700 text-lg mb-4">
                Upgrade to Premium for unlimited alerts.
              </p>
              <div className="space-x-4 mt-6">
                <button onClick={dismissUpgrade} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">
                  Maybe later
                </button>
                <button onClick={handleUpgrade} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold hover:from-blue-700 hover:to-purple-700 transition">
                  Upgrade to Premium
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-[1000]">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center">
            <button onClick={() => setShowSoundSettings(!showSoundSettings)} className="flex items-center gap-2 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
              <span className="text-2xl">
                {alertSound === 'siren' ? '🚨' : alertSound === 'calm' ? '🔔' : '🔕'}
              </span>
            </button>
            <div>
              <h2 className="font-bold text-sm text-gray-900">Olympic Shield 2026</h2>
              <p className="text-xs text-gray-600 hidden sm:block">
                {3 - alertCount} free alerts today
              </p>
            </div>
          </div>

          <button onClick={handleUpgrade} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold text-sm hover:from-blue-700 hover:to-purple-700 transition shadow-md">
            Upgrade to Premium
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
