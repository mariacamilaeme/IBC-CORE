"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, ArrowRight, Shield } from "lucide-react";
import { toast } from "sonner";

const HARBOR = "#0B5394";
const BEACON = "#00B8E0";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting: lock after 5 failed attempts for 60 seconds
    if (lockedUntil && Date.now() < lockedUntil) {
      const secsLeft = Math.ceil((lockedUntil - Date.now()) / 1000);
      toast.error(`Demasiados intentos. Espere ${secsLeft} segundos.`);
      return;
    }
    if (lockedUntil && Date.now() >= lockedUntil) {
      setLockedUntil(null);
      setLoginAttempts(0);
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        // Traducir la razón real de Supabase (no siempre es credencial inválida)
        const reason =
          error.message === "Invalid login credentials" ? "Correo o contrasena incorrectos."
          : error.message === "Email not confirmed" ? "El correo aún no está confirmado."
          : error.message.toLowerCase().includes("rate limit") ? "Demasiadas solicitudes al servidor. Espera un minuto."
          : error.message.toLowerCase().includes("fetch") ? "Sin conexión con el servidor. Revisa tu internet."
          : error.message;
        if (newAttempts >= 5) {
          setLockedUntil(Date.now() + 60000); // Lock for 60 seconds
          toast.error("Demasiados intentos fallidos", {
            description: "Cuenta bloqueada temporalmente. Espere 60 segundos.",
          });
        } else {
          toast.error("Error de autenticacion", {
            description: `${reason} Intentos restantes: ${5 - newAttempts}`,
          });
        }
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ last_login_at: new Date().toISOString() })
          .eq("id", user.id);
      }

      sessionStorage.removeItem("ibc-welcome-shown");

      toast.success("Bienvenido!", {
        description: "Inicio de sesion exitoso",
      });

      router.replace("/");
    } catch {
      toast.error("Error inesperado", {
        description: "Ocurrio un error. Intenta de nuevo.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="h-screen relative overflow-hidden">
      {/* ═══ Fondo: puerto a pantalla completa + duotono navy ═══ */}
      <motion.div
        initial={{ scale: 1.06, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/login-port.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center 38%",
        }}
      />
      {/* Overlay de marca: navy profundo que se abre hacia la derecha */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, rgba(4,15,27,0.94) 0%, rgba(5,20,36,0.82) 34%, rgba(6,27,46,0.60) 62%, rgba(6,27,46,0.72) 100%)",
        }}
      />
      {/* Vignette inferior para asentar el texto */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(4,15,27,0.35) 0%, transparent 30%, transparent 62%, rgba(4,15,27,0.65) 100%)",
        }}
      />

      {/* ═══ Contenido ═══ */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Marca, arriba a la izquierda */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="flex items-center gap-3 px-10 pt-8"
        >
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)", backdropFilter: "blur(8px)" }}
          >
            <span
              className="text-white font-bold text-[15px]"
              style={{ fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif" }}
            >
              IBC
            </span>
          </div>
          <div>
            <div
              className="text-white font-semibold text-[15px]"
              style={{ fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif", letterSpacing: "0.14em" }}
            >
              STEEL GROUP
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: BEACON }} />
              <span
                className="text-[10px] uppercase"
                style={{ fontFamily: "var(--font-jetbrains-mono), monospace", letterSpacing: "0.2em", color: "rgba(255,255,255,0.55)" }}
              >
                IBC Core
              </span>
            </div>
          </div>
        </motion.div>

        {/* Cuerpo: titular izquierda + tarjeta derecha */}
        <div className="flex-1 flex items-center justify-between gap-10 px-10 lg:px-16">
          {/* Titular sobrio, abajo-izquierda en pantallas grandes */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="hidden lg:block max-w-xl self-end pb-20"
          >
            <h1
              style={{
                fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif",
                fontWeight: 600,
                fontSize: "clamp(42px, 4.6vw, 68px)",
                letterSpacing: "0.14em",
                lineHeight: 1.05,
                background: "linear-gradient(120deg, #FFFFFF 0%, #DCEBF7 45%, #9CC6E8 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 2px 18px rgba(4,15,27,0.55))",
              }}
            >
              IBC CORE
            </h1>
            <div
              className="mt-4 mb-3"
              style={{ width: 64, height: 2.5, borderRadius: 99, background: `linear-gradient(90deg, ${BEACON}, rgba(0,184,224,0.12))` }}
            />
            <p
              className="text-[16px] leading-relaxed max-w-md"
              style={{ color: "rgba(255,255,255,0.78)", textShadow: "0 1px 12px rgba(4,15,27,0.6)" }}
            >
              Centro de operaciones logísticas de IBC Steel Group.
            </p>
          </motion.div>

          {/* ═══ Tarjeta flotante de acceso ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 26, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[420px] mx-auto lg:mx-0 lg:mr-[4vw] rounded-3xl p-8 sm:p-9"
            style={{
              background: "rgba(255,255,255,0.94)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.6)",
              boxShadow: "0 40px 90px -20px rgba(2,10,20,0.55), 0 12px 32px -12px rgba(2,10,20,0.35)",
            }}
          >
            {/* Encabezado */}
            <div className="mb-7">
              <p
                className="text-[10px] uppercase mb-2.5 flex items-center gap-2.5"
                style={{ fontFamily: "var(--font-jetbrains-mono), monospace", letterSpacing: "0.26em", color: HARBOR, fontWeight: 600 }}
              >
                <span style={{ display: "inline-block", width: 22, height: 1.5, background: BEACON }} />
                IBC CORE
              </p>
              <h2
                className="text-[26px] mb-1.5"
                style={{
                  fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: "#061B2E",
                }}
              >
                Inicia sesión
              </h2>
              <p className="text-sm" style={{ color: "#51647A" }}>
                Accede con tu cuenta corporativa.
              </p>
            </div>

            {/* Formulario */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: "#243A50" }}>
                  Correo electronico
                </label>
                <div
                  className={`relative rounded-xl transition-all duration-300 ${
                    focusedField === "email" ? "ring-2 shadow-lg" : "shadow-sm"
                  }`}
                  style={focusedField === "email" ? { boxShadow: "0 8px 24px rgba(11,83,148,0.12)", ["--tw-ring-color" as string]: "rgba(11,83,148,0.20)" } : undefined}
                >
                  <div
                    className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300"
                    style={{ color: focusedField === "email" ? HARBOR : "#8496AB" }}
                  >
                    <Mail className="w-[18px] h-[18px]" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="correo@ibcsteelgroup.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    required
                    className="pl-11 h-12 bg-white rounded-xl text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                    style={{ borderColor: "#D9E3EF" }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: "#243A50" }}>
                  Contrasena
                </label>
                <div
                  className={`relative rounded-xl transition-all duration-300 ${
                    focusedField === "password" ? "ring-2 shadow-lg" : "shadow-sm"
                  }`}
                  style={focusedField === "password" ? { boxShadow: "0 8px 24px rgba(11,83,148,0.12)", ["--tw-ring-color" as string]: "rgba(11,83,148,0.20)" } : undefined}
                >
                  <div
                    className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300"
                    style={{ color: focusedField === "password" ? HARBOR : "#8496AB" }}
                  >
                    <Lock className="w-[18px] h-[18px]" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Ingresa tu contrasena"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    required
                    className="pl-11 pr-11 h-12 bg-white rounded-xl text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                    style={{ borderColor: "#D9E3EF" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors duration-200"
                    style={{ color: "#8496AB" }}
                    tabIndex={-1}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={showPassword ? "hide" : "show"}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                      >
                        {showPassword ? (
                          <EyeOff className="w-[18px] h-[18px]" />
                        ) : (
                          <Eye className="w-[18px] h-[18px]" />
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </button>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-sm font-semibold tracking-wide transition-all duration-300 relative overflow-hidden group"
                  style={{
                    background: loading ? "#8496AB" : `linear-gradient(135deg, #083D6E 0%, ${HARBOR} 100%)`,
                    boxShadow: loading ? "none" : "0 4px 16px -3px rgba(11,83,148,0.45), 0 0 0 1px rgba(11,83,148,0.10)",
                  }}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                  {loading ? (
                    <div className="flex items-center gap-2.5">
                      <motion.div
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      />
                      <span>Verificando credenciales...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>Iniciar sesion</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                    </div>
                  )}
                </Button>
              </div>
            </form>

            {/* Nota de seguridad */}
            <div className="mt-7 flex items-center justify-center gap-2 text-xs" style={{ color: "#8496AB" }}>
              <Shield className="w-3.5 h-3.5" />
              <span>Conexion protegida con cifrado de extremo a extremo</span>
            </div>

            {/* Crédito */}
            <div className="mt-6 pt-5 text-center" style={{ borderTop: "1px solid #E7EEF6" }}>
              <span
                className="text-[8.5px] uppercase font-medium block"
                style={{ fontFamily: "var(--font-jetbrains-mono), monospace", letterSpacing: "0.24em", color: "#8496AB" }}
              >
                Desarrollado por
              </span>
              <span className="text-sm font-bold tracking-wide" style={{ color: HARBOR }}>
                Maria Camila Mesa
              </span>
            </div>
          </motion.div>
        </div>

        {/* Copyright */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="px-10 pb-6 text-[10px]"
          style={{ fontFamily: "var(--font-jetbrains-mono), monospace", letterSpacing: "0.14em", color: "rgba(255,255,255,0.45)" }}
        >
          © {new Date().getFullYear()} IBC STEEL GROUP · TODOS LOS DERECHOS RESERVADOS
        </motion.p>
      </div>
    </div>
  );
}
