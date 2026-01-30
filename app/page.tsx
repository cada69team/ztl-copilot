"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ZtlMap = dynamic(() => import("@/components/Map").then((mod) => mod.default), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans">
      <p className="text-zinc-600">Loading Olympic Shield 2026...</p>
    </div>
  ),
});

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<PermissionState | "unknown">("unknown");

  useEffect(() => {
    if ("geolocation" in navigator) {
      setPermission("prompt");
      setIsLoading(false);
    } else {
      setPermission("denied");
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans">
        <p className="text-zinc-600">Loading Olympic Shield 2026...</p>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 font-sans p-8">
        <h1 className="text-2xl font-bold text-zinc-900 mb-4">⚠️ Location Required</h1>
        <p className="text-zinc-600 text-center mb-6">
          ZTL alerts need GPS to work. Please enable location access in your browser settings.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  return <ZtlMap />;
}
