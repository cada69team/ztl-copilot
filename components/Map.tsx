"use client"

import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Polygon, Marker, useMap, ZoomControl } from "react-leaflet";
import { GoogleMap, useJsApiLoader, Polygon as GooglePolygon } from '@react-google-maps/api';
import * as turf from "@turf/turf";
import { isZoneActive } from "@/hooks/useZtlStatus";
import DebugPanel from "@/components/DebugPanel";
import { ToastContainer, toast } from 'react-toastify';

// Configurazione Google Maps
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

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

// Componente per OpenStreetMap (Piano Free)
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

  useEffect(() => {
    alertCountRef.current = alertCount;
  }, [alertCount]);

  useEffect(() => {
    if (!map || !ztlZones) return;

    if (watcherIdRef.current !== null) {
      console.log("🧹 Clearing existing GPS watcher:", watcherIdRef.current);
      navigator.geolocation.clearWatch(watcherIdRef.current);
      watcherIdRef.current = null;
    }

    console.log("✅ LocationMarker: Starting GPS watcher");

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
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
          } catch { }
        }

        if (nearest && nearest.properties) {
          const zoneName = nearest.properties.name;
          console.log("✅ LocationMarker: Nearest zone found:", zoneName);

          if (lastNearestZoneRef.current !== zoneName) {
            lastNearestZoneRef.current = zoneName;
          }
        } else {
          lastNearestZoneRef.current = null;
        }

        const distInMeters = minDistance * 1000;
        const approaching200m = minDistance < 0.2;
        const approaching100m = minDistance < 0.1;
        const insideZone = minDistance < 0.02;

        const activeViolations = ztlZones.features.filter((zone: any) => {
          try {
            const isInside = turf.booleanPointInPolygon(pt, turf.polygon(zone.geometry.coordinates));
            return isInside;
          } catch {
            return false;
          }
        });

        const now = Date.now();
        const timeSinceLastAlert = now - lastAlertTimeRef.current;
        const shouldDebounce = timeSinceLastAlert < 3000;

        if (activeViolations.length > 0) {
          const zone = activeViolations[0];
          const alertType = 'inside';

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
              onNearestZone(nearest);

              if (alertSound === "siren" && siren) {
                siren.currentTime = 0;
                siren.play().catch(() => { });
              }
            }
          }
        } else if (approaching100m && alertCountRef.current < alertFreePlan && nearest) {
          const alertType = 'approaching100m';

          if (lastAlertTypeRef.current !== alertType || !shouldDebounce) {
            lastAlertTypeRef.current = alertType;
            lastAlertTimeRef.current = now;

            const nearestZone = nearest as any;
            const nearestCity = nearestZone.properties.city;
            const nearestName = nearestZone.properties.name;
            const distStr = distInMeters.toFixed(0);

            const alertMessage = `ZTL very close (${distStr}m)\n${nearestCity} - ${nearestName}\nTurn right NOW to avoid`;
            onAlert(true, alertMessage);
            onNearestZone(nearest);

            if (alertSound === "siren" && siren) {
              siren.currentTime = 0;
              siren.play().catch(() => { });
            }
          }
        } else {
          lastAlertTypeRef.current = null;
          onAlert(false);
          if (siren) {
            siren.pause();
          }

          if (nearest && nearest !== lastNearestZoneRef.current) {
            onNearestZone(nearest);
          } else if (!nearest) {
            onNearestZone(null);
          }
        }
      },
      (err) => {
        console.error("❌ LocationMarker: GPS error:", err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => {
      console.log("🧹 LocationMarker: Cleanup - clearing GPS watcher");
      if (watcherIdRef.current !== null) {
        navigator.geolocation.clearWatch(watcherIdRef.current);
        watcherIdRef.current = null;
      }
      if (siren) {
        siren.pause();
      }
    };
  }, [map, ztlZones, alertSound, siren, onAlert, onNearestZone, onPositionUpdate, onAlertIncrement]);

  return position ? <Marker position={position} /> : null;
}

