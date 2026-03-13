import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import REPORT_DATA from "@/data/quotations-report.json";

// =====================================================
// GET /api/quotations/report-data
// Serves the static quotations report data to authenticated users only.
// This prevents the data from being bundled in client-side JS.
// =====================================================
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const res = NextResponse.json({ data: REPORT_DATA });
    res.headers.set("Cache-Control", "private, max-age=3600");
    return res;
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
