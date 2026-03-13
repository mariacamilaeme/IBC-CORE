"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

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
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-[#1E3A5F] via-[#2a4a73] to-[#1a2e4a]"
        >
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 25px 25px, white 1px, transparent 1px)`,
              backgroundSize: '50px 50px'
            }} />
          </div>

          {/* Logo */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative mb-8"
          >
            <div className="relative w-28 h-28 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-2xl animate-pulse-glow">
              <Image
                src="/logo-ibc.png"
                alt="IBC Steel Group"
                width={80}
                height={80}
                className="object-contain"
                priority
              />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-4xl font-bold text-white mb-2"
          >
            IBC Core
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-blue-200/70 text-lg mb-8"
          >
            IBC Steel Group
          </motion.p>

          {/* Loading bar */}
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 200, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.7 }}
            className="h-1 bg-white/10 rounded-full overflow-hidden"
          >
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{
                duration: 1.5,
                delay: 0.8,
                ease: "easeInOut",
                repeat: Infinity,
              }}
              className="h-full w-1/2 bg-gradient-to-r from-transparent via-blue-400 to-transparent rounded-full"
            />
          </motion.div>

          {/* Developer credit */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2 }}
            className="absolute bottom-8 flex flex-col items-center gap-0.5"
          >
            <span className="text-[10px] text-blue-200/40 uppercase tracking-[0.2em]">
              Desarrollado por
            </span>
            <span className="text-sm font-semibold text-[#D4A843]">
              Maria Camila Mesa
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
