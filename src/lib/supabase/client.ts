import { createBrowserClient } from "@supabase/ssr";

// Candado entre pestañas resistente. Supabase usa navigator.locks para
// coordinar el refresco de sesión entre pestañas; si una pestaña zombi se
// queda con el candado, la app entera se congela con "Acquiring an exclusive
// Navigator LockManager lock ... timed out". Aquí esperamos hasta 8s y, si
// no se libera, robamos el candado en lugar de dejar la app bloqueada.
async function resilientLock<R>(name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
  if (typeof navigator === "undefined" || !navigator.locks) return fn();
  try {
    return await navigator.locks.request(name, { signal: AbortSignal.timeout(8000) }, () => fn());
  } catch (err) {
    if (err instanceof DOMException && (err.name === "AbortError" || err.name === "TimeoutError")) {
      return await navigator.locks.request(name, { steal: true }, () => fn());
    }
    throw err;
  }
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { lock: resilientLock } }
  );
}
