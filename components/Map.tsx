"use client"

import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Polygon, Marker, useMap, ZoomControl } from "react-leaflet";
import * as turf from "@turf/turf";
import { isZoneActive } from "@/hooks/useZtlStatus";
import DebugPanel from "@/components/DebugPanel";
import { ToastContainer, toast } from 'react-toastify';
// import Toast from "@/components/Toast";
// import {useToast} from "@/hooks/useToast";


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

function LocationMarker({ onAlert, alertSound, onNearestZone, onPositionUpdate, onAlertIncrement, alertCount, ztlZones }: {
  onAlert: (active: boolean, message?: string) => void;
  alertSound: AlertSound;
  onNearestZone: (zone: ZoneFeature | null) => void;
  onPositionUpdate: (position: [number, number] | null) => void;
  onAlertIncrement: () => void;
  alertCount: number;
  ztlZones: any;
}) {
  const map = useMap();
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [siren, setSiren] = useState<HTMLAudioElement | null>(null);
  const alertCountRef = useRef(alertCount);
  const watcherIdRef = useRef<number | null>(null);

  // Fix bubbling: track last alert to prevent duplicates
  const lastAlertTypeRef = useRef<string | null>(null);
  const lastAlertTimeRef = useRef<number>(0);
  const lastNearestZoneRef = useRef<string | null>(null);
  const isFreePlan = (localStorage.getItem('payment_session') == null);
  const alertFreePlan = isFreePlan ? 3 : 10000000;

  useEffect(() => {
    const sirenAudio = new Audio("/siren.mp3");
    sirenAudio.volume = 0.5;
    setSiren(sirenAudio);

    return () => {
      sirenAudio.pause();
      sirenAudio.remove();
    };
  }, []);

  // Sync ref with alertCount prop without triggering re-renders
  useEffect(() => {
    alertCountRef.current = alertCount;
  }, [alertCount]);

  useEffect(() => {
    if (!map || !ztlZones) return;

    // Clear any existing watcher before starting a new one
    if (watcherIdRef.current !== null) {
      console.log("🧹 Clearing existing GPS watcher:", watcherIdRef.current);
      navigator.geolocation.clearWatch(watcherIdRef.current);
      watcherIdRef.current = null;
    }

    console.log("✅ LocationMarker: Starting GPS watcher");

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        // Store watcher ID
        if (typeof watchId === 'number') {
          watcherIdRef.current = watchId;
        }
        setPosition([latitude, longitude]);
        onPositionUpdate([latitude, longitude]);

        const pt = turf.point([longitude, latitude]);

        let nearest: any = null;
        let minDistance = Infinity;

        for (const zone of ztlZones.features) {
          try {
            const polygon = turf.polygon(zone.geometry.coordinates);
            const distance = turf.pointToPolygonDistance(pt, polygon);
            if (distance < minDistance && distance < 1) {
              minDistance = distance;
              nearest = zone;
            }

          } catch {

          }

        }

        // Only call onNearestZone if zone changed AND not in active alert
        if (nearest && nearest.properties) {
          const zoneName = nearest.properties.name;
          console.log("✅ LocationMarker: Nearest zone found:", zoneName);

          // Update nearest zone reference
          if (lastNearestZoneRef.current !== zoneName) {
            lastNearestZoneRef.current = zoneName;
            // Only show nearest zone toast if NOT in alert state
            // We'll handle this in the main logic below
          }
        } else {
          lastNearestZoneRef.current = null;
        }

        const distInMeters = minDistance * 1000;

        const approaching200m = minDistance < 0.2;
        const approaching100m = minDistance < 0.1;
        const approaching50m = minDistance < 0.05;
        const insideZone = minDistance < 0.02;

        const activeViolations = ztlZones.features.filter((zone: any) => {
          try {
            const isInside = turf.booleanPointInPolygon(pt, turf.polygon(zone.geometry.coordinates));
            //const isActiveNow =   isZoneActive(zone.properties.name);
            // return isInside && isActiveNow;
            return isInside;

          } catch {

            return false;
          }

        });

        // Debounce: prevent alerts more frequent than 3 seconds
        const now = Date.now();
        const timeSinceLastAlert = now - lastAlertTimeRef.current;
        const shouldDebounce = timeSinceLastAlert < 3000; // 3 seconds minimum between alerts

        if (activeViolations.length > 0) {
          const zone = activeViolations[0];
          const alertType = 'inside';

          // Only alert if this is a new alert type OR enough time passed
          if (lastAlertTypeRef.current !== alertType || !shouldDebounce) {
            lastAlertTypeRef.current = alertType;
            lastAlertTimeRef.current = now;

            onAlertIncrement();
            const newCount = alertCountRef.current + 1;

            const city = zone.properties.city;
            const name = zone.properties.name;
            const fine = zone.properties.fine;
            const remaining = alertFreePlan - newCount;

            if (remaining > 0) {

              const alertMessage = isFreePlan ? `INSIDE ZTL in ${city}\nZone: ${name}\nFine: €${fine}\n${remaining} free alerts remaining today` : `INSIDE ZTL in ${city}\nZone: ${name}\nFine: €${fine}\n`;

              onAlert(true, alertMessage);

              if (siren) {
                siren.currentTime = 0;
                siren.play().catch(() => { });
              }
            }


          }
        } else if (approaching200m && alertCountRef.current < alertFreePlan && nearest) {
          const alertType = 'approaching200m';

          if (lastAlertTypeRef.current !== alertType || !shouldDebounce) {
            lastAlertTypeRef.current = alertType;
            lastAlertTimeRef.current = now;

            onAlertIncrement();
            const newCount = alertCountRef.current + 1;

            const nearestZone = nearest as any;
            const nearestCity = nearestZone.properties.city;
            const nearestName = nearestZone.properties.name;
            const distStr = distInMeters.toFixed(0);
            const remaining = alertFreePlan - newCount;

            if (remaining > 0) {

              const alertMessage = isFreePlan ? `ZTL in ${distStr}m\n${nearestCity} - ${nearestName}\nTurn right in 150m to avoid\n${remaining} free alerts remaining today`
                : `ZTL in ${distStr}m\n${nearestCity} - ${nearestName}\nTurn right in 150m to avoid`;

              onAlert(true, alertMessage);

              // Show nearest zone toast ONLY here, not separately
              onNearestZone(nearest);

              if (alertSound === "siren" && siren) {
                siren.currentTime = 0;
                siren.play().catch(() => { });
              }

            }


          }
        } else if (approaching100m && alertCountRef.current < alertFreePlan) {
          const alertType = 'approaching100m';

          if (lastAlertTypeRef.current !== alertType || !shouldDebounce) {
            lastAlertTypeRef.current = alertType;
            lastAlertTimeRef.current = now;

            onAlertIncrement();
            const newCount = alertCountRef.current + 1;

            const distStr = distInMeters.toFixed(0);
            const remaining = alertFreePlan - newCount;

            if (remaining > 0) {
              const alertMessage = isFreePlan ? `ZTL ${distStr}m ahead\nPrepare to turn\n${remaining} free alerts remaining today`
                : `ZTL ${distStr}m ahead\nPrepare to turn`;

              onAlert(true, alertMessage);

              if (siren) {
                siren.currentTime = 0;
                siren.play().catch(() => { });
              }

            }


          }
        } else if (approaching50m && alertCountRef.current < alertFreePlan && nearest) {
          const alertType = 'approaching50m';

          if (lastAlertTypeRef.current !== alertType || !shouldDebounce) {
            lastAlertTypeRef.current = alertType;
            lastAlertTimeRef.current = now;

            onAlertIncrement();
            const newCount = alertCountRef.current + 1;

            const distStr = distInMeters.toFixed(0);
            const remaining = alertFreePlan - newCount;

            if (remaining > 0) {
              const alertMessage = isFreePlan ? `ZTL ${distStr}m ahead\nTURN NOW\n${remaining} free alerts remaining today`
                : `ZTL ${distStr}m ahead\nTURN NOW`;

              onAlert(true, alertMessage);

              if (siren) {
                siren.currentTime = 0;
                siren.play().catch(() => { });
              }

            }


          }
        } else {
          // Clear alert state when not in any alert zone
          if (lastAlertTypeRef.current !== null) {
            lastAlertTypeRef.current = null;
            onAlert(false);
          }

          // Show nearest zone toast ONLY when not in alert and zone changed
          if (nearest && nearest.properties &&
            lastNearestZoneRef.current === nearest.properties.name &&
            timeSinceLastAlert > 5000) { // Show nearest zone max once per 5 seconds
            const newCount = alertCountRef.current + 1;
            const remaining = alertFreePlan - newCount;
            if (remaining > 0) {
              onNearestZone(nearest);
              lastAlertTimeRef.current = now;
            }

          }
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
      const id = watcherIdRef.current;
      if (id !== null) {
        console.log("🧹 Cleaning up GPS watcher:", id);
        navigator.geolocation.clearWatch(id);
        watcherIdRef.current = null;
      }
    };
  }, [map, onAlert, siren, onNearestZone, onPositionUpdate, onAlertIncrement, ztlZones]);

  return position ? <Marker position={position} /> : null;
}

