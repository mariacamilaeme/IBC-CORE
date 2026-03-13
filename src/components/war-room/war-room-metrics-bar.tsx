"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
} from "recharts";
import { TASK_CATEGORY_LABELS, TASK_CATEGORY_COLORS } from "@/lib/utils";
import type { WarRoomMetrics } from "@/types";

interface WarRoomMetricsBarProps {
  metrics: WarRoomMetrics | null;
}

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const CircularProgress = ({
  value,
  size = 100,
  strokeWidth = 8,
  color = "#0D9F6E",
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) => {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value, 100) / 100;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#F0EDE8"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
        style={{
          transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)",
        }}
      />
    </svg>
  );
};

export default function WarRoomMetricsBar({ metrics }: WarRoomMetricsBarProps) {
  if (!metrics) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-white rounded-[18px] border border-[#F0EDE8] shadow p-5 wr-card animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="h-[120px] bg-[#F0EDE8] rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  // Weekly completions chart data
  const weeklyData = WEEKDAY_LABELS.map((day, idx) => ({
    name: day,
    completadas: metrics.weekly_completions[idx] ?? 0,
  }));

  // Category distribution chart data
  const categoryData = metrics.category_distribution.map((item) => ({
    category: TASK_CATEGORY_LABELS[item.category] || item.category,
    categoryKey: item.category,
    count: item.count,
  }));

  const completionRate = Math.round(metrics.monthly_completion_rate);

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Card 1: Actividad Semanal */}
      <div
        className="bg-white rounded-[18px] border border-[#F0EDE8] shadow p-5 wr-card"
        style={{ animationDelay: "0ms" }}
      >
        <h4 className="text-[10.5px] font-bold uppercase tracking-wider text-[#6B7080] mb-3">
          Actividad Semanal
        </h4>
        <div className="h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0B5394" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#0B5394" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE8" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#9CA3B4" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9CA3B4" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #F0EDE8",
                  borderRadius: 12,
                  fontSize: 12,
                  boxShadow: "0 2px 8px rgba(26,29,35,0.06)",
                }}
                labelStyle={{ color: "#18191D", fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey="completadas"
                stroke="#0B5394"
                strokeWidth={2}
                fill="url(#areaGradient)"
                name="Completadas"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Card 2: Tasa de Completado */}
      <div
        className="bg-white rounded-[18px] border border-[#F0EDE8] shadow p-5 wr-card flex flex-col items-center justify-center"
        style={{ animationDelay: "100ms" }}
      >
        <h4 className="text-[10.5px] font-bold uppercase tracking-wider text-[#6B7080] mb-3">
          Tasa de Completado
        </h4>
        <div className="relative flex items-center justify-center">
          <CircularProgress value={completionRate} size={100} strokeWidth={8} color="#0D9F6E" />
          <div className="absolute inset-0 flex items-center justify-center" style={{ transform: "none" }}>
            <span className="font-mono font-extrabold text-[22px] text-[#18191D]">
              {completionRate}%
            </span>
          </div>
        </div>
        <span className="text-[11px] text-[#9CA3B4] mt-2">este mes</span>
      </div>

      {/* Card 3: Por Categoria */}
      <div
        className="bg-white rounded-[18px] border border-[#F0EDE8] shadow p-5 wr-card"
        style={{ animationDelay: "200ms" }}
      >
        <h4 className="text-[10.5px] font-bold uppercase tracking-wider text-[#6B7080] mb-3">
          Por Categoria
        </h4>
        {categoryData.length === 0 ? (
          <div className="h-[120px] flex items-center justify-center">
            <p className="text-[12px] text-[#9CA3B4]">Sin datos</p>
          </div>
        ) : (
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryData}
                layout="vertical"
                margin={{ top: 0, right: 4, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE8" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "#9CA3B4" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  tick={{ fontSize: 9, fill: "#6B7080" }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #F0EDE8",
                    borderRadius: 12,
                    fontSize: 12,
                    boxShadow: "0 2px 8px rgba(26,29,35,0.06)",
                  }}
                  labelStyle={{ color: "#18191D", fontWeight: 600 }}
                  formatter={(value) => [value ?? 0, "Tareas"]}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14} name="Tareas">
                  {categoryData.map((entry, index) => {
                    const colors = TASK_CATEGORY_COLORS[entry.categoryKey];
                    // Extract hex color from Tailwind class for recharts
                    const fillColor = getCategoryFill(entry.categoryKey);
                    return <Cell key={`cell-${index}`} fill={fillColor} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function getCategoryFill(category: string): string {
  const colorMap: Record<string, string> = {
    seguimiento_pago: "#0D9F6E",
    firma_contrato: "#0B5394",
    anticipo_pendiente: "#DC8B0B",
    liberacion: "#7C5CFC",
    logistica: "#3B82F6",
    documentos: "#0EA5A5",
    produccion: "#F97316",
    general: "#6B7080",
  };
  return colorMap[category] || "#6B7080";
}
