"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import Link from "next/link";
import { addLogoToWorkbook, addLogoToHeader } from "@/lib/excel-logo";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid,
} from "recharts";
import {
  DollarSign, Wallet, TrendingUp, AlertTriangle,
  ChevronDown, ChevronRight, Search, Download, Plus, Home,
  Pencil, Trash2, Check, X, Building2, Eye, Layers,
  CreditCard, Scale, Ship, Users, FileText,
} from "lucide-react";

import { T } from "@/lib/design-tokens";

// ─── FONT LOADER & KEYFRAMES ────────────────────────────────
const FontLoader = () => (
  <style>{`
    @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideRight { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes progressFill { from { width: 0%; } }
    @keyframes dotPulse { 0%,100% { opacity:.4 } 50% { opacity:1 } }
    ::-webkit-scrollbar { width: 5px }
    ::-webkit-scrollbar-track { background: transparent }
    ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 10px }
    .hlift { transition: all .3s cubic-bezier(.4,0,.2,1) }
    .hlift:hover { transform: translateY(-2px); box-shadow: ${T.shadowLg} }
    .hglow { transition: all .2s ease }
    .hglow:hover { background: ${T.surfaceHover} !important }
  `}</style>
);

// ─── TYPES ───────────────────────────────────────────────────
interface Supplier {
  id: string;
  name: string;
  bank_name: string | null;
  account_details: string | null;
}

interface Payment {
  id: string;
  category: string;
  supplier_id: string | null;
  client: string | null;
  description: string | null;
  china_sales_contract: string | null;
  usd_invoice: number | null;
  deposit: number | null;
  deposit_percentage: number | null;
  balance_to_pay: number | null;
  payment_colombia: string | null;
  account_info: string | null;
  client_payment: number | null;
  remarks: string | null;
  numeral_cambiario: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  suppliers: Supplier | null;
}

type Category = "reporte_pagos" | "abonos" | "pte_saldos" | "impo";

interface AgingBucket {
  label: string;
  value: number;
  pct: number;
  color: string;
  count: number;
}

interface CashFlowMonth {
  m: string;
  facturado: number;
  recaudado: number;
}

interface SupplierExposureItem {
  name: string;
  total: number;
  pct: number;
  deposited: number;
  balance: number;
  invoices: number;
}

const CATEGORIES: { key: Category; label: string; icon: React.ReactNode; color: string; colorBg: string }[] = [
  { key: "reporte_pagos", label: "Reporte de Pagos", icon: <CreditCard size={16} />, color: T.accent, colorBg: T.accentLight },
  { key: "abonos", label: "Abonos", icon: <Wallet size={16} />, color: T.success, colorBg: T.successBg },
  { key: "pte_saldos", label: "Saldos Pendientes", icon: <Scale size={16} />, color: T.warning, colorBg: T.warningBg },
  { key: "impo", label: "Importaciones", icon: <Ship size={16} />, color: T.blue, colorBg: T.blueBg },
];

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pendiente", color: T.danger, bg: T.dangerBg },
  partial: { label: "Parcial", color: T.warning, bg: T.warningBg },
  paid: { label: "Pagado", color: T.success, bg: T.successBg },
};

