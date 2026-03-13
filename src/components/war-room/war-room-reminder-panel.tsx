"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Bell,
  DollarSign,
  FileText,
  CreditCard,
  Unlock,
  Ship,
  Factory,
  Star,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, REMINDER_TYPE_LABELS, formatDate } from "@/lib/utils";
import { isToday, isTomorrow, isPast, parseISO, differenceInDays } from "date-fns";
import type { ReminderWithRelations, ReminderType } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type TypeFilter = "todos" | ReminderType;

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "todos", label: "Todos los tipos" },
  ...Object.entries(REMINDER_TYPE_LABELS).map(([key, label]) => ({
    value: key as ReminderType,
    label,
  })),
];

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  pago: DollarSign,
  contrato: FileText,
  anticipo: CreditCard,
  liberacion: Unlock,
  motonave: Ship,
  produccion: Factory,
  custom: Star,
};

const PRIORITY_BORDER: Record<string, string> = {
  urgente: "border-l-[#E63946]",
  alta: "border-l-[#F97316]",
  media: "border-l-[#DC8B0B]",
  baja: "border-l-[#D1D5DB]",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dueDateInfo(dateStr: string): {
  text: string;
  overdue: boolean;
  daysBadge: string | null;
  daysBadgeColor: string;
} {
  try {
    const normalized = dateStr.substring(0, 10);
    const date = parseISO(normalized);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isToday(date)) return { text: "Hoy", overdue: false, daysBadge: "Hoy", daysBadgeColor: "bg-[#DBEAFE] text-[#1D4ED8]" };
    if (isTomorrow(date)) return { text: "Mañana", overdue: false, daysBadge: "Mañana", daysBadgeColor: "bg-[#FEF3C7] text-[#92400E]" };

    const diff = differenceInDays(date, today);
    if (isPast(date)) {
      const abs = Math.abs(diff);
      return {
        text: formatDate(dateStr),
        overdue: true,
        daysBadge: `${abs}d vencido`,
        daysBadgeColor: "bg-[#FEE2E2] text-[#DC2626]",
      };
    }
    return {
      text: formatDate(dateStr),
      overdue: false,
      daysBadge: `${diff}d`,
      daysBadgeColor: diff <= 3 ? "bg-[#FEF3C7] text-[#92400E]" : "bg-[#DCFCE7] text-[#15803D]",
    };
  } catch {
    return { text: dateStr, overdue: false, daysBadge: null, daysBadgeColor: "" };
  }
}

