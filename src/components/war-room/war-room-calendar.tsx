"use client";

import { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachHourOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
  endOfDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  format,
  getDay,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CalendarDays,
  CalendarRange,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getHolidaysForDate } from "@/lib/holidays";
import type { Holiday } from "@/lib/holidays";
import type { WarRoomTaskWithRelations, ReminderWithRelations } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CalendarViewMode = "month" | "week" | "day";

interface WarRoomCalendarProps {
  currentMonth: Date;
  selectedDate: Date | null;
  tasks: WarRoomTaskWithRelations[];
  reminders: ReminderWithRelations[];
  onMonthChange: (date: Date) => void;
  onDateSelect: (date: Date | null) => void;
}

interface DayEvent {
  id: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  kind: "task" | "reminder";
  completed: boolean;
  priority?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEEKDAY_HEADERS_SHORT = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

const COUNTRY_FLAG: Record<string, string> = {
  CO: "\u{1F1E8}\u{1F1F4}",
  CN: "\u{1F1E8}\u{1F1F3}",
};

const MAX_PREVIEWS_MONTH = 3;

// Vivid event colors with borders
const TASK_PRIORITY_EVENT: Record<string, { color: string; bgColor: string; borderColor: string }> = {
  urgente: { color: "text-[#B91C1C]", bgColor: "bg-[#FEE2E2]", borderColor: "border-l-[#EF4444]" },
  alta:    { color: "text-[#C2410C]", bgColor: "bg-[#FFF7ED]", borderColor: "border-l-[#F97316]" },
  media:   { color: "text-[#1E40AF]", bgColor: "bg-[#DBEAFE]", borderColor: "border-l-[#3B82F6]" },
  baja:    { color: "text-[#4B5563]", bgColor: "bg-[#F3F4F6]", borderColor: "border-l-[#9CA3AF]" },
};

const REMINDER_EVENT = {
  color: "text-[#6D28D9]",
  bgColor: "bg-[#EDE9FE]",
  borderColor: "border-l-[#8B5CF6]",
};

const COMPLETED_EVENT = {
  color: "text-[#15803D]",
  bgColor: "bg-[#F0FDF4]",
  borderColor: "border-l-[#22C55E]",
};

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function useCalendarData(tasks: WarRoomTaskWithRelations[], reminders: ReminderWithRelations[]) {
  const tasksByDate = useMemo(() => {
    const map: Record<string, WarRoomTaskWithRelations[]> = {};
    for (const task of tasks) {
      if (task.due_date) {
        const key = task.due_date.substring(0, 10);
        if (!map[key]) map[key] = [];
        map[key].push(task);
      }
    }
    return map;
  }, [tasks]);

  const remindersByDate = useMemo(() => {
    const map: Record<string, ReminderWithRelations[]> = {};
    for (const reminder of reminders) {
      if (reminder.due_date) {
        const key = reminder.due_date.substring(0, 10);
        if (!map[key]) map[key] = [];
        map[key].push(reminder);
      }
    }
    return map;
  }, [reminders]);

  function getEventsForDay(dateStr: string): DayEvent[] {
    const events: DayEvent[] = [];
    const dayTasks = tasksByDate[dateStr] || [];
    for (const t of dayTasks) {
      const priority = t.priority || "media";
      const completed = !!t.is_completed;
      const ec = completed ? COMPLETED_EVENT : (TASK_PRIORITY_EVENT[priority] || TASK_PRIORITY_EVENT.media);
      events.push({
        id: t.id || `task-${events.length}`,
        label: t.title,
        color: ec.color,
        bgColor: ec.bgColor,
        borderColor: ec.borderColor,
        kind: "task",
        completed,
        priority,
      });
    }
    const dayReminders = remindersByDate[dateStr] || [];
    for (const r of dayReminders) {
      const completed = !!r.is_completed;
      const ec = completed ? COMPLETED_EVENT : REMINDER_EVENT;
      events.push({
        id: r.id || `rem-${events.length}`,
        label: r.title,
        color: ec.color,
        bgColor: ec.bgColor,
        borderColor: ec.borderColor,
        kind: "reminder",
        completed,
      });
    }
    return events;
  }

  function getDayStats(dateStr: string) {
    const dayTasks = tasksByDate[dateStr] || [];
    const dayReminders = remindersByDate[dateStr] || [];
    return {
      totalTasks: dayTasks.length,
      completedTasks: dayTasks.filter((t) => t.is_completed).length,
      totalReminders: dayReminders.length,
      completedReminders: dayReminders.filter((r) => r.is_completed).length,
    };
  }

  function hasOverdue(dateStr: string, day: Date): boolean {
    const todayStart = startOfDay(new Date());
    if (!isBefore(day, todayStart)) return false;
    const dayTasks = tasksByDate[dateStr] || [];
    return dayTasks.some((t) => !t.is_completed);
  }

  return { tasksByDate, remindersByDate, getEventsForDay, getDayStats, hasOverdue };
}

function isWeekend(day: Date): boolean {
  const dow = getDay(day);
  return dow === 0 || dow === 6;
}

// ---------------------------------------------------------------------------
// Event chip component (shared across views)
// ---------------------------------------------------------------------------

function EventChip({ ev, compact = false, selected = false }: { ev: DayEvent; compact?: boolean; selected?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 w-full rounded-md border-l-[3px] transition-all",
        compact ? "px-1 py-[2px]" : "px-2 py-1",
        selected
          ? "bg-white/20 border-l-white/60"
          : cn(ev.bgColor, ev.borderColor),
        ev.completed && !selected && "opacity-50"
      )}
      title={ev.label}
    >
      <span
        className={cn(
          "text-[9px] leading-tight truncate font-semibold",
          selected ? "text-white" : ev.completed ? "text-[#15803D] line-through" : ev.color
        )}
      >
        {ev.label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function WarRoomCalendar({
  currentMonth,
  selectedDate,
  tasks,
  reminders,
  onMonthChange,
  onDateSelect,
}: WarRoomCalendarProps) {
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const { getEventsForDay, getDayStats, hasOverdue } = useCalendarData(tasks, reminders);

  // ── Navigation ─────────────────────────────────────────────────────
  const referenceDate = selectedDate || currentMonth;

  function navigate(dir: -1 | 1) {
    if (viewMode === "month") {
      onMonthChange(dir === 1 ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1));
    } else if (viewMode === "week") {
      const newDate = dir === 1 ? addWeeks(referenceDate, 1) : subWeeks(referenceDate, 1);
      onDateSelect(newDate);
      onMonthChange(startOfMonth(newDate));
    } else {
      const newDate = dir === 1 ? addDays(referenceDate, 1) : subDays(referenceDate, 1);
      onDateSelect(newDate);
      onMonthChange(startOfMonth(newDate));
    }
  }

  function goToday() {
    const today = new Date();
    onMonthChange(startOfMonth(today));
    if (viewMode !== "month") onDateSelect(today);
  }

  // ── Title ──────────────────────────────────────────────────────────
  function getTitle(): string {
    if (viewMode === "month") {
      const label = format(currentMonth, "MMMM yyyy", { locale: es });
      return label.charAt(0).toUpperCase() + label.slice(1);
    }
    if (viewMode === "week") {
      const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(referenceDate, { weekStartsOn: 1 });
      const s = format(weekStart, "d MMM", { locale: es });
      const e = format(weekEnd, "d MMM yyyy", { locale: es });
      return `${s} — ${e}`;
    }
    const label = format(referenceDate, "EEEE d 'de' MMMM yyyy", { locale: es });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  // ── Handlers ───────────────────────────────────────────────────────
  function handleDayClick(day: Date) {
    if (selectedDate && isSameDay(day, selectedDate)) {
      onDateSelect(null);
    } else {
      onDateSelect(day);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-[#E8E6E1] shadow-[0_2px_12px_rgba(26,29,35,0.06)] overflow-hidden">
      {/* ═══════ Header ═══════ */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0EDE8]">
        <div className="flex items-center gap-3">
          <h3 className="text-[17px] font-extrabold text-[#111827] select-none tracking-tight">
            {getTitle()}
          </h3>
          {/* Legend */}
          <div className="hidden lg:flex items-center gap-2.5 ml-1">
            <LegendDot color="bg-[#3B82F6]" label="Tareas" />
            <LegendDot color="bg-[#8B5CF6]" label="Recordatorios" />
            <LegendDot color="bg-[#EF4444]" label="Vencidas" />
            <LegendDot color="bg-[#22C55E]" label="Completadas" />
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* View mode switcher */}
          <div className="flex bg-[#F3F4F6] rounded-lg p-0.5 mr-1">
            <ViewModeBtn active={viewMode === "month"} onClick={() => setViewMode("month")} icon={<CalendarDays className="h-3.5 w-3.5" />} label="Mes" />
            <ViewModeBtn active={viewMode === "week"} onClick={() => { setViewMode("week"); if (!selectedDate) onDateSelect(new Date()); }} icon={<CalendarRange className="h-3.5 w-3.5" />} label="Semana" />
            <ViewModeBtn active={viewMode === "day"} onClick={() => { setViewMode("day"); if (!selectedDate) onDateSelect(new Date()); }} icon={<Clock className="h-3.5 w-3.5" />} label="Día" />
          </div>

          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] font-bold text-[#2563EB] rounded-lg hover:bg-[#EFF6FF]" onClick={goToday}>
            Hoy
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-[#F3F4F6]" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4 text-[#6B7280]" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-[#F3F4F6]" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4 text-[#6B7280]" />
          </Button>
        </div>
      </div>

      {/* ═══════ Body ═══════ */}
      {viewMode === "month" && (
        <MonthView
          currentMonth={currentMonth}
          selectedDate={selectedDate}
          getEventsForDay={getEventsForDay}
          getDayStats={getDayStats}
          hasOverdue={hasOverdue}
          onDayClick={handleDayClick}
        />
      )}
      {viewMode === "week" && (
        <WeekView
          referenceDate={referenceDate}
          selectedDate={selectedDate}
          getEventsForDay={getEventsForDay}
          getDayStats={getDayStats}
          hasOverdue={hasOverdue}
          onDayClick={handleDayClick}
        />
      )}
      {viewMode === "day" && (
        <DayView
          referenceDate={referenceDate}
          getEventsForDay={getEventsForDay}
          getDayStats={getDayStats}
          hasOverdue={hasOverdue}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MONTH VIEW
// ═══════════════════════════════════════════════════════════════════════════

function MonthView({
  currentMonth,
  selectedDate,
  getEventsForDay,
  getDayStats,
  hasOverdue,
  onDayClick,
}: {
  currentMonth: Date;
  selectedDate: Date | null;
  getEventsForDay: (d: string) => DayEvent[];
  getDayStats: (d: string) => ReturnType<ReturnType<typeof useCalendarData>["getDayStats"]>;
  hasOverdue: (d: string, day: Date) => boolean;
  onDayClick: (d: Date) => void;
}) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = useMemo(
    () => eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calendarStart.getTime(), calendarEnd.getTime()]
  );

  return (
    <div className="p-3">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_HEADERS_SHORT.map((d, i) => (
          <div key={d} className={cn("text-center text-[10px] font-bold uppercase tracking-widest py-1.5", i >= 5 ? "text-[#9CA3AF]" : "text-[#6B7280]")}>
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const selected = selectedDate ? isSameDay(day, selectedDate) : false;
          const holidays = getHolidaysForDate(dateStr);
          const events = inMonth ? getEventsForDay(dateStr) : [];
          const overdue = inMonth && hasOverdue(dateStr, day);
          const weekend = isWeekend(day);
          const remaining = events.length - MAX_PREVIEWS_MONTH;
          const stats = inMonth ? getDayStats(dateStr) : null;
          const allDone = stats && stats.totalTasks > 0 && stats.completedTasks === stats.totalTasks;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onDayClick(day)}
              className={cn(
                "relative flex flex-col items-start rounded-xl min-h-[82px] p-1.5 transition-all duration-150 text-left group",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]",
                // Base
                !inMonth && "opacity-25 cursor-default",
                inMonth && "cursor-pointer",
                // Background
                inMonth && !selected && !overdue && !allDone && !weekend && "bg-[#FAFBFC] hover:bg-[#F0F4F8]",
                inMonth && !selected && weekend && "bg-[#F9FAFB] hover:bg-[#F0F4F8]",
                inMonth && overdue && !selected && "bg-gradient-to-b from-[#FEF2F2] to-[#FECACA]/20 hover:from-[#FEE2E2] hover:to-[#FECACA]/30",
                inMonth && allDone && !overdue && !selected && "bg-gradient-to-b from-[#F0FDF4] to-[#DCFCE7]/30 hover:from-[#DCFCE7] hover:to-[#BBF7D0]/30",
                // Today
                inMonth && today && !selected && "ring-2 ring-[#2563EB] ring-offset-1 z-10",
                // Selected
                inMonth && selected && "bg-gradient-to-b from-[#2563EB] to-[#1D4ED8] shadow-lg shadow-blue-200/50 z-10 ring-0",
                // Hover lift
                inMonth && !selected && "hover:shadow-sm hover:-translate-y-px"
              )}
            >
              {/* ── Day number row ─────────── */}
              <div className="flex items-center justify-between w-full mb-0.5">
                <span className={cn(
                  "w-6 h-6 flex items-center justify-center rounded-lg text-[12px] font-bold leading-none",
                  !inMonth && "text-[#D1D5DB]",
                  inMonth && !selected && !today && "text-[#1F2937]",
                  inMonth && today && !selected && "bg-[#2563EB] text-white",
                  inMonth && selected && "bg-white/20 text-white",
                  inMonth && overdue && !selected && !today && "text-[#DC2626]"
                )}>
                  {format(day, "d")}
                </span>

                {/* Stats badge */}
                {inMonth && stats && stats.totalTasks > 0 && (
                  <span className={cn(
                    "flex items-center gap-0.5 text-[8px] font-extrabold rounded-md px-1 py-0.5 transition-colors",
                    selected
                      ? "bg-white/20 text-white/90"
                      : allDone
                      ? "bg-[#DCFCE7] text-[#15803D]"
                      : overdue
                      ? "bg-[#FEE2E2] text-[#DC2626]"
                      : "bg-[#DBEAFE] text-[#1D4ED8]"
                  )}>
                    {allDone ? <CheckCircle2 className="h-2.5 w-2.5" /> : <>{stats.completedTasks}/{stats.totalTasks}</>}
                  </span>
                )}
              </div>

              {/* ── Holidays ─────────── */}
              {inMonth && holidays.map((h: Holiday) => (
                <div key={h.date + h.country} className={cn("flex items-center gap-0.5 w-full mb-0.5 rounded-md px-1 py-[1px]", selected ? "bg-white/10" : "bg-[#FEF3C7]")} title={h.name}>
                  <span className="text-[8px] leading-none shrink-0">{COUNTRY_FLAG[h.country] || ""}</span>
                  <span className={cn("text-[8px] leading-tight truncate font-semibold", selected ? "text-white/80" : "text-[#92400E]")}>{h.name}</span>
                </div>
              ))}

              {/* ── Event chips ─────────── */}
              {inMonth && events.slice(0, MAX_PREVIEWS_MONTH).map((ev) => (
                <div key={ev.id} className="w-full mb-[2px]">
                  <EventChip ev={ev} compact selected={selected} />
                </div>
              ))}

              {/* ── Overflow ─────────── */}
              {inMonth && remaining > 0 && (
                <span className={cn(
                  "text-[8px] font-bold mt-auto rounded-md px-1.5 py-0.5",
                  selected ? "text-white/70 bg-white/10" : "text-[#6B7280] bg-[#F3F4F6]"
                )}>
                  +{remaining} más
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// WEEK VIEW
// ═══════════════════════════════════════════════════════════════════════════

function WeekView({
  referenceDate,
  selectedDate,
  getEventsForDay,
  getDayStats,
  hasOverdue,
  onDayClick,
}: {
  referenceDate: Date;
  selectedDate: Date | null;
  getEventsForDay: (d: string) => DayEvent[];
  getDayStats: (d: string) => ReturnType<ReturnType<typeof useCalendarData>["getDayStats"]>;
  hasOverdue: (d: string, day: Date) => boolean;
  onDayClick: (d: Date) => void;
}) {
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(referenceDate, { weekStartsOn: 1 });
  const days = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weekStart.getTime(), weekEnd.getTime()]
  );

  return (
    <div className="p-3">
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const today = isToday(day);
          const selected = selectedDate ? isSameDay(day, selectedDate) : false;
          const holidays = getHolidaysForDate(dateStr);
          const events = getEventsForDay(dateStr);
          const overdue = hasOverdue(dateStr, day);
          const stats = getDayStats(dateStr);
          const allDone = stats.totalTasks > 0 && stats.completedTasks === stats.totalTasks;
          const dayLabel = format(day, "EEE", { locale: es });
          const capitalDay = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1);

          return (
            <div
              key={dateStr}
              className={cn(
                "flex flex-col rounded-xl border transition-all min-h-[280px]",
                selected
                  ? "border-[#2563EB] bg-gradient-to-b from-[#EFF6FF] to-white shadow-md shadow-blue-100/50"
                  : overdue
                  ? "border-[#FECACA] bg-gradient-to-b from-[#FEF2F2] to-white"
                  : allDone
                  ? "border-[#BBF7D0] bg-gradient-to-b from-[#F0FDF4] to-white"
                  : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB] hover:shadow-sm"
              )}
            >
              {/* Day header */}
              <button
                type="button"
                onClick={() => onDayClick(day)}
                className={cn(
                  "flex items-center justify-between px-2.5 py-2 border-b cursor-pointer rounded-t-xl transition-colors",
                  selected
                    ? "border-[#BFDBFE] bg-[#2563EB] text-white"
                    : today
                    ? "border-[#BFDBFE] bg-[#EFF6FF]"
                    : "border-[#F3F4F6] hover:bg-[#F9FAFB]"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "text-[20px] font-extrabold leading-none",
                    selected ? "text-white" : today ? "text-[#2563EB]" : "text-[#111827]"
                  )}>
                    {format(day, "d")}
                  </span>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    selected ? "text-white/70" : "text-[#9CA3AF]"
                  )}>
                    {capitalDay}
                  </span>
                </div>

                {stats.totalTasks > 0 && (
                  <span className={cn(
                    "text-[9px] font-extrabold rounded-md px-1.5 py-0.5",
                    selected
                      ? "bg-white/20 text-white"
                      : allDone
                      ? "bg-[#DCFCE7] text-[#15803D]"
                      : overdue
                      ? "bg-[#FEE2E2] text-[#DC2626]"
                      : "bg-[#DBEAFE] text-[#1D4ED8]"
                  )}>
                    {allDone ? <CheckCircle2 className="h-3 w-3" /> : `${stats.completedTasks}/${stats.totalTasks}`}
                  </span>
                )}
              </button>

              {/* Events */}
              <div className="flex-1 px-2 py-1.5 space-y-1 overflow-y-auto max-h-[240px]">
                {holidays.map((h: Holiday) => (
                  <div key={h.date + h.country} className="flex items-center gap-1 rounded-md bg-[#FEF3C7] px-1.5 py-1" title={h.name}>
                    <span className="text-[9px]">{COUNTRY_FLAG[h.country] || ""}</span>
                    <span className="text-[9px] font-semibold text-[#92400E] truncate">{h.name}</span>
                  </div>
                ))}
                {events.map((ev) => (
                  <EventChip key={ev.id} ev={ev} />
                ))}
                {events.length === 0 && holidays.length === 0 && (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-[10px] text-[#D1D5DB] font-medium">Sin eventos</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DAY VIEW
// ═══════════════════════════════════════════════════════════════════════════

function DayView({
  referenceDate,
  getEventsForDay,
  getDayStats,
  hasOverdue,
}: {
  referenceDate: Date;
  getEventsForDay: (d: string) => DayEvent[];
  getDayStats: (d: string) => ReturnType<ReturnType<typeof useCalendarData>["getDayStats"]>;
  hasOverdue: (d: string, day: Date) => boolean;
}) {
  const dateStr = format(referenceDate, "yyyy-MM-dd");
  const events = getEventsForDay(dateStr);
  const holidays = getHolidaysForDate(dateStr);
  const stats = getDayStats(dateStr);
  const overdue = hasOverdue(dateStr, referenceDate);
  const today = isToday(referenceDate);
  const allDone = stats.totalTasks > 0 && stats.completedTasks === stats.totalTasks;

  // Generate hours for timeline
  const hours = useMemo(() => {
    const start = startOfDay(referenceDate);
    const end = endOfDay(referenceDate);
    return eachHourOfInterval({ start, end }).filter((h) => {
      const hour = h.getHours();
      return hour >= 6 && hour <= 21;
    });
  }, [referenceDate]);

  // Separate pending and completed
  const pendingEvents = events.filter((e) => !e.completed);
  const completedEvents = events.filter((e) => e.completed);

  return (
    <div className="p-4">
      {/* Day summary card */}
      <div className={cn(
        "rounded-xl border p-4 mb-4",
        today
          ? "border-[#BFDBFE] bg-gradient-to-r from-[#EFF6FF] to-[#F0F9FF]"
          : overdue
          ? "border-[#FECACA] bg-gradient-to-r from-[#FEF2F2] to-[#FFF5F5]"
          : allDone
          ? "border-[#BBF7D0] bg-gradient-to-r from-[#F0FDF4] to-[#FAFFF7]"
          : "border-[#E5E7EB] bg-[#F9FAFB]"
      )}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-[14px] font-extrabold text-[#111827]">
              Resumen del día
            </h4>
            <p className="text-[11px] text-[#6B7280] mt-0.5">
              {stats.totalTasks} tarea{stats.totalTasks !== 1 ? "s" : ""} · {stats.totalReminders} recordatorio{stats.totalReminders !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stats.totalTasks > 0 && (
              <div className={cn(
                "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold",
                allDone ? "bg-[#DCFCE7] text-[#15803D]" : overdue ? "bg-[#FEE2E2] text-[#DC2626]" : "bg-[#DBEAFE] text-[#1D4ED8]"
              )}>
                {allDone && <CheckCircle2 className="h-3.5 w-3.5" />}
                {allDone ? "Todo completado" : `${stats.completedTasks}/${stats.totalTasks} completadas`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Holidays */}
      {holidays.length > 0 && (
        <div className="mb-3 space-y-1">
          {holidays.map((h: Holiday) => (
            <div key={h.date + h.country} className="flex items-center gap-2 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] px-3 py-2">
              <span className="text-sm">{COUNTRY_FLAG[h.country] || ""}</span>
              <span className="text-[12px] font-semibold text-[#92400E]">{h.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Two columns: timeline + events */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Timeline */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
          <div className="px-3 py-2 border-b border-[#F3F4F6] bg-[#FAFBFC]">
            <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Línea de tiempo</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {hours.map((hour) => {
              const hourNum = hour.getHours();
              const now = new Date();
              const isCurrentHour = today && now.getHours() === hourNum;
              return (
                <div key={hourNum} className={cn(
                  "flex items-start border-b border-[#F9FAFB] min-h-[40px]",
                  isCurrentHour && "bg-[#EFF6FF]"
                )}>
                  <span className={cn(
                    "w-14 shrink-0 text-right text-[10px] font-semibold pr-3 pt-2",
                    isCurrentHour ? "text-[#2563EB] font-bold" : "text-[#9CA3AF]"
                  )}>
                    {format(hour, "h a")}
                  </span>
                  <div className={cn("flex-1 border-l pt-1.5 pb-1 px-2 min-h-[40px]", isCurrentHour ? "border-l-[#2563EB] border-l-2" : "border-l-[#E5E7EB]")}>
                    {isCurrentHour && (
                      <div className="flex items-center gap-1 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
                        <span className="text-[9px] font-bold text-[#2563EB]">AHORA</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Event list */}
        <div className="space-y-3">
          {/* Pending */}
          {pendingEvents.length > 0 && (
            <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
              <div className="px-3 py-2 border-b border-[#F3F4F6] bg-[#FAFBFC] flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Pendientes</span>
                <span className="text-[10px] font-bold text-[#2563EB] bg-[#DBEAFE] rounded-md px-1.5 py-0.5">{pendingEvents.length}</span>
              </div>
              <div className="p-2 space-y-1.5">
                {pendingEvents.map((ev) => (
                  <div key={ev.id} className={cn("rounded-lg border-l-[3px] px-3 py-2", ev.bgColor, ev.borderColor)}>
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full shrink-0", ev.kind === "reminder" ? "bg-[#8B5CF6]" : ev.color.replace("text-", "bg-"))} />
                      <span className={cn("text-[12px] font-semibold", ev.color)}>{ev.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 ml-4">
                      <span className="text-[9px] font-medium text-[#9CA3AF] uppercase tracking-wider">
                        {ev.kind === "task" ? "Tarea" : "Recordatorio"}
                      </span>
                      {ev.priority && (
                        <span className={cn(
                          "text-[8px] font-bold uppercase px-1 py-px rounded",
                          ev.priority === "urgente" ? "bg-[#FEE2E2] text-[#DC2626]"
                            : ev.priority === "alta" ? "bg-[#FFF7ED] text-[#EA580C]"
                            : ev.priority === "media" ? "bg-[#DBEAFE] text-[#1D4ED8]"
                            : "bg-[#F3F4F6] text-[#6B7280]"
                        )}>
                          {ev.priority}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {completedEvents.length > 0 && (
            <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
              <div className="px-3 py-2 border-b border-[#F3F4F6] bg-[#FAFBFC] flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Completadas</span>
                <span className="text-[10px] font-bold text-[#15803D] bg-[#DCFCE7] rounded-md px-1.5 py-0.5">{completedEvents.length}</span>
              </div>
              <div className="p-2 space-y-1.5">
                {completedEvents.map((ev) => (
                  <div key={ev.id} className="rounded-lg border-l-[3px] border-l-[#22C55E] bg-[#F0FDF4] px-3 py-2 opacity-60">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#22C55E] shrink-0" />
                      <span className="text-[12px] font-medium text-[#15803D] line-through">{ev.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {events.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#D1D5DB] bg-[#FAFBFC] p-8 flex flex-col items-center justify-center">
              <CalendarDays className="h-8 w-8 text-[#D1D5DB] mb-2" />
              <span className="text-[13px] font-medium text-[#9CA3AF]">Sin eventos para este día</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Small shared components
// ═══════════════════════════════════════════════════════════════════════════

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn("w-2 h-2 rounded-full", color)} />
      <span className="text-[9px] text-[#6B7280] font-medium">{label}</span>
    </span>
  );
}

function ViewModeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all",
        active
          ? "bg-white text-[#111827] shadow-sm"
          : "text-[#6B7280] hover:text-[#374151]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
