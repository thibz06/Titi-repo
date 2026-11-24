"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import { useEffect, type ReactNode } from "react";

/**
 * Enregistre le service worker (désactivé en développement). Quand une nouvelle version de l'app prend
 * la main, la page se recharge une fois : sans ça, le téléphone garde l'ancienne version affichée.
 */
export function ServiceWorker({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    const onChange = () => {
      if (!hadController || reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onChange);
    // Vérifier s'il existe une version plus récente à chaque ouverture.
    navigator.serviceWorker.getRegistration().then((r) => r?.update()).catch(() => undefined);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onChange);
  }, []);

  return (
    <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV !== "production"} reloadOnOnline={false}>
      {children}
    </SerwistProvider>
  );
}
