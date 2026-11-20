import type { MetadataRoute } from "next";
import { defaultLocale, getMessages } from "@/i18n";

export default function manifest(): MetadataRoute.Manifest {
  const t = getMessages();
  return {
    name: t.app.name,
    short_name: t.app.name,
    description: t.app.description,
    lang: defaultLocale,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F6EEDF",
    theme_color: "#0FB5BA",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
