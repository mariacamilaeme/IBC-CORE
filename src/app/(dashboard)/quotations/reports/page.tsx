"use client";

import dynamic from "next/dynamic";
import { useQuotationsData } from "@/hooks/useQuotationsData";

const ChartsDashboard = dynamic(() => import("../charts-dashboard"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #E8E6E1", borderTopColor: "#0B5394", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  ),
});

export default function ReportsPage() {
  const { data } = useQuotationsData();
  return <ChartsDashboard data={data} />;
}
