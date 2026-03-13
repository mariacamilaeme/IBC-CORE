"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Users,
  Receipt,
  Ship,
  ClipboardList,
  Search,
  Loader2,
  ArrowRight,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

interface SearchResults {
  contracts: Array<{
    id: string;
    commercial_name: string;
    client_name: string;
    china_contract: string | null;
    client_contract: string | null;
    status: string | null;
    vessel_name: string | null;
    detail: string | null;
    product_type: string | null;
  }>;
  clients: Array<{
    id: string;
    company_name: string;
    trade_name: string | null;
    contact_name: string | null;
    email: string | null;
    country: string | null;
    client_type: string | null;
  }>;
  quotations: Array<{
    id: string;
    quotation_number: string;
    material: string | null;
    status: string | null;
    product_line: string | null;
    total_value_usd: number | null;
    client: { company_name: string } | null;
  }>;
  invoices: Array<{
    id: string;
    invoice_number: string;
    issue_date: string | null;
    total_amount: number | null;
    currency: string | null;
    payment_status: string | null;
    client: { company_name: string } | null;
  }>;
  shipments: Array<{
    id: string;
    shipment_number: string;
    bl_number: string | null;
    booking_number: string | null;
    status: string | null;
    port_of_loading: string | null;
    port_of_discharge: string | null;
    vessel: { vessel_name: string } | null;
    client: { company_name: string } | null;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  // Contracts
  "PENDIENTE ANTICIPO": "bg-amber-100 text-amber-700",
  "EN PRODUCCIÓN": "bg-blue-100 text-blue-700",
  "EN TRÁNSITO": "bg-purple-100 text-purple-700",
  "ENTREGADO AL CLIENTE": "bg-emerald-100 text-emerald-700",
  "ANULADO": "bg-red-100 text-red-700",
  // Quotations
  pendiente: "bg-amber-100 text-amber-700",
  en_proceso: "bg-blue-100 text-blue-700",
  enviada_cliente: "bg-indigo-100 text-indigo-700",
  aprobada: "bg-emerald-100 text-emerald-700",
  rechazada: "bg-red-100 text-red-700",
  contrato: "bg-emerald-100 text-emerald-700",
  vencida: "bg-slate-100 text-slate-500",
  // Invoices
  parcial: "bg-amber-100 text-amber-700",
  pagada: "bg-emerald-100 text-emerald-700",
  anulada: "bg-red-100 text-red-700",
  // Shipments
  reservado: "bg-slate-100 text-slate-600",
  en_puerto_origen: "bg-amber-100 text-amber-700",
  en_transito: "bg-purple-100 text-purple-700",
  en_puerto_destino: "bg-blue-100 text-blue-700",
  en_aduana: "bg-orange-100 text-orange-700",
  nacionalizado: "bg-teal-100 text-teal-700",
  entregado: "bg-emerald-100 text-emerald-700",
  con_novedad: "bg-red-100 text-red-700",
};

const QUOTATION_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  enviada_cliente: "Enviada",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  contrato: "Contrato",
  vencida: "Vencida",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  parcial: "Parcial",
  pagada: "Pagada",
  vencida: "Vencida",
  anulada: "Anulada",
};

const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  reservado: "Reservado",
  en_puerto_origen: "En puerto origen",
  en_transito: "En tránsito",
  en_puerto_destino: "En puerto destino",
  en_aduana: "En aduana",
  nacionalizado: "Nacionalizado",
  entregado: "Entregado",
  con_novedad: "Con novedad",
};

const emptyResults: SearchResults = {
  contracts: [],
  clients: [],
  quotations: [],
  invoices: [],
  shipments: [],
};