// Componente per Google Maps (Piano Premium)
function GoogleMapsTracker({
  map,
  onAlert,
  alertSound,
  onNearestZone,
  onPositionUpdate,
  onAlertIncrement,
  alertCount,
  ztlZones
}: {
  map: google.maps.Map | null;
  onAlert: (active: boolean, message?: string) => void;
  alertSound: AlertSound;
  onNearestZone: (zone: ZoneFeature | null) => void;
  onPositionUpdate: (position: [number, number] | null) => void;
  onAlertIncrement: () => void;
  alertCount: number;
  ztlZones: any;
}) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [siren, setSiren] = useState<HTMLAudioElement | null>(null);
  const alertCountRef = useRef(alertCount);
  const watcherIdRef = useRef<number | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

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

  useEffect(() => {
    alertCountRef.current = alertCount;
  }, [alertCount]);

  // Gestione del marker sulla mappa Google
  useEffect(() => {
    if (!map || !position) return;

    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        position: position,
        map: map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#4285F4",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
    } else {
      markerRef.current.setPosition(position);
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    };
  }, [map, position]);

  // Tracking GPS identico a LocationMarker
  useEffect(() => {
    if (!map || !ztlZones) return;

    if (watcherIdRef.current !== null) {
      console.log("🧹 Clearing existing GPS watcher:", watcherIdRef.current);
      navigator.geolocation.clearWatch(watcherIdRef.current);
      watcherIdRef.current = null;
    }

    console.log("✅ GoogleMapsTracker: Starting GPS watcher");

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (typeof watchId === 'number') {
          watcherIdRef.current = watchId;
        }

        const newPosition = { lat: latitude, lng: longitude };
        setPosition(newPosition);
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
          } catch { }
        }

        if (nearest && nearest.properties) {
          const zoneName = nearest.properties.name;
          if (lastNearestZoneRef.current !== zoneName) {
            lastNearestZoneRef.current = zoneName;
          }
        } else {
          lastNearestZoneRef.current = null;
        }

        const distInMeters = minDistance * 1000;
        const approaching200m = minDistance < 0.2;
        const approaching100m = minDistance < 0.1;

        const activeViolations = ztlZones.features.filter((zone: any) => {
          try {
            const isInside = turf.booleanPointInPolygon(pt, turf.polygon(zone.geometry.coordinates));
            return isInside;
          } catch {
            return false;
          }
        });

        const now = Date.now();
        const timeSinceLastAlert = now - lastAlertTimeRef.current;
        const shouldDebounce = timeSinceLastAlert < 3000;

        if (activeViolations.length > 0) {
          const zone = activeViolations[0];
          const alertType = 'inside';

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

              if (alertSound === "siren" && siren) {
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
              onNearestZone(nearest);

              if (alertSound === "siren" && siren) {
                siren.currentTime = 0;
                siren.play().catch(() => { });
              }
            }
          }
        } else if (approaching100m && alertCountRef.current < alertFreePlan && nearest) {
          const alertType = 'approaching100m';

          if (lastAlertTypeRef.current !== alertType || !shouldDebounce) {
            lastAlertTypeRef.current = alertType;
            lastAlertTimeRef.current = now;

            const nearestZone = nearest as any;
            const nearestCity = nearestZone.properties.city;
            const nearestName = nearestZone.properties.name;
            const distStr = distInMeters.toFixed(0);

            const alertMessage = `ZTL very close (${distStr}m)\n${nearestCity} - ${nearestName}\nTurn right NOW to avoid`;
            onAlert(true, alertMessage);
            onNearestZone(nearest);

            if (alertSound === "siren" && siren) {
              siren.currentTime = 0;
              siren.play().catch(() => { });
            }
          }
        } else {
          lastAlertTypeRef.current = null;
          onAlert(false);
          if (siren) {
            siren.pause();
          }

          if (nearest && nearest !== lastNearestZoneRef.current) {
            onNearestZone(nearest);
          } else if (!nearest) {
            onNearestZone(null);
          }
        }
      },
      (err) => {
        console.error("❌ GoogleMapsTracker: GPS error:", err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => {
      console.log("🧹 GoogleMapsTracker: Cleanup - clearing GPS watcher");
      if (watcherIdRef.current !== null) {
        navigator.geolocation.clearWatch(watcherIdRef.current);
        watcherIdRef.current = null;
      }
      if (siren) {
        siren.pause();
      }
    };
  }, [map, ztlZones, alertSound, siren, onAlert, onNearestZone, onPositionUpdate, onAlertIncrement]);

  return null;
}

