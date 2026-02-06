import type { Metadata } from "next";
import 'leaflet/dist/leaflet.css';
import 'react-toastify/dist/ReactToastify.css';

export const metadata: Metadata = {
  title: "ZTL-Copilot - Olympic Shield 2026",
  description: "Real-time ZTL alerts for Olympic tourists",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // <html lang="en">
    //   <head>
    //     <link rel="icon" href="/icons/icon-192.png" />
    //     <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    //   </head>
    //   <body>{children}</body>
    // </html>
 <html lang="en" style={{ height: '100%', margin: 0, padding: 0 }}>
      <head>
        <link rel="icon" href="/icons/icon-192.png" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>{`
          * { box-sizing: border-box; }
          html, body, #__next { height: 100%; margin: 1em; padding: 1em; }
        `}</style>
      </head>
      <body style={{ height: '100%', margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
