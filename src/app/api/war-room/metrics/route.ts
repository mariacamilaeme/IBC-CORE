import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// =====================================================
// GET /api/war-room/metrics
// Aggregated productivity metrics for the War Room
// =====================================================
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: profile, error: profileError } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
    if (profileError || !profile) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 403 });

    const now = new Date();
    // Use Colombia timezone (UTC-5) for consistent date boundaries
    const pad = (n: number) => String(n).padStart(2, "0");
    const toLocalDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const todayStr = toLocalDate(now);
    const todayStart = `${todayStr}T00:00:00`;
    const todayEnd = `${todayStr}T23:59:59`;

    // Monday of current week
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
    const weekStart = `${toLocalDate(monday)}T00:00:00`;
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    const weekEnd = `${toLocalDate(sunday)}T23:59:59`;

    // First of current month
    const monthFirst = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthLast = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthStart = `${toLocalDate(monthFirst)}T00:00:00`;
    const monthEnd = `${toLocalDate(monthLast)}T23:59:59`;

    const isComercial = profile.role === "comercial";

    // Run all queries in parallel
    const [
      tasksToday,
      tasksCompletedWeek,
      tasksOverdue,
      remindersActive,
      remindersCompletedWeek,
      remindersOverdue,
      notesActive,
      tasksMonth,
      tasksCompletedMonth,
      tasksByCategory,
      tasksCompletedDaily,
    ] = await Promise.all([
      // Tasks due today, not completed
      (() => {
        let q = supabase.from("war_room_tasks").select("id", { count: "exact" }).eq("is_active", true).eq("is_completed", false).gte("due_date", todayStart).lte("due_date", todayEnd);
        if (isComercial) q = q.eq("assigned_to", user.id);
        return q;
      })(),
      // Tasks completed this week
      (() => {
        let q = supabase.from("war_room_tasks").select("id", { count: "exact" }).eq("is_active", true).eq("is_completed", true).gte("completed_at", weekStart).lte("completed_at", weekEnd);
        if (isComercial) q = q.eq("assigned_to", user.id);
        return q;
      })(),
      // Tasks overdue
      (() => {
        let q = supabase.from("war_room_tasks").select("id", { count: "exact" }).eq("is_active", true).eq("is_completed", false).lt("due_date", todayStart).not("due_date", "is", null);
        if (isComercial) q = q.eq("assigned_to", user.id);
        return q;
      })(),
      // Active reminders
      (() => {
        let q = supabase.from("reminders").select("id", { count: "exact" }).eq("is_active", true).eq("is_completed", false);
        if (isComercial) q = q.eq("assigned_to", user.id);
        return q;
      })(),
      // Reminders completed this week
      (() => {
        let q = supabase.from("reminders").select("id", { count: "exact" }).eq("is_active", true).eq("is_completed", true).gte("completed_at", weekStart).lte("completed_at", weekEnd);
        if (isComercial) q = q.eq("assigned_to", user.id);
        return q;
      })(),
      // Reminders overdue
      (() => {
        let q = supabase.from("reminders").select("id", { count: "exact" }).eq("is_active", true).eq("is_completed", false).lt("due_date", todayStart);
        if (isComercial) q = q.eq("assigned_to", user.id);
        return q;
      })(),
      // Active notes
      (() => {
        let q = supabase.from("war_room_notes").select("id", { count: "exact" }).eq("is_active", true);
        if (isComercial) q = q.eq("created_by", user.id);
        return q;
      })(),
      // Total tasks this month
      (() => {
        let q = supabase.from("war_room_tasks").select("id", { count: "exact" }).eq("is_active", true).gte("created_at", monthStart).lte("created_at", monthEnd);
        if (isComercial) q = q.eq("assigned_to", user.id);
        return q;
      })(),
      // Tasks completed this month
      (() => {
        let q = supabase.from("war_room_tasks").select("id", { count: "exact" }).eq("is_active", true).eq("is_completed", true).gte("completed_at", monthStart).lte("completed_at", monthEnd);
        if (isComercial) q = q.eq("assigned_to", user.id);
        return q;
      })(),
      // Tasks by category
      (() => {
        let q = supabase.from("war_room_tasks").select("category").eq("is_active", true).eq("is_completed", false);
        if (isComercial) q = q.eq("assigned_to", user.id);
        return q;
      })(),
      // Tasks completed per day this week (fetch all, group client-side)
      (() => {
        let q = supabase.from("war_room_tasks").select("completed_at").eq("is_active", true).eq("is_completed", true).gte("completed_at", weekStart).lte("completed_at", weekEnd);
        if (isComercial) q = q.eq("assigned_to", user.id);
        return q;
      })(),
    ]);

    // Weekly completions: array of 7 (Mon-Sun)
    const weeklyCompletions = [0, 0, 0, 0, 0, 0, 0];
    if (tasksCompletedDaily.data) {
      for (const task of tasksCompletedDaily.data) {
        if (task.completed_at) {
          const d = new Date(task.completed_at);
          const dayIndex = d.getDay() === 0 ? 6 : d.getDay() - 1;
          weeklyCompletions[dayIndex]++;
        }
      }
    }

    // Category distribution
    const catMap: Record<string, number> = {};
    if (tasksByCategory.data) {
      for (const t of tasksByCategory.data) {
        const cat = (t.category as string) || "general";
        catMap[cat] = (catMap[cat] || 0) + 1;
      }
    }
    const categoryDistribution = Object.entries(catMap).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);

    // Monthly completion rate
    const totalMonth = tasksMonth.count || 0;
    const completedMonth = tasksCompletedMonth.count || 0;
    const monthlyRate = totalMonth > 0 ? Math.round((completedMonth / totalMonth) * 100) : 0;

    const res = NextResponse.json({
      tasks_today: tasksToday.count || 0,
      completed_this_week: (tasksCompletedWeek.count || 0) + (remindersCompletedWeek.count || 0),
      overdue_count: (tasksOverdue.count || 0) + (remindersOverdue.count || 0),
      active_reminders: remindersActive.count || 0,
      active_notes: notesActive.count || 0,
      weekly_completions: weeklyCompletions,
      monthly_completion_rate: monthlyRate,
      category_distribution: categoryDistribution,
    });
    res.headers.set("Cache-Control", "private, max-age=60");
    return res;
  } catch (error) {
    console.error("Unexpected error in GET /api/war-room/metrics:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
