"use client";

import { useEffect } from "react";

// La app NUNCA ha usado service workers, pero algunos navegadores tienen uno
// registrado para localhost:3000 (de otro proyecto o experimento previo) que
// sirve archivos viejos cacheados y rompe la app con "Error inesperado".
// Aquí lo desregistramos y limpiamos sus cachés en cuanto carga la página.
export function CleanupServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      }).catch(() => {});
    }
    if ("caches" in window) {
      caches.keys().then((keys) => {
        keys.forEach((k) => caches.delete(k));
      }).catch(() => {});
    }
  }, []);
  return null;
}