// ─── ANIMATED NUMBER ─────────────────────────────────────────
function AnimNum({ value, prefix = "", suffix = "", decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const n = typeof value === "number" ? value : 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / 1400, 1);
      setDisplay(n * (1 - Math.pow(1 - p, 5)));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value]);
  return <span>{prefix}{display.toLocaleString("es-CO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

// ─── CARD COMPONENT ──────────────────────────────────────────
function Card({ children, style = {}, delay = 0, hover = false }: {
  children: React.ReactNode; style?: React.CSSProperties; delay?: number; hover?: boolean;
}) {
  return (
    <div className={hover ? "hlift" : ""} style={{
      background: T.surface, borderRadius: T.radius, border: `1px solid ${T.borderLight}`,
      boxShadow: T.shadow, animation: `fadeUp .55s cubic-bezier(.4,0,.2,1) ${delay}ms both`,
      overflow: "hidden", ...style,
    }}>{children}</div>
  );
}

// ─── FORMAT HELPERS ──────────────────────────────────────────
function fmtUSD(v: number | null | undefined): string {
  if (v == null) return "—";
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtK(v: number): string {
  return "$" + (v / 1000).toFixed(1) + "K";
}

// ─── ANALYTICS HELPERS ───────────────────────────────────────
function calculateAgingBuckets(payments: Payment[]): AgingBucket[] {
  const now = Date.now();
  const pending = payments.filter(p => p.status !== "paid" && p.balance_to_pay && p.balance_to_pay > 0);
  const buckets = [
    { label: "0–15 días", min: 0, max: 15, value: 0, count: 0, color: T.success },
    { label: "16–30 días", min: 16, max: 30, value: 0, count: 0, color: T.blue },
    { label: "31–60 días", min: 31, max: 60, value: 0, count: 0, color: T.warning },
    { label: "60+ días", min: 61, max: Infinity, value: 0, count: 0, color: T.danger },
  ];
  for (const p of pending) {
    const days = Math.floor((now - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const balance = p.balance_to_pay || 0;
    for (const b of buckets) {
      if (days >= b.min && days <= b.max) {
        b.value += balance;
        b.count++;
        break;
      }
    }
  }
  const total = buckets.reduce((s, b) => s + b.value, 0);
  return buckets.map(b => ({
    label: b.label,
    value: Math.round(b.value * 100) / 100,
    pct: total > 0 ? Math.round((b.value / total) * 1000) / 10 : 0,
    color: b.color,
    count: b.count,
  }));
}

function calculateCashFlow(payments: Payment[]): CashFlowMonth[] {
  const now = new Date();
  const months: CashFlowMonth[] = [];
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const monthPayments = payments.filter(p => {
      const pd = new Date(p.created_at);
      return `${pd.getFullYear()}-${pd.getMonth()}` === key;
    });
    months.push({
      m: monthNames[d.getMonth()],
      facturado: Math.round(monthPayments.reduce((s, p) => s + (p.usd_invoice || 0), 0) / 1000),
      recaudado: Math.round(monthPayments.reduce((s, p) => s + (p.client_payment || 0), 0) / 1000),
    });
  }
  return months;
}

function calculateSupplierExposure(payments: Payment[]): SupplierExposureItem[] {
  const map: Record<string, SupplierExposureItem> = {};
  for (const p of payments) {
    const name = p.suppliers?.name || "Sin Proveedor";
    if (!map[name]) map[name] = { name, total: 0, pct: 0, deposited: 0, balance: 0, invoices: 0 };
    map[name].total += p.usd_invoice || 0;
    map[name].deposited += p.deposit || 0;
    map[name].balance += p.balance_to_pay || 0;
    map[name].invoices++;
  }
  const items = Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5);
  const grandTotal = items.reduce((s, i) => s + i.total, 0);
  for (const item of items) {
    item.pct = grandTotal > 0 ? Math.round((item.total / grandTotal) * 1000) / 10 : 0;
  }
  return items;
}

function getPaymentAge(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
}

// =====================================================
// MAIN COMPONENT
// =====================================================
export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category>("reporte_pagos");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Payment>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPayment, setNewPayment] = useState<Partial<Payment>>({ category: "reporte_pagos", status: "pending" });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [saving, setSaving] = useState(false);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierBank, setNewSupplierBank] = useState("");
  const [newSupplierAccount, setNewSupplierAccount] = useState("");
  const [creatingSup, setCreatingSup] = useState(false);

  // ── Fetch payments ──
  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch(`/api/payments?pageSize=500`);
      if (res.ok) {
        const json = await res.json();
        setPayments(json.data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch suppliers ──
  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch(`/api/payments/suppliers`);
      if (res.ok) {
        const json = await res.json();
        setSuppliers(json.data || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchPayments();
    fetchSuppliers();
  }, [fetchPayments, fetchSuppliers]);

  // ── Suppliers from payments fallback ──
  const suppliersFromPayments = payments.reduce((acc, p) => {
    if (p.suppliers && !acc.find(s => s.id === p.suppliers!.id)) acc.push(p.suppliers);
    return acc;
  }, [] as Supplier[]);
  const allSuppliers = suppliers.length > 0 ? suppliers : suppliersFromPayments;

  // ── Filter payments ──
  const filtered = payments.filter(p => {
    if (p.category !== activeCategory) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (debouncedSearch) {
      const s = debouncedSearch.toLowerCase();
      return (
        (p.client || "").toLowerCase().includes(s) ||
        (p.description || "").toLowerCase().includes(s) ||
        (p.china_sales_contract || "").toLowerCase().includes(s) ||
        (p.remarks || "").toLowerCase().includes(s)
      );
    }
    return true;
  });

  // ── Group by supplier ──
  const grouped = filtered.reduce((acc, p) => {
    const name = p.suppliers?.name || "Sin Proveedor";
    if (!acc[name]) acc[name] = [];
    acc[name].push(p);
    return acc;
  }, {} as Record<string, Payment[]>);

  useEffect(() => {
    setExpandedSuppliers(new Set(Object.keys(grouped)));
  }, [activeCategory, payments.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Global Analytics ──
  const totalFacturado = payments.reduce((s, p) => s + (p.usd_invoice || 0), 0);
  const totalRecaudado = payments.reduce((s, p) => s + (p.client_payment || 0), 0);
  const totalSaldoPendiente = payments.reduce((s, p) => s + (p.balance_to_pay || 0), 0);
  const totalDepositos = payments.reduce((s, p) => s + (p.deposit || 0), 0);
  const totalAbonos = payments.filter(p => p.category === "abonos").reduce((s, p) => s + (p.client_payment || 0), 0);
  const agingBuckets = calculateAgingBuckets(payments);
  const totalAging = agingBuckets.reduce((s, b) => s + b.value, 0);
  const cashFlowData = calculateCashFlow(payments);
  const supplierExposure = calculateSupplierExposure(payments);

  // Client-focused metrics
  const uniqueClients = new Set(payments.filter(p => p.client).map(p => p.client!.toLowerCase().trim())).size;
  const countByCategory = {
    reporte_pagos: payments.filter(p => p.category === "reporte_pagos").length,
    abonos: payments.filter(p => p.category === "abonos").length,
    pte_saldos: payments.filter(p => p.category === "pte_saldos").length,
    impo: payments.filter(p => p.category === "impo").length,
  };
  const pendingCount = payments.filter(p => p.status === "pending").length;

  // Cash flow trend
  const lastMonth = cashFlowData[cashFlowData.length - 1];
  const prevMonth = cashFlowData[cashFlowData.length - 2];
  const brechaCobranza = totalFacturado - totalRecaudado;
  const trendPct = prevMonth && prevMonth.recaudado > 0
    ? (((lastMonth?.recaudado || 0) - prevMonth.recaudado) / prevMonth.recaudado * 100)
    : 0;

  // ── Toggle supplier ──
  const toggleSupplier = (name: string) => {
    setExpandedSuppliers(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  // ── Save inline edit ──
  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...editData }),
      });
      if (res.ok) {
        await fetchPayments();
        setEditingId(null);
        setEditData({});
      }
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  // ── Delete payment ──
  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este pago?")) return;
    try {
      const res = await fetch(`/api/payments?id=${id}`, { method: "DELETE" });
      if (res.ok) await fetchPayments();
    } catch { /* ignore */ }
  };

  // ── Add new payment ──
  const handleAddPayment = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newPayment, category: activeCategory }),
      });
      if (res.ok) {
        await fetchPayments();
        setShowAddModal(false);
        setNewPayment({ category: activeCategory, status: "pending" });
      }
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  // ── Create new supplier ──
  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim()) return;
    setCreatingSup(true);
    try {
      const res = await fetch("/api/payments/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSupplierName.trim(),
          bank_name: newSupplierBank.trim() || null,
          account_details: newSupplierAccount.trim() || null,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const created = json.data;
        setSuppliers(prev => [...prev, created]);
        setNewPayment(prev => ({ ...prev, supplier_id: created.id }));
        setShowNewSupplier(false);
        setNewSupplierName("");
        setNewSupplierBank("");
        setNewSupplierAccount("");
      }
    } catch { /* ignore */ } finally { setCreatingSup(false); }
  };

  // ── Excel export (all categories as separate sheets) ──
  const handleExport = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "IBC Steel Group - IBC Core";
    wb.created = new Date();
    const FONT = "Aptos";
    const NAVY = "1E3A5F";
    const WHITE = "FFFFFF";
    const dateStr = new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
    const logoId = await addLogoToWorkbook(wb);

    for (const cat of CATEGORIES) {
      const catPayments = payments.filter(p => p.category === cat.key);
      const catIsImpo = cat.key === "impo";
      const ws = wb.addWorksheet(cat.label);

      ws.mergeCells("A1", "K1");
      const c1 = ws.getCell("A1");
      c1.value = {
        richText: [
          { text: "                              ", font: { name: FONT, size: 16, color: { argb: NAVY } } },
          { text: cat.label.toUpperCase(), font: { name: FONT, size: 12, bold: true, color: { argb: WHITE } } },
          { text: `     ${dateStr}  ·  ${catPayments.length} registros`, font: { name: FONT, size: 9, color: { argb: "D0DCE8" } } },
        ],
      } as never;
      c1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      c1.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      ws.getRow(1).height = 52;
      addLogoToHeader(ws, logoId, 11);

      ws.getRow(2).height = 5;
      for (let c = 1; c <= 11; c++) ws.getRow(2).getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } };

      const headers = catIsImpo
        ? ["Contrato China", "USD Factura", "% Depósito", "Saldo a Pagar", "Pago Colombia", "Proveedor", "Cuenta", "Numeral Cambiario", "Estado", "", ""]
        : ["Cliente", "Descripción", "Contrato China", "USD Factura", "Depósito", "Saldo / % Pagado", "Pago Colombia", "Proveedor", "Cuenta", "Pago Cliente", "Observaciones"];

      const headerRow = ws.getRow(3);
      headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.font = { name: FONT, size: 9.5, bold: true, color: { argb: WHITE } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "2A4D7A" } };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.border = { top: { style: "thin", color: { argb: WHITE } }, bottom: { style: "thin", color: { argb: WHITE } }, left: { style: "thin", color: { argb: WHITE } }, right: { style: "thin", color: { argb: WHITE } } };
      });
      headerRow.height = 28;

      // Group by supplier
      const catGrouped = catPayments.reduce((acc, p) => {
        const name = p.suppliers?.name || "Sin Proveedor";
        if (!acc[name]) acc[name] = [];
        acc[name].push(p);
        return acc;
      }, {} as Record<string, Payment[]>);

      let rowIdx = 4;
      for (const [supplierName, records] of Object.entries(catGrouped)) {
        ws.mergeCells(`A${rowIdx}`, `K${rowIdx}`);
        const sCell = ws.getCell(`A${rowIdx}`);
        sCell.value = supplierName;
        sCell.font = { name: FONT, size: 10, bold: true, color: { argb: NAVY } };
        sCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E8F0FE" } };
        sCell.alignment = { vertical: "middle" };
        ws.getRow(rowIdx).height = 24;
        rowIdx++;

        for (const p of records) {
          const row = ws.getRow(rowIdx);
          const isOdd = (rowIdx - 4) % 2 === 1;
          const bgColor = isOdd ? "F8F7F5" : WHITE;
          const vals = catIsImpo
            ? [p.china_sales_contract, p.usd_invoice, p.deposit_percentage, p.balance_to_pay, p.payment_colombia, p.suppliers?.name, p.account_info, p.numeral_cambiario, STATUS_CFG[p.status]?.label || p.status, "", ""]
            : [p.client, p.description, p.china_sales_contract, p.usd_invoice, p.deposit, p.balance_to_pay ?? p.deposit_percentage, p.payment_colombia, p.suppliers?.name, p.account_info, p.client_payment, p.remarks];
          vals.forEach((v, i) => {
            const cell = row.getCell(i + 1);
            cell.value = v != null ? v : "";
            cell.font = { name: FONT, size: 9, color: { argb: "3D4049" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
            cell.alignment = { vertical: "middle", wrapText: true };
            cell.border = { bottom: { style: "hair", color: { argb: "EDECEA" } } };
            if (typeof v === "number" && i !== 2) cell.numFmt = '#,##0.00';
          });
          row.height = 22;
          rowIdx++;
        }

        const subRow = ws.getRow(rowIdx);
        const subTotal = records.reduce((s, p) => s + (p.client_payment || 0), 0);
        const subDeposit = records.reduce((s, p) => s + (p.deposit || 0), 0);
        for (let c = 1; c <= 11; c++) {
          const cell = subRow.getCell(c);
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F0EDE8" } };
          cell.border = { top: { style: "thin", color: { argb: "D4D2CD" } } };
        }
        subRow.getCell(1).value = "SUBTOTAL";
        subRow.getCell(1).font = { name: FONT, size: 9, bold: true, color: { argb: NAVY } };
        if (!catIsImpo) {
          subRow.getCell(5).value = subDeposit || "";
          subRow.getCell(5).numFmt = '#,##0.00';
          subRow.getCell(5).font = { name: FONT, size: 9, bold: true, color: { argb: NAVY } };
          subRow.getCell(10).value = subTotal || "";
          subRow.getCell(10).numFmt = '#,##0.00';
          subRow.getCell(10).font = { name: FONT, size: 9, bold: true, color: { argb: NAVY } };
        }
        subRow.height = 22;
        rowIdx++;
        rowIdx++;
      }

      ws.mergeCells(`A${rowIdx}`, `K${rowIdx}`);
      const fCell = ws.getCell(`A${rowIdx}`);
      fCell.value = `IBC STEEL GROUP  ·  Generado ${dateStr}`;
      fCell.font = { name: FONT, size: 8, italic: true, color: { argb: "9CA3B4" } };
      fCell.alignment = { horizontal: "center" };

      const widths = catIsImpo
        ? [20, 14, 12, 14, 18, 24, 30, 16, 12, 10, 10]
        : [22, 20, 20, 14, 14, 16, 18, 24, 30, 14, 24];
      widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
      ws.views = [{ state: "frozen" as const, xSplit: 0, ySplit: 3, activeCell: "A4" }];
      ws.autoFilter = { from: "A3", to: `K3` };
    }

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `IBC_Reporte_Pagos_Completo_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Start inline edit ──
  const startEdit = (p: Payment) => {
    setEditingId(p.id);
    setEditData({
      client: p.client, description: p.description, china_sales_contract: p.china_sales_contract,
      usd_invoice: p.usd_invoice, deposit: p.deposit, deposit_percentage: p.deposit_percentage,
      balance_to_pay: p.balance_to_pay, payment_colombia: p.payment_colombia,
      client_payment: p.client_payment, remarks: p.remarks, numeral_cambiario: p.numeral_cambiario, status: p.status,
    });
  };

  const activeCat = CATEGORIES.find(c => c.key === activeCategory)!;
  const supplierColors = [T.accent, T.blue, T.orange, T.teal, T.violet];
  const supplierBgs = [T.accentLight, T.blueBg, T.orangeBg, T.tealBg, T.violetBg];

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif", width: "100%", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}>
      <FontLoader />

      {/* ═══ BREADCRUMB ═══ */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, animation: "fadeIn .3s ease both", fontSize: 12.5, color: T.inkLight }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 4, color: T.accent, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>
          <Home size={14} /> Inicio
        </Link>
        <span style={{ color: T.inkGhost }}>/</span>
        <span style={{ fontWeight: 600, color: T.inkMuted }}>Pagos</span>
      </div>

      {/* ═══ HEADER BANNER ═══ */}
      <div style={{
        position: "relative", overflow: "hidden", borderRadius: 14,
        background: "linear-gradient(135deg, #1E3A5F 0%, #2a4d7a 50%, #3B82F6 100%)",
        padding: "14px 24px", marginBottom: 16,
        boxShadow: "0 4px 24px rgba(30,58,95,0.18)",
      }}>
        <div style={{
          position: "absolute", inset: 0, opacity: 0.07,
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "20px 20px",
        }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <CreditCard size={18} color="#fff" />
            </div>
            <div>
              <h1 style={{
                fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                fontSize: 18, fontWeight: 800, color: "#fff",
                letterSpacing: "-0.02em", lineHeight: 1.2,
              }}>Pagos</h1>
              <p style={{ fontSize: 12, color: "rgba(191,219,254,0.7)", fontWeight: 500, margin: 0 }}>
                Gestión de pagos, abonos e importaciones
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleExport}
              style={{
                padding: "7px 14px", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)",
                color: "#fff", fontWeight: 600, fontSize: 12,
                cursor: "pointer", fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                display: "flex", alignItems: "center", gap: 5,
                transition: "all 0.2s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
            >
              <Download size={16} />
              Descargar Excel
            </button>
            <button
              onClick={() => { setNewPayment({ category: activeCategory, status: "pending" }); setShowAddModal(true); }}
              style={{
                padding: "7px 16px", borderRadius: 8, border: "none",
                background: "#fff", color: "#1E3A5F", fontWeight: 700, fontSize: 12,
                cursor: "pointer", fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
                display: "flex", alignItems: "center", gap: 5,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)"; }}
            >
              <Plus size={16} />
              Nuevo Pago
            </button>
          </div>
        </div>
      </div>

      {/* ═══ 6 KPI CARDS ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Total Facturado", value: totalFacturado, prefix: "$", icon: <DollarSign size={18} />, color: T.accent, bg: T.accentLight },
          { label: "Pagos Clientes", value: totalRecaudado, prefix: "$", icon: <Wallet size={18} />, color: T.success, bg: T.successBg, sub: `${uniqueClients} clientes activos` },
          { label: "Total Abonos", value: totalAbonos, prefix: "$", icon: <Layers size={18} />, color: T.blue, bg: T.blueBg, sub: `${countByCategory.abonos} registros` },
          { label: "Saldo Pendiente", value: totalSaldoPendiente, prefix: "$", icon: <AlertTriangle size={18} />, color: T.danger, bg: T.dangerBg, sub: `${pendingCount} por cobrar` },
        ].map((k, i) => (
          <Card key={i} delay={50 * i} hover style={{ padding: "18px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", color: k.color }}>{k.icon}</div>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: T.inkLight, letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "right", lineHeight: 1.3, maxWidth: 80 }}>{k.label}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1 }}>
              <AnimNum value={k.value} prefix={k.prefix || ""} suffix="" decimals={0} />
            </div>
            {k.sub && <div style={{ fontSize: 10, color: T.inkLight, marginTop: 6, fontWeight: 500 }}>{k.sub}</div>}
          </Card>
        ))}
      </div>

      {/* ═══ STRATEGIC ROW: Cashflow + Aging + Exposure ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.9fr 0.8fr", gap: 14, marginBottom: 16 }}>

        {/* Cash Flow Chart */}
        <Card delay={400} style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" }}>Flujo de Caja</h3>
            <div style={{ display: "flex", gap: 14 }}>
              {[{ c: T.accent, l: "Facturado" }, { c: T.success, l: "Recaudado" }].map((lg, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: T.inkMuted }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: lg.c }} />{lg.l}
                </div>
              ))}
            </div>
          </div>
          <p style={{ fontSize: 11.5, color: T.inkLight, marginBottom: 14 }}>Últimos 6 meses · Miles USD</p>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={cashFlowData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke={T.borderLight} vertical={false} />
              <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: T.inkLight, fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: T.inkLight, fontSize: 11 }} />
              <RechartsTooltip
                contentStyle={{ background: T.ink, border: "none", borderRadius: 10, padding: "8px 14px" }}
                labelStyle={{ color: T.inkLight, fontSize: 11 }}
                itemStyle={{ color: "#fff", fontSize: 12, fontWeight: 600 }}
                formatter={(v: number | undefined) => [`$${v ?? 0}K`, ""]}
              />
              <Bar dataKey="facturado" fill={T.accent} radius={[4, 4, 0, 0]} />
              <Bar dataKey="recaudado" fill={T.success} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 12, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.borderLight}` }}>
            <div style={{ flex: 1, padding: "10px 14px", borderRadius: T.radiusSm, background: T.surfaceAlt }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.inkLight, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>Brecha de Cobro</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.danger, fontFamily: "'JetBrains Mono', monospace" }}>{fmtUSD(brechaCobranza)}</div>
              <div style={{ fontSize: 10.5, color: T.inkLight, marginTop: 2 }}>diferencia facturado vs recaudado</div>
            </div>
            <div style={{ flex: 1, padding: "10px 14px", borderRadius: T.radiusSm, background: T.surfaceAlt }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.inkLight, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>Tendencia</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: trendPct >= 0 ? T.success : T.danger, fontFamily: "'JetBrains Mono', monospace" }}>
                  {trendPct >= 0 ? "+" : ""}{trendPct.toFixed(1)}%
                </span>
              </div>
              <div style={{ fontSize: 10.5, color: T.inkLight, marginTop: 2 }}>mejora en recaudo vs mes anterior</div>
            </div>
          </div>
        </Card>

        {/* Aging Analysis */}
        <Card delay={500} style={{ padding: "22px 24px" }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em", marginBottom: 2 }}>Antigüedad de Saldos</h3>
          <p style={{ fontSize: 11.5, color: T.inkLight, marginBottom: 16 }}>Distribución de cartera pendiente</p>

          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <div style={{ position: "relative", width: 150, height: 150 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={agingBuckets.filter(b => b.value > 0)} dataKey="value" cx="50%" cy="50%" innerRadius={48} outerRadius={68} paddingAngle={3} strokeWidth={0}>
                    {agingBuckets.filter(b => b.value > 0).map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{fmtK(totalAging)}</div>
                <div style={{ fontSize: 9, color: T.inkMuted, fontWeight: 600, marginTop: 2 }}>PENDIENTE</div>
              </div>
            </div>
          </div>

          {agingBuckets.map((b, i) => (
            <div key={i} style={{ marginBottom: i < agingBuckets.length - 1 ? 12 : 0, animation: `slideRight .3s ease ${600 + i * 60}ms both` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 3, background: b.color }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.inkSoft }}>{b.label}</span>
                  <span style={{ fontSize: 10, color: T.inkLight, fontFamily: "'JetBrains Mono', monospace" }}>({b.count})</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{fmtK(b.value)}</span>
                  <span style={{ fontSize: 10, color: T.inkLight, fontFamily: "'JetBrains Mono', monospace", minWidth: 32, textAlign: "right" }}>{b.pct}%</span>
                </div>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: T.borderLight, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 2, background: b.color, width: `${b.pct}%`, animation: `progressFill .8s ease ${700 + i * 80}ms both` }} />
              </div>
            </div>
          ))}

          {agingBuckets[3] && agingBuckets[3].value > 0 && (
            <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: T.radiusSm, background: T.dangerBg, border: `1px solid ${T.danger}15`, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: T.danger }}><AlertTriangle size={16} /></span>
              <div style={{ fontSize: 11.5, color: T.ink }}>
                <strong>{fmtK(agingBuckets[3].value)}</strong> en cartera vencida 60+ días
              </div>
            </div>
          )}
        </Card>

        {/* Supplier Exposure */}
        <Card delay={600} style={{ padding: "22px 24px" }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em", marginBottom: 2 }}>Exposición por Proveedor</h3>
          <p style={{ fontSize: 11.5, color: T.inkLight, marginBottom: 18 }}>Concentración de riesgo</p>

          {supplierExposure.slice(0, 4).map((s, i) => (
            <div key={i} style={{
              padding: "14px 0",
              borderBottom: i < Math.min(supplierExposure.length, 4) - 1 ? `1px solid ${T.borderLight}` : "none",
              animation: `slideRight .3s ease ${700 + i * 80}ms both`,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: supplierBgs[i % supplierBgs.length], color: supplierColors[i % supplierColors.length], display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Building2 size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>{s.name.length > 22 ? s.name.slice(0, 22) + "..." : s.name}</div>
                    <div style={{ fontSize: 10, color: T.inkLight }}>{s.invoices} factura{s.invoices > 1 ? "s" : ""}</div>
                  </div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>
                  {s.pct > 0 ? `${s.pct}%` : "—"}
                </span>
              </div>
              {s.total > 0 && (
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1, padding: "6px 10px", borderRadius: 8, background: T.surfaceAlt, fontSize: 10.5 }}>
                    <div style={{ color: T.inkLight, fontWeight: 600, marginBottom: 2 }}>Facturado</div>
                    <div style={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{fmtK(s.total)}</div>
                  </div>
                  <div style={{ flex: 1, padding: "6px 10px", borderRadius: 8, background: T.surfaceAlt, fontSize: 10.5 }}>
                    <div style={{ color: T.inkLight, fontWeight: 600, marginBottom: 2 }}>Saldo</div>
                    <div style={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: s.balance > 20000 ? T.danger : T.ink }}>{fmtK(s.balance)}</div>
                  </div>
                </div>
              )}
              {s.total === 0 && s.balance > 0 && (
                <div style={{ padding: "6px 10px", borderRadius: 8, background: T.dangerBg, fontSize: 11, color: T.danger, fontWeight: 600 }}>
                  Devolución pendiente: {fmtK(s.balance)}
                </div>
              )}
            </div>
          ))}
        </Card>
      </div>

      {/* ═══ CATEGORY TABS ═══ */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, background: T.surfaceAlt, borderRadius: T.radiusSm, padding: 3, width: "fit-content", animation: "fadeIn .4s ease 700ms both" }}>
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat.key;
          const count = payments.filter(p => p.category === cat.key).length;
          return (
            <button key={cat.key} onClick={() => { setActiveCategory(cat.key); setStatusFilter("all"); }} style={{
              padding: "8px 20px", borderRadius: 8, border: "none",
              background: isActive ? T.surface : "transparent",
              boxShadow: isActive ? T.shadow : "none",
              color: isActive ? T.ink : T.inkMuted,
              fontWeight: isActive ? 700 : 500,
              fontSize: 12.5, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              display: "flex", alignItems: "center", gap: 6, transition: "all .2s ease",
            }}>
              {cat.icon}
              {cat.label}
              {count > 0 && (
                <span style={{
                  padding: "1px 7px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                  background: isActive ? T.accentLight : T.borderLight,
                  color: isActive ? T.accent : T.inkLight,
                }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══ SEARCH + FILTERS ═══ */}
      <Card delay={800} style={{ padding: "16px 24px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10, background: T.surfaceAlt, border: `1px solid ${T.borderLight}`, flex: 1, maxWidth: 440 }}>
            <span style={{ color: T.inkLight }}><Search size={15} /></span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por cliente, contrato, descripción..."
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, color: T.ink, fontFamily: "'DM Sans', sans-serif" }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: T.inkLight, display: "flex", alignItems: "center" }}>
                <X size={14} />
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { key: "all", label: "Todos" },
              { key: "partial", label: "Parcial" },
              { key: "pending", label: "Pendiente" },
              { key: "paid", label: "Completo" },
            ].map(f => (
              <span key={f.key} onClick={() => setStatusFilter(f.key)} style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                background: statusFilter === f.key ? T.ink : "transparent",
                color: statusFilter === f.key ? "#fff" : T.inkMuted,
                border: statusFilter === f.key ? "none" : `1px solid ${T.borderLight}`,
              }}>{f.label}</span>
            ))}
          </div>
        </div>
        <span style={{ fontSize: 12.5, color: T.inkMuted, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{filtered.length} registros</span>
      </Card>

      {/* ═══ PAYMENT TABLE BY SUPPLIER ═══ */}
      {loading ? (
        <Card style={{ padding: 60 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14, color: T.inkLight, fontWeight: 500 }}>Cargando pagos...</div>
          </div>
        </Card>
      ) : Object.keys(grouped).length === 0 ? (
        <Card style={{ padding: 60 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: activeCat.color, marginBottom: 12, opacity: 0.4, display: "flex", justifyContent: "center" }}>{activeCat.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 4 }}>Sin registros</div>
            <div style={{ fontSize: 13, color: T.inkLight }}>No hay pagos en esta categoría</div>
          </div>
        </Card>
      ) : (
        Object.entries(grouped).map(([supplierName, records], si) => {
          const isExpanded = expandedSuppliers.has(supplierName);
          const supplierTotal = records.reduce((s, p) => s + (p.usd_invoice || 0), 0);
          const supplierBalance = records.reduce((s, p) => s + (p.balance_to_pay || 0), 0);

          return (
            <Card key={supplierName} delay={900 + si * 100} style={{ marginBottom: 12 }}>
              {/* Supplier header */}
              <div
                onClick={() => toggleSupplier(supplierName)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "16px 24px", cursor: "pointer",
                  background: isExpanded ? T.surfaceAlt : T.surface,
                  borderBottom: isExpanded ? `1px solid ${T.borderLight}` : "none",
                  transition: "all .2s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform .2s ease", display: "flex", color: T.inkMuted }}>
                    <ChevronDown size={14} />
                  </span>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: supplierBgs[si % supplierBgs.length], color: supplierColors[si % supplierColors.length], display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Building2 size={16} />
                  </div>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.01em" }}>{supplierName}</span>
                    <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: T.accentLight, color: T.accent }}>{records.length}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  {supplierBalance > 0 && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: T.inkLight, fontWeight: 600, marginBottom: 1 }}>Saldo</div>
                      <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: supplierBalance > 20000 ? T.danger : T.ink }}>
                        {fmtUSD(supplierBalance)}
                      </div>
                    </div>
                  )}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: T.inkLight, fontWeight: 600, marginBottom: 1 }}>Total Facturado</div>
                    <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: T.accent }}>
                      {supplierTotal > 0 ? fmtUSD(supplierTotal) : "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    {/* Column headers */}
                    {activeCategory === "impo" ? (
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "1.2fr 1fr 0.7fr 1fr 1fr 0.9fr 0.7fr 0.5fr",
                        padding: "10px 24px", gap: 8, borderBottom: `1px solid ${T.border}`,
                      }}>
                        {["Contrato China", "USD Factura", "% Depósito", "Saldo a Pagar", "Pago Colombia", "Numeral Camb.", "Estado", ""].map(h => (
                          <span key={h} style={{ fontSize: 10, fontWeight: 700, color: T.inkLight, letterSpacing: "0.05em", textTransform: "uppercase", textAlign: ["USD Factura", "% Depósito", "Saldo a Pagar"].includes(h) ? "right" : "left" }}>{h}</span>
                        ))}
                      </div>
                    ) : (
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "1.1fr 1fr 1fr 0.8fr 0.8fr 0.6fr 0.8fr 1.4fr 0.6fr 0.5fr",
                        padding: "10px 24px", gap: 8, borderBottom: `1px solid ${T.border}`,
                      }}>
                        {["Cliente", "Descripción", "Contrato", "USD Factura", "Depósito", "Saldo %", "Pago Cliente", "Observaciones", "Estado", ""].map(h => (
                          <span key={h} style={{ fontSize: 10, fontWeight: 700, color: T.inkLight, letterSpacing: "0.05em", textTransform: "uppercase", textAlign: ["USD Factura", "Depósito", "Saldo %", "Pago Cliente"].includes(h) ? "right" : "left" }}>{h}</span>
                        ))}
                      </div>
                    )}

                    {/* Data rows */}
                    {records.map((p, ri) => {
                      const st = STATUS_CFG[p.status] || STATUS_CFG.pending;
                      const isEditing = editingId === p.id;
                      const age = getPaymentAge(p.created_at);
                      const saldoPct = p.usd_invoice && p.usd_invoice > 0 && p.balance_to_pay
                        ? Math.round((p.balance_to_pay / p.usd_invoice) * 1000) / 10
                        : 0;

                      if (activeCategory === "impo") {
                        return (
                          <div key={p.id} className="hglow" style={{
                            display: "grid",
                            gridTemplateColumns: "1.2fr 1fr 0.7fr 1fr 1fr 0.9fr 0.7fr 0.5fr",
                            padding: "14px 24px", gap: 8, alignItems: "center",
                            borderBottom: `1px solid ${T.borderLight}`,
                            animation: `slideRight .3s ease ${ri * 50}ms both`,
                            cursor: "pointer",
                          }}>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, fontWeight: 600 }}>
                              {isEditing ? <input value={editData.china_sales_contract || ""} onChange={e => setEditData({ ...editData, china_sales_contract: e.target.value })} style={inputStyle} /> : (p.china_sales_contract || "—")}
                            </span>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, fontWeight: 700, textAlign: "right" }}>
                              {isEditing ? <input type="number" value={editData.usd_invoice ?? ""} onChange={e => setEditData({ ...editData, usd_invoice: e.target.value ? Number(e.target.value) : null })} style={inputStyle} /> : fmtUSD(p.usd_invoice)}
                            </span>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, textAlign: "right" }}>
                              {isEditing ? <input type="number" step="0.01" value={editData.deposit_percentage ?? ""} onChange={e => setEditData({ ...editData, deposit_percentage: e.target.value ? Number(e.target.value) : null })} style={inputStyle} /> : (p.deposit_percentage != null ? `${(p.deposit_percentage * 100).toFixed(0)}%` : "—")}
                            </span>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, fontWeight: 600, color: T.warning, textAlign: "right" }}>
                              {isEditing ? <input type="number" value={editData.balance_to_pay ?? ""} onChange={e => setEditData({ ...editData, balance_to_pay: e.target.value ? Number(e.target.value) : null })} style={inputStyle} /> : fmtUSD(p.balance_to_pay)}
                            </span>
                            <span style={{ fontSize: 12, color: T.inkMuted }}>{p.payment_colombia || "—"}</span>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                              {isEditing ? <input value={editData.numeral_cambiario || ""} onChange={e => setEditData({ ...editData, numeral_cambiario: e.target.value })} style={inputStyle} /> : (p.numeral_cambiario || "—")}
                            </span>
                            <span>
                              {isEditing ? (
                                <select value={editData.status} onChange={e => setEditData({ ...editData, status: e.target.value })} style={inputStyle}>
                                  <option value="pending">Pendiente</option>
                                  <option value="partial">Parcial</option>
                                  <option value="paid">Pagado</option>
                                </select>
                              ) : (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 6, fontSize: 10.5, fontWeight: 700, color: st.color, background: st.bg, width: "fit-content" }}>
                                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.color, ...(p.status === "pending" ? { animation: "dotPulse 1.5s ease infinite" } : {}) }} />
                                  {st.label}
                                </span>
                              )}
                            </span>
                            <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                              {isEditing ? (
                                <>
                                  <button onClick={handleSaveEdit} disabled={saving} style={actionBtnStyle(T.success)} title="Guardar"><Check size={13} /></button>
                                  <button onClick={() => { setEditingId(null); setEditData({}); }} style={actionBtnStyle(T.inkLight)} title="Cancelar"><X size={13} /></button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => startEdit(p)} style={actionBtnStyle(T.accent)} title="Editar"><Pencil size={13} /></button>
                                  <button onClick={() => handleDelete(p.id)} style={actionBtnStyle(T.danger)} title="Eliminar"><Trash2 size={13} /></button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // Non-impo categories
                      return (
                        <div key={p.id} className="hglow" style={{
                          display: "grid",
                          gridTemplateColumns: "1.1fr 1fr 1fr 0.8fr 0.8fr 0.6fr 0.8fr 1.4fr 0.6fr 0.5fr",
                          padding: "14px 24px", gap: 8, alignItems: "center",
                          borderBottom: `1px solid ${T.borderLight}`,
                          animation: `slideRight .3s ease ${ri * 50}ms both`,
                          cursor: "pointer",
                        }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>
                            {isEditing ? <input value={editData.client || ""} onChange={e => setEditData({ ...editData, client: e.target.value })} style={inputStyle} /> : (p.client || "—")}
                          </span>
                          <span style={{ fontSize: 12, color: T.inkMuted }}>
                            {isEditing ? <input value={editData.description || ""} onChange={e => setEditData({ ...editData, description: e.target.value })} style={inputStyle} /> : (p.description || "—")}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: T.inkSoft }}>
                            {isEditing ? <input value={editData.china_sales_contract || ""} onChange={e => setEditData({ ...editData, china_sales_contract: e.target.value })} style={inputStyle} /> : (p.china_sales_contract || "—")}
                          </span>
                          <span style={{ fontSize: 12.5, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textAlign: "right" }}>
                            {isEditing ? <input type="number" value={editData.usd_invoice ?? ""} onChange={e => setEditData({ ...editData, usd_invoice: e.target.value ? Number(e.target.value) : null })} style={inputStyle} /> : fmtUSD(p.usd_invoice)}
                          </span>
                          <span style={{ fontSize: 12.5, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textAlign: "right", color: (p.deposit || 0) > 0 ? T.success : T.inkLight }}>
                            {isEditing ? <input type="number" value={editData.deposit ?? ""} onChange={e => setEditData({ ...editData, deposit: e.target.value ? Number(e.target.value) : null })} style={inputStyle} /> : fmtUSD(p.deposit)}
                          </span>
                          <div style={{ textAlign: "right" }}>
                            {isEditing ? (
                              <input type="number" value={editData.balance_to_pay ?? ""} onChange={e => setEditData({ ...editData, balance_to_pay: e.target.value ? Number(e.target.value) : null })} style={inputStyle} />
                            ) : saldoPct > 0 ? (
                              <span style={{
                                fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                                padding: "2px 8px", borderRadius: 6,
                                background: saldoPct > 30 ? T.dangerBg : saldoPct > 15 ? T.warningBg : T.successBg,
                                color: saldoPct > 30 ? T.danger : saldoPct > 15 ? T.warning : T.success,
                              }}>{saldoPct}%</span>
                            ) : <span style={{ color: T.inkLight }}>—</span>}
                          </div>
                          <span style={{ fontSize: 12.5, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textAlign: "right" }}>
                            {isEditing ? <input type="number" value={editData.client_payment ?? ""} onChange={e => setEditData({ ...editData, client_payment: e.target.value ? Number(e.target.value) : null })} style={inputStyle} /> : fmtUSD(p.client_payment)}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {isEditing ? (
                              <input value={editData.remarks || ""} onChange={e => setEditData({ ...editData, remarks: e.target.value })} style={inputStyle} />
                            ) : (
                              <>
                                <span style={{ fontSize: 11.5, color: T.inkMuted, lineHeight: 1.3 }}>{p.remarks || "—"}</span>
                                {age > 45 && (
                                  <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: 5, background: T.dangerBg, display: "flex", alignItems: "center", justifyContent: "center", color: T.danger }}>
                                    <AlertTriangle size={12} />
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                          <span>
                            {isEditing ? (
                              <select value={editData.status} onChange={e => setEditData({ ...editData, status: e.target.value })} style={inputStyle}>
                                <option value="pending">Pendiente</option>
                                <option value="partial">Parcial</option>
                                <option value="paid">Pagado</option>
                              </select>
                            ) : (
                              <span style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                padding: "3px 9px", borderRadius: 6, fontSize: 10.5, fontWeight: 700,
                                color: st.color, background: st.bg, width: "fit-content",
                              }}>
                                <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.color, ...(p.status === "pending" ? { animation: "dotPulse 1.5s ease infinite" } : {}) }} />
                                {st.label}
                              </span>
                            )}
                          </span>
                          <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                            {isEditing ? (
                              <>
                                <button onClick={handleSaveEdit} disabled={saving} style={actionBtnStyle(T.success)} title="Guardar"><Check size={13} /></button>
                                <button onClick={() => { setEditingId(null); setEditData({}); }} style={actionBtnStyle(T.inkLight)} title="Cancelar"><X size={13} /></button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEdit(p)} style={actionBtnStyle(T.accent)} title="Editar"><Pencil size={13} /></button>
                                <button onClick={() => handleDelete(p.id)} style={actionBtnStyle(T.danger)} title="Eliminar"><Trash2 size={13} /></button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })
      )}

      {/* ═══ ADD PAYMENT MODAL ═══ */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed", inset: 0, zIndex: 1000,
              background: "rgba(24,25,29,0.4)", backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: 520, maxHeight: "85vh", overflowY: "auto",
                background: T.surface, borderRadius: T.radius,
                boxShadow: T.shadowLg, border: `1px solid ${T.borderLight}`,
              }}
            >
              {/* Modal header */}
              <div style={{ padding: "18px 24px", borderBottom: `1px solid ${T.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: activeCat.color + "0C", border: `1px solid ${activeCat.color}15`, display: "flex", alignItems: "center", justifyContent: "center", color: activeCat.color }}>{activeCat.icon}</div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Nuevo Pago — {activeCat.label}</span>
                </div>
                <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.inkLight, display: "flex", alignItems: "center", padding: 4 }}>
                  <X size={16} />
                </button>
              </div>

              {/* Modal body */}
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Proveedor</label>
                    <button
                      type="button"
                      onClick={() => setShowNewSupplier(!showNewSupplier)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: 11, fontWeight: 700, color: T.accent,
                        display: "flex", alignItems: "center", gap: 4,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {showNewSupplier ? <X size={12} /> : <Plus size={12} />}
                      {showNewSupplier ? "Cancelar" : "Nuevo proveedor"}
                    </button>
                  </div>
                  {showNewSupplier ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 14px", borderRadius: 10, background: T.surfaceAlt, border: `1px solid ${T.borderLight}` }}>
                      <input
                        value={newSupplierName}
                        onChange={e => setNewSupplierName(e.target.value)}
                        style={modalInputStyle}
                        placeholder="Nombre del proveedor *"
                      />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <input
                          value={newSupplierBank}
                          onChange={e => setNewSupplierBank(e.target.value)}
                          style={modalInputStyle}
                          placeholder="Banco (opcional)"
                        />
                        <input
                          value={newSupplierAccount}
                          onChange={e => setNewSupplierAccount(e.target.value)}
                          style={modalInputStyle}
                          placeholder="Cuenta (opcional)"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleCreateSupplier}
                        disabled={creatingSup || !newSupplierName.trim()}
                        style={{
                          padding: "7px 14px", borderRadius: 8, border: "none",
                          background: T.accent, color: "#fff", fontSize: 12, fontWeight: 700,
                          cursor: !newSupplierName.trim() ? "not-allowed" : "pointer",
                          fontFamily: "'DM Sans', sans-serif",
                          opacity: creatingSup || !newSupplierName.trim() ? 0.5 : 1,
                          display: "flex", alignItems: "center", gap: 5, alignSelf: "flex-end",
                        }}
                      >
                        {creatingSup ? "Creando..." : <><Plus size={13} /> Crear Proveedor</>}
                      </button>
                    </div>
                  ) : (
                    <select value={newPayment.supplier_id || ""} onChange={e => setNewPayment({ ...newPayment, supplier_id: e.target.value || null })} style={modalInputStyle}>
                      <option value="">Seleccionar proveedor...</option>
                      {allSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  )}
                </div>

                {activeCategory !== "impo" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Cliente</label>
                      <input value={newPayment.client || ""} onChange={e => setNewPayment({ ...newPayment, client: e.target.value })} style={modalInputStyle} placeholder="Nombre del cliente" />
                    </div>
                    <div>
                      <label style={labelStyle}>Descripción</label>
                      <input value={newPayment.description || ""} onChange={e => setNewPayment({ ...newPayment, description: e.target.value })} style={modalInputStyle} placeholder="Descripción del producto" />
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Contrato China</label>
                    <input value={newPayment.china_sales_contract || ""} onChange={e => setNewPayment({ ...newPayment, china_sales_contract: e.target.value })} style={modalInputStyle} placeholder="Ej: IS-2510116-174" />
                  </div>
                  <div>
                    <label style={labelStyle}>USD Factura</label>
                    <input type="number" value={newPayment.usd_invoice ?? ""} onChange={e => setNewPayment({ ...newPayment, usd_invoice: e.target.value ? Number(e.target.value) : null })} style={modalInputStyle} placeholder="0.00" />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Depósito</label>
                    <input type="number" value={newPayment.deposit ?? ""} onChange={e => setNewPayment({ ...newPayment, deposit: e.target.value ? Number(e.target.value) : null })} style={modalInputStyle} placeholder="0.00" />
                  </div>
                  <div>
                    <label style={labelStyle}>Saldo a Pagar</label>
                    <input type="number" value={newPayment.balance_to_pay ?? ""} onChange={e => setNewPayment({ ...newPayment, balance_to_pay: e.target.value ? Number(e.target.value) : null })} style={modalInputStyle} placeholder="0.00" />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Pago Cliente</label>
                    <input type="number" value={newPayment.client_payment ?? ""} onChange={e => setNewPayment({ ...newPayment, client_payment: e.target.value ? Number(e.target.value) : null })} style={modalInputStyle} placeholder="0.00" />
                  </div>
                  <div>
                    <label style={labelStyle}>Estado</label>
                    <select value={newPayment.status || "pending"} onChange={e => setNewPayment({ ...newPayment, status: e.target.value })} style={modalInputStyle}>
                      <option value="pending">Pendiente</option>
                      <option value="partial">Parcial</option>
                      <option value="paid">Pagado</option>
                    </select>
                  </div>
                </div>

                {activeCategory === "impo" && (
                  <div>
                    <label style={labelStyle}>Numeral Cambiario</label>
                    <input value={newPayment.numeral_cambiario || ""} onChange={e => setNewPayment({ ...newPayment, numeral_cambiario: e.target.value })} style={modalInputStyle} placeholder="Numeral" />
                  </div>
                )}

                <div>
                  <label style={labelStyle}>Observaciones</label>
                  <input value={newPayment.remarks || ""} onChange={e => setNewPayment({ ...newPayment, remarks: e.target.value })} style={modalInputStyle} placeholder="Notas adicionales..." />
                </div>
              </div>

              {/* Modal footer */}
              <div style={{ padding: "16px 24px", borderTop: `1px solid ${T.borderLight}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={() => setShowAddModal(false)} style={{
                  padding: "9px 20px", borderRadius: T.radiusSm, background: "transparent", border: `1px solid ${T.border}`,
                  color: T.inkMuted, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                }}>Cancelar</button>
                <button onClick={handleAddPayment} disabled={saving} style={{
                  padding: "9px 20px", borderRadius: T.radiusSm, background: activeCat.color, border: "none",
                  color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  boxShadow: `0 2px 8px ${activeCat.color}30`, opacity: saving ? 0.6 : 1,
                }}>{saving ? "Guardando..." : "Crear Pago"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ FOOTER ═══ */}
      <div style={{ marginTop: 36, paddingTop: 20, borderTop: `1px solid ${T.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 11, color: T.inkLight, fontWeight: 500 }}>Powered by IBC STEEL GROUP · © {new Date().getFullYear()}</div>
          <div style={{ fontSize: 12, color: T.accent, fontWeight: 700, letterSpacing: "0.01em" }}>Developed by Maria Camila Mesa</div>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {[
            { label: "Contratos", href: "/contracts" },
            { label: "Cotizaciones", href: "/quotations" },
            { label: "Dashboard", href: "/" },
          ].map(l => (
            <Link key={l.label} href={l.href} style={{ fontSize: 11, color: T.inkMuted, fontWeight: 600, textDecoration: "none", transition: "color 0.15s" }}>{l.label}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SHARED STYLES ───────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "4px 8px",
  borderRadius: 6,
  border: `1px solid ${T.border}`,
  fontSize: 12,
  color: T.ink,
  outline: "none",
  background: T.surface,
  fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
};

const modalInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: `1px solid ${T.border}`,
  fontSize: 13,
  color: T.ink,
  outline: "none",
  background: T.surface,
  fontFamily: "'DM Sans', var(--font-dm-sans), sans-serif",
  transition: "border-color 0.2s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: T.inkMuted,
  marginBottom: 5,
};

function actionBtnStyle(color: string): React.CSSProperties {
  return {
    width: 28, height: 28, borderRadius: 7,
    background: color + "0A", border: `1px solid ${color}15`,
    display: "flex", alignItems: "center", justifyContent: "center",
    color, cursor: "pointer", transition: "all 0.15s",
  };
}
