"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polygon, Marker, useMap } from "react-leaflet";
import * as turf from "@turf/turf";
import { isZoneActive } from "@/hooks/useZtlStatus";
// @ts-ignore
import ztlZones from "../public/ztl-zones.json";

interface LocationMarkerProps {
  onAlert: (active: boolean, message?: string) => void;
}

function LocationMarker({ onAlert }: LocationMarkerProps) {
  const map = useMap();
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [siren] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Preload siren
    const audio = new Audio("/siren.mp3");
    audio.volume = 0.5;
    return () => {
      audio.pause();
      audio.remove();
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      console.error("Geolocation not supported");
      return;
    }

    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition([latitude, longitude]);
        map.flyTo([latitude, longitude], 16);

        // Geofencing Logic
        const pt = turf.point([longitude, latitude]);

        // Check for approaching zone (50m warning)
        const userBuffer = turf.buffer(pt, 0.05, { units: 'kilometers' });
        const isApproaching = ztlZones.features.some((zone: any) => {
          const polygon = turf.polygon(zone.geometry.coordinates);
          // @ts-ignore
          return turf.booleanIntersects(userBuffer, polygon);
        });

        // Check if inside any active zone
        const activeViolations = ztlZones.features.filter((zone: any) => {
          const isInside = turf.booleanPointInPolygon(pt, turf.polygon(zone.geometry.coordinates));
          const isActiveNow = isZoneActive(zone.properties.name);
          return isInside && isActiveNow;
        });

        if (activeViolations.length > 0) {
          const zone = activeViolations[0].properties;
          onAlert(true, `⚠️ ACTIVE ZTL in ${zone.city}: ${zone.name}\nPotential Fine: €${zone.fine}`);
          // Play siren on first alert
          if (siren) {
            siren.currentTime = 0;
            siren.play().catch(() => {});
          }
        } else if (isApproaching) {
          onAlert(true, "⚠️ Approaching Olympic Restricted Zone - Check ahead!");
        } else {
          onAlert(false);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
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

  // Keep screen on while driving
  useEffect(() => {
    if ("wakeLock" in navigator) {
      (navigator as any).wakeLock.request("screen").catch(() => {});
    }
  }, []);

  const handleAlert = (active: boolean, message = "") => {
    setIsAlert(active);
    setAlertMessage(message);
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

      <MapContainer
        center={[45.4642, 9.1900]}
        zoom={13}
        className="h-[80%] w-full"
        style={{ height: "80vh", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {ztlZones.features.map((f: any, i: number) => (
          <Polygon
            key={i}
            positions={f.geometry.coordinates[0].map((c: any) => [c[1], c[0]])}
            color="red"
            fillColor="rgba(255, 0, 0, 0.2)"
            fillOpacity={0.3}
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

      <div className="fixed top-4 left-4 right-4 bg-white/90 backdrop-blur rounded-lg p-3 shadow-lg z-[1000]">
        <h2 className="font-bold text-sm text-gray-900">🏔️ Olympic Shield 2026</h2>
        <p className="text-xs text-gray-600">ZTL alerts for Milan & Olympic venues</p>
      </div>
    </div>
  );
}
