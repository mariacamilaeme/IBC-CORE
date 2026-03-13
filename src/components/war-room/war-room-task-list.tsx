"use client";

import { useState, useMemo } from "react";
import { Plus, ChevronDown, CheckCircle2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, TASK_CATEGORY_LABELS } from "@/lib/utils";
import { isToday, isPast, isTomorrow, parseISO } from "date-fns";
import type { WarRoomTaskWithRelations } from "@/types";
import WarRoomTaskItem from "./war-room-task-item";

interface WarRoomTaskListProps {
  tasks: WarRoomTaskWithRelations[];
  onToggle: (id: string, completed: boolean) => void;
  onClickTask: (task: WarRoomTaskWithRelations) => void;
  onAddTask: () => void;
}

function classifyTask(task: WarRoomTaskWithRelations): "overdue" | "today" | "upcoming" | "no_date" {
  if (!task.due_date) return "no_date";
  // Use only the date part to avoid timezone shifts
  const normalized = task.due_date.substring(0, 10);
  const date = parseISO(normalized);
  if (isToday(date) || isTomorrow(date)) return "today";
  if (isPast(date)) return "overdue";
  return "upcoming";
}

export default function WarRoomTaskList({
  tasks,
  onToggle,
  onClickTask,
  onAddTask,
}: WarRoomTaskListProps) {
  const [categoryFilter, setCategoryFilter] = useState("todas");
  const [showCompleted, setShowCompleted] = useState(false);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (categoryFilter !== "todas" && t.category !== categoryFilter) return false;
      return true;
    });
  }, [tasks, categoryFilter]);

  const pending = useMemo(() => filtered.filter((t) => !t.is_completed), [filtered]);
  const completed = useMemo(() => filtered.filter((t) => t.is_completed), [filtered]);

  // Group pending by urgency
  const groups = useMemo(() => {
    const overdue: WarRoomTaskWithRelations[] = [];
    const today: WarRoomTaskWithRelations[] = [];
    const upcoming: WarRoomTaskWithRelations[] = [];
    const noDate: WarRoomTaskWithRelations[] = [];

    for (const task of pending) {
      const cls = classifyTask(task);
      if (cls === "overdue") overdue.push(task);
      else if (cls === "today") today.push(task);
      else if (cls === "upcoming") upcoming.push(task);
      else noDate.push(task);
    }

    // Sort overdue by date ascending (oldest first)
    overdue.sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""));
    // Sort upcoming by date ascending
    upcoming.sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""));

    return { overdue, today, upcoming, noDate };
  }, [pending]);

  const hasAnyPending = pending.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-[15px] font-bold text-[#18191D]">
            Pendientes
            {pending.length > 0 && (
              <span className="ml-2 text-[13px] font-extrabold text-[#0B5394] font-mono">
                {pending.length}
              </span>
            )}
          </h3>

          {/* Category filter — single compact dropdown */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-7 w-auto min-w-0 gap-1 rounded-lg border-[#E8E6E1] text-[11px] font-semibold text-[#6B7080] px-2 py-0 bg-[#FAF9F7] hover:bg-[#F0EDE8] transition-colors [&>svg]:h-3 [&>svg]:w-3">
              <Filter className="h-3 w-3 text-[#9CA3B4]" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {Object.entries(TASK_CATEGORY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onAddTask}
          className="h-7 rounded-lg border-[#0B5394]/20 text-[#0B5394] hover:bg-[#E8F0FE] text-[11px] font-semibold gap-1 px-2.5"
        >
          <Plus className="h-3 w-3" />
          Nueva
        </Button>
      </div>

      {/* Task groups */}
      <div className="max-h-[420px] overflow-y-auto pr-0.5 space-y-1">
        {!hasAnyPending && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-10 h-10 rounded-full bg-[#ECFDF3] flex items-center justify-center mb-3">
              <CheckCircle2 className="h-5 w-5 text-[#0D9F6E]" />
            </div>
            <p className="text-[13px] font-medium text-[#6B7080]">
              Todo al día
            </p>
            <p className="text-[11px] text-[#9CA3B4] mt-0.5">
              No tienes tareas pendientes
            </p>
          </div>
        )}

        {/* OVERDUE section */}
        {groups.overdue.length > 0 && (
          <TaskGroup
            label="Vencidas"
            count={groups.overdue.length}
            accentColor="text-[#E63946]"
            dotColor="bg-[#E63946]"
            tasks={groups.overdue}
            onToggle={onToggle}
            onClickTask={onClickTask}
          />
        )}

        {/* TODAY section */}
        {groups.today.length > 0 && (
          <TaskGroup
            label="Hoy"
            count={groups.today.length}
            accentColor="text-[#0B5394]"
            dotColor="bg-[#0B5394]"
            tasks={groups.today}
            onToggle={onToggle}
            onClickTask={onClickTask}
          />
        )}

        {/* UPCOMING section */}
        {groups.upcoming.length > 0 && (
          <TaskGroup
            label="Próximas"
            count={groups.upcoming.length}
            accentColor="text-[#6B7080]"
            dotColor="bg-[#9CA3B4]"
            tasks={groups.upcoming}
            onToggle={onToggle}
            onClickTask={onClickTask}
          />
        )}

        {/* NO DATE section */}
        {groups.noDate.length > 0 && (
          <TaskGroup
            label="Sin fecha"
            count={groups.noDate.length}
            accentColor="text-[#9CA3B4]"
            dotColor="bg-[#D1D5DB]"
            tasks={groups.noDate}
            onToggle={onToggle}
            onClickTask={onClickTask}
          />
        )}
      </div>

      {/* Completed toggle */}
      {completed.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-[#9CA3B4] hover:text-[#6B7080] transition-colors py-1"
          >
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform",
                showCompleted && "rotate-180"
              )}
            />
            {completed.length} completada{completed.length !== 1 ? "s" : ""}
          </button>
          {showCompleted && (
            <div className="space-y-0.5 mt-1">
              {completed.map((task) => (
                <WarRoomTaskItem
                  key={task.id}
                  task={task}
                  onToggle={onToggle}
                  onClick={onClickTask}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Grouped section ──────────────────────────────────
function TaskGroup({
  label,
  count,
  accentColor,
  dotColor,
  tasks,
  onToggle,
  onClickTask,
}: {
  label: string;
  count: number;
  accentColor: string;
  dotColor: string;
  tasks: WarRoomTaskWithRelations[];
  onToggle: (id: string, completed: boolean) => void;
  onClickTask: (task: WarRoomTaskWithRelations) => void;
}) {
  return (
    <div className="mb-1">
      <div className="flex items-center gap-2 px-1 py-1.5">
        <span className={cn("w-1.5 h-1.5 rounded-full", dotColor)} />
        <span className={cn("text-[10.5px] font-bold uppercase tracking-wider", accentColor)}>
          {label}
        </span>
        <span className={cn("text-[10.5px] font-bold font-mono", accentColor)}>
          {count}
        </span>
      </div>
      <div className="space-y-0.5">
        {tasks.map((task) => (
          <WarRoomTaskItem
            key={task.id}
            task={task}
            onToggle={onToggle}
            onClick={onClickTask}
          />
        ))}
      </div>
    </div>
  );
}
