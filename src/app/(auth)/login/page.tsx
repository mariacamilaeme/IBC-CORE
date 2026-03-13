"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, ArrowRight, Shield } from "lucide-react";
import { toast } from "sonner";

// Animated gradient background
function AnimatedGradient() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "linear-gradient(135deg, #0f172a 0%, #1e3a5f 30%, #1a365d 60%, #0c1e36 100%)",
            "linear-gradient(135deg, #0c1e36 0%, #1a365d 30%, #1e3a5f 60%, #0f172a 100%)",
            "linear-gradient(135deg, #152238 0%, #1e3a5f 40%, #0f2744 70%, #0c1e36 100%)",
            "linear-gradient(135deg, #0f172a 0%, #1e3a5f 30%, #1a365d 60%, #0c1e36 100%)",
          ],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full opacity-25"
        style={{
          background: "radial-gradient(circle, rgba(59,130,246,0.35) 0%, transparent 70%)",
          top: "-15%",
          right: "-20%",
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.25, 0.35, 0.25],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full opacity-15"
        style={{
          background: "radial-gradient(circle, rgba(99,205,255,0.3) 0%, transparent 70%)",
          bottom: "-10%",
          left: "-15%",
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Error de autenticacion", {
          description: "Correo o contrasena incorrectos. Intenta de nuevo.",
        });
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
    <div className="h-screen flex overflow-hidden">
      {/* Left Panel - Branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="hidden lg:flex lg:w-[36%] relative overflow-hidden bg-[#0f172a]"
      >
        <AnimatedGradient />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Top - Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex items-center gap-3"
          >
            <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center">
              <span className="text-white font-bold text-lg">IBC</span>
            </div>
            <div>
              <span className="text-white font-semibold text-lg tracking-tight">
                Steel Group
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-white/50">Sistema activo</span>
              </div>
            </div>
          </motion.div>

          {/* Center - Clean branding */}
          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.h1
                className="text-4xl xl:text-5xl font-bold leading-tight mb-3 cursor-default select-none"
                style={{
                  background: "linear-gradient(135deg, #ffffff 0%, #94b8db 50%, #ffffff 100%)",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
                whileHover={{
                  backgroundPosition: ["0% center", "200% center"],
                  textShadow: "0 0 40px rgba(96,165,250,0.6)",
                  scale: 1.03,
                }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              >
                I B C&nbsp;&nbsp;&nbsp;C O R E
              </motion.h1>

              {/* Decorative line */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: 80 }}
                transition={{ duration: 0.8, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="h-[3px] rounded-full mb-5"
                style={{
                  background: "linear-gradient(90deg, rgba(96,165,250,0.8), rgba(96,165,250,0.1))",
                }}
              />

              <p className="text-base text-white/45 leading-relaxed max-w-md">
                Centro de operaciones para gestion logistica, cotizaciones, embarques
                y facturacion del grupo siderurgico.
              </p>
            </motion.div>
          </div>

          {/* Bottom - Copyright */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
          >
            <p className="text-xs text-white/25">
              &copy; {new Date().getFullYear()} IBC Steel Group. Todos los derechos reservados.
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center relative bg-slate-50">
        {/* Subtle background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-60 -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-50 rounded-full blur-3xl opacity-50 translate-y-1/3 -translate-x-1/4" />
        </div>

        {/* Dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: "radial-gradient(#cbd5e1 0.5px, transparent 0.5px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative z-10 w-full max-w-[420px] px-8">
          {/* Mobile logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="lg:hidden text-center mb-10"
          >
            <div className="inline-flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#1E3A5F] flex items-center justify-center">
                <span className="text-white font-bold text-sm">IBC</span>
              </div>
              <span className="text-xl font-bold text-[#1E3A5F]">Steel Group</span>
            </div>
          </motion.div>

          {/* Welcome text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Bienvenido de vuelta
            </h2>
            <p className="text-sm text-slate-500">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </motion.div>

          {/* Login form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email field */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Correo electronico
              </label>
              <div
                className={`relative rounded-xl transition-all duration-300 ${
                  focusedField === "email"
                    ? "ring-2 ring-[#1E3A5F]/20 shadow-lg shadow-[#1E3A5F]/5"
                    : "shadow-sm"
                }`}
              >
                <div
                  className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                    focusedField === "email" ? "text-[#1E3A5F]" : "text-slate-400"
                  }`}
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
                  className="pl-11 h-12 bg-white border-slate-200/80 rounded-xl text-sm placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#1E3A5F]/30"
                />
              </div>
            </motion.div>

            {/* Password field */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Contrasena
              </label>
              <div
                className={`relative rounded-xl transition-all duration-300 ${
                  focusedField === "password"
                    ? "ring-2 ring-[#1E3A5F]/20 shadow-lg shadow-[#1E3A5F]/5"
                    : "shadow-sm"
                }`}
              >
                <div
                  className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                    focusedField === "password"
                      ? "text-[#1E3A5F]"
                      : "text-slate-400"
                  }`}
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
                  className="pl-11 pr-11 h-12 bg-white border-slate-200/80 rounded-xl text-sm placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#1E3A5F]/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-200"
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
            </motion.div>

            {/* Submit button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="pt-2"
            >
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl text-sm font-semibold tracking-wide transition-all duration-300 relative overflow-hidden group"
                style={{
                  background: loading
                    ? "#94a3b8"
                    : "linear-gradient(135deg, #1E3A5F 0%, #2a5298 100%)",
                  boxShadow: loading
                    ? "none"
                    : "0 4px 15px -3px rgba(30,58,95,0.4), 0 0 0 1px rgba(30,58,95,0.1)",
                }}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                {loading ? (
                  <div className="flex items-center gap-2.5">
                    <motion.div
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        ease: "linear",
                      }}
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
            </motion.div>
          </form>

          {/* Security note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Conexion protegida con cifrado de extremo a extremo</span>
          </motion.div>

          {/* Credits */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="mt-8 text-center"
          >
            <div className="inline-flex flex-col items-center gap-1 px-5 py-2.5 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200/80 shadow-sm">
              <span className="text-[9px] text-slate-400 uppercase tracking-[0.2em] font-medium">
                Desarrollado por
              </span>
              <span className="text-sm text-[#1E3A5F] font-bold tracking-wide">
                Maria Camila Mesa
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
