// ---------------------------------------------------------------------------
// Shared Types, Constants & Helpers for Quotations Module
// ---------------------------------------------------------------------------

export interface ReportQuotation {
  id: string | null;
  customer: string;
  materials: string;
  requestDate: string | null;
  issueDate: string | null;
  status: string;
  requestedBy: string;
  country: string;
  continent: string;
  category: string;
  responseTime: number | null;
  contractDate: string | null;
  contractNo: string | null;
  daysElapsed: number | null;
  chinaTime: number | null;
  chinaStatus: string | null;
}

export const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; border: string; icon: string; label: string }
> = {
  Aprobado: {
    color: "#059669",
    bg: "#ECFDF5",
    border: "#A7F3D0",
    icon: "\u2713",
    label: "Aprobado",
  },
  Finalizado: {
    color: "#6366F1",
    bg: "#EEF2FF",
    border: "#C7D2FE",
    icon: "\u25C6",
    label: "Finalizado",
  },
  "En negociaci\u00f3n": {
    color: "#0891B2",
    bg: "#ECFEFF",
    border: "#A5F3FC",
    icon: "\u27F3",
    label: "En negociaci\u00f3n",
  },
  "Pendiente cotizaci\u00f3n": {
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
    icon: "\u25EF",
    label: "Pendiente",
  },
};

export const CATEGORY_CONFIG: Record<
  string,
  { label: string; short: string; color: string; bg: string }
> = {
  MP: { label: "Materia Prima", short: "MP", color: "#2563EB", bg: "#EFF6FF" },
  "LINEA AGRO": {
    label: "L\u00ednea Agro",
    short: "AGRO",
    color: "#059669",
    bg: "#ECFDF5",
  },
  MAQUINARIA: {
    label: "Maquinaria",
    short: "MAQ",
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
  REPUESTOS: {
    label: "Repuestos",
    short: "REP",
    color: "#D97706",
    bg: "#FFFBEB",
  },
};

export const getCountryFlag = (country: string): string => {
  if (!country) return "\uD83C\uDF10";
  const lower = country.toLowerCase();
  if (lower.includes("colombia")) return "\uD83C\uDDE8\uD83C\uDDF4";
  if (lower.includes("chile")) return "\uD83C\uDDE8\uD83C\uDDF1";
  if (lower.includes("emiratos") || lower.includes("uae"))
    return "\uD83C\uDDE6\uD83C\uDDEA";
  if (lower.includes("venezuela")) return "\uD83C\uDDFB\uD83C\uDDEA";
  return "\uD83C\uDF10";
};

export const fmtDate = (dateStr: string | null): string => {
  if (!dateStr) return "\u2014";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const avatarColor = (name: string): string => {
  const colors = [
    "#2563EB",
    "#059669",
    "#D97706",
    "#7C3AED",
    "#DC2626",
    "#0891B2",
    "#C026D3",
    "#EA580C",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};
