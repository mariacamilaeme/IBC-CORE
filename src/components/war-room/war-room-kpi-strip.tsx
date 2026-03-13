"use client";

import { CheckSquare, CheckCircle, AlertTriangle, Bell, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WarRoomMetrics } from "@/types";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import type { KpiDrawerType } from "./war-room-kpi-drawer";

interface WarRoomKpiStripProps {
  metrics: WarRoomMetrics | null;
  onCardClick?: (type: KpiDrawerType) => void;
}

interface KpiCardConfig {
  label: string;
  key: keyof Pick<WarRoomMetrics, "tasks_today" | "completed_this_week" | "overdue_count" | "active_reminders" | "active_notes">;
  drawerType: NonNullable<KpiDrawerType>;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  sparklineKey?: "weekly_completions";
}

const KPI_CARDS: KpiCardConfig[] = [
  {
    label: "Tareas Hoy",
    key: "tasks_today",
    drawerType: "tasks_today",
    icon: CheckSquare,
    color: "#0B5394",
    bgColor: "#E8F0FE",
  },
  {
    label: "Completadas",
    key: "completed_this_week",
    drawerType: "completed_this_week",
    icon: CheckCircle,
    color: "#0D9F6E",
    bgColor: "#ECFDF3",
    sparklineKey: "weekly_completions",
  },
  {
    label: "Vencidas",
    key: "overdue_count",
    drawerType: "overdue_count",
    icon: AlertTriangle,
    color: "#E63946",
    bgColor: "#FFF1F2",
  },
  {
    label: "Recordatorios",
    key: "active_reminders",
    drawerType: "active_reminders",
    icon: Bell,
    color: "#DC8B0B",
    bgColor: "#FFF8EB",
  },
  {
    label: "Notas",
    key: "active_notes",
    drawerType: "active_notes",
    icon: StickyNote,
    color: "#7C5CFC",
    bgColor: "#F3F0FF",
  },
];

export default function WarRoomKpiStrip({ metrics, onCardClick }: WarRoomKpiStripProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {KPI_CARDS.map((card, i) => {
        const Icon = card.icon;
        const value = metrics ? metrics[card.key] : 0;
        const sparkData =
          card.sparklineKey && metrics?.weekly_completions
            ? metrics.weekly_completions.map((v, idx) => ({ v, idx }))
            : null;

        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onCardClick?.(card.drawerType)}
            className={cn(
              "wr-card wr-hover-lift relative bg-white rounded-[12px] border border-[#F0EDE8]",
              "shadow-[0_1px_2px_rgba(26,29,35,0.03),0_2px_8px_rgba(26,29,35,0.04)]",
              "px-2.5 pt-2 pb-1.5 flex flex-col gap-0.5 overflow-hidden text-left",
              "cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            )}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {/* Icon top-right */}
            <div
              className="absolute top-1.5 right-1.5 flex items-center justify-center w-5 h-5 rounded-md"
              style={{ backgroundColor: card.bgColor }}
            >
              <Icon className="h-3 w-3" style={{ color: card.color }} />
            </div>

            {/* Label */}
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#6B7080]">
              {card.label}
            </span>

            {/* Big number */}
            <span
              className="text-[18px] font-mono font-extrabold leading-none"
              style={{ color: card.color }}
            >
              {metrics ? value : "--"}
            </span>

            {/* Mini sparkline for weekly completions */}
            {sparkData && sparkData.length > 0 && (
              <div className="h-4 w-full -mx-0.5">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkData}>
                    <defs>
                      <linearGradient id={`spark-${card.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={card.color} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={card.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke={card.color}
                      strokeWidth={1.5}
                      fill={`url(#spark-${card.key})`}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
