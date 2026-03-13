// =====================================================
// Feriados oficiales de Colombia y China (2025-2027)
// =====================================================

export interface Holiday {
  date: string; // "YYYY-MM-DD"
  name: string;
  country: "CO" | "CN";
}

export const HOLIDAYS: Holiday[] = [
  // ─── COLOMBIA 2025 ────────────────────────────────────
  { date: "2025-01-01", name: "Año Nuevo", country: "CO" },
  { date: "2025-01-06", name: "Día de los Reyes Magos", country: "CO" },
  { date: "2025-03-24", name: "Día de San José", country: "CO" },
  { date: "2025-04-17", name: "Jueves Santo", country: "CO" },
  { date: "2025-04-18", name: "Viernes Santo", country: "CO" },
  { date: "2025-05-01", name: "Día del Trabajo", country: "CO" },
  { date: "2025-06-02", name: "Ascensión del Señor", country: "CO" },
  { date: "2025-06-23", name: "Corpus Christi", country: "CO" },
  { date: "2025-06-30", name: "Sagrado Corazón de Jesús", country: "CO" },
  { date: "2025-06-30", name: "San Pedro y San Pablo", country: "CO" },
  { date: "2025-07-20", name: "Día de la Independencia", country: "CO" },
  { date: "2025-08-07", name: "Batalla de Boyacá", country: "CO" },
  { date: "2025-08-18", name: "Asunción de la Virgen", country: "CO" },
  { date: "2025-10-13", name: "Día de la Raza", country: "CO" },
  { date: "2025-11-03", name: "Todos los Santos", country: "CO" },
  { date: "2025-11-17", name: "Independencia de Cartagena", country: "CO" },
  { date: "2025-12-08", name: "Inmaculada Concepción", country: "CO" },
  { date: "2025-12-25", name: "Navidad", country: "CO" },

  // ─── COLOMBIA 2026 ────────────────────────────────────
  { date: "2026-01-01", name: "Año Nuevo", country: "CO" },
  { date: "2026-01-12", name: "Día de los Reyes Magos", country: "CO" },
  { date: "2026-03-23", name: "Día de San José", country: "CO" },
  { date: "2026-04-02", name: "Jueves Santo", country: "CO" },
  { date: "2026-04-03", name: "Viernes Santo", country: "CO" },
  { date: "2026-05-01", name: "Día del Trabajo", country: "CO" },
  { date: "2026-05-18", name: "Ascensión del Señor", country: "CO" },
  { date: "2026-06-08", name: "Corpus Christi", country: "CO" },
  { date: "2026-06-15", name: "Sagrado Corazón de Jesús", country: "CO" },
  { date: "2026-06-29", name: "San Pedro y San Pablo", country: "CO" },
  { date: "2026-07-20", name: "Día de la Independencia", country: "CO" },
  { date: "2026-08-07", name: "Batalla de Boyacá", country: "CO" },
  { date: "2026-08-17", name: "Asunción de la Virgen", country: "CO" },
  { date: "2026-10-12", name: "Día de la Raza", country: "CO" },
  { date: "2026-11-02", name: "Todos los Santos", country: "CO" },
  { date: "2026-11-16", name: "Independencia de Cartagena", country: "CO" },
  { date: "2026-12-08", name: "Inmaculada Concepción", country: "CO" },
  { date: "2026-12-25", name: "Navidad", country: "CO" },

  // ─── COLOMBIA 2027 ────────────────────────────────────
  { date: "2027-01-01", name: "Año Nuevo", country: "CO" },
  { date: "2027-01-11", name: "Día de los Reyes Magos", country: "CO" },
  { date: "2027-03-22", name: "Día de San José", country: "CO" },
  { date: "2027-03-25", name: "Jueves Santo", country: "CO" },
  { date: "2027-03-26", name: "Viernes Santo", country: "CO" },
  { date: "2027-05-01", name: "Día del Trabajo", country: "CO" },
  { date: "2027-05-10", name: "Ascensión del Señor", country: "CO" },
  { date: "2027-05-31", name: "Corpus Christi", country: "CO" },
  { date: "2027-06-07", name: "Sagrado Corazón de Jesús", country: "CO" },
  { date: "2027-06-28", name: "San Pedro y San Pablo", country: "CO" },
  { date: "2027-07-20", name: "Día de la Independencia", country: "CO" },
  { date: "2027-08-07", name: "Batalla de Boyacá", country: "CO" },
  { date: "2027-08-16", name: "Asunción de la Virgen", country: "CO" },
  { date: "2027-10-18", name: "Día de la Raza", country: "CO" },
  { date: "2027-11-01", name: "Todos los Santos", country: "CO" },
  { date: "2027-11-15", name: "Independencia de Cartagena", country: "CO" },
  { date: "2027-12-08", name: "Inmaculada Concepción", country: "CO" },
  { date: "2027-12-25", name: "Navidad", country: "CO" },

  // ─── CHINA 2025 ───────────────────────────────────────
  { date: "2025-01-01", name: "元旦 Año Nuevo", country: "CN" },
  { date: "2025-01-28", name: "春节 Festival de Primavera", country: "CN" },
  { date: "2025-01-29", name: "春节 Festival de Primavera", country: "CN" },
  { date: "2025-01-30", name: "春节 Festival de Primavera", country: "CN" },
  { date: "2025-01-31", name: "春节 Festival de Primavera", country: "CN" },
  { date: "2025-02-01", name: "春节 Festival de Primavera", country: "CN" },
  { date: "2025-02-02", name: "春节 Festival de Primavera", country: "CN" },
  { date: "2025-02-03", name: "春节 Festival de Primavera", country: "CN" },
  { date: "2025-02-04", name: "春节 Festival de Primavera", country: "CN" },
  { date: "2025-04-04", name: "清明节 Qingming", country: "CN" },
  { date: "2025-04-05", name: "清明节 Qingming", country: "CN" },
  { date: "2025-04-06", name: "清明节 Qingming", country: "CN" },
  { date: "2025-05-01", name: "劳动节 Día del Trabajo", country: "CN" },
  { date: "2025-05-02", name: "劳动节 Día del Trabajo", country: "CN" },
  { date: "2025-05-03", name: "劳动节 Día del Trabajo", country: "CN" },
  { date: "2025-05-04", name: "劳动节 Día del Trabajo", country: "CN" },
  { date: "2025-05-05", name: "劳动节 Día del Trabajo", country: "CN" },
  { date: "2025-05-31", name: "端午节 Festival del Bote Dragón", country: "CN" },
  { date: "2025-06-01", name: "端午节 Festival del Bote Dragón", country: "CN" },
  { date: "2025-06-02", name: "端午节 Festival del Bote Dragón", country: "CN" },
  { date: "2025-10-01", name: "国庆节 Día Nacional", country: "CN" },
  { date: "2025-10-02", name: "国庆节 Día Nacional", country: "CN" },
  { date: "2025-10-03", name: "国庆节 Día Nacional", country: "CN" },
  { date: "2025-10-04", name: "中秋节 Festival del Medio Otoño", country: "CN" },
  { date: "2025-10-05", name: "国庆节 Día Nacional", country: "CN" },
  { date: "2025-10-06", name: "国庆节 Día Nacional", country: "CN" },
  { date: "2025-10-07", name: "国庆节 Día Nacional", country: "CN" },
  { date: "2025-10-08", name: "国庆节 Día Nacional", country: "CN" },

  // ─── CHINA 2026 ───────────────────────────────────────
  { date: "2026-01-01", name: "元旦 Año Nuevo", country: "CN" },
  { date: "2026-02-17", name: "春节 Festival de Primavera", country: "CN" },
  { date: "2026-02-18", name: "春节 Festival de Primavera", country: "CN" },
  { date: "2026-02-19", name: "春节 Festival de Primavera", country: "CN" },
  { date: "2026-02-20", name: "春节 Festival de Primavera", country: "CN" },
  { date: "2026-02-21", name: "春节 Festival de Primavera", country: "CN" },
  { date: "2026-02-22", name: "春节 Festival de Primavera", country: "CN" },
  { date: "2026-02-23", name: "春节 Festival de Primavera", country: "CN" },
  { date: "2026-04-05", name: "清明节 Qingming", country: "CN" },
  { date: "2026-04-06", name: "清明节 Qingming", country: "CN" },
  { date: "2026-04-07", name: "清明节 Qingming", country: "CN" },
  { date: "2026-05-01", name: "劳动节 Día del Trabajo", country: "CN" },
  { date: "2026-05-02", name: "劳动节 Día del Trabajo", country: "CN" },
  { date: "2026-05-03", name: "劳动节 Día del Trabajo", country: "CN" },
  { date: "2026-05-04", name: "劳动节 Día del Trabajo", country: "CN" },
  { date: "2026-05-05", name: "劳动节 Día del Trabajo", country: "CN" },
  { date: "2026-06-19", name: "端午节 Festival del Bote Dragón", country: "CN" },
  { date: "2026-06-20", name: "端午节 Festival del Bote Dragón", country: "CN" },
  { date: "2026-06-21", name: "端午节 Festival del Bote Dragón", country: "CN" },
  { date: "2026-10-01", name: "国庆节 Día Nacional", country: "CN" },
  { date: "2026-10-02", name: "国庆节 Día Nacional", country: "CN" },
  { date: "2026-10-03", name: "国庆节 Día Nacional", country: "CN" },
  { date: "2026-10-04", name: "国庆节 Día Nacional", country: "CN" },
  { date: "2026-10-05", name: "国庆节 Día Nacional", country: "CN" },
  { date: "2026-10-06", name: "国庆节 Día Nacional", country: "CN" },
  { date: "2026-10-07", name: "国庆节 Día Nacional", country: "CN" },

  // ─── CHINA 2027 ───────────────────────────────────────
  { date: "2027-01-01", name: "元旦 Año Nuevo", country: "CN" },
  { date: "2027-02-06", name: "春节 Festival de Primavera", country: "CN" },
  { date: "2027-02-07", name: "春节 Festival de Primavera", country: "CN" },
  { date: "2027-02-08", name: "春节 Festival de Primavera", country: "CN" },
  { date: "2027-02-09", name: "春节 Festival de Primavera", country: "CN" },
  { date: "2027-02-10", name: "春节 Festival de Primavera", country: "CN" },
  { date: "2027-02-11", name: "春节 Festival de Primavera", country: "CN" },
  { date: "2027-02-12", name: "春节 Festival de Primavera", country: "CN" },
  { date: "2027-04-05", name: "清明节 Qingming", country: "CN" },
  { date: "2027-04-06", name: "清明节 Qingming", country: "CN" },
  { date: "2027-04-07", name: "清明节 Qingming", country: "CN" },
  { date: "2027-05-01", name: "劳动节 Día del Trabajo", country: "CN" },
  { date: "2027-05-02", name: "劳动节 Día del Trabajo", country: "CN" },
  { date: "2027-05-03", name: "劳动节 Día del Trabajo", country: "CN" },
  { date: "2027-06-09", name: "端午节 Festival del Bote Dragón", country: "CN" },
  { date: "2027-06-10", name: "端午节 Festival del Bote Dragón", country: "CN" },
  { date: "2027-06-11", name: "端午节 Festival del Bote Dragón", country: "CN" },
  { date: "2027-10-01", name: "国庆节 Día Nacional", country: "CN" },
  { date: "2027-10-02", name: "国庆节 Día Nacional", country: "CN" },
  { date: "2027-10-03", name: "国庆节 Día Nacional", country: "CN" },
  { date: "2027-10-04", name: "国庆节 Día Nacional", country: "CN" },
  { date: "2027-10-05", name: "国庆节 Día Nacional", country: "CN" },
  { date: "2027-10-06", name: "国庆节 Día Nacional", country: "CN" },
  { date: "2027-10-07", name: "国庆节 Día Nacional", country: "CN" },
];

/** Get holidays for a specific month */
export function getHolidaysForMonth(year: number, month: number): Holiday[] {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  return HOLIDAYS.filter((h) => h.date.startsWith(prefix));
}

/** Get holiday(s) for a specific date */
export function getHolidaysForDate(dateStr: string): Holiday[] {
  return HOLIDAYS.filter((h) => h.date === dateStr);
}

/** Check if a date is a holiday */
export function isHoliday(dateStr: string): boolean {
  return HOLIDAYS.some((h) => h.date === dateStr);
}
