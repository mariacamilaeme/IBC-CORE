"use client";

import { useQuotationsData } from "@/hooks/useQuotationsData";
import ChartsDashboard from "../charts-dashboard";

export default function ReportsPage() {
  const { data } = useQuotationsData();
  return <ChartsDashboard data={data} />;
}