const quickLinks = [
  { label: "Contratos", href: "/contracts", icon: ClipboardList },
  { label: "Clientes", href: "/clients", icon: Users },
  { label: "Cotizaciones", href: "/quotations", icon: FileText },
  { label: "Facturas", href: "/invoices", icon: Receipt },
  { label: "Embarques", href: "/shipments", icon: Ship },
];

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(emptyResults);
      setLoading(false);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setResults(emptyResults);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch {
      // Silently fail, results stay empty
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const hasResults =
    results.contracts.length > 0 ||
    results.clients.length > 0 ||
    results.quotations.length > 0 ||
    results.invoices.length > 0 ||
    results.shipments.length > 0;

  const showEmpty = query.length >= 2 && !loading && !hasResults;
  const showQuickLinks = query.length < 2 && !loading;

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="relative hidden md:flex items-center gap-2 h-9 w-64 px-3 text-sm text-slate-400 bg-slate-50/80 border border-slate-200/80 rounded-xl hover:bg-slate-100/80 hover:text-slate-500 transition-colors cursor-pointer"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Buscar...</span>
        <kbd className="pointer-events-none hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 text-[10px] font-medium text-slate-400 select-none">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Mobile trigger */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-2.5 rounded-xl hover:bg-slate-100/80 transition-all duration-200"
      >
        <Search className="h-5 w-5 text-slate-400" />
      </button>

      {/* Command Dialog */}
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Búsqueda global"
        description="Buscar contratos, clientes, cotizaciones, facturas y embarques"
        showCloseButton={false}
      >
        <CommandInput
          placeholder="Buscar contratos, clientes, cotizaciones..."
          value={query}
          onValueChange={handleQueryChange}
        />
        <CommandList className="max-h-[400px]">
          {loading && (
            <div className="flex items-center justify-center py-6 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Buscando...
            </div>
          )}

          {showEmpty && (
            <CommandEmpty>
              No se encontraron resultados para &ldquo;{query}&rdquo;
            </CommandEmpty>
          )}

          {/* Quick links when no query */}
          {showQuickLinks && (
            <CommandGroup heading="Accesos rápidos">
              {quickLinks.map((link) => (
                <CommandItem
                  key={link.href}
                  onSelect={() => navigate(link.href)}
                  className="cursor-pointer"
                >
                  <link.icon className="h-4 w-4 mr-2 text-slate-400" />
                  <span>{link.label}</span>
                  <ArrowRight className="ml-auto h-3 w-3 text-slate-300" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Contracts */}
          {results.contracts.length > 0 && (
            <>
              <CommandGroup heading="Contratos">
                {results.contracts.map((c) => (
                  <CommandItem
                    key={`contract-${c.id}`}
                    onSelect={() => navigate("/contracts")}
                    className="cursor-pointer"
                  >
                    <ClipboardList className="h-4 w-4 mr-2 text-[#1E3A5F] shrink-0" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">
                        {c.china_contract || c.client_contract || "Sin número"} — {c.client_name}
                      </span>
                      <span className="text-xs text-slate-400 truncate">
                        {c.commercial_name}
                        {c.detail ? ` · ${c.detail}` : ""}
                        {c.vessel_name ? ` · ${c.vessel_name}` : ""}
                      </span>
                    </div>
                    {c.status && (
                      <Badge
                        variant="secondary"
                        className={`ml-2 text-[10px] shrink-0 ${STATUS_COLORS[c.status] || "bg-slate-100 text-slate-600"}`}
                      >
                        {c.status}
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Clients */}
          {results.clients.length > 0 && (
            <>
              <CommandGroup heading="Clientes">
                {results.clients.map((c) => (
                  <CommandItem
                    key={`client-${c.id}`}
                    onSelect={() => navigate("/clients")}
                    className="cursor-pointer"
                  >
                    <Users className="h-4 w-4 mr-2 text-emerald-600 shrink-0" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">
                        {c.company_name}
                        {c.trade_name ? ` (${c.trade_name})` : ""}
                      </span>
                      <span className="text-xs text-slate-400 truncate">
                        {c.contact_name || ""}
                        {c.country ? ` · ${c.country}` : ""}
                        {c.email ? ` · ${c.email}` : ""}
                      </span>
                    </div>
                    {c.client_type && (
                      <Badge
                        variant="secondary"
                        className="ml-2 text-[10px] shrink-0 bg-slate-100 text-slate-600"
                      >
                        {c.client_type}
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Quotations */}
          {results.quotations.length > 0 && (
            <>
              <CommandGroup heading="Cotizaciones">
                {results.quotations.map((q) => (
                  <CommandItem
                    key={`quotation-${q.id}`}
                    onSelect={() => navigate("/quotations")}
                    className="cursor-pointer"
                  >
                    <FileText className="h-4 w-4 mr-2 text-blue-600 shrink-0" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">
                        {q.quotation_number}
                        {q.client?.company_name ? ` — ${q.client.company_name}` : ""}
                      </span>
                      <span className="text-xs text-slate-400 truncate">
                        {q.material || "Sin material"}
                        {q.total_value_usd ? ` · USD ${q.total_value_usd.toLocaleString("es-CO")}` : ""}
                      </span>
                    </div>
                    {q.status && (
                      <Badge
                        variant="secondary"
                        className={`ml-2 text-[10px] shrink-0 ${STATUS_COLORS[q.status] || "bg-slate-100 text-slate-600"}`}
                      >
                        {QUOTATION_STATUS_LABELS[q.status] || q.status}
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Invoices */}
          {results.invoices.length > 0 && (
            <>
              <CommandGroup heading="Facturas">
                {results.invoices.map((inv) => (
                  <CommandItem
                    key={`invoice-${inv.id}`}
                    onSelect={() => navigate("/invoices")}
                    className="cursor-pointer"
                  >
                    <Receipt className="h-4 w-4 mr-2 text-amber-600 shrink-0" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">
                        {inv.invoice_number}
                        {inv.client?.company_name ? ` — ${inv.client.company_name}` : ""}
                      </span>
                      <span className="text-xs text-slate-400 truncate">
                        {inv.total_amount != null
                          ? `${inv.currency || "USD"} ${inv.total_amount.toLocaleString("es-CO")}`
                          : ""}
                        {inv.issue_date ? ` · ${new Date(inv.issue_date).toLocaleDateString("es-CO")}` : ""}
                      </span>
                    </div>
                    {inv.payment_status && (
                      <Badge
                        variant="secondary"
                        className={`ml-2 text-[10px] shrink-0 ${STATUS_COLORS[inv.payment_status] || "bg-slate-100 text-slate-600"}`}
                      >
                        {PAYMENT_STATUS_LABELS[inv.payment_status] || inv.payment_status}
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Shipments */}
          {results.shipments.length > 0 && (
            <CommandGroup heading="Embarques">
              {results.shipments.map((s) => (
                <CommandItem
                  key={`shipment-${s.id}`}
                  onSelect={() => navigate("/shipments")}
                  className="cursor-pointer"
                >
                  <Ship className="h-4 w-4 mr-2 text-purple-600 shrink-0" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-medium truncate">
                      {s.shipment_number}
                      {s.client?.company_name ? ` — ${s.client.company_name}` : ""}
                    </span>
                    <span className="text-xs text-slate-400 truncate">
                      {s.vessel?.vessel_name || ""}
                      {s.port_of_loading && s.port_of_discharge
                        ? ` · ${s.port_of_loading} → ${s.port_of_discharge}`
                        : ""}
                      {s.bl_number ? ` · BL: ${s.bl_number}` : ""}
                    </span>
                  </div>
                  {s.status && (
                    <Badge
                      variant="secondary"
                      className={`ml-2 text-[10px] shrink-0 ${STATUS_COLORS[s.status] || "bg-slate-100 text-slate-600"}`}
                    >
                      {SHIPMENT_STATUS_LABELS[s.status] || s.status}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
