"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Clock,
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────
interface Metrics {
  tasks_today: number;
  overdue_count: number;
  active_reminders: number;
}

interface Task {
  id: string;
  title: string;
  priority: string;
  due_date: string | null;
  is_completed: boolean;
  related_client_name?: string;
  assigned_to_profile?: { full_name: string };
}

interface Reminder {
  id: string;
  title: string;
  priority: string;
  due_date: string | null;
  is_completed: boolean;
  type?: string;
  related_client_name?: string;
}

// ─── Helpers ─────────────────────────────────────────
const PRIORITY_DOT: Record<string, string> = {
  urgente: "#EF4444",
  alta: "#F97316",
  media: "#3B82F6",
  baja: "#22C55E",
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 0) {
    const absDays = Math.abs(days);
    if (absDays === 0) return "Hoy";
    if (absDays === 1) return "Manana";
    return `En ${absDays} dias`;
  }
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  return `Hace ${days} dias`;
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < now;
}

// ─── Component ───────────────────────────────────────
export function NotificationBell() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [detailLoaded, setDetailLoaded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch("/api/war-room/metrics");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch {
      // silently fail
    }
  }, []);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, remindersRes] = await Promise.all([
        fetch("/api/war-room/tasks?completed=false"),
        fetch("/api/reminders?completed=false"),
      ]);
      if (tasksRes.ok) {
        const d = await tasksRes.json();
        setTasks((d.data || []).slice(0, 30));
      }
      if (remindersRes.ok) {
        const d = await remindersRes.json();
        setReminders((d.data || []).slice(0, 30));
      }
      setDetailLoaded(true);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    intervalRef.current = setInterval(fetchMetrics, 60000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchMetrics]);

  useEffect(() => {
    if (open && !detailLoaded) fetchDetails();
  }, [open, detailLoaded, fetchDetails]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) setDetailLoaded(false);
  };

  const navigateToItem = useCallback((type: string, id: string) => {
    setOpen(false);
    router.push(`/calendar?${type}=${id}`);
  }, [router]);

  const totalCount = metrics
    ? metrics.overdue_count + metrics.tasks_today + metrics.active_reminders
    : 0;
  const hasOverdue = (metrics?.overdue_count || 0) > 0;

  const overdueTasks = tasks.filter((t) => isOverdue(t.due_date));
  const todayTasks = tasks.filter((t) => isToday(t.due_date));
  const overdueReminders = reminders.filter((r) => isOverdue(r.due_date));
  const activeReminders = reminders.filter((r) => !isOverdue(r.due_date));

  const overdueItems = [
    ...overdueTasks.map((t) => ({ ...t, _type: "task" as const })),
    ...overdueReminders.map((r) => ({ ...r, _type: "reminder" as const, title: r.title })),
  ];
  const todayItems = todayTasks.map((t) => ({ ...t, _type: "task" as const }));
  const reminderItems = activeReminders.map((r) => ({ ...r, _type: "reminder" as const, title: r.title }));

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button className="relative p-2.5 rounded-xl hover:bg-slate-100/80 transition-all duration-200 group">
          <Bell
            className={`h-5 w-5 transition-colors ${
              hasOverdue
                ? "text-red-400 group-hover:text-red-500"
                : "text-slate-400 group-hover:text-slate-600"
            }`}
          />
          {totalCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex items-center justify-center border-2 border-white"
              style={{
                minWidth: 19, height: 19, padding: "0 4px", borderRadius: 10,
                fontSize: 10, fontWeight: 800, color: "#fff",
                background: hasOverdue ? "#EF4444" : "#F97316",
                boxShadow: `0 2px 6px ${hasOverdue ? "rgba(239,68,68,0.35)" : "rgba(249,115,22,0.35)"}`,
              }}
            >
              {totalCount > 99 ? "99+" : totalCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="p-0 overflow-hidden border border-slate-200/80"
        style={{
          width: 380,
          maxHeight: "72vh",
          borderRadius: 14,
          boxShadow: "0 16px 48px -8px rgba(0,0,0,0.14), 0 4px 12px -2px rgba(0,0,0,0.06)",
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <Bell className="h-4 w-4 text-slate-700" />
            <span className="text-[14px] font-bold text-slate-800 tracking-tight">
              Notificaciones
            </span>
          </div>
          {totalCount > 0 && (
            <div className="flex items-center gap-1.5">
              {hasOverdue && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="h-3 w-3" />
                  {metrics!.overdue_count}
                </span>
              )}
              <span className="text-[11px] font-medium text-slate-400">
                {totalCount} pendiente{totalCount !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="sidebar-scroll bg-white" style={{ overflowY: "auto", maxHeight: "calc(72vh - 108px)" }}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
            </div>
          ) : overdueItems.length === 0 && todayItems.length === 0 && reminderItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-3" />
              <p className="text-[13px] font-semibold text-slate-600">Todo al dia</p>
              <p className="text-[12px] text-slate-400 mt-0.5">Sin pendientes</p>
            </div>
          ) : (
            <>
              {overdueItems.length > 0 && (
                <NotifGroup
                  title="Vencidas"
                  icon={<AlertTriangle className="h-3 w-3 text-red-400" />}
                  items={overdueItems}
                  onItemClick={navigateToItem}
                  variant="overdue"
                />
              )}
              {todayItems.length > 0 && (
                <NotifGroup
                  title="Hoy"
                  icon={<CalendarDays className="h-3 w-3 text-blue-400" />}
                  items={todayItems}
                  onItemClick={navigateToItem}
                  variant="today"
                />
              )}
              {reminderItems.length > 0 && (
                <NotifGroup
                  title="Recordatorios"
                  icon={<Clock className="h-3 w-3 text-amber-500" />}
                  items={reminderItems}
                  onItemClick={navigateToItem}
                  variant="reminder"
                />
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <Link
          href="/calendar"
          onClick={() => setOpen(false)}
          className="group/ft flex items-center justify-center gap-1.5 py-3 border-t border-slate-100 bg-slate-50/60 hover:bg-slate-100/80 transition-colors"
          style={{ textDecoration: "none" }}
        >
          <span className="text-[12px] font-semibold text-slate-500 group-hover/ft:text-slate-700 transition-colors">
            Ver todo en el Calendario
          </span>
          <ChevronRight className="h-3 w-3 text-slate-400 group-hover/ft:text-slate-600 group-hover/ft:translate-x-0.5 transition-all" />
        </Link>
      </PopoverContent>
    </Popover>
  );
}

// ─── Group Sub-component ─────────────────────────────
function NotifGroup({ title, icon, items, onItemClick, variant }: {
  title: string;
  icon: React.ReactNode;
  items: Array<{ id: string; title: string; due_date: string | null; priority: string; _type: string; related_client_name?: string }>;
  onItemClick: (type: string, id: string) => void;
  variant: "overdue" | "today" | "reminder";
}) {
  return (
    <div>
      {/* Section label */}
      <div className="sticky top-0 z-10 flex items-center gap-2 px-5 py-2 bg-slate-50/90 backdrop-blur-sm border-b border-slate-100/60">
        {icon}
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <span className="text-[10px] font-bold text-slate-300 bg-slate-100 rounded-full px-1.5 py-px">
          {items.length}
        </span>
      </div>

      {/* Items */}
      {items.map((item) => {
        const dotColor = PRIORITY_DOT[item.priority] || PRIORITY_DOT.media;
        const isTask = item._type === "task";

        return (
          <div
            key={`${item._type}-${item.id}`}
            className="group/row flex items-center gap-3 px-5 py-3 cursor-pointer border-b border-slate-50 hover:bg-slate-50/80 transition-colors"
            onClick={() => onItemClick(item._type, item.id)}
          >
            {/* Priority dot */}
            <span
              className="w-[7px] h-[7px] rounded-full flex-shrink-0"
              style={{ background: dotColor }}
            />

            {/* Text content */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-slate-700 truncate leading-tight group-hover/row:text-slate-900 transition-colors">
                {item.title}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                {[
                  item.related_client_name,
                  item.due_date ? timeAgo(item.due_date) : null,
                ].filter(Boolean).join(" · ")}
              </p>
            </div>

            {/* Type tag */}
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
              isTask
                ? "text-blue-500 bg-blue-50"
                : "text-amber-600 bg-amber-50"
            }`}>
              {isTask ? "Tarea" : "Recordatorio"}
            </span>

            {/* Arrow on hover */}
            <ChevronRight className="h-3.5 w-3.5 text-slate-200 group-hover/row:text-slate-400 flex-shrink-0 transition-colors" />
          </div>
        );
      })}
    </div>
  );
}
