"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import type {
  ReminderWithRelations,
  WarRoomTaskWithRelations,
  WarRoomNote,
  WarRoomMetrics,
  Profile,
} from "@/types";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WarRoomGreeting from "@/components/war-room/war-room-greeting";
import WarRoomKpiStrip from "@/components/war-room/war-room-kpi-strip";
import WarRoomCalendar from "@/components/war-room/war-room-calendar";
import WarRoomTaskList from "@/components/war-room/war-room-task-list";
import WarRoomReminderPanel from "@/components/war-room/war-room-reminder-panel";
import WarRoomNotesPanel from "@/components/war-room/war-room-notes-panel";
import WarRoomMetricsBar from "@/components/war-room/war-room-metrics-bar";
import WarRoomTaskDetail from "@/components/war-room/war-room-task-detail";
import WarRoomKpiDrawer from "@/components/war-room/war-room-kpi-drawer";
import type { KpiDrawerType } from "@/components/war-room/war-room-kpi-drawer";
import WarRoomTaskDialog from "@/components/war-room/war-room-task-dialog";
import WarRoomNoteDialog from "@/components/war-room/war-room-note-dialog";
import WarRoomReminderDialog from "@/components/war-room/war-room-reminder-dialog";

// =====================================================
// War Room — Centro de Operaciones
// =====================================================
export default function WarRoomPage() {
  const { user, profile } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const deepLinkHandled = useRef(false);

  // Data state
  const [tasks, setTasks] = useState<WarRoomTaskWithRelations[]>([]);
  const [reminders, setReminders] = useState<ReminderWithRelations[]>([]);
  const [notes, setNotes] = useState<WarRoomNote[]>([]);
  const [metrics, setMetrics] = useState<WarRoomMetrics | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Panel state
  const [activePanel, setActivePanel] = useState<string>("tasks");

  // Selected task for detail view
  const [selectedTask, setSelectedTask] = useState<WarRoomTaskWithRelations | null>(null);

  // KPI drawer state
  const [kpiDrawerType, setKpiDrawerType] = useState<KpiDrawerType>(null);

  // Dialog state
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<WarRoomTaskWithRelations | null>(null);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderWithRelations | null>(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<WarRoomNote | null>(null);
  const [saving, setSaving] = useState(false);

  // ── FETCH FUNCTIONS ──────────────────────────────────

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/war-room/tasks");
      if (res.ok) {
        const { data } = await res.json();
        setTasks(data || []);
      }
    } catch (e) {
      console.error("Error fetching tasks:", e);
    }
  }, []);

  const fetchReminders = useCallback(async () => {
    try {
      const res = await fetch("/api/reminders");
      if (res.ok) {
        const { data } = await res.json();
        setReminders(data || []);
      }
    } catch (e) {
      console.error("Error fetching reminders:", e);
    }
  }, []);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/war-room/notes");
      if (res.ok) {
        const { data } = await res.json();
        setNotes(data || []);
      }
    } catch (e) {
      console.error("Error fetching notes:", e);
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch("/api/war-room/metrics");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (e) {
      console.error("Error fetching metrics:", e);
    }
  }, []);

  const fetchProfiles = useCallback(async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_active", true)
        .order("full_name");
      setProfiles(data || []);
    } catch (e) {
      console.error("Error fetching profiles:", e);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (!user) return;
    Promise.all([fetchTasks(), fetchReminders(), fetchNotes(), fetchMetrics(), fetchProfiles()]);
  }, [user, fetchTasks, fetchReminders, fetchNotes, fetchMetrics, fetchProfiles]);

  // ── DEEP LINKING from notification bell ─────────────
  useEffect(() => {
    if (deepLinkHandled.current) return;
    const taskId = searchParams.get("task");
    const reminderId = searchParams.get("reminder");

    if (taskId && tasks.length > 0) {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        deepLinkHandled.current = true;
        setSelectedTask(task);
        setActivePanel("tasks");
        if (task.due_date) {
          const d = new Date(task.due_date);
          setSelectedDate(d);
          setCurrentMonth(d);
        }
        // Clean URL params
        router.replace("/calendar", { scroll: false });
      }
    }

    if (reminderId && reminders.length > 0) {
      const reminder = reminders.find((r) => r.id === reminderId);
      if (reminder) {
        deepLinkHandled.current = true;
        setActivePanel("reminders");
        setEditingReminder(reminder);
        setReminderDialogOpen(true);
        if (reminder.due_date) {
          const d = new Date(reminder.due_date);
          setSelectedDate(d);
          setCurrentMonth(d);
        }
        // Clean URL params
        router.replace("/calendar", { scroll: false });
      }
    }
  }, [searchParams, tasks, reminders, router]);

  // ── TASK CRUD ────────────────────────────────────────

  const handleToggleTask = useCallback(async (id: string, completed: boolean) => {
    try {
      const res = await fetch("/api/war-room/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_completed: completed }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === id ? data : t)));
        fetchMetrics();
        toast.success(completed ? "Tarea completada" : "Tarea reabierta");
      }
    } catch {
      toast.error("Error al actualizar tarea");
    }
  }, [fetchMetrics]);

  const handleSaveTask = useCallback(async (formData: Record<string, unknown>) => {
    setSaving(true);
    try {
      const isEdit = !!editingTask;
      const res = await fetch("/api/war-room/tasks", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { id: editingTask.id, ...formData } : formData),
      });
      if (res.ok) {
        const { data } = await res.json();
        if (isEdit) {
          setTasks((prev) => prev.map((t) => (t.id === data.id ? data : t)));
        } else {
          setTasks((prev) => [data, ...prev]);
        }
        setTaskDialogOpen(false);
        setEditingTask(null);
        fetchMetrics();
        toast.success(isEdit ? "Tarea actualizada" : "Tarea creada");
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al guardar tarea");
      }
    } catch {
      toast.error("Error al guardar tarea");
    } finally {
      setSaving(false);
    }
  }, [editingTask, fetchMetrics]);

  // ── REMINDER CRUD ────────────────────────────────────

  const handleToggleReminder = useCallback(async (id: string, completed: boolean) => {
    try {
      const res = await fetch("/api/reminders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_completed: completed }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setReminders((prev) => prev.map((r) => (r.id === id ? data : r)));
        fetchMetrics();
        toast.success(completed ? "Recordatorio completado" : "Recordatorio reabierto");
      }
    } catch {
      toast.error("Error al actualizar recordatorio");
    }
  }, [fetchMetrics]);

  const handleSaveReminder = useCallback(async (formData: Record<string, unknown>) => {
    setSaving(true);
    try {
      const isEdit = !!editingReminder;
      const res = await fetch("/api/reminders", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { id: editingReminder.id, ...formData } : formData),
      });
      if (res.ok) {
        const { data } = await res.json();
        if (isEdit) {
          setReminders((prev) => prev.map((r) => (r.id === data.id ? data : r)));
        } else {
          setReminders((prev) => [data, ...prev]);
        }
        setReminderDialogOpen(false);
        setEditingReminder(null);
        fetchMetrics();
        toast.success(isEdit ? "Recordatorio actualizado" : "Recordatorio creado");
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al guardar recordatorio");
      }
    } catch {
      toast.error("Error al guardar recordatorio");
    } finally {
      setSaving(false);
    }
  }, [editingReminder, fetchMetrics]);

  // ── NOTE CRUD ────────────────────────────────────────

  const handleSaveNote = useCallback(async (formData: Record<string, unknown>) => {
    setSaving(true);
    try {
      const isEdit = !!editingNote;
      const res = await fetch("/api/war-room/notes", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { id: editingNote.id, ...formData } : formData),
      });
      if (res.ok) {
        const { data } = await res.json();
        if (isEdit) {
          setNotes((prev) => prev.map((n) => (n.id === data.id ? data : n)));
        } else {
          setNotes((prev) => [data, ...prev]);
        }
        setNoteDialogOpen(false);
        setEditingNote(null);
        fetchMetrics();
        toast.success(isEdit ? "Nota actualizada" : "Nota creada");
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al guardar nota");
      }
    } catch {
      toast.error("Error al guardar nota");
    } finally {
      setSaving(false);
    }
  }, [editingNote, fetchMetrics]);

  const handleTogglePin = useCallback(async (id: string, pinned: boolean) => {
    try {
      const res = await fetch("/api/war-room/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, pinned }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setNotes((prev) => prev.map((n) => (n.id === id ? data : n)));
      }
    } catch {
      toast.error("Error al actualizar nota");
    }
  }, []);

  const handleDeleteNote = useCallback(async (id: string) => {
    try {
      const res = await fetch("/api/war-room/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: false }),
      });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== id));
        fetchMetrics();
        toast.success("Nota eliminada");
      }
    } catch {
      toast.error("Error al eliminar nota");
    }
  }, [fetchMetrics]);

  // ── FILTERED DATA (by selected date) ────────────────

  const filteredTasks = selectedDate
    ? tasks.filter((t) => {
        if (!t.due_date) return false;
        // Compare only the date part (first 10 chars) to avoid timezone shifts
        return t.due_date.substring(0, 10) === format(selectedDate, "yyyy-MM-dd");
      })
    : tasks;

  const filteredReminders = selectedDate
    ? reminders.filter((r) => {
        if (!r.due_date) return false;
        return r.due_date.substring(0, 10) === format(selectedDate, "yyyy-MM-dd");
      })
    : reminders;

  const filteredNotes = selectedDate
    ? notes.filter((n) => {
        if (!n.linked_date) return false;
        return n.linked_date === format(selectedDate, "yyyy-MM-dd");
      })
    : notes;

  // ── DIALOG HANDLERS ─────────────────────────────────

  const openAddTask = useCallback(() => { setEditingTask(null); setTaskDialogOpen(true); }, []);
  const openAddReminder = useCallback(() => { setEditingReminder(null); setReminderDialogOpen(true); }, []);
  const openAddNote = useCallback(() => { setEditingNote(null); setNoteDialogOpen(true); }, []);

  const openEditTask = useCallback((task: WarRoomTaskWithRelations) => { setEditingTask(task); setTaskDialogOpen(true); setSelectedTask(null); }, []);

  // Show task detail in right panel (instead of opening edit dialog immediately)
  const showTaskDetail = useCallback((task: WarRoomTaskWithRelations) => { setSelectedTask(task); }, []);
  const openEditReminder = useCallback((reminder: ReminderWithRelations) => { setEditingReminder(reminder); setReminderDialogOpen(true); }, []);
  const openEditNote = useCallback((note: WarRoomNote) => { setEditingNote(note); setNoteDialogOpen(true); }, []);

  // ── Date selection with smart auto-switch ───────────
  const handleDateSelect = useCallback((date: Date | null) => {
    setSelectedDate(date);
    setSelectedTask(null);
    if (date) {
      const dateStr = format(date, "yyyy-MM-dd");
      const hasTasks = tasks.some((t) => t.due_date && t.due_date.substring(0, 10) === dateStr);
      const hasReminders = reminders.some((r) => r.due_date && r.due_date.substring(0, 10) === dateStr);
      const hasNotes = notes.some((n) => n.linked_date === dateStr);

      if (hasTasks) setActivePanel("tasks");
      else if (hasReminders) setActivePanel("reminders");
      else if (hasNotes) setActivePanel("notes");
      else setActivePanel("tasks");
    }
  }, [tasks, reminders, notes]);

  // ── Pending counts ────────────────────────────────────
  const pendingTasks = filteredTasks.filter((t) => !t.is_completed).length;
  const pendingReminders = filteredReminders.filter((r) => !r.is_completed).length;

  // ── LOADING STATE ────────────────────────────────────

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-[#0B5394] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#6B7080]">Cargando War Room...</span>
        </div>
      </div>
    );
  }

  // ── RENDER ──────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 12.5, color: "#9CA3B4" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 4, color: "#0B5394", fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          Inicio
        </Link>
        <span style={{ color: "#C5CAD5" }}>/</span>
        <span style={{ fontWeight: 600, color: "#6B7080" }}>Calendario</span>
      </div>

      {/* Greeting */}
      <WarRoomGreeting
        profile={profile}
        onAddTask={openAddTask}
        onAddReminder={openAddReminder}
        onAddNote={openAddNote}
      />

      {/* KPI Strip */}
      <WarRoomKpiStrip metrics={metrics} onCardClick={setKpiDrawerType} />

      {/* ════════════════════════════════════════════════════
          Main content — Calendar (protagonist) + Panel
          ════════════════════════════════════════════════════ */}
      <div className="flex flex-col xl:flex-row gap-5">

        {/* ── LEFT: CALENDARIO — protagonista ──────────── */}
        <div className="w-full xl:w-[62%] xl:min-w-0">
          <WarRoomCalendar
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            tasks={tasks}
            reminders={reminders}
            onMonthChange={setCurrentMonth}
            onDateSelect={handleDateSelect}
          />
        </div>

        {/* ── RIGHT: Panel — Tareas / Recordatorios / Notas ── */}
        <div className="w-full xl:w-[38%] xl:min-w-0">
          <div className="bg-white rounded-[18px] border border-[#F0EDE8] shadow-[0_1px_2px_rgba(26,29,35,0.03),0_2px_8px_rgba(26,29,35,0.04)] h-full flex flex-col">
            <Tabs value={activePanel} onValueChange={setActivePanel} className="flex flex-col h-full">
              {/* Tab header */}
              <div className="px-5 pt-5 pb-2 shrink-0">
                <TabsList className="w-full bg-[#FAF9F7] rounded-[10px] p-1 h-auto">
                  <TabsTrigger
                    value="tasks"
                    className="flex-1 rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#18191D] text-[#6B7080] py-2"
                  >
                    Tareas
                    {pendingTasks > 0 && (
                      <span className="ml-1.5 bg-[#E8F0FE] text-[#0B5394] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {pendingTasks}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="reminders"
                    className="flex-1 rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#18191D] text-[#6B7080] py-2"
                  >
                    Recordatorios
                    {pendingReminders > 0 && (
                      <span className="ml-1.5 bg-[#FFF8EB] text-[#DC8B0B] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {pendingReminders}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="notes"
                    className="flex-1 rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#18191D] text-[#6B7080] py-2"
                  >
                    Notas
                    {filteredNotes.length > 0 && (
                      <span className="ml-1.5 bg-[#F3F0FF] text-[#7C5CFC] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {filteredNotes.length}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Date filter indicator */}
                {selectedDate && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#6B7080]">
                      Filtrando:
                    </span>
                    <span className="text-xs font-semibold text-[#0B5394] bg-[#E8F0FE] px-2 py-0.5 rounded-md">
                      {format(selectedDate, "d 'de' MMMM yyyy")}
                    </span>
                    <button
                      onClick={() => { setSelectedDate(null); setSelectedTask(null); }}
                      className="text-[10px] text-[#9CA3B4] hover:text-[#E63946] transition-colors cursor-pointer"
                    >
                      Limpiar
                    </button>
                  </div>
                )}
              </div>

              {/* Tab content — scrollable */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <TabsContent value="tasks" className="pb-5 mt-0">
                  {selectedTask ? (
                    <WarRoomTaskDetail
                      task={selectedTask}
                      onBack={() => setSelectedTask(null)}
                      onEdit={openEditTask}
                      onToggle={(id, completed) => {
                        handleToggleTask(id, completed);
                        setSelectedTask((prev) =>
                          prev && prev.id === id ? { ...prev, is_completed: completed } : prev
                        );
                      }}
                    />
                  ) : (
                    <div className="px-5">
                      <WarRoomTaskList
                        tasks={filteredTasks}
                        onToggle={handleToggleTask}
                        onClickTask={showTaskDetail}
                        onAddTask={openAddTask}
                      />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="reminders" className="px-5 pb-5 mt-0">
                  <WarRoomReminderPanel
                    reminders={filteredReminders}
                    onClickReminder={openEditReminder}
                    onToggleComplete={handleToggleReminder}
                    onAddReminder={openAddReminder}
                  />
                </TabsContent>

                <TabsContent value="notes" className="px-5 pb-5 mt-0">
                  <WarRoomNotesPanel
                    notes={filteredNotes}
                    onAddNote={openAddNote}
                    onClickNote={openEditNote}
                    onTogglePin={handleTogglePin}
                    onDeleteNote={handleDeleteNote}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Metrics Bar */}
      <WarRoomMetricsBar metrics={metrics} />

      {/* ── Dialogs ── */}
      <WarRoomTaskDialog
        open={taskDialogOpen}
        onOpenChange={(open) => { setTaskDialogOpen(open); if (!open) setEditingTask(null); }}
        task={editingTask}
        profiles={profiles}
        onSave={handleSaveTask}
        saving={saving}
      />

      <WarRoomReminderDialog
        open={reminderDialogOpen}
        onOpenChange={(open) => { setReminderDialogOpen(open); if (!open) setEditingReminder(null); }}
        reminder={editingReminder}
        profiles={profiles}
        onSave={handleSaveReminder}
        saving={saving}
      />

      <WarRoomNoteDialog
        open={noteDialogOpen}
        onOpenChange={(open) => { setNoteDialogOpen(open); if (!open) setEditingNote(null); }}
        note={editingNote}
        onSave={handleSaveNote}
        saving={saving}
      />

      {/* KPI Drawer */}
      <WarRoomKpiDrawer
        type={kpiDrawerType}
        tasks={tasks}
        reminders={reminders}
        notes={notes}
        onClose={() => setKpiDrawerType(null)}
        onClickTask={(task) => { setKpiDrawerType(null); showTaskDetail(task); setActivePanel("tasks"); }}
        onClickReminder={(reminder) => { setKpiDrawerType(null); openEditReminder(reminder); }}
        onClickNote={(note) => { setKpiDrawerType(null); openEditNote(note); }}
      />
    </div>
  );
}
