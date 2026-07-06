"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const BEACON = "#00B8E0";

export function WelcomeAnimation() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: "#050F1B" }}
        >
          {/* Puerto difuminado — misma imagen del login para continuidad */}
          <motion.div
            initial={{ scale: 1.12 }}
            animate={{ scale: 1.04 }}
            transition={{ duration: 3.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
            style={{
              backgroundImage: "url(/login-port.jpg)",
              backgroundSize: "cover",
              backgroundPosition: "center 38%",
              filter: "blur(2.5px) saturate(0.9)",
            }}
          />
          {/* Duotono navy + vignette */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(1200px 800px at 50% 42%, rgba(6,27,46,0.42) 0%, rgba(4,15,27,0.72) 70%, rgba(3,11,20,0.86) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(4,15,27,0.55) 0%, transparent 35%, transparent 60%, rgba(4,15,27,0.75) 100%)" }}
          />

          {/* ═══ Lockup central ═══ */}
          <div className="relative flex flex-col items-center">
            {/* Placa del logo */}
            <motion.div
              initial={{ scale: 0.82, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="relative mb-9"
            >
              <div
                className="relative w-28 h-28 rounded-3xl flex items-center justify-center"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  backdropFilter: "blur(18px)",
                  border: "1px solid rgba(255,255,255,0.16)",
                  boxShadow: "0 24px 64px -16px rgba(2,10,20,0.7), inset 0 1px 0 rgba(255,255,255,0.18)",
                }}
              >
                <Image
                  src="/logo-ibc.png"
                  alt="IBC Steel Group"
                  width={76}
                  height={76}
                  className="object-contain brightness-0 invert drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
                  priority
                />
              </div>
              {/* Halo beacon */}
              <div
                className="absolute -inset-4 rounded-[32px] pointer-events-none"
                style={{
                  border: `1px solid rgba(0,184,224,0.18)`,
                  animation: "pulse-glow 3s ease-in-out infinite",
                }}
              />
            </motion.div>

            {/* Wordmark */}
            <motion.h1
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif",
                fontWeight: 600,
                fontSize: 44,
                letterSpacing: "0.16em",
                background: "linear-gradient(120deg, #FFFFFF 0%, #DCEBF7 45%, #9CC6E8 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 2px 16px rgba(4,15,27,0.6))",
              }}
            >
              IBC CORE
            </motion.h1>

            {/* Barra de acento */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 56, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mt-4 mb-3.5"
              style={{ height: 2.5, borderRadius: 99, background: `linear-gradient(90deg, ${BEACON}, rgba(0,184,224,0.15))` }}
            />

            <motion.p
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.55 }}
              className="text-[13px]"
              style={{
                fontFamily: "var(--font-jetbrains-mono), monospace",
                letterSpacing: "0.24em",
                color: "rgba(255,255,255,0.55)",
                textTransform: "uppercase",
              }}
            >
              Centro de operaciones logísticas
            </motion.p>

            {/* Barra de progreso */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.85 }}
              className="mt-10 h-[3px] w-[220px] rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.10)" }}
            >
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1.4, delay: 0.9, ease: "easeInOut", repeat: Infinity }}
                className="h-full w-1/2 rounded-full"
                style={{ background: `linear-gradient(90deg, transparent, ${BEACON}, transparent)` }}
              />
            </motion.div>
          </div>

          {/* Crédito */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.15 }}
            className="absolute bottom-8 flex flex-col items-center gap-1"
          >
            <span
              className="text-[9px] uppercase"
              style={{ fontFamily: "var(--font-jetbrains-mono), monospace", letterSpacing: "0.26em", color: "rgba(255,255,255,0.38)" }}
            >
              Desarrollado por
            </span>
            <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>
              Maria Camila Mesa
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
