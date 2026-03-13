"use client";

import { format, parseISO, isToday, isTomorrow, isPast } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft,
  CalendarDays,
  Edit3,
  User2,
  Tag,
  Repeat,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, TASK_CATEGORY_LABELS, TASK_CATEGORY_COLORS } from "@/lib/utils";
import type { WarRoomTaskWithRelations } from "@/types";

interface WarRoomTaskDetailProps {
  task: WarRoomTaskWithRelations;
  onBack: () => void;
  onEdit: (task: WarRoomTaskWithRelations) => void;
  onToggle: (id: string, completed: boolean) => void;
}

const PRIORITY_LABELS: Record<string, string> = {
  urgente: "Urgente",
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

const PRIORITY_STYLES: Record<string, string> = {
  urgente: "bg-[#FFF1F2] text-[#E63946] border-[#E63946]/20",
  alta: "bg-[#FFF7ED] text-[#F97316] border-[#F97316]/20",
  media: "bg-[#FFF8EB] text-[#DC8B0B] border-[#DC8B0B]/20",
  baja: "bg-[#F9FAFB] text-[#9CA3B4] border-[#D1D5DB]/20",
};

function formatDueDate(dateStr: string | null): { label: string; isOverdue: boolean } {
  if (!dateStr) return { label: "Sin fecha", isOverdue: false };
  const normalized = dateStr.length > 10 ? dateStr.substring(0, 10) : dateStr;
  const date = parseISO(normalized);
  if (isToday(date)) return { label: "Hoy", isOverdue: false };
  if (isTomorrow(date)) return { label: "Mañana", isOverdue: false };
  const overdue = isPast(date) && !isToday(date);
  return {
    label: format(date, "d 'de' MMMM yyyy", { locale: es }),
    isOverdue: overdue,
  };
}

const RECURRENCE_LABELS: Record<string, string> = {
  daily: "Diaria",
  weekly: "Semanal",
  monthly: "Mensual",
};

export default function WarRoomTaskDetail({
  task,
  onBack,
  onEdit,
  onToggle,
}: WarRoomTaskDetailProps) {
  const completed = !!task.is_completed;
  const priority = task.priority ?? "media";
  const category = task.category ?? "general";
  const catColor = TASK_CATEGORY_COLORS[category] ?? TASK_CATEGORY_COLORS.general;
  const catLabel = TASK_CATEGORY_LABELS[category] ?? category;
  const { label: dueDateLabel, isOverdue } = formatDueDate(task.due_date);
  const assignedName = task.assigned_to_profile?.full_name ?? null;

  return (
    <div className="flex flex-col gap-4 px-5 pb-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-[12px] font-semibold text-[#6B7080] hover:text-[#18191D] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(task)}
          className="h-7 rounded-lg border-[#0B5394]/20 text-[#0B5394] hover:bg-[#E8F0FE] text-[11px] font-semibold gap-1 px-2.5"
        >
          <Edit3 className="h-3 w-3" />
          Editar
        </Button>
      </div>

      {/* Title + completion toggle */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="flex-shrink-0 mt-0.5"
          onClick={() => onToggle(task.id!, !completed)}
        >
          <div
            className={cn(
              "w-5 h-5 rounded-[6px] flex items-center justify-center transition-all",
              completed
                ? "bg-[#0D9F6E]"
                : "border-2 border-[#D1D5DB] hover:border-[#0D9F6E] hover:bg-[#0D9F6E]/5"
            )}
          >
            {completed && (
              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        </button>
        <h3
          className={cn(
            "text-[16px] font-bold leading-snug",
            completed ? "line-through text-[#9CA3B4]" : "text-[#18191D]"
          )}
        >
          {task.title}
        </h3>
      </div>

      {/* Status badge */}
      {completed ? (
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#0D9F6E]">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Completada
          {task.completed_at && (
            <span className="text-[#9CA3B4] font-normal ml-1">
              {format(parseISO(task.completed_at), "d MMM yyyy", { locale: es })}
            </span>
          )}
        </div>
      ) : isOverdue ? (
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#E63946]">
          <AlertTriangle className="h-3.5 w-3.5" />
          Vencida
        </div>
      ) : null}

      {/* Description */}
      {task.description && (
        <div className="bg-[#FAF9F7] rounded-xl px-3.5 py-3">
          <p className="text-[13px] text-[#4A4E59] leading-relaxed whitespace-pre-wrap">
            {task.description}
          </p>
        </div>
      )}

      {/* Detail fields */}
      <div className="space-y-2.5">
        {/* Due date */}
        <DetailRow
          icon={<CalendarDays className="h-3.5 w-3.5" />}
          label="Fecha"
          value={dueDateLabel}
          valueClassName={isOverdue ? "text-[#E63946] font-semibold" : ""}
        />

        {/* Priority */}
        <DetailRow
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          label="Prioridad"
        >
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border",
              PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.media
            )}
          >
            {PRIORITY_LABELS[priority] ?? priority}
          </span>
        </DetailRow>

        {/* Category */}
        <DetailRow
          icon={<Tag className="h-3.5 w-3.5" />}
          label="Categoría"
        >
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold",
              catColor.bg,
              catColor.text
            )}
          >
            {catLabel}
          </span>
        </DetailRow>

        {/* Assigned to */}
        {assignedName && (
          <DetailRow
            icon={<User2 className="h-3.5 w-3.5" />}
            label="Asignado a"
            value={assignedName}
          />
        )}

        {/* Client */}
        {task.related_client_name && (
          <DetailRow
            icon={<User2 className="h-3.5 w-3.5" />}
            label="Cliente"
            value={task.related_client_name}
          />
        )}

        {/* Recurrence */}
        {task.recurrence && task.recurrence !== "none" && (
          <DetailRow
            icon={<Repeat className="h-3.5 w-3.5" />}
            label="Repetición"
            value={RECURRENCE_LABELS[task.recurrence] ?? task.recurrence}
          />
        )}

        {/* Created */}
        {task.created_at && (
          <DetailRow
            icon={<Clock className="h-3.5 w-3.5" />}
            label="Creada"
            value={format(parseISO(task.created_at), "d MMM yyyy", { locale: es })}
          />
        )}
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  valueClassName,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  valueClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[#9CA3B4]">{icon}</span>
      <span className="text-[11px] font-semibold text-[#9CA3B4] w-[70px] shrink-0">
        {label}
      </span>
      {children ?? (
        <span className={cn("text-[13px] text-[#4A4E59]", valueClassName)}>
          {value}
        </span>
      )}
    </div>
  );
}