export default function ZtlMap() {
  const [isAlert, setIsAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [zonesLoaded, setZonesLoaded] = useState(false);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [zonesCount, setZonesCount] = useState(0);
  const [zonesError, setZonesError] = useState<string | null>(null);
  const [mapTilesLoading, setMapTilesLoading] = useState(true);
  const [polygonsRendering, setPolygonsRendering] = useState(false);
  const [ztlZones, setZtlZones] = useState<any>(null);
  const [nearestZone, setNearestZone] = useState<ZoneFeature | null>(null);
  const [gpsPosition, setGpsPosition] = useState<[number, number] | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneFeature | null>(null);
  const [alertCount, setAlertCount] = useState(0);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [debugPanelExpanded, setDebugPanelExpanded] = useState(false);
  const [isAFreePlan,setIsAFreePlan]=useState(true);
  // const { toasts,  dismissToast,  showAlert,  showZone,  showWarning } = useToast();
  const lastToastRef = useRef<{ message: string, time: number }>({ message: '', time: 0 });

  const isFreePlan = (localStorage.getItem('payment_session') == null);
  const mainAlertFreePlan = isFreePlan ? 3 : 10000000;
   
  

  // Auto-dismiss zone info modal after 8 seconds
  useEffect(() => {
    if (selectedZone) {
      const timer = setTimeout(() => {
        console.log("⏱️ Auto-dismissing zone info modal after 8 seconds");
        setSelectedZone(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [selectedZone]);

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

  const [center, setCenter] = useState<[number, number]>([45.479853, 9.169119]);
  const [zoom, setZoom] = useState(13);

  const handleNearestZone = useCallback((zone: ZoneFeature | null) => {
    console.log("✅ ZtlMap: Nearest zone updated:", zone?.properties.name || "null");
    setNearestZone(zone);
    if (zone) {
      setDebugPanelExpanded(true);
      // show toast nearest zone
      const city = zone.properties.city;
      const name = zone.properties.name;
      const fine = zone.properties.fine;

      // showZone(
      //   `📍 Nearest Zone: ${name}`,
      //   `City: ${city}\nPotential Fine: €${fine}\nStay alert!`,
      //   5000
      // );

      // showWarning(  `📍 Nearest Zone: ${name}`,
      //   `City: ${city}\nPotential Fine: €${fine}\nStay alert!`,
      //   5000)

      toast.clearWaitingQueue();

      toast(`City: ${city}\nPotential Fine: €${fine}\nStay alert!`, {
        position: "top-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
        type: "warning"
      });
    }
  }, [/*showZone*/]);

  const handlePositionUpdate = useCallback((position: [number, number] | null) => {
    setGpsPosition(position);
  }, []);

  const handleAlertIncrement = useCallback(() => {
    const newCount = alertCount + 1;
    setAlertCount(newCount);
    localStorage.setItem('ztl-alert-count', newCount.toString());
  }, [alertCount]);

  useEffect(() => {
    console.log("🚨 ZtlMap component mounted");
    console.log("🚨 Starting zones data load...");

    setZonesLoading(true);
    setZonesLoaded(false);
    setMapTilesLoading(true);
 

    fetch('/ztl-zones.json')
      .then(res => {
        console.log("✅ Zones file loaded from network:", res.status);
        console.log("✅ Zones file size:", res.headers.get('content-length') || 'unknown');
        return res.json();
      })
      .then(data => {
        console.log("✅ Zones data parsed successfully");
        console.log("✅ Zones data type:", data.type);
        console.log("✅ Features count:", data.features?.length || 0);
        console.log("✅ First zone sample:", data.features?.[0]);

        setZtlZones(data);
        setZonesCount(data.features?.length || 0);
        setZonesLoaded(true);
        setZonesError(null);
        setZonesLoading(false);
        setPolygonsRendering(true);
        
      })
      .catch(err => {
        console.error("❌ Zones load error:", err);
        console.error("❌ Error name:", err.name);
        console.error("❌ Error message:", err.message);
        console.error("❌ Error stack:", err.stack);

        const errorMsg = `Failed to load zones: ${err.message}\nError: ${err.name}`;

        setZonesError(errorMsg);
        setZonesLoaded(false);
        setZonesLoading(false);
      });
  }, []);

  useEffect(() => {
    console.log("🎯 Setting map ready after 2 seconds");

    const timer = setTimeout(() => {
      setMapReady(true);
      setMapTilesLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

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

  const handleAlert = useCallback((active: boolean, message = "") => {
    setIsAlert(active);
    setAlertMessage(message);

    if (alertCount >= mainAlertFreePlan && !showUpgradePrompt) {
      setShowUpgradePrompt(true);
    }

    if (message && active) {
      setAlertMessage(message);

      // ✅ FIX BUBBLING: Debounce toast - prevent same message within 3 seconds
      const now = Date.now();
      const timeSinceLastToast = now - lastToastRef.current.time;
      const isSameMessage = lastToastRef.current.message === message;

      // Only show toast if:
      // 1. Different message, OR
      // 2. Same message but more than 3 seconds passed
      if (!isSameMessage || timeSinceLastToast > 3000) {
        lastToastRef.current = { message, time: now };

        // ADD THIS: open debug panel on alert
        setDebugPanelExpanded(true);

        // show toast with alert info 
        const lines = message.split('\n');
        const title = lines[0]; // Prima riga come titolo
        const body = lines.slice(1).join('\n'); // Resto come corpo

        toast.clearWaitingQueue();

        toast(body, {
          position: "top-center",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "dark",
          type: "error"
        });
      }
    }

  }, [alertCount, showUpgradePrompt /*,showAlert, showWarning*/]);

  const handleDismissAlert = useCallback(() => {
    console.log("👆 Alert dismissed by user");
    setIsAlert(false);
  }, []);

  const handleMapReady = () => {
    console.log("✅ Map ready!");
  };

  const handleMapError = () => {
    setMapError("Failed to load map. Please refresh and check your connection.");
  };

  // const handleZoneClick = (zone: ZoneFeature) => {
  //   setSelectedZone(zone);
  // };

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

  const handleDismissZonesError = () => {
    setZonesError(null);
  };

  const handleUseTestData = () => {
    console.log("🧪 Using test data instead of zones file");

    const testZones = {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: {
          city: "Milano",
          name: "TEST ZONE",
          fine: 85
        },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [9.18, 45.47],
            [9.19, 45.47],
            [9.19, 45.46],
            [9.18, 45.46],
            [9.18, 45.47]
          ]]
        }
      }]
    };

    setZtlZones(testZones);
    setZonesCount(testZones.features.length);
    setZonesLoaded(true);
    setZonesError(null);
    setZonesLoading(false);
    setPolygonsRendering(true);
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 1, 18);
    setZoom(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 1, 10);
    setZoom(newZoom);
  };

  const handleZoneClick = (zone: ZoneFeature) => {
    setSelectedZone(zone);

    // Icona dinamica basata sul valore della multa
    const getIcon = (fine: number) => {
      if (fine >= 100) return '🚨';
      if (fine >= 80) return '⚠️';
      return '📍';
    };

    // Colore dinamico
    const getColor = (fine: number) => {
      if (fine >= 100) return 'red';
      if (fine >= 80) return 'orange';
      return 'blue';
    };

    const icon = getIcon(zone.properties.fine);
    const color = getColor(zone.properties.fine);

    toast(
      <div className="p-2">
        <div className="flex gap-3">
          <div className="flex-shrink-0 text-4xl">
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">
              {zone.properties.city}
            </h3>
            <p className={`text-${color}-300 font-semibold mb-2`}>
              {zone.properties.name}
            </p>

            <div className={`bg-${color}-900/40 border-2 border-${color}-500/70 rounded px-3 py-2`}>
              <p className={`text-${color}-300 font-bold text-center`}>
                Fine: €{zone.properties.fine}
              </p>
            </div>

            {zone.properties.note && (
              <p className="text-xs text-gray-400 mt-2 italic">
                💡 {zone.properties.note}
              </p>
            )}
          </div>
        </div>
      </div>,
      {
        position: "top-center",
        autoClose: 5000,
        theme: "dark",
        type: color === 'red' ? 'error' : color === 'orange' ? 'warning' : 'info'
      }
    );
  };

  const handleInstallToast = () => {

    toast.clearWaitingQueue();

    toast.success(<div className='fixed inset-0 flex items-center justify-center z-[2000] bg-black/50 backdrop-blur-sm'>
      <div className='bg-white p-6 rounded-2xl shadow-2xl max-w-md'>
        <div className='space-y-4'>
          <div>
            <h3 className='text-lg font-bold text-gray-900 mb-2'>On Chrome (Android & Desktop)</h3>
            <ol className='list-decimal list-inside space-y-2 text-gray-700'>
              <li>Tap <strong>⋮</strong> in address bar</li>
              <li>Select <strong>'Add Olympic Shield 2026 to Home Screen...'</strong></li>
              <li>Tap <strong>'Add'</strong></li>
            </ol>
          </div>
          <div>
            <h3 className='text-lg font-bold text-gray-900 mb-2'>On Safari (iPhone & iPad)</h3>
            <ol className='list-decimal list-inside space-y-2 text-gray-700'>
              <li>Tap <strong>Share</strong> icon in bottom toolbar</li>
              <li>Tap <strong>'Add to Home Screen'</strong></li>
              <li>Tap <strong>'Add'</strong> in top right corner</li>
            </ol>
          </div>
          <div>
            <h3 className='text-lg font-bold text-gray-900 mb-2'>On Firefox (Android)</h3>
            <ol className='list-decimal list-inside space-y-2 text-gray-700'>
              <li>Tap <strong>⋮</strong> in address bar</li>
              <li>Select <strong>'Install App'</strong></li>
            </ol>
          </div>
          <div className='bg-gray-50 p-4 rounded-lg'>
            <h4 className='font-bold text-gray-900 mb-2'>Why Install?</h4>
            <ul className='space-y-1 text-sm text-gray-700'>
              <li>• Get full-screen ZTL alerts while driving</li>
              <li>• Never miss a ZTL warning</li>
              <li>• Works offline (cached zone data)</li>
              <li>• Faster loading with service worker caching</li>
            </ul>
          </div>
        </div>
      </div>
    </div>,
      {
        position: "bottom-center",
        autoClose: 10000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",


      });

  }

  const handleCenterMap = () => {
    setCenter([45.4642, 9.1900]);
    setZoom(13);
  };

  const handleSoundChange = (sound: AlertSound) => {
    setAlertSound(sound);
    localStorage.setItem('alert-sound-preference', sound);
  };

  return (
    <div className="h-screen w-full bg-white">

      {isFreePlan && (
        <div className="fixed top-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-[1000]" style={{ marginTop: '1em', marginBottom: '1em' }}>
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <button onClick={handleUpgrade} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold text-sm hover:from-blue-700 hover:to-purple-700 transition shadow-md">
              Upgrade to Premium
            </button>
          </div>


        </div>
      )}

       <div className="fixed top-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-[1000]" style={{ marginTop: '1em', marginBottom: '1em' }}>
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <button onClick={handleInstallToast} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold text-sm hover:from-blue-700 hover:to-purple-700 transition shadow-md">
              Installing instructions
            </button>
          </div>
       </div>

      {/* EXPANDED DIAGNOSTIC CONSOLE */}
      {/* <div className="fixed bottom-4 left-4 p-3 bg-black/95 text-white rounded-lg z-[4000] text-xs font-mono max-w-sm overflow-y-auto max-h-48">
        <div className="font-bold text-yellow-300 mb-2">📊 DIAGNOSTIC CONSOLE</div>
        {mapTilesLoading && <div className="text-yellow-200">⏳ Map tiles loading...</div>}
        {mapReady && !mapTilesLoading && <div className="text-green-400">✅ Map tiles loaded</div>}
        <div className="h-px bg-gray-700 my-2"></div>
        {zonesLoading && <div className="text-yellow-200">⏳ Zones data loading...</div>}
        {zonesLoaded && <div className="text-green-400">✅ Zones data loaded: {zonesCount} zones</div>}
        {zonesError && <div className="text-red-400">❌ Zones error: {zonesError}</div>}
        {!ztlZones && !zonesLoading && <div className="text-gray-400">⚠️ Zones data is null</div>}
        <div className="h-px bg-gray-700 my-2"></div>
        {polygonsRendering && <div className="text-blue-400">⏳ Polygons rendering...</div>}
        <div className="h-px bg-gray-700 my-2"></div>
        {nearestZone && <div className="text-green-400">✅ Nearest zone: {nearestZone.properties.name}</div>}
        <div className="h-px bg-gray-700 my-2"></div>
        {gpsPosition && <div className="text-cyan-400">✅ GPS active: {gpsPosition[0].toFixed(4)}, {gpsPosition[1].toFixed(4)}</div>}
        {!gpsPosition && <div className="text-gray-400">⚠️ GPS not active</div>}
      </div> */}

      {/* ZONES ERROR ALERT WITH ACTIONS */}
      {/* {zonesError && (
        <div className="fixed top-24 left-4 right-4 z-[3000]">
          <div className="bg-red-50 border-2 border-red-300 p-4 rounded-lg shadow-xl max-w-md">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-xl font-bold text-red-600 flex items-center gap-2">
                <span>⚠️ Zones Load Error</span>
              </h3>
              <button onClick={handleDismissZonesError} className="text-gray-400 hover:text-gray-600 text-xl">
                ✕
              </button>
            </div>

            <p className="text-gray-800 mb-3">{zonesError}</p>

            <div className="bg-white p-3 rounded-lg mb-3">
              <p className="text-sm font-semibold text-gray-900 mb-2">Possible Fixes:</p>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• Zone file not in public directory</li>
                <li>• Zone file path: <code className="bg-gray-100 px-1 py-0.5 rounded">/ztl-zones.json</code></li>
                <li>• CORS issue with fetch</li>
                <li>• File not deployed to Vercel</li>
              </ul>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => window.location.reload()} className="py-2 px-3 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
                Reload Page
              </button>
              <button onClick={handleUseTestData} className="py-2 px-3 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                Use Test Data
              </button>
              <button onClick={handleDismissZonesError} className="py-2 px-3 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )} */}

      {/* INSTALL INSTRUCTIONS MODAL */}
      {/* {showInstallInstructions && (
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
      )}  */}

      {/* SOUND SETTINGS MODAL */}
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
                className={`w-full p-4 rounded-lg font-medium transition border-2 flex items-center gap-3 ${alertSound === 'siren' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 hover:border-red-300 text-gray-700'
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

              {/* <button
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
              </button> */}

              <button
                onClick={() => { handleSoundChange('silent'); setShowSoundSettings(false); }}
                className={`w-full p-4 rounded-lg font-medium transition border-2 flex items-center gap-3 ${alertSound === 'silent' ? 'border-gray-500 bg-gray-50 text-gray-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'
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
              Tap any sound to set it. Preference saved automatically.
            </div>
          </div>
        </div>
      )}

      {/* PWA INSTALL PROMPT - BOTTOM SHEET */}
      {/* {showInstallPrompt && (
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
      )} */}

      {/* DELAYED INSTALL PROMPT */}
      {/* {showDelayedPrompt && (
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
      )} */}

      {/* MAP ERROR */}
      {mapError && (
        <div className="fixed inset-0 bg-red-50 flex items-center justify-center z-[1996]">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
            <h3 className="text-lg font-bold text-red-600 mb-2">Map Error</h3>
            <p className="text-gray-600">{mapError}</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              Reload
            </button>
          </div>
        </div>
      )}

      {/* LOADING STATE */}
      {(!mapReady || !zonesLoaded || mapTilesLoading || zonesLoading || !ztlZones) && !mapError && !zonesError && !showInstallPrompt && !showDelayedPrompt && !showSoundSettings && !showUpgradePrompt && !selectedZone && !showInstallInstructions && (
        <div className="fixed inset-0 bg-white/90 flex items-center justify-center z-[1995]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-800 font-medium">Loading map and zones...</p>
            <div className="mt-2 text-xs text-gray-500 space-y-1">
              {mapTilesLoading && <div>⏳ Map tiles</div>}
              {zonesLoading && <div>⏳ Zones data</div>}
              {zonesLoaded && !polygonsRendering && <div>✓ Zones loaded</div>}
              {polygonsRendering && <div>✓ Rendering zones</div>}
            </div>
          </div>
        </div>
      )}
      {/* TOAST NOTIFICATIONS */}
      {/* <Toast toasts={toasts} onDismiss={dismissToast} />  */}
      <ToastContainer limit={1} />

      {/* MAP */}
      {mapReady && ztlZones && (
        <MapContainer
          center={center}
          zoom={zoom}
          className="h-[70%] w-full"
          style={{ height: "70vh", width: "100%", borderRadius: "25px" }}
          whenReady={handleMapReady}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {/* <ZoomControl position="topleft" /> */}

          <LocationMarker
            onAlert={handleAlert}
            alertSound={alertSound}
            onNearestZone={handleNearestZone}
            onPositionUpdate={handlePositionUpdate}
            onAlertIncrement={handleAlertIncrement}
            alertCount={alertCount}
            ztlZones={ztlZones}
          
          />
          {ztlZones.features.map((f: ZoneFeature, i: number) => {
            
            //const isNearest = nearestZone  && nearestZone.properties.name === f.properties.name;
            const color = isAFreePlan ? "red" : "orange";
            const fillColor = isAFreePlan ? "rgba(255, 0, 0, 0.3)" : "rgba(255, 165, 0, 0.2)";
            const fillOpacity = isAFreePlan ? 0.5 : 0.2;

            // GeoJSON uses [lng, lat] but React-leaflet expects [lat, lng]
            // Also need to unwrap the nested array structure
            const positions = f.geometry.coordinates[0].map(([lng, lat]: [number, number]) => [lat, lng]);

            return (
              <Polygon
                key={i}
                positions={positions}
                eventHandlers={{ click: () => handleZoneClick(f) }}
                color={color}
                fillColor={fillColor}
                fillOpacity={fillOpacity}
                weight={2}
                opacity={0.8}
              />
            );
          })}
        </MapContainer>
      )}

      {/* DEBUG PANEL */}
      {/* <DebugPanel /> */}
      {/* <DebugPanel 
      expanded={debugPanelExpanded} 
      onExpandChange={setDebugPanelExpanded} 
    /> */}

      {/* TOAST NOTIFICATIONS */}
      {/* <Toast toasts={toasts} onDismiss={dismissToast} /> */}

      {/* ALERT BANNER */}
      {/* {isAlert && (
        <div
          onTouchEnd={handleDismissAlert}
          onClick={handleDismissAlert}
          className="fixed bottom-0 left-0 right-0 p-4 bg-red-700 text-white text-center z-[1994] animate-slide-up cursor-pointer active:opacity-80"
        >
          <p className="font-bold text-lg whitespace-pre-line">{alertMessage}</p>
          <p className="text-sm mt-1">Tap anywhere to dismiss</p>
        </div>
      )} */}

      {/* ZONE DETAILS MODAL
      {selectedZone && (
        <div className="fixed inset-0 flex items-center justify-center z-[1500]">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900">{selectedZone.properties.city}</h2>
              <button onClick={() => setSelectedZone(null)} className="text-gray-400 hover:text-gray-600 text-2xl">
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
      )} */}



      {/* UPGRADE PROMPT */}
      {showUpgradePrompt && isFreePlan && !selectedZone && (
        <div className="fixed inset-0 flex items-center justify-center z-[1999]">
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

      {/* HEADER WITH STATUS BADGES */}
      <div className="fixed top-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-[1000]" style={{ marginTop: '1em' }}>
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSoundSettings(!showSoundSettings)} className="flex items-center gap-2 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
              <span className="text-2xl">
                {alertSound === 'siren' ? '🚨' : alertSound === 'calm' ? '🔔' : '🔕'}
              </span>
            </button>
            <div>
              <h2 className="font-bold text-sm text-gray-900">Olympic Shield 2026 {isFreePlan ? " - Free plan with 3 alerts!" : " - Premium plan, ulimited alerts!"}</h2>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${mapReady ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {mapReady ? '✓ Map Ready' : '⏳ Loading'}
                </span>
                {/* <span className={`px-2 py-1 rounded text-xs font-semibold ${zonesLoaded ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {zonesLoaded ? `✓ ${zonesCount} Zones` : '✗ 0 Zones'}
                </span> */}
              </div>
              {/* <div>
                 <span className={`px-2 py-1 rounded text-xs font-semibold  bg-green-100 text-black-700' `}>
                  {premiumPlan}
                </span>
                
              </div> */}
            </div>
          </div>
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
      @keyframes progress {
        from {
          width: 100%;
        }
        to {
          width: 0%;
        }
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      .animate-slide-up {
        animation: slideUp 0.3s ease-out;
      }

      .animate-fade-in {
        animation: fadeIn 0.2s ease-out;
      }
    `}</style>
    </div>
  );
}
