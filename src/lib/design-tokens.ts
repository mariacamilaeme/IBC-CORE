// ===========================================================================
// IBC CORE — Design Tokens · "Sala de Cartas"
// Paleta acero + carta náutica. Blanco + azul IBC, fríos, sin cremas cálidos.
// Todas las keys se conservan: cambiar valores aquí re-tematiza toda la app.
// ===========================================================================

export const T = {
  // Background & Surfaces — papel de carta náutica (frío, no crema)
  bg: "#F3F7FB",
  surface: "#FFFFFF",
  surfaceHover: "#F8FBFD",
  surfaceAlt: "#F4F8FC",

  // Text colors (Ink) — tinta de profundidad marina, NUNCA #000000
  ink: "#061B2E",
  inkSoft: "#243A50",
  inkMuted: "#51647A",
  inkLight: "#8496AB",
  inkGhost: "#BFCBD9",

  // Accent (IBC Brand Blue)
  accent: "#0B5394",
  accentLight: "#E8F1FB",
  accentDark: "#083D6E",
  accentVivid: "#1A6FD1",

  // Beacon — cian instrumental (faro / radar), acento de firma
  beacon: "#00B8E0",
  beaconBg: "#E3F7FC",

  // Status - Success
  success: "#16A34A",
  successSoft: "#D1FAE5",
  successBg: "#DCFCE7",

  // Status - Warning
  warning: "#CA8A04",
  warningBg: "#FEF9C3",
  warningSoft: "#FEF3C7",

  // Status - Danger
  danger: "#DC2626",
  dangerBg: "#FEE2E2",
  dangerSoft: "#FECDD3",

  // Secondary colors
  blue: "#2563EB",
  blueBg: "#DBEAFE",
  violet: "#7C5CFC",
  violetBg: "#F3F0FF",
  teal: "#0EA5A5",
  tealBg: "#EDFCFC",
  orange: "#F97316",
  orangeBg: "#FFF7ED",

  // Borders — acero frío
  border: "#D9E3EF",
  borderLight: "#E7EEF6",
  borderFocus: "#0B539444",

  // Glass effect
  glassBg: "rgba(255,255,255,0.80)",
  glassBorder: "rgba(11,83,148,0.09)",
  glassBlur: "blur(20px)",

  // Shadows — tintadas con brand color, NUNCA gris genérico
  shadow: "0 1px 3px rgba(6,27,46,0.05), 0 2px 8px rgba(11,83,148,0.05)",
  shadowMd: "0 4px 14px rgba(11,83,148,0.07), 0 1px 4px rgba(6,27,46,0.05)",
  shadowLg: "0 10px 28px rgba(11,83,148,0.10), 0 2px 8px rgba(6,27,46,0.05)",
  shadowAccent: "0 4px 18px rgba(11,83,148,0.14)",
  shadowTeal: "0 4px 16px rgba(14,165,165,0.10)",
  shadowGlass: "0 4px 24px rgba(11,83,148,0.06), 0 1px 4px rgba(6,27,46,0.04), 0 0 0 1px rgba(255,255,255,0.55)",

  // Gradients — acero y mar, sin pasteles multicolor
  gradientBg: "linear-gradient(160deg, #EAF2FA 0%, #F2F7FB 40%, #EDF4F9 70%, #E9F1F8 100%)",
  gradientPrimary: "linear-gradient(135deg, #083D6E, #0B5394)",
  gradientAccent: "linear-gradient(135deg, #0B72B8, #00B8E0)",
  gradientMixed: "linear-gradient(135deg, #0B5394, #00B8E0)",
  gradientSidebar: "linear-gradient(180deg, #050F1B 0%, #081C30 55%, #061524 100%)",

  // Border Radius
  radius: "16px",
  radiusMd: "12px",
  radiusSm: "8px",
  radiusXs: "6px",
} as const;