export default function Map() {
  const [ztlZones, setZtlZones] = useState<any>(null);
  const [zonesLoaded, setZonesLoaded] = useState(false);
  const [zonesCount, setZonesCount] = useState(0);
  const [isAlert, setIsAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [nearestZone, setNearestZone] = useState<ZoneFeature | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneFeature | null>(null);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const dismissTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectedZoneTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [alertCount, setAlertCount] = useState(0);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [alertSound, setAlertSound] = useState<AlertSound>("siren");
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const [isAFreePlan, setIsAFreePlan] = useState(true); // Default a free plan
  const lastToastRef = useRef<{ message: string, time: number }>({ message: '', time: 0 });

  // Google Maps state
  const [googleMapInstance, setGoogleMapInstance] = useState<google.maps.Map | null>(null);
  const [googlePolygons, setGooglePolygons] = useState<google.maps.Polygon[]>([]);

  // Verifica piano utente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasPaymentSession = localStorage.getItem('payment_session') !== null;
      setIsAFreePlan(!hasPaymentSession);
      console.log("💳 Piano utente:", hasPaymentSession ? "Premium" : "Free");
    }
  }, []);

  // Carica Google Maps API solo per piano premium
  // IMPORTANTE: Passa googleMapsApiKey solo se premium, altrimenti il loader non fa nulla
  const { isLoaded: isGoogleMapsLoaded } = useJsApiLoader({
    id: 'google-map-script',
    //googleMapsApiKey: isAFreePlan ? "" : GOOGLE_MAPS_API_KEY, // Vuoto per free plan
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const handleAlertIncrement = useCallback(() => {
    setAlertCount((prev) => {
      const newCount = prev + 1;
      console.log("🔢 Alert count incremented:", newCount);
      if (newCount >= 3 && isAFreePlan) {
        setShowUpgradePrompt(true);
      }
      return newCount;
    });
  }, [isAFreePlan]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sound = localStorage.getItem('alertSound');
    if (sound === 'siren' || sound === 'calm' || sound === 'silent') {
      setAlertSound(sound);
    }
  }, []);

  const handleSoundChange = (sound: AlertSound) => {
    setAlertSound(sound);
    if (typeof window !== 'undefined') {
      localStorage.setItem('alertSound', sound);
    }
    setShowSoundSettings(false);
  };

  const handleUpgrade = () => {
    console.log("🔄 Upgrade clicked");
    window.location.href = "/pricing";
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

  const dismissUpgrade = () => {
    console.log("❌ Upgrade dismissed");
    setShowUpgradePrompt(false);
  };

  useEffect(() => {
    const loadZones = async () => {
      try {
        console.log("🗺️ Loading ZTL zones...");
        const res =await fetch("/ztl-zones.json"); // await fetch("/ztl.geojson");
        const data = await res.json();
        setZtlZones(data);
        setZonesCount(data.features.length);
        setZonesLoaded(true);
        console.log(`✅ Loaded ${data.features.length} ZTL zones`);
      } catch (err) {
        console.error("❌ Failed to load ZTL zones:", err);
      }
    };
    loadZones();
  }, []);

  // Crea i poligoni su Google Maps quando la mappa è pronta
  useEffect(() => {
    if (!googleMapInstance || !ztlZones || isAFreePlan) return;

    // Pulisci poligoni esistenti
    googlePolygons.forEach(polygon => polygon.setMap(null));

    const newPolygons: google.maps.Polygon[] = [];

    ztlZones.features.forEach((f: ZoneFeature) => {
      const color =  "#FF0000";
      const fillColor = "rgba(255, 0, 0, 0.3)" ;
      const fillOpacity =  0.2;

      // Converti coordinate da [lng, lat] a {lat, lng}
      const paths = f.geometry.coordinates[0].map(([lng, lat]: [number, number]) => ({
        lat,
        lng,
      }));

      const polygon = new google.maps.Polygon({
        paths,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity,
        clickable: true,
      });

      polygon.addListener('click', () => handleZoneClick(f));
      polygon.setMap(googleMapInstance);
      newPolygons.push(polygon);
    });

    setGooglePolygons(newPolygons);

    return () => {
      newPolygons.forEach(polygon => polygon.setMap(null));
    };
  }, [googleMapInstance, ztlZones, isAFreePlan]);

  const handleAlert = useCallback((active: boolean, message = "") => {
    console.log("🚨 Map: Alert triggered:", { active, message });

    setIsAlert(active);

    // ✅ FIX BUBBLING: Debounce toast - prevent same message within 3 seconds
    const now = Date.now();
    const timeSinceLastToast = now - lastToastRef.current.time;
    const isSameMessage = lastToastRef.current.message === message;

    // Only show toast if:
    // 1. Different message, OR
    // 2. Same message but more than 3 seconds passed
    if (message.trim() != "" && (!isSameMessage || timeSinceLastToast > 3000)) {
      lastToastRef.current = { message, time: now };

      // ADD THIS: open debug panel on alert


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

  }, []);

  const handleDismissAlert = useCallback(() => {
    console.log("👆 User dismissed alert");
    setIsAlert(false);
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
    }
  }, []);

  const handleNearestZone = useCallback((zone: ZoneFeature | null) => {
    console.log("📍 Map: Nearest zone updated:", zone?.properties?.name || "None");
    setNearestZone(zone);
    if (zone) {

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
  }, []);

  const handleZoneClick = useCallback((zone: ZoneFeature) => {
    console.log("🖱️ Zone clicked:", zone.properties.name);
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
  }, []);

  const handlePositionUpdate = useCallback((position: [number, number] | null) => {
    console.log("📡 Map: User position updated:", position);
    setUserPosition(position);
  }, []);

  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
      if (selectedZoneTimeoutRef.current) clearTimeout(selectedZoneTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkDailyCap = () => {
      const today = new Date().toISOString().split('T')[0];
      const lastReset = localStorage.getItem('dailyResetDate');
      const storedCount = parseInt(localStorage.getItem('dailyAlertCount') || '0', 10);

      if (lastReset !== today) {
        console.log("🔄 New day detected - resetting alert count");
        localStorage.setItem('dailyResetDate', today);
        localStorage.setItem('dailyAlertCount', '0');
        setAlertCount(0);
      } else {
        console.log(`📊 Restored alert count from storage: ${storedCount}`);
        setAlertCount(storedCount);
      }
    };

    checkDailyCap();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('dailyAlertCount', alertCount.toString());
    localStorage.setItem('dailyResetDate', today);
  }, [alertCount]);

  if (!ztlZones) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-white text-2xl font-bold animate-pulse">
          🗺️ Loading map...
        </div>
      </div>
    );
  }

  const isPremiumPlan = !isAFreePlan;

  return (
    <div className="relative h-screen w-screen" style={{ height: '100vh', width: '100vw' }}>
      <ToastContainer limit={1} />

      {!isPremiumPlan && (
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
      {/* Sound Settings Popup */}
      {showSoundSettings && (
        <div className="fixed top-20 left-4 bg-white rounded-lg shadow-xl p-4 z-[1001]" style={{   marginBottom: '1em' }}>
          <h3 className="font-bold mb-3">Alert Sound</h3>
          <div className="space-y-2">
            <button
              onClick={() => handleSoundChange('siren')}
              className={`w-full p-2 rounded ${alertSound === 'siren' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
            >
              🚨 Siren (Loud)
            </button>
            {/* <button
              onClick={() => handleSoundChange('calm')}
              className={`w-full p-2 rounded ${alertSound === 'calm' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
            >
              🔔 Calm (Gentle)
            </button> */}
            <button
              onClick={() => handleSoundChange('silent')}
              className={`w-full p-2 rounded ${alertSound === 'silent' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
            >
              🔕 Silent
            </button>
          </div>
        </div>
      )}

      {!isPremiumPlan ? (
        // Piano FREE: usa OpenStreetMap con Leaflet
        <MapContainer
          center={[45.4642, 9.19]}
          zoom={13}
          className="h-full w-full"
          style={{ height: "70vh", width: "100%", borderRadius: "25px" }}
          zoomControl={false}
          whenReady={() => {
            console.log("✅ OpenStreetMap ready");
            setMapReady(true);
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ZoomControl position="bottomright" />
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
            const color = "orange";
            const fillColor = "rgba(255, 165, 0, 0.2)";
            const fillOpacity = 0.5;

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
      ) : isGoogleMapsLoaded ? (
        // Piano PREMIUM: usa Google Maps
        <GoogleMap
          mapContainerStyle={{ height: "70vh", width: "100%", paddingLeft: "10px", borderRadius: "25px" }}
          center={{ lat: 45.4642, lng: 9.19 }}
          zoom={13}
          onLoad={(map) => {
            console.log("✅ Google Maps loaded");
            setGoogleMapInstance(map);
            setMapReady(true);
          }}
          options={{
            zoomControl: true,
            zoomControlOptions: {
              position: window.google?.maps?.ControlPosition?.RIGHT_BOTTOM,
            },
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          }}
        >
          <GoogleMapsTracker
            map={googleMapInstance}
            onAlert={handleAlert}
            alertSound={alertSound}
            onNearestZone={handleNearestZone}
            onPositionUpdate={handlePositionUpdate}
            onAlertIncrement={handleAlertIncrement}
            alertCount={alertCount}
            ztlZones={ztlZones}
          />
        </GoogleMap>
      ) : (
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-500 to-purple-600">
          <div className="text-white text-2xl font-bold animate-pulse">
            🗺️ Loading Google Maps...
          </div>
        </div>
      )}

      {/* UPGRADE PROMPT */}
      {showUpgradePrompt && isAFreePlan && !selectedZone && (
        <div className="fixed inset-0 flex items-center justify-center z-[1999] bg-black/50">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md">
            <div className="text-center">
              <div className="text-6xl mb-4">🚨</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Free limit reached</h3>
              <p className="text-gray-700 text-lg mb-4">
                You've used all 3 free alerts today. Upgrade to Premium for unlimited alerts and Google Maps!
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
      <div className="fixed top-0 left-0 right-0 p-3 pt-4 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-[1000]">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSoundSettings(!showSoundSettings)} className="flex items-center gap-2 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
              <span className="text-2xl">
                {alertSound === 'siren' ? '🚨' : alertSound === 'calm' ? '🔔' : '🔕'}
              </span>
            </button>
            <div>
              <h2 className="font-bold text-sm text-gray-900">
                Olympic Shield 2026 {isAFreePlan ? " - Free (OpenStreetMap)" : " - Premium (Google Maps)"}
              </h2>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${mapReady ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {mapReady ? '✓ Map Ready' : '⏳ Loading'}
                </span>
                {isAFreePlan && (
                  <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                    {3 - alertCount} alerts left
                  </span>
                )}
              </div>
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
      .animate-slide-up {
        animation: slideUp 0.3s ease-out;
      }
    `}</style>
    </div>
  );
}
