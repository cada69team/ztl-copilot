import type { Metadata } from "next";

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
    <html lang="en">
      <head>
        <link rel="icon" href="/icons/icon-192.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}