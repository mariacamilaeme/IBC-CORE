import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow, parseISO } from "date-fns"
import { es } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy", { locale: es });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy HH:mm", { locale: es });
}

export function formatRelativeDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

export function formatCurrency(amount: number | null | undefined, currency: string = "USD"): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number | null | undefined): string {
  if (num == null) return "—";
  return new Intl.NumberFormat("es-CO").format(num);
}

export const QUOTATION_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  en_proceso: "En Proceso",
  enviada_cliente: "Enviada al Cliente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  contrato: "Contrato",
  vencida: "Vencida",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  parcial: "Parcial",
  pagada: "Pagada",
  vencida: "Vencida",
  anulada: "Anulada",
};

export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  reservado: "Reservado",
  en_puerto_origen: "En Puerto Origen",
  en_transito: "En Tránsito",
  en_puerto_destino: "En Puerto Destino",
  en_aduana: "En Aduana",
  nacionalizado: "Nacionalizado",
  entregado: "Entregado",
  con_novedad: "Con Novedad",
};

export const PRODUCT_LINE_LABELS: Record<string, string> = {
  agro: "Agro",
  mp: "MP",
  maquinas: "Máquinas",
  otro: "Otro",
};

export const CLIENT_TYPE_LABELS: Record<string, string> = {
  nacional: "Nacional",
  internacional: "Internacional",
  distribuidor: "Distribuidor",
  usuario_final: "Usuario Final",
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  directora: "Directora",
  analista: "Analista",
  comercial: "Comercial",
};

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  "ENTREGADO AL CLIENTE": "ENTREGADO AL CLIENTE",
  "EN TRÁNSITO": "EN TRÁNSITO",
  "EN PRODUCCIÓN": "EN PRODUCCIÓN",
  "ANULADO": "ANULADO",
  "PENDIENTE ANTICIPO": "PENDIENTE ANTICIPO",
};

export const CONTRACT_STATUS_COLORS: Record<string, string> = {
  "ENTREGADO AL CLIENTE": "bg-green-100 text-green-800 border-green-200",
  "EN TRÁNSITO": "bg-blue-100 text-blue-800 border-blue-200",
  "EN PRODUCCIÓN": "bg-amber-100 text-amber-800 border-amber-200",
  "ANULADO": "bg-red-100 text-red-800 border-red-200",
  "PENDIENTE ANTICIPO": "bg-gray-100 text-gray-800 border-gray-200",
};

export const PRIORITY_LABELS: Record<string, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  urgente: "Urgente",
};

export const REMINDER_TYPE_LABELS: Record<string, string> = {
  pago: "Pago",
  contrato: "Contrato",
  anticipo: "Anticipo",
  liberacion: "Liberación",
  motonave: "Motonave",
  produccion: "Producción",
  custom: "Personalizado",
};

export const TASK_CATEGORY_LABELS: Record<string, string> = {
  seguimiento_pago: "Seguimiento de Pago",
  firma_contrato: "Firma de Contrato",
  anticipo_pendiente: "Anticipo Pendiente",
  liberacion: "Liberación BL",
  logistica: "Logística",
  documentos: "Documentos",
  produccion: "Producción",
  general: "General",
  otro: "Otro",
};

export const TASK_CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  seguimiento_pago: { bg: "bg-[#ECFDF3]", text: "text-[#0D9F6E]" },
  firma_contrato: { bg: "bg-[#E8F0FE]", text: "text-[#0B5394]" },
  anticipo_pendiente: { bg: "bg-[#FFF8EB]", text: "text-[#DC8B0B]" },
  liberacion: { bg: "bg-[#F3F0FF]", text: "text-[#7C5CFC]" },
  logistica: { bg: "bg-[#EFF6FF]", text: "text-[#3B82F6]" },
  documentos: { bg: "bg-[#EDFCFC]", text: "text-[#0EA5A5]" },
  produccion: { bg: "bg-[#FFF7ED]", text: "text-[#F97316]" },
  general: { bg: "bg-[#FAF9F7]", text: "text-[#6B7080]" },
  otro: { bg: "bg-[#F5F3EF]", text: "text-[#8B7355]" },
};

export const PRIORITY_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  urgente: { dot: "bg-[#E63946]", bg: "bg-[#FFF1F2]", text: "text-[#E63946]" },
  alta: { dot: "bg-[#E63946]", bg: "bg-[#FFF1F2]", text: "text-[#E63946]" },
  media: { dot: "bg-[#DC8B0B]", bg: "bg-[#FFF8EB]", text: "text-[#DC8B0B]" },
  baja: { dot: "bg-[#6B7080]", bg: "bg-[#FAF9F7]", text: "text-[#6B7080]" },
};

export const NOTE_COLORS: Record<string, { bg: string; border: string }> = {
  default: { bg: "bg-white", border: "border-[#E8E6E1]" },
  blue: { bg: "bg-[#EFF6FF]", border: "border-[#3B82F6]/20" },
  green: { bg: "bg-[#ECFDF3]", border: "border-[#0D9F6E]/20" },
  amber: { bg: "bg-[#FFF8EB]", border: "border-[#DC8B0B]/20" },
  red: { bg: "bg-[#FFF1F2]", border: "border-[#E63946]/20" },
  violet: { bg: "bg-[#F3F0FF]", border: "border-[#7C5CFC]/20" },
};

export const REMINDER_LEAD_OPTIONS = [
  { value: "same_day", label: "El mismo día", offset: 0 },
  { value: "1_day", label: "1 día antes", offset: 1 },
  { value: "3_days", label: "3 días antes", offset: 3 },
  { value: "1_week", label: "1 semana antes", offset: 7 },
  { value: "2_weeks", label: "2 semanas antes", offset: 14 },
  { value: "1_month", label: "1 mes antes", offset: 30 },
];

/**
 * Sanitize user input for use in PostgREST .or() filter strings.
 * Escapes characters that could inject additional filter clauses.
 */
export function sanitizePostgrestValue(input: string): string {
  return input.replace(/[,.()*\\]/g, "");
}
