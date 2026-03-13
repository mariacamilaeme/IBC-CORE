"use client";

import { cn, TASK_CATEGORY_LABELS, TASK_CATEGORY_COLORS } from "@/lib/utils";
import { isToday, isTomorrow, isPast, format, parseISO, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, User2 } from "lucide-react";
import type { WarRoomTaskWithRelations } from "@/types";

interface WarRoomTaskItemProps {
  task: WarRoomTaskWithRelations;
  onToggle: (id: string, completed: boolean) => void;
  onClick: (task: WarRoomTaskWithRelations) => void;
}

const PRIORITY_BORDER: Record<string, string> = {
  urgente: "border-l-[#E63946]",
  alta: "border-l-[#F97316]",
  media: "border-l-[#DC8B0B]",
  baja: "border-l-[#D1D5DB]",
};

function formatDueDate(dateStr: string | null): {
  label: string;
  isOverdue: boolean;
  daysBadge: string | null;
  daysBadgeColor: string;
} {
  if (!dateStr) return { label: "", isOverdue: false, daysBadge: null, daysBadgeColor: "" };
  const normalized = dateStr.substring(0, 10);
  const date = parseISO(normalized);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isToday(date)) {
    return { label: "Hoy", isOverdue: false, daysBadge: "Hoy", daysBadgeColor: "bg-[#DBEAFE] text-[#1D4ED8]" };
  }
  if (isTomorrow(date)) {
    return { label: "Mañana", isOverdue: false, daysBadge: "Mañana", daysBadgeColor: "bg-[#FEF3C7] text-[#92400E]" };
  }

  const diff = differenceInDays(date, today);
  const overdue = isPast(date) && !isToday(date);

  if (overdue) {
    const abs = Math.abs(diff);
    return {
      label: format(date, "d MMM", { locale: es }),
      isOverdue: true,
      daysBadge: `${abs}d vencido`,
      daysBadgeColor: "bg-[#FEE2E2] text-[#DC2626]",
    };
  }

  return {
    label: format(date, "d MMM", { locale: es }),
    isOverdue: false,
    daysBadge: `${diff}d`,
    daysBadgeColor: diff <= 3 ? "bg-[#FEF3C7] text-[#92400E]" : "bg-[#DCFCE7] text-[#15803D]",
  };
}

export default function WarRoomTaskItem({
  task,
  onToggle,
  onClick,
}: WarRoomTaskItemProps) {
  const completed = !!task.is_completed;
  const priority = task.priority ?? "media";
  const category = task.category ?? "general";
  const { label: dueDateLabel, isOverdue, daysBadge, daysBadgeColor } = formatDueDate(task.due_date);
  const borderColor = PRIORITY_BORDER[priority] ?? PRIORITY_BORDER.media;
  const catColor = TASK_CATEGORY_COLORS[category] ?? TASK_CATEGORY_COLORS.general;
  const catLabel = TASK_CATEGORY_LABELS[category] ?? category;

  return (
    <div
      className={cn(
        "group flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-l-[3px] cursor-pointer transition-all duration-150",
        completed
          ? "border-l-[#D1D5DB] bg-transparent opacity-50 hover:opacity-70"
          : cn(borderColor, "bg-white hover:bg-[#FAFAF8] hover:shadow-[0_1px_4px_rgba(0,0,0,0.04)]")
      )}
      onClick={() => onClick(task)}
    >
      {/* Checkbox */}
      <button
        type="button"
        className="flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(task.id!, !completed);
        }}
      >
        <div
          className={cn(
            "w-[18px] h-[18px] rounded-[5px] flex items-center justify-center transition-all duration-150",
            completed
              ? "bg-[#0D9F6E]"
              : "border-[1.5px] border-[#D1D5DB] hover:border-[#0D9F6E] hover:bg-[#0D9F6E]/5"
          )}
        >
          {completed && (
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-[13px] font-medium leading-tight truncate",
            completed ? "line-through text-[#9CA3B4]" : "text-[#18191D]"
          )}
        >
          {task.title}
        </p>

        {/* Meta row — only show when NOT completed */}
        {!completed && (
          <div className="flex items-center gap-2 mt-1">
            {/* Category chip */}
            <span
              className={cn(
                "inline-flex items-center px-1.5 py-px rounded text-[9.5px] font-semibold leading-none",
                catColor.bg,
                catColor.text
              )}
            >
              {catLabel}
            </span>

            {/* Client */}
            {task.related_client_name && (
              <span className="flex items-center gap-0.5 text-[10px] text-[#9CA3B4] truncate max-w-[100px]">
                <User2 className="h-2.5 w-2.5 flex-shrink-0" />
                {task.related_client_name}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Due date + days badge — right side */}
      {dueDateLabel && !completed && (
        <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-1">
            <CalendarDays className={cn(
              "h-3 w-3",
              isOverdue ? "text-[#E63946]" : "text-[#C5CAD5]"
            )} />
            <span
              className={cn(
                "text-[10px] font-semibold",
                isOverdue ? "text-[#E63946]" : "text-[#9CA3B4]"
              )}
            >
              {dueDateLabel}
            </span>
          </div>
          {daysBadge && (
            <span className={cn("text-[8px] font-bold rounded-md px-1.5 py-0.5", daysBadgeColor)}>
              {daysBadge}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
