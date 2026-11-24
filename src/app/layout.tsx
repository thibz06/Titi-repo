import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import { defaultLocale, getMessages } from "@/i18n";
import { Providers } from "@/components/Providers";
import { ServiceWorker } from "@/components/ServiceWorker";
import { TabBar } from "@/components/TabBar";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const t = getMessages();

export const metadata: Metadata = {
  title: t.app.name,
  description: t.app.description,
  applicationName: t.app.name,
  appleWebApp: { capable: true, title: t.app.name, statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  // App à usage privé pour l'instant : pas d'indexation par les moteurs.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#FFFAF4",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={defaultLocale} className={`${sora.variable} ${inter.variable}`}>
      <body className="antialiased">
        <ServiceWorker>
          <Providers>
            {children}
            <TabBar />
          </Providers>
        </ServiceWorker>
      </body>
    </html>
  );
}
