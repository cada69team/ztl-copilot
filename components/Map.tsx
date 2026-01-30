"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polygon, Marker, useMap } from "react-leaflet";
import * as turf from "@turf/turf";
import { isZoneActive } from "@/hooks/useZtlStatus";
import ztlZones from "../public/ztl-zones.json";

interface LocationMarkerProps {
  onAlert: (active: boolean, message?: string) => void;
}

function LocationMarker({ onAlert }: LocationMarkerProps) {
  const map = useMap();
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [siren] = useState<HTMLAudioElement | null>(null);
  const [nearestZone, setNearestZone] = useState<any>(null);
  const [distanceToZone, setDistanceToZone] = useState<number | null>(null);

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
          const polygon = turf.polygon(zone.geometry.coordinates);
          const distance = turf.pointToPolygonDistance(pt, polygon);
          if (distance < minDistance && distance < 1.0) {
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
          const isInside = turf.booleanPointInPolygon(pt, turf.polygon(zone.geometry.coordinates));
          const isActiveNow = isZoneActive(zone.properties.name);
          return isInside && isActiveNow;
        });

        if (activeViolations.length > 0) {
          const zone = activeViolations[0];
          const fine = zone.properties.fine || 0;
          onAlert(true, `⚠️ INSIDE ZTL in ${zone.properties.city}\nZone: ${zone.properties.name}\nFine: €${fine}`);
          if (siren) {
            siren.currentTime = 0;
            siren.play().catch(() => {});
          }
        } else if (approaching200m) {
          const zoneName = nearest?.properties?.name || "Unknown";
          const cityName = nearest?.properties?.city || "Unknown";
          onAlert(true, `⚠️ ZTL in ${distInMeters.toFixed(0)}m\n${cityName} - ${zoneName}\nTurn right in 150m to avoid`);
        } else if (approaching100m) {
          onAlert(true, `⚠️ ZTL ${distInMeters.toFixed(0)}m ahead\nPrepare to turn`);
        } else {
          onAlert(false);
        }

        if (map) {
          map.panTo([latitude, longitude], { animate: true, duration: 0.5 });
        }
      },
      (err) => {
        console.error("❌ Geolocation error:", err);
      },
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, [map, onAlert, siren]);

  return position ? <Marker position={position} /> : null;
}

export default function ZtlMap() {
  const [isAlert, setIsAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [nearestZone, setNearestZone] = useState<any>(null);
  const [distanceToZone, setDistanceToZone] = useState<number | null>(null);

  useEffect(() => {
    if ("wakeLock" in navigator) {
      (navigator as any).wakeLock.request("screen").catch((e: any) => {
        console.log("⚠️ Wake lock failed:", e.message);
      });
    }
  }, []);

  const handleAlert = (active: boolean, message = "") => {
    setIsAlert(active);
    setAlertMessage(message);
  };

  const handleMapReady = () => {
    setMapReady(true);
  };

  const handleMapError = () => {
    setMapError("Failed to load map. Please refresh and check your connection.");
  };

  const handleUpgrade = () => {
    window.location.href = '/pricing';
  };

  return (
    <div className={`h-screen w-full transition-colors duration-500 ${isAlert ? "bg-red-600 animate-pulse" : "bg-white"}`}>
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

      {!mapReady && (
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
            positions={f.geometry.coordinates.map((c: any) => [c[1], c[0]])}
            color={nearestZone?.properties?.name === f.properties?.name ? "red" : "orange"}
            fillColor={nearestZone?.properties?.name === f.properties?.name ? "rgba(255, 0, 0, 0.3)" : "rgba(255, 165, 0, 0.2)"}
            fillOpacity={nearestZone?.properties?.name === f.properties?.name ? 0.5 : 0.2}
          />
        ))}
        <LocationMarker onAlert={handleAlert} />
      </MapContainer>

      {isAlert && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-red-700 text-white text-center z-[1000]">
          <p className="font-bold text-lg whitespace-pre-line">{alertMessage}</p>
          <p className="text-sm mt-1">Tap to dismiss</p>
        </div>
      )}

      {nearestZone && distanceToZone !== null && distanceToZone < 1000 && !isAlert && (
        <div className="fixed top-20 left-4 right-4 bg-blue-600 text-white p-3 rounded-lg shadow-lg z-[1000] max-w-xs">
          <p className="font-bold text-sm">🎯 {nearestZone.properties?.city}</p>
          <p className="text-xs">{nearestZone.properties?.name}</p>
          <p className="font-semibold text-sm">
            {distanceToZone < 500 ? `${Math.round(distanceToZone)}m away` : `${Math.round(distanceToZone)}m warning`}
          </p>
        </div>
      )}

      <div className="fixed top-0 left-0 right-0 p-3 bg-white/95 backdrop-blur border-b border-gray-200 z-[1000]">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center">
            <h2 className="font-bold text-sm text-gray-900">🏔️ Olympic Shield 2026</h2>
            <p className="text-xs text-gray-600 hidden sm:block">ZTL alerts for Milan & Olympic venues</p>
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
