"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from "recharts";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  CheckCircle2,
  Clock,
  Globe2,
  BarChart3,
  Target,
  Zap,
  AlertTriangle,
  Timer,
} from "lucide-react";
import type { ReportQuotation } from "./constants";

// ---------------------------------------------------------------------------
// Helpers to compute dashboard data from props
// ---------------------------------------------------------------------------

import { CATEGORY_CONFIG } from "./constants";

const STATUS_COLORS: Record<string, string> = {
  Finalizado: "#6366F1",
  "Pendiente cotización": "#D97706",
  Aprobado: "#059669",
  "En negociación": "#0891B2",
};

const CATEGORY_COLORS: Record<string, string> = {
  MP: "#2563EB",
  MAQUINARIA: "#7C3AED",
  "LINEA AGRO": "#059669",
  REPUESTOS: "#D97706",
};

function computeDashboardData(data: ReportQuotation[]) {
  const total = data.length;
  const approved = data.filter((d) => d.status === "Aprobado").length;
  const pendiente = data.filter((d) => d.status === "Pendiente cotización").length;
  const negociacion = data.filter((d) => d.status === "En negociación").length;
  const finalizado = data.filter((d) => d.status === "Finalizado").length;
  const inProcess = pendiente + negociacion;
  const uniqueClients = new Set(data.map((d) => d.customer)).size;

  const responseTimes = data.filter((d) => d.responseTime != null).map((d) => d.responseTime!);
  const avgResponseDays = responseTimes.length > 0
    ? Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 10) / 10
    : 0;

  const chinaTimes = data.filter((d) => d.chinaTime != null).map((d) => d.chinaTime!);
  const avgChinaDays = chinaTimes.length > 0
    ? Math.round((chinaTimes.reduce((a, b) => a + b, 0) / chinaTimes.length) * 10) / 10
    : 0;

  const approvalRate = total > 0 ? Math.round((approved / total) * 1000) / 10 : 0;
  const closeRate = total > 0 ? Math.round((finalizado / total) * 1000) / 10 : 0;

  const KPI = { total, approved, inProcess, uniqueClients, avgResponseDays, approvalRate, closeRate, avgChinaDays };

  // Status distribution
  const statusCounts: Record<string, number> = {};
  data.forEach((d) => { statusCounts[d.status] = (statusCounts[d.status] || 0) + 1; });
  const GESTION = Object.entries(statusCounts)
    .map(([estado, cantidad]) => ({
      estado,
      cantidad,
      pct: total > 0 ? Math.round((cantidad / total) * 1000) / 10 : 0,
      color: STATUS_COLORS[estado] || "#94A3B8",
    }))
    .sort((a, b) => b.cantidad - a.cantidad);

  // Commercial performance
  const commercialMap: Record<string, { total: number; aprobadas: number; pendientes: number; negociacion: number; times: number[] }> = {};
  data.forEach((d) => {
    const name = d.requestedBy || "Sin asignar";
    if (!commercialMap[name]) commercialMap[name] = { total: 0, aprobadas: 0, pendientes: 0, negociacion: 0, times: [] };
    commercialMap[name].total++;
    if (d.status === "Aprobado") commercialMap[name].aprobadas++;
    if (d.status === "Pendiente cotización") commercialMap[name].pendientes++;
    if (d.status === "En negociación") commercialMap[name].negociacion++;
    if (d.responseTime != null) commercialMap[name].times.push(d.responseTime);
  });
  const COMERCIALES = Object.entries(commercialMap)
    .map(([name, v]) => ({
      name,
      total: v.total,
      aprobadas: v.aprobadas,
      efectividad: v.total > 0 ? Math.round((v.aprobadas / v.total) * 1000) / 10 : 0,
      pendientes: v.pendientes,
      negociacion: v.negociacion,
    }))
    .sort((a, b) => b.total - a.total);

  // Response times by commercial
  const TIEMPOS = Object.entries(commercialMap)
    .filter(([, v]) => v.times.length > 0)
    .map(([name, v]) => ({
      name,
      cotizaciones: v.times.length,
      promedio: Math.round((v.times.reduce((a, b) => a + b, 0) / v.times.length) * 10) / 10,
      min: Math.min(...v.times),
      max: Math.max(...v.times),
    }))
    .sort((a, b) => a.promedio - b.promedio);

  // Product lines
  const catCounts: Record<string, number> = {};
  data.forEach((d) => { const cat = d.category || "Otro"; catCounts[cat] = (catCounts[cat] || 0) + 1; });
  const LINEAS = Object.entries(catCounts)
    .map(([linea, cantidad]) => ({
      linea,
      label: CATEGORY_CONFIG[linea]?.label || linea,
      cantidad,
      pct: total > 0 ? Math.round((cantidad / total) * 1000) / 10 : 0,
      color: CATEGORY_COLORS[linea] || "#94A3B8",
    }))
    .sort((a, b) => b.cantidad - a.cantidad);

  const maxLinePct = Math.max(...LINEAS.map((l) => l.pct), 1);

  // Country distribution
  const countryCounts: Record<string, number> = {};
  data.forEach((d) => { const c = d.country || "Desconocido"; countryCounts[c] = (countryCounts[c] || 0) + 1; });
  const PAISES = Object.entries(countryCounts)
    .map(([pais, cantidad]) => ({
      pais,
      flag: getCountryFlagLocal(pais),
      cantidad,
      pct: total > 0 ? Math.round((cantidad / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.cantidad - a.cantidad);

  // China times
  const chinaAtrasado = data.filter((d) => d.chinaStatus === "Atrasado" || (d.chinaTime != null && d.chinaTime > 3)).length;
  const chinaATiempo = data.filter((d) => d.chinaStatus === "A tiempo" || (d.chinaTime != null && d.chinaTime <= 3)).length;
  const chinaTotal = chinaAtrasado + chinaATiempo || 1;
  const CHINA = {
    avgDays: avgChinaDays,
    atrasado: { cantidad: chinaAtrasado, pct: Math.round((chinaAtrasado / chinaTotal) * 1000) / 10 },
    aTiempo: { cantidad: chinaATiempo, pct: Math.round((chinaATiempo / chinaTotal) * 1000) / 10 },
  };

  return { KPI, GESTION, COMERCIALES, TIEMPOS, LINEAS, maxLinePct, PAISES, CHINA };
}

function getCountryFlagLocal(country: string): string {
  const flags: Record<string, string> = {
    Colombia: "\u{1F1E8}\u{1F1F4}", Venezuela: "\u{1F1FB}\u{1F1EA}", Chile: "\u{1F1E8}\u{1F1F1}",
    "Emiratos Árabes": "\u{1F1E6}\u{1F1EA}", Ecuador: "\u{1F1EA}\u{1F1E8}", Perú: "\u{1F1F5}\u{1F1EA}",
    México: "\u{1F1F2}\u{1F1FD}", Brasil: "\u{1F1E7}\u{1F1F7}", Argentina: "\u{1F1E6}\u{1F1F7}",
  };
  return flags[country] || "\u{1F30D}";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: "easeOut" as const },
  }),
};

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
  idx,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  accent: string;
  idx: number;
}) {
  return (
    <motion.div
      custom={idx}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" style={{ backgroundColor: accent }} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <p className="text-3xl font-extrabold text-[#1E3A5F] mt-1 tabular-nums">{value}</p>
          {subtitle && <p className="text-[11px] text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: accent + "18" }}
        >
          <Icon className="w-5 h-5" style={{ color: accent }} />
        </div>
      </div>
    </motion.div>
  );
}

function SectionCard({
  title,
  subtitle,
  accent,
  children,
  className = "",
  idx,
}: {
  title: string;
  subtitle?: string;
  accent: string;
  children: React.ReactNode;
  className?: string;
  idx: number;
}) {
  return (
    <motion.div
      custom={idx}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden ${className}`}
    >
      <div className="px-6 pt-5 pb-4 flex items-center gap-3">
        <div className="h-8 w-1 rounded-full" style={{ background: `linear-gradient(to bottom, ${accent}, ${accent}88)` }} />
        <div>
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="px-6 pb-6">{children}</div>
    </motion.div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-lg px-4 py-3">
      <p className="text-xs font-bold text-slate-700 mb-1.5">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <div key={i} className="flex items-center gap-2 text-[11px]">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-bold text-slate-800">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface Props {
  data: ReportQuotation[];
}

export default function ChartsDashboard({ data }: Props) {
  const { KPI, GESTION, COMERCIALES, TIEMPOS, LINEAS, maxLinePct, PAISES, CHINA } = React.useMemo(
    () => computeDashboardData(data),
    [data]
  );
  const CUTOFF_DATE = new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  const maxTotal = Math.max(...COMERCIALES.map((c) => c.total), 1);

  return (
    <div className="p-5 space-y-5">
      {/* ================================================================ */}
      {/* HEADER                                                            */}
      {/* ================================================================ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-xl font-extrabold text-[#1E3A5F] tracking-tight">
            Reporte Ejecutivo de Cotizaciones 2026
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            IBC Steel Group &mdash; Dashboard Gerencial
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-medium text-slate-600">
            Corte: {CUTOFF_DATE}
          </span>
        </div>
      </motion.div>

      {/* ================================================================ */}
      {/* KPI STRIP - Main (4 cards)                                        */}
      {/* ================================================================ */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard idx={0} title="Total Cotizaciones" value={KPI.total} subtitle="Acumulado 2026" icon={FileText} accent="#2563EB" />
        <KpiCard idx={1} title="Aprobadas" value={KPI.approved} subtitle={`${KPI.approvalRate}% tasa de aprobación`} icon={CheckCircle2} accent="#059669" />
        <KpiCard idx={2} title="En Proceso" value={KPI.inProcess} subtitle="Pendientes + En negociación" icon={Clock} accent="#D97706" />
        <KpiCard idx={3} title="Clientes Únicos" value={KPI.uniqueClients} subtitle="Empresas cotizadas" icon={Users} accent="#7C3AED" />
      </div>

      {/* ================================================================ */}
      {/* KPI STRIP - Secondary (4 metric pills)                            */}
      {/* ================================================================ */}
      <motion.div
        custom={4}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-4 gap-4"
      >
        {[
          { label: "Días Respuesta Prom.", value: `${KPI.avgResponseDays}`, unit: "días", icon: Timer, color: "#2563EB" },
          { label: "Tasa de Aprobación", value: `${KPI.approvalRate}%`, icon: Target, color: "#059669" },
          { label: "Tasa de Cierre", value: `${KPI.closeRate}%`, icon: TrendingUp, color: "#6366F1" },
          { label: "Días Resp. China Prom.", value: `${KPI.avgChinaDays}`, unit: "días", icon: Zap, color: "#0891B2" },
        ].map((m, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-gradient-to-r from-white to-slate-50/50 px-4 py-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: m.color + "14" }}>
              <m.icon className="w-4 h-4" style={{ color: m.color }} />
            </div>
            <div>
              <p className="text-lg font-extrabold text-[#1E3A5F] tabular-nums leading-tight">
                {m.value}
                {m.unit && <span className="text-xs font-medium text-slate-400 ml-1">{m.unit}</span>}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">{m.label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ================================================================ */}
      {/* ROW: GESTIÓN POR ESTADO + LÍNEAS DE NEGOCIO                       */}
      {/* ================================================================ */}
      <div className="grid grid-cols-2 gap-5">
        {/* Gestión por Estado */}
        <SectionCard idx={5} title="Gestión por Estado" subtitle="Distribución del pipeline de cotizaciones" accent="#6366F1">
          <div className="flex items-center gap-6">
            {/* Donut */}
            <div className="w-[180px] h-[180px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={GESTION}
                    dataKey="cantidad"
                    nameKey="estado"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    strokeWidth={0}
                    animationDuration={800}
                  >
                    {GESTION.map((g, i) => (
                      <Cell key={i} fill={g.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.[0] ? (
                        <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-lg px-3 py-2">
                          <p className="text-xs font-bold text-slate-700">{payload[0].name}</p>
                          <p className="text-[11px] text-slate-500">{payload[0].value} cotizaciones</p>
                        </div>
                      ) : null
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend + bars */}
            <div className="flex-1 space-y-3">
              {GESTION.map((g) => (
                <div key={g.estado}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: g.color }} />
                      <span className="text-xs font-medium text-slate-700">{g.estado}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 tabular-nums">{g.cantidad}</span>
                      <span className="text-[10px] text-slate-400 w-10 text-right tabular-nums">{g.pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${g.pct}%`, backgroundColor: g.color }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-medium">Total</span>
                <span className="text-sm font-extrabold text-[#1E3A5F]">{KPI.total}</span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Líneas de Negocio */}
        <SectionCard idx={6} title="Líneas de Negocio" subtitle="Participación por línea de producto" accent="#2563EB">
          <div className="flex items-center gap-6">
            {/* Pie */}
            <div className="w-[180px] h-[180px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={LINEAS}
                    dataKey="cantidad"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    strokeWidth={0}
                    animationDuration={800}
                  >
                    {LINEAS.map((l, i) => (
                      <Cell key={i} fill={l.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.[0] ? (
                        <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-lg px-3 py-2">
                          <p className="text-xs font-bold text-slate-700">{payload[0].name}</p>
                          <p className="text-[11px] text-slate-500">{payload[0].value} cotizaciones ({LINEAS.find((l) => l.label === payload[0].name)?.pct}%)</p>
                        </div>
                      ) : null
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex-1 space-y-3">
              {LINEAS.map((l) => (
                <div key={l.linea}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
                      <span className="text-xs font-medium text-slate-700">{l.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 tabular-nums">{l.cantidad}</span>
                      <span className="text-[10px] text-slate-400 w-10 text-right tabular-nums">{l.pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(l.pct / maxLinePct) * 100}%`, backgroundColor: l.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ================================================================ */}
      {/* DESEMPEÑO COMERCIAL (full width)                                  */}
      {/* ================================================================ */}
      <SectionCard idx={7} title="Desempeño Comercial" subtitle="Cotizaciones totales, aprobadas y tasa de efectividad por comercial" accent="#059669">
        <div className="h-[380px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={COMERCIALES}
              layout="vertical"
              margin={{ top: 5, right: 40, left: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                width={110}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" name="Total" fill="#CBD5E1" radius={[0, 4, 4, 0]} barSize={14} animationDuration={800} />
              <Bar dataKey="aprobadas" name="Aprobadas" fill="#059669" radius={[0, 4, 4, 0]} barSize={14} animationDuration={800}>
                <LabelList
                  dataKey="aprobadas"
                  position="right"
                  formatter={(v) => (Number(v) > 0 ? String(v) : "")}
                  style={{ fontSize: 10, fill: "#059669", fontWeight: 700 }}
                />
              </Bar>
              <Line
                dataKey="efectividad"
                name="% Efectividad"
                stroke="#D97706"
                strokeWidth={2}
                dot={{ r: 3, fill: "#D97706", stroke: "#fff", strokeWidth: 2 }}
                animationDuration={800}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Summary table below chart */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="grid grid-cols-7 gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 mb-2">
            <span className="col-span-2">Comercial</span>
            <span className="text-center">Total</span>
            <span className="text-center">Aprobadas</span>
            <span className="text-center">Efectividad</span>
            <span className="text-center">Pendientes</span>
            <span className="text-center">Negociación</span>
          </div>
          <div className="space-y-1 max-h-[280px] overflow-y-auto">
            {COMERCIALES.map((c) => (
              <div
                key={c.name}
                className="grid grid-cols-7 gap-2 items-center px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="col-span-2 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#1E3A5F] flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                    {c.name.charAt(0)}
                  </div>
                  <span className="text-xs font-medium text-slate-700 truncate">{c.name}</span>
                </div>
                <span className="text-xs font-bold text-slate-800 text-center tabular-nums">{c.total}</span>
                <span className="text-xs font-bold text-emerald-600 text-center tabular-nums">{c.aprobadas}</span>
                <div className="flex justify-center">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      c.efectividad >= 20
                        ? "bg-emerald-50 text-emerald-700"
                        : c.efectividad > 0
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-50 text-slate-400"
                    }`}
                  >
                    {c.efectividad}%
                  </span>
                </div>
                <span className="text-xs text-amber-600 text-center font-semibold tabular-nums">{c.pendientes || "—"}</span>
                <span className="text-xs text-cyan-600 text-center font-semibold tabular-nums">{c.negociacion || "—"}</span>
              </div>
            ))}
          </div>
          {/* Totals row */}
          <div className="grid grid-cols-7 gap-2 items-center px-2 py-2.5 mt-2 border-t border-slate-200 bg-slate-50 rounded-lg">
            <span className="col-span-2 text-xs font-bold text-[#1E3A5F]">TOTAL</span>
            <span className="text-xs font-extrabold text-[#1E3A5F] text-center">{KPI.total}</span>
            <span className="text-xs font-extrabold text-emerald-600 text-center">{KPI.approved}</span>
            <div className="flex justify-center">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{KPI.approvalRate}%</span>
            </div>
            <span className="text-xs font-bold text-amber-600 text-center">{COMERCIALES.reduce((s, c) => s + c.pendientes, 0)}</span>
            <span className="text-xs font-bold text-cyan-600 text-center">{COMERCIALES.reduce((s, c) => s + c.negociacion, 0)}</span>
          </div>
        </div>
      </SectionCard>

      {/* ================================================================ */}
      {/* ROW: TIEMPOS DE RESPUESTA + DISTRIBUCIÓN GEOGRÁFICA               */}
      {/* ================================================================ */}
      <div className="grid grid-cols-5 gap-5">
        {/* Tiempos de Respuesta (3 cols) */}
        <SectionCard idx={8} title="Tiempos de Respuesta" subtitle="Promedio de días por comercial (ordenado de menor a mayor)" accent="#D97706" className="col-span-3">
          <div className="h-[360px] -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={TIEMPOS}
                layout="vertical"
                margin={{ top: 5, right: 50, left: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                  unit=" d"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
                  width={110}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.[0] ? (
                      <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-lg px-4 py-3">
                        <p className="text-xs font-bold text-slate-700">{(payload[0].payload as typeof TIEMPOS[0]).name}</p>
                        <p className="text-[11px] text-slate-500">Promedio: <b>{(payload[0].payload as typeof TIEMPOS[0]).promedio} días</b></p>
                        <p className="text-[11px] text-slate-500">Rango: {(payload[0].payload as typeof TIEMPOS[0]).min} – {(payload[0].payload as typeof TIEMPOS[0]).max} días</p>
                        <p className="text-[11px] text-slate-500">Cotizaciones: {(payload[0].payload as typeof TIEMPOS[0]).cotizaciones}</p>
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="promedio" name="Promedio (días)" radius={[0, 6, 6, 0]} barSize={16} animationDuration={800}>
                  {TIEMPOS.map((t, i) => (
                    <Cell
                      key={i}
                      fill={t.promedio <= 3 ? "#059669" : t.promedio <= 7 ? "#D97706" : "#DC2626"}
                    />
                  ))}
                  <LabelList
                    dataKey="promedio"
                    position="right"
                    formatter={(v) => `${v}d`}
                    style={{ fontSize: 10, fill: "#64748B", fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-5 mt-3 pt-3 border-t border-slate-100">
            <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              &le; 3 días (Excelente)
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
              4–7 días (Aceptable)
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
              &gt; 7 días (Requiere atención)
            </span>
          </div>
        </SectionCard>

        {/* Distribución Geográfica (2 cols) */}
        <SectionCard idx={9} title="Distribución Geográfica" subtitle="Cotizaciones por país de destino" accent="#0891B2" className="col-span-2">
          <div className="space-y-4">
            {PAISES.map((p, i) => (
              <div key={p.pais}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl leading-none">{p.flag}</span>
                    <span className="text-sm font-semibold text-slate-700">{p.pais}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-extrabold text-[#1E3A5F] tabular-nums">{p.cantidad}</span>
                    <span className="text-[10px] text-slate-400 ml-1.5">{p.pct}%</span>
                  </div>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${p.pct}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, #0891B2, ${i === 0 ? "#06B6D4" : "#67E8F9"})`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Mini map insight */}
          <div className="mt-5 pt-4 border-t border-slate-100 rounded-xl bg-gradient-to-br from-slate-50 to-white p-4">
            <div className="flex items-start gap-2">
              <Globe2 className="w-4 h-4 text-cyan-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-slate-700">Insight geográfico</p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                  {PAISES[0]?.pais || "Principal país"} concentra el <b>{PAISES[0]?.pct || 0}%</b> de las cotizaciones.
                  {PAISES.length > 1 && ` Se identifican oportunidades de expansión en ${PAISES.slice(1, 4).map(p => p.pais).join(", ")}.`}
                </p>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ================================================================ */}
      {/* TIEMPOS CHINA (full width)                                        */}
      {/* ================================================================ */}
      <SectionCard idx={10} title="Tiempos de Respuesta China" subtitle="Análisis de cumplimiento de tiempos de proveedores chinos" accent="#DC2626">
        <div className="grid grid-cols-3 gap-6">
          {/* Donut */}
          <div className="flex flex-col items-center justify-center">
            <div className="w-[180px] h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "A tiempo", value: CHINA.aTiempo.cantidad, fill: "#059669" },
                      { name: "Atrasado", value: CHINA.atrasado.cantidad, fill: "#DC2626" },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    strokeWidth={0}
                    animationDuration={800}
                  >
                    <Cell fill="#059669" />
                    <Cell fill="#DC2626" />
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.[0] ? (
                        <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-lg px-3 py-2">
                          <p className="text-xs font-bold text-slate-700">{payload[0].name}</p>
                          <p className="text-[11px] text-slate-500">{payload[0].value} cotizaciones</p>
                        </div>
                      ) : null
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-2xl font-extrabold text-[#1E3A5F] mt-2">{CHINA.avgDays} días</p>
            <p className="text-[10px] text-slate-400 font-medium">Promedio de respuesta</p>
          </div>

          {/* Stats cards */}
          <div className="flex flex-col justify-center gap-4">
            <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-xs font-bold text-red-700">Atrasados</span>
              </div>
              <p className="text-3xl font-extrabold text-red-600 tabular-nums">{CHINA.atrasado.cantidad}</p>
              <p className="text-[10px] text-red-500 mt-1">{CHINA.atrasado.pct}% del total de cotizaciones</p>
              <div className="h-2 bg-red-100 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${CHINA.atrasado.pct}%` }} />
              </div>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-emerald-700">A tiempo</span>
              </div>
              <p className="text-3xl font-extrabold text-emerald-600 tabular-nums">{CHINA.aTiempo.cantidad}</p>
              <p className="text-[10px] text-emerald-500 mt-1">{CHINA.aTiempo.pct}% del total de cotizaciones</p>
              <div className="h-2 bg-emerald-100 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${CHINA.aTiempo.pct}%` }} />
              </div>
            </div>
          </div>

          {/* Insight */}
          <div className="flex flex-col justify-center">
            <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-100 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#1E3A5F]" />
                <h4 className="text-xs font-bold text-slate-700">Análisis de cumplimiento</h4>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <TrendingDown className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    El <b className="text-red-600">{CHINA.atrasado.pct}%</b> de las cotizaciones tiene tiempos de respuesta China
                    por encima del objetivo. Se requiere gestión inmediata con proveedores.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Solo <b className="text-emerald-600">{CHINA.aTiempo.cantidad} cotizaciones</b> cumplen con los tiempos establecidos.
                    Se recomienda revisar acuerdos de nivel de servicio.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Target className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    El promedio de <b className="text-[#1E3A5F]">{CHINA.avgDays} días</b> sugiere
                    una respuesta inicial rápida, pero el cumplimiento general es bajo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ================================================================ */}
      {/* FOOTER                                                            */}
      {/* ================================================================ */}
      <motion.div
        custom={11}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="text-center py-3"
      >
        <p className="text-[10px] text-slate-400">
          IBC Steel Group &copy; 2026 &nbsp;|&nbsp; Reporte generado autom&aacute;ticamente &nbsp;|&nbsp; Confidencial
        </p>
      </motion.div>
    </div>
  );
}
