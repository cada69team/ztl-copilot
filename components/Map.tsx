"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polygon, Marker, useMap } from "react-leaflet";
import * as turf from "@turf/turf";
import "leaflet/dist/leaflet.css";

function LocationMarker({ zones, onAlert }) {
  const map = useMap();
  const [position, setPosition] = useState<[number, number] | null>(null);

  useEffect(() => {
    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition([latitude, longitude]);
        map.flyTo([latitude, longitude], 16);

        // Geofencing Logic
        const pt = turf.point([longitude, latitude]);
		
		// scheduler
		/*
		const activeViolations = zones.features.filter((zone: any) => {
			const isInside = turf.booleanPointInPolygon(pt, turf.polygon(zone.geometry.coordinates));
			const isActiveNow = isZoneActive(zone.properties.name);
			return isInside && isActiveNow;
		});

		if (activeViolations.length > 0) {
		  const zone = activeViolations[0].properties;
		  onAlert(true, `WARNING: Active ZTL in ${zone.city}. Potential Fine: €${zone.fine}`);
		} else {
		  onAlert(false);
		}*/


		const userBuffer = turf.buffer(userPt, 0.05, { units: 'kilometers' }); // 50-meter warning zone
		const isApproaching = zones.features.some((zone: any) => 
		  turf.booleanIntersects(userBuffer, turf.polygon(zone.geometry.coordinates))
		);
		if (isApproaching) {
		  onAlert(true); // Trigger "Warning: Approaching Olympic Restricted Zone"
		}//else onAlert(false);
        const isInside = zones.features.some((zone: any) => 
          turf.booleanPointInPolygon(pt, turf.polygon(zone.geometry.coordinates))
        );        
        if (isInside) onAlert(true);
        else onAlert(false);
      },
      null,
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, [map, zones, onAlert]);

  return position ? <Marker position={position} /> : null;
}

export default function ZtlMap({ zones }) {
  const [isAlert, setIsAlert] = useState(false);

  // Keep screen on while driving
  useEffect(() => {
    if ("wakeLock" in navigator) {
      (navigator as any).wakeLock.request("screen").catch(() => {});
    }
  }, []);

  return (
    <div className={`h-screen w-full transition-colors duration-500 ${isAlert ? "bg-red-600 animate-pulse" : "bg-white"}`}>
      <MapContainer center={[45.4642, 9.1900]} zoom={13} className="h-[80%] w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {zones.features.map((f: any, i: number) => (
          <Polygon key={i} positions={f.geometry.coordinates[0].map((c: any) => [c[1], c[0]])} color="red" />
        ))}
        <LocationMarker zones={zones} onAlert={setIsAlert} />
      </MapContainer>
      
      {isAlert && (
        <div className="p-4 text-center text-white font-bold text-xl">
          ⚠️ ACTIVE ZTL ZONE! AVOID OR PAY FINE.
        </div>
      )}
    </div>
  );
}