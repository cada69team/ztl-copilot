"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polygon, Marker, useMap } from "react-leaflet";
import * as turf from "@turf/turf";
import { isZoneActive } from "@/hooks/useZtlStatus";
import ztlZones from "../public/ztl-zones.json";

function LocationMarker({ onAlert }: { onAlert: (active: boolean, message?: string) => void }) {
  const map = useMap();
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [siren] = useState<HTMLAudioElement | null>(null);
  const [nearestZone, setNearestZone] = useState<any>(null);
  const [distanceToZone, setDistanceToZone] = useState<number | null>(null);
  const [selectedZone, setSelectedZone] = useState<any>(null);
  const [alertCount, setAlertCount] = useState(0);

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
    if (!map) return;

    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition([latitude, longitude]);

        const pt = turf.point([longitude, latitude]);

        let nearest: any = null;
        let minDistance = Infinity;

        ztlZones.features.forEach((zone: any) => {
          const polygon = turf.polygon((zone as any).geometry.coordinates);
          const distance = turf.pointToPolygonDistance(pt, (polygon as any));
          if (distance < minDistance && distance < 1) {
            minDistance = distance;
            nearest = zone;
          }
        });

        setNearestZone(nearest);
        const distInMeters = minDistance * 1000;
        setDistanceToZone(distInMeters);

        const approaching200m = minDistance < 0.2;
        const approaching100m = minDistance < 0.1;
        const insideZone = minDistance < 0.02;

        const activeViolations = ztlZones.features.filter((zone: any) => {
          const isInside = turf.booleanPointInPolygon(pt, turf.polygon((zone as any).geometry.coordinates));
          const isActiveNow = isZoneActive((zone as any).properties.name);
          return isInside && isActiveNow;
        });

        if (activeViolations.length > 0 && alertCount < 3) {
          const zone = activeViolations[0];
          const newCount = alertCount + 1;
          localStorage.setItem('ztl-alert-count', newCount.toString());
          setAlertCount(newCount);

          onAlert(true, `⚠️ INSIDE ZTL in ${(zone as any).properties.city}\nZone: ${(zone as any).properties.name}\nFine: €${(zone as any).properties.fine}\n${3 - newCount} free alerts remaining today`);
          if (siren) {
            siren.currentTime = 0;
            siren.play().catch(() => {});
          }
        } else if (approaching200m && alertCount < 3) {
          const zoneName = nearest?.properties?.name || "Unknown";
          const cityName = nearest?.properties?.city || "Unknown";
          const newCount = alertCount + 1;
          localStorage.setItem('ztl-alert-count', newCount.toString());
          setAlertCount(newCount);
          onAlert(true, `⚠️ ZTL in ${distInMeters.toFixed(0)}m\n${cityName} - ${zoneName}\nTurn right in 150m to avoid\n${3 - newCount} free alerts remaining today`);
        } else if (approaching100m && alertCount < 3) {
          const newCount = alertCount + 1;
          localStorage.setItem('ztl-alert-count', newCount.toString());
          setAlertCount(newCount);
          onAlert(true, `⚠️ ZTL ${distInMeters.toFixed(0)}m ahead\nPrepare to turn\n${3 - newCount} free alerts remaining today`);
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
  }, [map, onAlert, siren, alertCount]);

  return position ? <Marker position={position} /> : null;
}