function groupByType(reminders: ReminderWithRelations[]) {
  const groups: Record<string, ReminderWithRelations[]> = {};
  for (const r of reminders) {
    const key = r.type || "custom";
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }
  // Sort groups by the order they appear in REMINDER_TYPE_LABELS
  const order = Object.keys(REMINDER_TYPE_LABELS);
  const sorted: [string, ReminderWithRelations[]][] = [];
  for (const key of order) {
    if (groups[key]) sorted.push([key, groups[key]]);
  }
  // Add any remaining keys not in the label map
  for (const key of Object.keys(groups)) {
    if (!order.includes(key)) sorted.push([key, groups[key]]);
  }
  return sorted;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WarRoomReminderPanelProps {
  reminders: ReminderWithRelations[];
  onClickReminder: (reminder: ReminderWithRelations) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
  onAddReminder: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WarRoomReminderPanel({
  reminders,
  onClickReminder,
  onToggleComplete,
  onAddReminder,
}: WarRoomReminderPanelProps) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("todos");
  const [showCompleted, setShowCompleted] = useState(false);

  // Derived data
  const filtered = useMemo(() => {
    if (typeFilter === "todos") return reminders;
    return reminders.filter((r) => r.type === typeFilter);
  }, [reminders, typeFilter]);

  const pending = useMemo(
    () => filtered.filter((r) => !r.is_completed),
    [filtered],
  );
  const completed = useMemo(
    () => filtered.filter((r) => r.is_completed),
    [filtered],
  );

  const grouped = useMemo(() => groupByType(pending), [pending]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-4">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-bold text-[#18191D]">
            Pendientes
          </h3>
          <span className="text-[13px] font-medium text-[#9CA3B4]">
            {pending.length}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onAddReminder}
          className="h-7 rounded-lg border-[#0B5394] text-[#0B5394] hover:bg-[#E8F0FE] text-[12px] font-semibold gap-1 px-2.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo
        </Button>
      </div>

      {/* ---- Type filter (compact select) ---- */}
      <Select
        value={typeFilter}
        onValueChange={(v) => setTypeFilter(v as TypeFilter)}
      >
        <SelectTrigger className="h-8 w-[180px] rounded-lg text-[12px] border-[#E8E6E1] bg-white">
          <SelectValue placeholder="Filtrar por tipo" />
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-[12px]">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* ---- Pending reminders grouped by type ---- */}
      {pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Bell className="h-8 w-8 text-[#D1D5DB] mb-3" />
          <p className="text-[13px] text-[#9CA3B4]">
            No hay recordatorios pendientes
          </p>
        </div>
      ) : (
        <div className="max-h-[420px] overflow-y-auto pr-1 space-y-5">
          {grouped.map(([type, items]) => {
            const label =
              REMINDER_TYPE_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1);
            return (
              <section key={type}>
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3B4] mb-2 px-0.5">
                  {label}
                </h4>
                <div className="space-y-1.5">
                  {items.map((reminder) => (
                    <ReminderItem
                      key={reminder.id}
                      reminder={reminder}
                      onClick={onClickReminder}
                      onToggleComplete={onToggleComplete}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ---- Completed toggle ---- */}
      {completed.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowCompleted((prev) => !prev)}
            className="flex items-center gap-1.5 text-[12px] font-medium text-[#9CA3B4] hover:text-[#6B7080] transition-colors"
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                showCompleted && "rotate-180",
              )}
            />
            {completed.length} completado{completed.length !== 1 ? "s" : ""}
          </button>

          {showCompleted && (
            <div className="mt-2 space-y-1.5">
              {completed.map((reminder) => (
                <ReminderItem
                  key={reminder.id}
                  reminder={reminder}
                  onClick={onClickReminder}
                  onToggleComplete={onToggleComplete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reminder item
// ---------------------------------------------------------------------------

function ReminderItem({
  reminder,
  onClick,
  onToggleComplete,
}: {
  reminder: ReminderWithRelations;
  onClick: (reminder: ReminderWithRelations) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
}) {
  const type = reminder.type || "custom";
  const priority = reminder.priority || "baja";
  const Icon = TYPE_ICONS[type] || Star;
  const borderColor = PRIORITY_BORDER[priority] || PRIORITY_BORDER.baja;
  const due = dueDateInfo(reminder.due_date);

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl border-l-[3px] bg-white hover:bg-[#FAFAF8] transition-colors cursor-pointer",
        borderColor,
        reminder.is_completed && "opacity-50",
      )}
      onClick={() => onClick(reminder)}
    >
      {/* Checkbox */}
      <Checkbox
        checked={reminder.is_completed ?? false}
        onCheckedChange={(checked) =>
          onToggleComplete(reminder.id!, checked === true)
        }
        onClick={(e) => e.stopPropagation()}
        className="h-4 w-4 shrink-0"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-[13px] font-medium text-[#18191D] leading-snug truncate",
            reminder.is_completed && "line-through text-[#9CA3B4]",
          )}
        >
          {reminder.title}
        </p>
        <span
          className={cn(
            "text-[11px] leading-none",
            due.overdue ? "text-[#E63946] font-semibold" : "text-[#9CA3B4]",
          )}
        >
          {due.text}
        </span>
      </div>

      {/* Days badge + type icon — right side */}
      <div className="shrink-0 flex flex-col items-end gap-0.5">
        <Icon className="h-3.5 w-3.5 text-[#C5CAD5]" />
        {due.daysBadge && !reminder.is_completed && (
          <span className={cn("text-[8px] font-bold rounded-md px-1.5 py-0.5", due.daysBadgeColor)}>
            {due.daysBadge}
          </span>
        )}
      </div>
    </div>
  );
}
