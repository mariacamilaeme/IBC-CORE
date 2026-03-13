"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, Clock, AlertTriangle, CheckCircle2, CalendarDays, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
const PRIORITY_COLORS: Record<string, { bg: string; color: string }> = {
  urgente: { bg: "#FFF1F2", color: "#E63946" },
  alta: { bg: "#FFF7ED", color: "#F97316" },
  media: { bg: "#EFF6FF", color: "#3B82F6" },
  baja: { bg: "#ECFDF3", color: "#0D9F6E" },
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
    if (absDays === 1) return "Mañana";
    return `En ${absDays} días`;
  }
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  return `Hace ${days} días`;
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

  // Fetch just the counts (lightweight, runs on mount + polling)
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

  // Fetch detail items (only when popover opens)
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

  // Mount: fetch metrics + start polling
  useEffect(() => {
    fetchMetrics();
    intervalRef.current = setInterval(fetchMetrics, 60000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchMetrics]);

  // When popover opens, fetch detail items
  useEffect(() => {
    if (open && !detailLoaded) fetchDetails();
  }, [open, detailLoaded, fetchDetails]);

  // When popover closes, mark detail as stale so next open refetches
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) setDetailLoaded(false);
  };

  // Navigate to calendar with deep link
  const navigateToItem = useCallback((type: string, id: string) => {
    setOpen(false);
    router.push(`/calendar?${type}=${id}`);
  }, [router]);

  // Badge count
  const totalCount = metrics
    ? metrics.overdue_count + metrics.tasks_today + metrics.active_reminders
    : 0;
  const hasOverdue = (metrics?.overdue_count || 0) > 0;

  // Classify items
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
          <Bell className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          {totalCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex items-center justify-center border-2 border-white shadow-sm"
              style={{
                minWidth: 18, height: 18, padding: "0 4px", borderRadius: 9,
                fontSize: 10, fontWeight: 700, color: "#fff",
                background: hasOverdue
                  ? "linear-gradient(135deg, #E63946, #dc2626)"
                  : "linear-gradient(135deg, #F97316, #DC8B0B)",
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
        className="p-0 overflow-hidden"
        style={{ width: 380, maxHeight: "70vh", borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
      >
        {/* Header */}
        <div style={{
          padding: "14px 18px", borderBottom: "1px solid #F0EDE8",
          background: "linear-gradient(135deg, #fafaf8, #fff)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Bell style={{ width: 16, height: 16, color: "#0B5394" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#18191D", fontFamily: "'DM Sans',sans-serif" }}>
              Notificaciones
            </span>
          </div>
          {totalCount > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: "#6B7080", fontFamily: "'DM Sans',sans-serif",
            }}>
              {totalCount} pendiente{totalCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", maxHeight: "calc(70vh - 110px)" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0" }}>
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#0B5394" }} />
            </div>
          ) : overdueItems.length === 0 && todayItems.length === 0 && reminderItems.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <CheckCircle2 style={{ width: 32, height: 32, color: "#0D9F6E", margin: "0 auto 10px" }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: "#3D4049" }}>Todo al día</p>
              <p style={{ fontSize: 12, color: "#9CA3B4", marginTop: 2 }}>No hay notificaciones pendientes</p>
            </div>
          ) : (
            <>
              {/* Overdue Section */}
              {overdueItems.length > 0 && (
                <Section
                  label={`Vencidas (${overdueItems.length})`}
                  icon={<AlertTriangle style={{ width: 12, height: 12 }} />}
                  color="#E63946"
                  bg="#FFF1F2"
                  items={overdueItems}
                  onItemClick={navigateToItem}
                />
              )}

              {/* Today Section */}
              {todayItems.length > 0 && (
                <Section
                  label={`Para Hoy (${todayItems.length})`}
                  icon={<CalendarDays style={{ width: 12, height: 12 }} />}
                  color="#3B82F6"
                  bg="#EFF6FF"
                  items={todayItems}
                  onItemClick={navigateToItem}
                />
              )}

              {/* Reminders Section */}
              {reminderItems.length > 0 && (
                <Section
                  label={`Recordatorios (${reminderItems.length})`}
                  icon={<Clock style={{ width: 12, height: 12 }} />}
                  color="#DC8B0B"
                  bg="#FFF8EB"
                  items={reminderItems}
                  onItemClick={navigateToItem}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 18px", borderTop: "1px solid #F0EDE8", background: "#FAFAF8" }}>
          <Link
            href="/calendar"
            onClick={() => setOpen(false)}
            style={{
              display: "block", textAlign: "center", fontSize: 12, fontWeight: 700,
              color: "#0B5394", textDecoration: "none", padding: "6px 0",
              borderRadius: 8, transition: "background 0.15s",
              fontFamily: "'DM Sans',sans-serif",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#E8F0FE"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            Ver todo en War Room
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Section Sub-component ───────────────────────────
function Section({ label, icon, color, bg, items, onItemClick }: {
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  items: Array<{ id: string; title: string; due_date: string | null; priority: string; _type: string; related_client_name?: string }>;
  onItemClick: (type: string, id: string) => void;
}) {
  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", gap: 6, padding: "8px 18px",
        background: bg, borderBottom: "1px solid #F0EDE8",
      }}>
        <span style={{ color, display: "flex" }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "'DM Sans',sans-serif" }}>
          {label}
        </span>
      </div>
      {items.map((item) => {
        const pc = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.media;
        return (
          <div
            key={`${item._type}-${item.id}`}
            style={{
              padding: "10px 18px", borderBottom: "1px solid #F0EDE8",
              cursor: "pointer", transition: "background 0.15s",
            }}
            onClick={() => onItemClick(item._type, item.id)}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#FCFBF9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 13, fontWeight: 600, color: "#18191D", margin: 0,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  fontFamily: "'DM Sans',sans-serif",
                }}>
                  {item.title}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                  {item.related_client_name && (
                    <span style={{ fontSize: 11, color: "#6B7080" }}>{item.related_client_name}</span>
                  )}
                  {item.due_date && (
                    <span style={{ fontSize: 11, color: "#9CA3B4" }}>
                      {timeAgo(item.due_date)}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                  background: pc.bg, color: pc.color, textTransform: "uppercase", letterSpacing: "0.5px",
                }}>
                  {item.priority}
                </span>
                <span style={{
                  fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
                  background: item._type === "task" ? "#EFF6FF" : "#FFF8EB",
                  color: item._type === "task" ? "#3B82F6" : "#DC8B0B",
                }}>
                  {item._type === "task" ? "Tarea" : "Recordatorio"}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