export default function ZtlMap() {
  const [isAlert, setIsAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [nearestZone, setNearestZone] = useState<any>(null);
  const [distanceToZone, setDistanceToZone] = useState<number | null>(null);
  const [selectedZone, setSelectedZone] = useState<any>(null);
  const [alertCount, setAlertCount] = useState(0);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissInstallPrompt, setDismissInstallPrompt] = useState(false);

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

  const handleZoneClick = (zone: any) => {
    setSelectedZone(zone);
  };

  const handleUpgrade = () => {
    window.location.href = '/pricing';
  };

  const dismissUpgrade = () => {
    setShowUpgradePrompt(false);
  };

  const handleDismissInstall = () => {
    setDismissInstallPrompt(true);
  };

  return (
    <div className={`h-screen w-full transition-colors duration-500 ${isAlert ? "bg-red-600 animate-pulse" : "bg-white"}`}>
      {!isInstalled && !dismissInstallPrompt && (
        <div className="fixed top-0 left-0 right-0 p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white z-[2000] shadow-lg">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📱</span>
              <div>
                <p className="font-bold text-lg">Install for best experience</p>
                <p className="text-sm opacity-90">Add Olympic Shield 2026 to home screen for full-screen ZTL alerts</p>
              </div>
            </div>
            <button
              onClick={handleDismissInstall}
              className="text-white/20 hover:text-white/40 text-xl font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {mapError && (
        <div className="fixed inset-0 bg-red-50 flex items-center justify-center z-[2000]">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
            <h3 className="text-lg font-bold text-red-600 mb-2">Map Error</h3>
            <p className="text-gray-600">{mapError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reload
            </button>
          </div>
        </div>
      )}

      {!mapReady && !dismissInstallPrompt && (
        <div className="fixed inset-0 bg-white/90 flex items-center justify-center z-[1000]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

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
        {ztlZones.features.map((f: any, i: number) => (
          <Polygon
            key={i}
            positions={f.geometry.coordinates}
            eventHandlers={{
              click: () => handleZoneClick(f)
            }}
            color={nearestZone?.properties?.name === f.properties?.name ? "red" : "orange"}
            fillColor={nearestZone?.properties?.name === f.properties?.name ? "rgba(255, 0, 0, 0.3)" : "rgba(255, 165, 0, 0.2)"}
            fillOpacity={nearestZone?.properties?.name === f.properties?.name ? 0.5 : 0.2}
          />
        ))}
      </MapContainer>

      {isAlert && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-red-700 text-white text-center z-[1000]">
          <p className="font-bold text-lg whitespace-pre-line">{alertMessage}</p>
          <p className="text-sm mt-1">Tap to dismiss</p>
        </div>
      )}

      {nearestZone && distanceToZone !== null && distanceToZone < 1000 && !isAlert && !showUpgradePrompt && (
        <div className="fixed top-20 left-4 right-4 bg-blue-600 text-white p-3 rounded-lg shadow-lg z-[1000] max-w-xs">
          <p className="font-bold text-sm">🎯 {nearestZone?.properties?.city}</p>
          <p className="text-xs">{nearestZone?.properties?.name}</p>
          <p className="font-semibold text-sm">
            {distanceToZone < 500 ? `${Math.round(distanceToZone)}m away` : `${Math.round(distanceToZone)}m warning`}
          </p>
        </div>
      )}

      {selectedZone && (
        <div className="fixed inset-0 flex items-center justify-center z-[1500]">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900">{selectedZone?.properties?.city}</h2>
              <button
                onClick={() => setSelectedZone(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{selectedZone?.properties?.name}</h3>
                {selectedZone?.properties?.note && (
                  <p className="text-gray-600 text-sm">{selectedZone?.properties?.note}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-3xl font-bold text-blue-700">€{selectedZone?.properties?.fine}</p>
                  <p className="text-sm text-gray-600">Potential fine</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <p className="text-lg font-bold text-orange-700">⏰ Check hours</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedZone?.properties?.name === "Area C" && "Mon-Fri 07:30-18:30"}
                    {selectedZone?.properties?.name !== "Area C" && "Check local signage"}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-bold text-gray-900 mb-2">Exception?</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• Residents with valid permit</li>
                  <li>• Electric vehicles with charging plates</li>
                  <li>• Emergency vehicles</li>
                  <li>• Public transport (buses, taxis)</li>
                  <li>• Disabled vehicles with valid exemption</li>
                </ul>
              </div>

              <button
                onClick={handleUpgrade}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold hover:from-blue-700 hover:to-purple-700 transition"
              >
                🛒️ Get Premium Permit
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpgradePrompt && !selectedZone && (
        <div className="fixed inset-0 flex items-center justify-center z-[2000] bg-black/80 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Free limit reached</h3>
              <p className="text-gray-700 text-lg mb-4">
                You've used {3 - alertCount} free alerts today.
                <br />
                Upgrade to Premium for unlimited alerts.
              </p>
              <div className="space-x-4 mt-6">
                <button
                  onClick={dismissUpgrade}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Maybe later
                </button>
                <button
                  onClick={handleUpgrade}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold hover:from-blue-700 hover:to-purple-700 transition"
                >
                  🛒️ Upgrade to Premium
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed top-0 left-0 right-0 p-3 bg-white/95 backdrop-blur border-b border-gray-200 z-[1000]">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center">
            <h2 className="font-bold text-sm text-gray-900">🏔️ Olympic Shield 2026</h2>
            <p className="text-xs text-gray-600 hidden sm:block">
              {3 - alertCount} free alerts today
            </p>
          </div>

          <button
            onClick={handleUpgrade}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold text-sm hover:from-blue-700 hover:to-purple-700 transition shadow-md"
          >
            🛒️ Upgrade to Premium
          </button>
        </div>
      </div>
    </div>
  );
}
