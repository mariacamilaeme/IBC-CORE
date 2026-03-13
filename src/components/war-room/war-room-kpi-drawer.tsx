"use client";

import { useMemo } from "react";
import { X, CheckSquare, CheckCircle, AlertTriangle, Bell, StickyNote, Clock, CalendarDays } from "lucide-react";
import { cn, TASK_CATEGORY_LABELS, formatDate } from "@/lib/utils";
import { parseISO, differenceInDays, isToday, isTomorrow, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import type { WarRoomTaskWithRelations, ReminderWithRelations, WarRoomNote } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type KpiDrawerType =
  | "tasks_today"
  | "completed_this_week"
  | "overdue_count"
  | "active_reminders"
  | "active_notes"
  | null;

interface WarRoomKpiDrawerProps {
  type: KpiDrawerType;
  tasks: WarRoomTaskWithRelations[];
  reminders: ReminderWithRelations[];
  notes: WarRoomNote[];
  onClose: () => void;
  onClickTask?: (task: WarRoomTaskWithRelations) => void;
  onClickReminder?: (reminder: ReminderWithRelations) => void;
  onClickNote?: (note: WarRoomNote) => void;
}

// ---------------------------------------------------------------------------
// Config per KPI type
// ---------------------------------------------------------------------------

const KPI_CONFIG: Record<string, {
  title: string;
  icon: React.ElementType;
  color: string;
  gradientFrom: string;
  gradientTo: string;
}> = {
  tasks_today: {
    title: "Tareas de Hoy",
    icon: CheckSquare,
    color: "#0B5394",
    gradientFrom: "from-[#0B5394]",
    gradientTo: "to-[#1D4ED8]",
  },
  completed_this_week: {
    title: "Completadas esta Semana",
    icon: CheckCircle,
    color: "#0D9F6E",
    gradientFrom: "from-[#0D9F6E]",
    gradientTo: "to-[#059669]",
  },
  overdue_count: {
    title: "Vencidas",
    icon: AlertTriangle,
    color: "#E63946",
    gradientFrom: "from-[#E63946]",
    gradientTo: "to-[#DC2626]",
  },
  active_reminders: {
    title: "Recordatorios Activos",
    icon: Bell,
    color: "#DC8B0B",
    gradientFrom: "from-[#DC8B0B]",
    gradientTo: "to-[#D97706]",
  },
  active_notes: {
    title: "Notas Activas",
    icon: StickyNote,
    color: "#7C5CFC",
    gradientFrom: "from-[#7C5CFC]",
    gradientTo: "to-[#6D28D9]",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysLabel(dateStr: string | null): { text: string; badge: string; badgeColor: string } | null {
  if (!dateStr) return null;
  const normalized = dateStr.substring(0, 10);
  const date = parseISO(normalized);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isToday(date)) return { text: "Hoy", badge: "Hoy", badgeColor: "bg-[#DBEAFE] text-[#1D4ED8]" };
  if (isTomorrow(date)) return { text: "Mañana", badge: "Mañana", badgeColor: "bg-[#FEF3C7] text-[#92400E]" };

  const diff = differenceInDays(date, today);
  if (diff < 0) {
    const abs = Math.abs(diff);
    return {
      text: `${abs} día${abs !== 1 ? "s" : ""} vencido`,
      badge: `${abs}d vencido`,
      badgeColor: "bg-[#FEE2E2] text-[#DC2626]",
    };
  }
  return {
    text: `Faltan ${diff} día${diff !== 1 ? "s" : ""}`,
    badge: `${diff}d restante${diff !== 1 ? "s" : ""}`,
    badgeColor: "bg-[#DCFCE7] text-[#15803D]",
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WarRoomKpiDrawer({
  type,
  tasks,
  reminders,
  notes,
  onClose,
  onClickTask,
  onClickReminder,
  onClickNote,
}: WarRoomKpiDrawerProps) {
  if (!type) return null;

  const config = KPI_CONFIG[type];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Glass card */}
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border border-white/30 bg-white/85 backdrop-blur-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] animate-in fade-in zoom-in-95 duration-300">
        {/* Gradient accent */}
        <div className={cn("absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-gradient-to-r", config.gradientFrom, config.gradientTo)} />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-2 bg-slate-100/80 hover:bg-red-50 hover:text-red-500 text-slate-400 transition-all duration-200 hover:scale-110 hover:rotate-90 z-10"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-200/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${config.color}15` }}>
              <Icon className="h-5 w-5" style={{ color: config.color }} />
            </div>
            <div>
              <h2 className="text-[17px] font-extrabold text-[#111827]">{config.title}</h2>
              <p className="text-[11px] text-[#9CA3AF] font-medium mt-0.5">
                Haz clic en un elemento para ver más detalles
              </p>
            </div>
          </div>
        </div>

        {/* Content (scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          <DrawerContent
            type={type}
            tasks={tasks}
            reminders={reminders}
            notes={notes}
            onClickTask={onClickTask}
            onClickReminder={onClickReminder}
            onClickNote={onClickNote}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drawer content per type
// ---------------------------------------------------------------------------

function DrawerContent({
  type,
  tasks,
  reminders,
  notes,
  onClickTask,
  onClickReminder,
  onClickNote,
}: {
  type: NonNullable<KpiDrawerType>;
  tasks: WarRoomTaskWithRelations[];
  reminders: ReminderWithRelations[];
  notes: WarRoomNote[];
  onClickTask?: (task: WarRoomTaskWithRelations) => void;
  onClickReminder?: (reminder: ReminderWithRelations) => void;
  onClickNote?: (note: WarRoomNote) => void;
}) {
  // Filter data based on type
  const filteredItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = format(today, "yyyy-MM-dd");

    switch (type) {
      case "tasks_today":
        return {
          kind: "tasks" as const,
          items: tasks.filter((t) => {
            if (!t.due_date || t.is_completed) return false;
            return t.due_date.substring(0, 10) === todayStr;
          }),
        };
      case "completed_this_week":
        return {
          kind: "mixed" as const,
          tasks: tasks.filter((t) => t.is_completed),
          reminders: reminders.filter((r) => r.is_completed),
        };
      case "overdue_count": {
        const overdueTasks = tasks.filter((t) => {
          if (!t.due_date || t.is_completed) return false;
          return t.due_date.substring(0, 10) < todayStr;
        });
        const overdueReminders = reminders.filter((r) => {
          if (!r.due_date || r.is_completed) return false;
          return r.due_date.substring(0, 10) < todayStr;
        });
        return { kind: "overdue" as const, tasks: overdueTasks, reminders: overdueReminders };
      }
      case "active_reminders":
        return {
          kind: "reminders" as const,
          items: reminders.filter((r) => !r.is_completed),
        };
      case "active_notes":
        return {
          kind: "notes" as const,
          items: notes,
        };
      default:
        return { kind: "empty" as const };
    }
  }, [type, tasks, reminders, notes]);

  // Render based on kind
  if (filteredItems.kind === "tasks") {
    const items = filteredItems.items;
    if (items.length === 0) return <EmptyState text="No hay tareas para hoy" />;
    return (
      <div className="space-y-2">
        {items.map((task) => (
          <TaskRow key={task.id} task={task} onClick={() => onClickTask?.(task)} />
        ))}
      </div>
    );
  }

  if (filteredItems.kind === "reminders") {
    const items = filteredItems.items;
    if (items.length === 0) return <EmptyState text="No hay recordatorios activos" />;
    return (
      <div className="space-y-2">
        {items.map((r) => (
          <ReminderRow key={r.id} reminder={r} onClick={() => onClickReminder?.(r)} />
        ))}
      </div>
    );
  }

  if (filteredItems.kind === "overdue") {
    const { tasks: oTasks, reminders: oReminders } = filteredItems;
    if (oTasks.length === 0 && oReminders.length === 0) return <EmptyState text="No hay elementos vencidos" />;
    return (
      <div className="space-y-4">
        {oTasks.length > 0 && (
          <section>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#DC2626] mb-2 flex items-center gap-1.5">
              <CheckSquare className="h-3 w-3" /> Tareas vencidas ({oTasks.length})
            </h4>
            <div className="space-y-2">
              {oTasks.map((t) => <TaskRow key={t.id} task={t} onClick={() => onClickTask?.(t)} />)}
            </div>
          </section>
        )}
        {oReminders.length > 0 && (
          <section>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#DC2626] mb-2 flex items-center gap-1.5">
              <Bell className="h-3 w-3" /> Recordatorios vencidos ({oReminders.length})
            </h4>
            <div className="space-y-2">
              {oReminders.map((r) => <ReminderRow key={r.id} reminder={r} onClick={() => onClickReminder?.(r)} />)}
            </div>
          </section>
        )}
      </div>
    );
  }

  if (filteredItems.kind === "mixed") {
    const { tasks: cTasks, reminders: cReminders } = filteredItems;
    if (cTasks.length === 0 && cReminders.length === 0) return <EmptyState text="No hay elementos completados esta semana" />;
    return (
      <div className="space-y-4">
        {cTasks.length > 0 && (
          <section>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#15803D] mb-2 flex items-center gap-1.5">
              <CheckSquare className="h-3 w-3" /> Tareas ({cTasks.length})
            </h4>
            <div className="space-y-2">
              {cTasks.map((t) => <TaskRow key={t.id} task={t} onClick={() => onClickTask?.(t)} />)}
            </div>
          </section>
        )}
        {cReminders.length > 0 && (
          <section>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#15803D] mb-2 flex items-center gap-1.5">
              <Bell className="h-3 w-3" /> Recordatorios ({cReminders.length})
            </h4>
            <div className="space-y-2">
              {cReminders.map((r) => <ReminderRow key={r.id} reminder={r} onClick={() => onClickReminder?.(r)} />)}
            </div>
          </section>
        )}
      </div>
    );
  }

  if (filteredItems.kind === "notes") {
    const items = filteredItems.items;
    if (items.length === 0) return <EmptyState text="No hay notas activas" />;
    return (
      <div className="space-y-2">
        {items.map((note) => (
          <NoteRow key={note.id} note={note} onClick={() => onClickNote?.(note)} />
        ))}
      </div>
    );
  }

  return <EmptyState text="Sin datos" />;
}

// ---------------------------------------------------------------------------
// Row components
// ---------------------------------------------------------------------------

const PRIORITY_LEFT: Record<string, string> = {
  urgente: "border-l-[#EF4444]",
  alta: "border-l-[#F97316]",
  media: "border-l-[#3B82F6]",
  baja: "border-l-[#9CA3AF]",
};

function TaskRow({ task, onClick }: { task: WarRoomTaskWithRelations; onClick: () => void }) {
  const priority = task.priority ?? "media";
  const category = task.category ?? "general";
  const catLabel = TASK_CATEGORY_LABELS[category] ?? category;
  const days = daysLabel(task.due_date);
  const completed = !!task.is_completed;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left flex items-center gap-3 px-3.5 py-3 rounded-xl border-l-[3px] bg-white/70 hover:bg-white transition-all hover:shadow-sm group",
        PRIORITY_LEFT[priority] ?? PRIORITY_LEFT.media,
        completed && "opacity-50"
      )}
    >
      <div className="flex-1 min-w-0">
        <p className={cn("text-[13px] font-semibold text-[#111827] truncate", completed && "line-through text-[#9CA3AF]")}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-medium text-[#6B7280] bg-[#F3F4F6] rounded px-1.5 py-0.5">{catLabel}</span>
          {task.related_client_name && (
            <span className="text-[10px] text-[#9CA3AF] truncate max-w-[120px]">{task.related_client_name}</span>
          )}
        </div>
      </div>

      {/* Days badge */}
      {days && (
        <div className="shrink-0 flex flex-col items-end gap-0.5">
          <span className="text-[10px] text-[#9CA3AF] flex items-center gap-0.5">
            <CalendarDays className="h-2.5 w-2.5" />
            {task.due_date ? formatDate(task.due_date.substring(0, 10)) : ""}
          </span>
          <span className={cn("text-[9px] font-bold rounded-md px-1.5 py-0.5", days.badgeColor)}>
            {days.badge}
          </span>
        </div>
      )}
    </button>
  );
}

function ReminderRow({ reminder, onClick }: { reminder: ReminderWithRelations; onClick: () => void }) {
  const priority = reminder.priority ?? "baja";
  const days = daysLabel(reminder.due_date);
  const completed = !!reminder.is_completed;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left flex items-center gap-3 px-3.5 py-3 rounded-xl border-l-[3px] bg-white/70 hover:bg-white transition-all hover:shadow-sm",
        "border-l-[#8B5CF6]",
        completed && "opacity-50"
      )}
    >
      <div className="flex-1 min-w-0">
        <p className={cn("text-[13px] font-semibold text-[#111827] truncate", completed && "line-through text-[#9CA3AF]")}>
          {reminder.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-medium text-[#6D28D9] bg-[#EDE9FE] rounded px-1.5 py-0.5">
            {reminder.type || "Recordatorio"}
          </span>
        </div>
      </div>

      {days && (
        <div className="shrink-0 flex flex-col items-end gap-0.5">
          <span className="text-[10px] text-[#9CA3AF] flex items-center gap-0.5">
            <CalendarDays className="h-2.5 w-2.5" />
            {reminder.due_date ? formatDate(reminder.due_date.substring(0, 10)) : ""}
          </span>
          <span className={cn("text-[9px] font-bold rounded-md px-1.5 py-0.5", days.badgeColor)}>
            {days.badge}
          </span>
        </div>
      )}
    </button>
  );
}

const NOTE_BG: Record<string, string> = {
  default: "bg-white/70",
  blue: "bg-[#EFF6FF]/80",
  green: "bg-[#F0FDF4]/80",
  amber: "bg-[#FFFBEB]/80",
  red: "bg-[#FEF2F2]/80",
  violet: "bg-[#F5F3FF]/80",
};

function NoteRow({ note, onClick }: { note: WarRoomNote; onClick: () => void }) {
  const bg = NOTE_BG[note.color ?? "default"] ?? NOTE_BG.default;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("w-full text-left px-3.5 py-3 rounded-xl hover:shadow-sm transition-all border border-white/50", bg)}
    >
      <p className="text-[13px] font-medium text-[#111827] line-clamp-2">{note.content}</p>
      {note.linked_date && (
        <span className="text-[10px] text-[#9CA3AF] mt-1 flex items-center gap-0.5">
          <CalendarDays className="h-2.5 w-2.5" />
          {formatDate(note.linked_date)}
        </span>
      )}
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Clock className="h-8 w-8 text-[#D1D5DB] mb-3" />
      <p className="text-[13px] text-[#9CA3AF] font-medium">{text}</p>
    </div>
  );
}
