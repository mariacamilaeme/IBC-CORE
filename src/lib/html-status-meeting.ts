// ===========================================================================
// IBC CORE — Reporte de reunión "Status de Producción · Resumen ejecutivo"
// Genera un HTML autocontenido (estilo ibc-premium-design: blanco + azul,
// Space Grotesk / Manrope / JetBrains Mono) a partir de los contratos
// EN PRODUCCIÓN y EN TRÁNSITO. Diseño de tarjetas grandes por embarque con
// panorama gráfico (dona + barras), buscador y filtros combinados.
//
// Cruce por motonave: si una motonave ya tiene pedidos EN TRÁNSITO, todos
// sus pedidos se muestran en tránsito aunque el contrato individual siga
// EN PRODUCCIÓN en el módulo (y se alerta para corregir el dato).
// ===========================================================================

import type { Contract } from "@/types";

// ── Etapas operativas ──────────────────────────────────────────────────────
type Stage = "produccion" | "nominado" | "transito" | "equipos";

const STAGE_META: Record<Stage, { num: string; title: string; hint: string }> = {
  produccion: { num: "01", title: "En producción", hint: "sin motonave nominada" },
  nominado: { num: "02", title: "Con nominación · por zarpar", hint: "motonave asignada, esperando zarpe" },
  transito: { num: "03", title: "En tránsito", hint: "zarpados · documentos de origen en gestión" },
  equipos: { num: "04", title: "Equipos & proyectos", hint: "maquinaria en fabricación" },
};

const STAGE_COLORS: Record<Stage, string> = {
  produccion: "#7BB3E3",
  nominado: "#00B8E0",
  transito: "#0B5394",
  equipos: "#0A2A47",
};

function isEquipment(c: Contract): boolean {
  const pt = (c.product_type || "").toUpperCase();
  if (pt.includes("MAQ")) return true;
  if ((c.china_contract || "").toUpperCase().startsWith("PT-")) return true;
  return /machine|equipo|roll ?form|montacarga|shutter|deck|trefil/i.test(c.detail || "");
}

function stageOf(c: Contract): Stage {
  if (isEquipment(c)) return "equipos";
  if (c.status === "EN TRÁNSITO") return "transito";
  if ((c.vessel_name || "").trim()) return "nominado";
  return "produccion";
}

// Nombre de motonave normalizado: sin sufijo de viaje ("CHANG MIN V.A2635" → "CHANG MIN")
function normVessel(v: string | null | undefined): string {
  return (v || "").trim().toUpperCase().replace(/\s+V\.?\s*[\w/-]+$/, "");
}

// ── Formateo ───────────────────────────────────────────────────────────────
const MONTHS_ES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

function fmtShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.split("T")[0] + "T00:00:00");
  if (isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]}`;
}

function fmtMT(n: number): string {
  return n.toLocaleString("es-CO", { maximumFractionDigits: 0 });
}

function esc(s: string | null | undefined): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Puertos ────────────────────────────────────────────────────────────────
function portAbbrev(port: string | null | undefined): { code: string; name: string } {
  const p = (port || "").trim().toUpperCase();
  if (!p) return { code: "—", name: "Sin puerto" };
  if (p.includes("BUENAVENTURA")) return { code: "BV", name: "Buenaventura" };
  if (p.includes("BARRANQUILLA")) return { code: "BQ", name: "Barranquilla" };
  if (p.includes("CARTAGENA")) return { code: "CTG", name: "Cartagena" };
  if (p.includes("CABELLO")) return { code: "P. CABELLO", name: "Puerto Cabello" };
  if (p.includes("SANTA MARTA")) return { code: "SM", name: "Santa Marta" };
  return { code: p.slice(0, 10), name: port || "" };
}

// ── Materiales (clasificación por palabra clave del detalle) ──────────────
function materialBucket(detail: string | null | undefined): string {
  const d = (detail || "").toLowerCase();
  if (/tuber|tubo|pipe/.test(d)) return "Tubería";
  if (/teja/.test(d)) return "Teja & cubiertas";
  if (/bobina|coil|l[aá]mina|sheet|ppg|galvaniz|prepint/.test(d)) return "Bobina & lámina";
  if (/alambr|wire rod|wire/.test(d)) return "Alambrón";
  if (/barra|bar\b|deformed|round/.test(d)) return "Barras";
  if (/angle|perfil|channel|beam|viga|[aá]ngulo/.test(d)) return "Perfiles & ángulos";
  return "Otros";
}

// ── Tipo de producto (para segregar el detalle) ────────────────────────────
// Tres categorías: materiales (todo el acero junto), máquinas y montacargas.
function typeBucket(c: Contract): string {
  const txt = `${c.detail || ""} ${c.product_type || ""}`;
  if (/forklift|montacarga/i.test(txt)) return "Montacargas";
  if (isEquipment(c)) return "Máquinas";
  return "Materiales";
}

// ── Documentos: estado real del set documental ─────────────────────────────
// El campo documents_pending llega con "OK" / "Todos enviados" cuando ya no
// falta nada; cualquier otro texto es la lista de documentos que faltan.
const DOCS_OK_RE = /^(ok|todos enviados|n\/?a|ninguno|completos?|listo|-)$/i;

function docsState(c: Contract): { state: "completos" | "faltan" | "sin_recibir"; pending: string; sent: string } {
  const pending = (c.documents_pending || "").trim();
  const sent = (c.documents_sent || "").trim();
  if (pending && !DOCS_OK_RE.test(pending)) return { state: "faltan", pending, sent };
  if (sent || (pending && DOCS_OK_RE.test(pending))) return { state: "completos", pending, sent };
  return { state: "sin_recibir", pending, sent };
}

// ── Notas de China: traducción e interpretación ────────────────────────────
// Las notas llegan en inglés con patrones recurrentes. Se traducen por
// fragmentos (lo que no coincide con ningún patrón se conserva tal cual) y
// se extrae la fecha implícita ("end of July" → ~25 jul) para compararla
// contra la fecha EXW del contrato.
const EXW_GAP_ALERT_DAYS = 20; // brecha zarpe-vs-EXW (días) que dispara alerta

const NOTE_MONTHS: Record<string, number> = {
  january: 0, jan: 0, enero: 0, ene: 0,
  february: 1, feb: 1, febrero: 1,
  march: 2, mar: 2, marzo: 2,
  april: 3, apr: 3, abril: 3, abr: 3,
  may: 4, mayo: 4,
  june: 5, jun: 5, junio: 5,
  july: 6, jul: 6, julio: 6,
  august: 7, aug: 7, agosto: 7, ago: 7,
  september: 8, sept: 8, sep: 8, septiembre: 8,
  october: 9, oct: 9, octubre: 9,
  november: 10, nov: 10, noviembre: 10,
  december: 11, dec: 11, diciembre: 11, dic: 11,
};
const MONTHS_ES_LONG = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const NOTE_MONTH_ALT = Object.keys(NOTE_MONTHS).sort((a, b) => b.length - a.length).join("|");

function extractNoteDate(note: string, refYear: number): Date | null {
  const lower = note.toLowerCase();
  let month = -1;
  let day = -1;
  // "june 17" / "july 26th"
  let m = lower.match(new RegExp(`\\b(${NOTE_MONTH_ALT})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`));
  if (m) { month = NOTE_MONTHS[m[1]]; day = parseInt(m[2]); }
  // "17 june" / "17 de junio"
  if (month < 0) {
    m = lower.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+|de\\s+)?(${NOTE_MONTH_ALT})\\b`));
    if (m) { day = parseInt(m[1]); month = NOTE_MONTHS[m[2]]; }
  }
  // "end of july" / "early august" / "mediados de agosto" / "FIN JUL"
  if (month < 0) {
    m = lower.match(new RegExp(`\\b(early|beginning|start|mid|middle|end|late|inicios?|principios?|comienzos?|mediados|fin(?:es|ales)?)\\s*(?:of\\s*|de\\s*)?(${NOTE_MONTH_ALT})\\b`));
    if (m) {
      month = NOTE_MONTHS[m[2]];
      day = /early|beginning|start|inicio|principio|comienzo/.test(m[1]) ? 5 : /mid|middle|mediados/.test(m[1]) ? 15 : 25;
    }
  }
  // solo el mes → mitad de mes
  if (month < 0) {
    m = lower.match(new RegExp(`\\b(${NOTE_MONTH_ALT})\\b`));
    if (m) { month = NOTE_MONTHS[m[1]]; day = 15; }
  }
  if (month < 0 || day < 1 || day > 31) return null;
  return new Date(refYear, month, day);
}

function translateNote(raw: string): string {
  let s = raw.trim();
  if (!s) return s;
  // "June 17" → "17 de junio" (reordenar antes de traducir fragmentos)
  s = s.replace(
    new RegExp(`\\b(${NOTE_MONTH_ALT})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, "gi"),
    (_all, mo: string, d: string) => `${parseInt(d)} de ${MONTHS_ES_LONG[NOTE_MONTHS[mo.toLowerCase()]]}`
  );
  const reps: [RegExp, string][] = [
    [/\bwill be shipped\b/gi, "embarque previsto para"],
    [/\bplan(?:s|ning)? to ship\b/gi, "embarque previsto para"],
    [/\bplan(?:s|ning)? to finish\b/gi, "fin de producción previsto para"],
    [/\bin production and\b/gi, "en producción ·"],
    [/\bin production\b/gi, "en producción"],
    [/\bbooked (?:a )?bulk vessel\b/gi, "motonave granelera reservada para"],
    [/\bbulk vessel\b/gi, "motonave granelera"],
    [/\bthe vessel (?:was |is |has been )?delayed\b/gi, "la motonave se retrasó"],
    [/\bvessel (?:was |is |has been )?delayed\b/gi, "motonave retrasada"],
    [/\bchanged (?:to )?another vessel because of (?:the )?stowage\b/gi, "cambio de motonave por estiba"],
    [/\bchanged (?:the )?vessel\b/gi, "cambio de motonave"],
    [/\bwaiting to (?:start )?load(?:ing)?\b/gi, "a la espera de cargue"],
    [/\bwaiting for loading\b/gi, "a la espera de cargue"],
    [/\bin port\b/gi, "en puerto"],
    [/\bthe pipes\b/gi, "la tubería"],
    [/\bwaiting (?:for )?(?:the )?customer'?s? permits?\b/gi, "a la espera de permisos del cliente"],
    [/\bwill share (?:the )?rest (?:of the )?documents? asap\b/gi, "documentos restantes por enviar"],
    [/\bconfirmed the final dra?wing on\b/gi, "plano final confirmado el"],
    [/\b(?:the )?first shipment\b/gi, "1er embarque"],
    [/\b(?:the )?second shipment\b/gi, "2º embarque"],
    [/\bATD is\b/gi, "ATD"],
    [/\bETD is\b/gi, "ETD"],
    [/\bETA is\b/gi, "ETA"],
    [/\bend of\b/gi, "fin de"],
    [/\b(?:mid|middle) of\b/gi, "mediados de"],
    [/\bmid\b/gi, "mediados de"],
    [/\b(?:early|beginning of|start of)\b/gi, "inicios de"],
    [/\blate\b/gi, "finales de"],
    [/\bfrom\b/gi, "desde"],
    [/\bport\b/gi, "puerto"],
  ];
  for (const [re, to] of reps) s = s.replace(re, to);
  // meses sueltos que hayan quedado
  s = s.replace(new RegExp(`\\b(${NOTE_MONTH_ALT})\\b`, "gi"), (mo) => MONTHS_ES_LONG[NOTE_MONTHS[mo.toLowerCase()]] ?? mo);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const NOTE_DELAY_RE = /delay|postpon|retras|aplaz/i;

// ── Alertas automáticas ────────────────────────────────────────────────────
interface Alert { title: string; body: string }

function buildAlerts(contracts: Contract[], today: Date, stager: (c: Contract) => Stage): Alert[] {
  const alerts: Alert[] = [];
  const daysFrom = (iso: string | null | undefined) => {
    if (!iso) return null;
    const d = new Date(iso.split("T")[0] + "T00:00:00");
    if (isNaN(d.getTime())) return null;
    return Math.floor((today.getTime() - d.getTime()) / 86400000);
  };

  // 1. Motonaves nominadas con ETD vencido → confirmar zarpe
  const etdOverdue = contracts.filter(
    (c) => stager(c) === "nominado" && c.etd && (daysFrom(c.etd) ?? 0) > 0
  );
  const byVessel = new Map<string, Contract[]>();
  for (const c of etdOverdue) {
    const v = (c.vessel_name || "").trim().toUpperCase();
    if (!byVessel.has(v)) byVessel.set(v, []);
    byVessel.get(v)!.push(c);
  }
  for (const [vessel, group] of byVessel) {
    const mt = group.reduce((s, c) => s + (c.tons_agreed ?? 0), 0);
    const clients = [...new Set(group.map((c) => c.client_name))].join(", ");
    const days = Math.max(...group.map((c) => daysFrom(c.etd) ?? 0));
    alerts.push({
      title: `Confirmar zarpe de ${esc(vessel)}`,
      body: `Su ETD venció hace ${days} día${days !== 1 ? "s" : ""}: confirmar si zarpó con ${group.length} pedido${group.length !== 1 ? "s" : ""} (${esc(clients)} · ${fmtMT(mt)} MT).`,
    });
  }

  // 2. En tránsito con documentos pendientes
  const docsPending = contracts.filter(
    (c) => stager(c) === "transito" && docsState(c).state !== "completos"
  );
  if (docsPending.length > 0) {
    const vessels = [...new Set(docsPending.map((c) => (c.vessel_name || "").trim()).filter(Boolean))].join(", ");
    alerts.push({
      title: "Documentos de los zarpados",
      body: `${docsPending.length} pedido${docsPending.length !== 1 ? "s" : ""} en tránsito (${esc(vessels)}) con set documental pendiente de recibir desde origen para adaptar y entregar al cliente.`,
    });
  }

  // 3. En tránsito con ETA vencida → confirmar llegada
  const etaOverdue = contracts.filter(
    (c) => stager(c) === "transito" && c.eta_final && (daysFrom(c.eta_final) ?? 0) > 0
  );
  for (const c of etaOverdue.slice(0, 3)) {
    const days = daysFrom(c.eta_final) ?? 0;
    alerts.push({
      title: `Confirmar llegada de ${esc((c.vessel_name || "motonave").toUpperCase())}`,
      body: `${esc(c.client_name)} · ${esc(c.client_contract || c.china_contract || "")}: la ETA venció hace ${days} día${days !== 1 ? "s" : ""}. Verificar arribo a ${esc(portAbbrev(c.arrival_port).name)} y actualizar estado.`,
    });
  }

  // 4. Producción con EXW vencido y sin motonave → gestionar nominación
  const exwOverdue = contracts.filter(
    (c) => stager(c) === "produccion" && c.exw_date && (daysFrom(c.exw_date) ?? 0) > 0
  );
  if (exwOverdue.length > 0) {
    const mt = exwOverdue.reduce((s, c) => s + (c.tons_agreed ?? 0), 0);
    const clients = [...new Set(exwOverdue.map((c) => c.client_name))].slice(0, 4).join(", ");
    alerts.push({
      title: "Nominación pendiente con producción lista",
      body: `${exwOverdue.length} pedido${exwOverdue.length !== 1 ? "s" : ""} con fecha EXW cumplida y sin motonave asignada (${esc(clients)}${exwOverdue.length > 4 ? "…" : ""} · ${fmtMT(mt)} MT). Gestionar nominación para no perder ventana.`,
    });
  }

  return alerts;
}

// ── Fecha clave por fila según etapa ───────────────────────────────────────
function keyDate(c: Contract, stage: Stage): { label: string; value: string } {
  if (stage === "transito") return { label: "ETA", value: fmtShortDate(c.eta_final) };
  if (stage === "nominado") return { label: "ETD", value: fmtShortDate(c.etd) };
  if (stage === "equipos") return { label: "EXW", value: fmtShortDate(c.exw_date) };
  return { label: "EXW", value: fmtShortDate(c.exw_date) };
}

function keyISO(c: Contract, stage: Stage): string | null {
  const v = stage === "transito" ? c.eta_final : stage === "nominado" ? c.etd : c.exw_date;
  return v ? v.split("T")[0] : null;
}

// ===========================================================================
// Generador principal
// ===========================================================================
// vesselContext: contratos del módulo completo (opcional) usados SOLO como
// evidencia de qué motonaves ya zarparon — clave cuando el informe se genera
// a partir de un Excel anexado que no trae los pedidos en tránsito.
export function generateStatusMeetingHTML(contracts: Contract[], vesselContext?: Contract[]): string {
  const today = new Date();
  const dateLong = today.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  const dateShort = `${today.getDate()} ${MONTHS_ES[today.getMonth()]} ${today.getFullYear()}`;

  // Filtrar anulados/entregados por si llegan
  const active = contracts.filter((c) => c.status === "EN PRODUCCIÓN" || c.status === "EN TRÁNSITO");

  // ── Cruce por motonave: si una motonave ya zarpó (pedidos EN TRÁNSITO o
  // entregados recientemente en el módulo), sus demás pedidos se clasifican
  // en tránsito aunque el contrato individual siga EN PRODUCCIÓN ────────────
  const evidence = vesselContext && vesselContext.length ? vesselContext : active;
  const SAILED_EVIDENCE = new Set(["EN TRÁNSITO", "ENTREGADO AL CLIENTE"]);
  const sailedVessels = new Set(
    evidence
      .filter((c) => SAILED_EVIDENCE.has(c.status || "") && normVessel(c.vessel_name))
      .map((c) => normVessel(c.vessel_name))
  );
  const todayT = today.getTime();
  const stager = (c: Contract): Stage => {
    const base = stageOf(c);
    if (base !== "nominado") return base;
    // Arrastrar a tránsito solo si su propio ETD no es futuro — evita
    // confundir un viaje nuevo de la misma motonave con el que ya zarpó
    if (sailedVessels.has(normVessel(c.vessel_name))) {
      const etdISO = (c.etd || "").split("T")[0];
      const etdT = etdISO ? new Date(etdISO + "T00:00:00").getTime() : NaN;
      if (isNaN(etdT) || etdT <= todayT + 3 * 86400000) return "transito";
    }
    return base;
  };
  // Pedidos cuyo estado en el módulo quedó atrás (motonave zarpada, contrato en producción)
  const derivedIds = new Set(
    active
      .filter((c) => c.id && c.status !== "EN TRÁNSITO" && stager(c) === "transito")
      .map((c) => c.id as string)
  );

  const groups: Record<Stage, Contract[]> = { produccion: [], nominado: [], transito: [], equipos: [] };
  for (const c of active) groups[stager(c)].push(c);

  // Ordenar cada grupo: por fecha clave asc, luego cliente
  const sortKey = (c: Contract, st: Stage) =>
    (st === "transito" ? c.eta_final : st === "nominado" ? c.etd : c.exw_date) || "9999";
  (Object.keys(groups) as Stage[]).forEach((st) => {
    groups[st].sort((a, b) => sortKey(a, st).localeCompare(sortKey(b, st)) || (a.client_name || "").localeCompare(b.client_name || ""));
  });

  const mtOf = (list: Contract[]) => list.reduce((s, c) => s + (c.tons_agreed ?? 0), 0);
  const totalPedidos = active.length;
  const mtPlan = mtOf(groups.produccion) + mtOf(groups.nominado);
  const vesselsTransito = [...new Set(groups.transito.map((c) => (c.vessel_name || "").trim()).filter(Boolean))];

  // Tonelaje por puerto (producción + nominado = plan por zarpar)
  const planContracts = [...groups.produccion, ...groups.nominado];
  const portMap = new Map<string, { name: string; mt: number; count: number }>();
  for (const c of planContracts) {
    const { code, name } = portAbbrev(c.arrival_port);
    if (!portMap.has(code)) portMap.set(code, { name, mt: 0, count: 0 });
    const e = portMap.get(code)!;
    e.mt += c.tons_agreed ?? 0;
    e.count += 1;
  }
  const ports = [...portMap.entries()].sort((a, b) => b[1].mt - a[1].mt);
  const maxPort = ports.length ? ports[0][1].mt : 1;

  // Tonelaje por material (todo lo activo con tons)
  const matMap = new Map<string, number>();
  for (const c of active) {
    if (!c.tons_agreed) continue;
    const bucket = materialBucket(c.detail);
    matMap.set(bucket, (matMap.get(bucket) ?? 0) + c.tons_agreed);
  }
  const materials = [...matMap.entries()].sort((a, b) => b[1] - a[1]);
  const maxMat = materials.length ? materials[0][1] : 1;

  // ── Análisis de notas: traducción + fecha implícita vs EXW ────────────────
  const noteMeta = new Map<string, { es: string; gapDays: number | null; delay: boolean }>();
  for (const c of active) {
    const raw = (c.notes || "").trim();
    if (!raw || !c.id) continue;
    const delay = NOTE_DELAY_RE.test(raw);
    const es = translateNote(raw);
    let gapDays: number | null = null;
    const exwISO = (c.exw_date || "").split("T")[0];
    const exw = exwISO ? new Date(exwISO + "T00:00:00") : null;
    const refYear = exw ? exw.getFullYear() : today.getFullYear();
    let nd = extractNoteDate(raw, refYear);
    if (nd && exw) {
      // La nota no trae año: si queda muy por detrás del EXW, es el año siguiente
      if (nd.getTime() < exw.getTime() - 45 * 86400000) nd = new Date(nd.getFullYear() + 1, nd.getMonth(), nd.getDate());
      gapDays = Math.round((nd.getTime() - exw.getTime()) / 86400000);
    }
    noteMeta.set(c.id, { es, gapDays, delay });
  }

  const alerts = buildAlerts(active, today, stager);

  // Alerta de datos: contratos que van en motonaves ya zarpadas pero siguen
  // EN PRODUCCIÓN en el módulo — actualizar para mantener el cruce limpio
  if (derivedIds.size > 0) {
    const list = active.filter((c) => c.id && derivedIds.has(c.id));
    const byV = [...new Set(list.map((c) => (c.vessel_name || "").trim().toUpperCase()))].join(", ");
    const items = list.slice(0, 4).map((c) => `${c.client_name} (${c.client_contract || c.china_contract || "—"})`).join(", ");
    alerts.push({
      title: "Actualizar estado en el módulo de contratos",
      body: `${list.length} pedido${list.length !== 1 ? "s" : ""} viaja${list.length !== 1 ? "n" : ""} en motonaves que ya zarparon (${esc(byV)}) pero sigue${list.length !== 1 ? "n" : ""} EN PRODUCCIÓN en el módulo: ${esc(items)}${list.length > 4 ? "…" : ""}. El informe ya los muestra en tránsito.`,
    });
  }

  // Alerta agregada: notas cuyo zarpe queda lejos del EXW o mencionan retraso
  // (solo aplica antes del zarpe: producción / nominado / equipos)
  const flagged = active.filter((c) => {
    if (stager(c) === "transito" || !c.id) return false;
    const m = noteMeta.get(c.id);
    return !!m && (m.delay || (m.gapDays != null && m.gapDays > EXW_GAP_ALERT_DAYS));
  });
  if (flagged.length > 0) {
    const items = flagged.slice(0, 4).map((c) => {
      const m = noteMeta.get(c.id!)!;
      const tag = m.gapDays != null && m.gapDays > EXW_GAP_ALERT_DAYS ? `+${m.gapDays} días vs EXW` : "retraso reportado";
      return `${c.client_name} (${c.client_contract || c.china_contract || "—"} · ${tag})`;
    }).join(", ");
    alerts.push({
      title: "Zarpes lejos de la fecha EXW",
      body: `${flagged.length} pedido${flagged.length !== 1 ? "s" : ""} cuya nota indica zarpe a más de ${EXW_GAP_ALERT_DAYS} días del EXW o menciona retraso: ${esc(items)}${flagged.length > 4 ? "…" : ""}. Revisar ventana con origen.`,
    });
  }

  // ── Segregación por fechas: meses presentes en las fechas clave ───────────
  const monthKeySet = new Set<string>();
  let hasNoDate = false;
  for (const c of active) {
    const iso = keyISO(c, stager(c));
    if (iso) monthKeySet.add(iso.slice(0, 7));
    else hasNoDate = true;
  }
  const monthsSorted = [...monthKeySet].sort();
  const monthLabel = (k: string) => {
    const [y, m] = k.split("-").map(Number);
    return `${MONTHS_ES[m - 1]} ${y}`;
  };

  // ── Segregación por tipo: tres categorías fijas (solo las presentes) ──────
  const TYPE_ORDER = ["Materiales", "Máquinas", "Montacargas"];
  const typesPresent = TYPE_ORDER.filter((t) => active.some((c) => typeBucket(c) === t));

  // ── Dona por etapa ─────────────────────────────────────────────────────────
  const donutParts = (Object.keys(groups) as Stage[])
    .map((s) => ({ stage: s, n: groups[s].length, color: STAGE_COLORS[s] }))
    .filter((p) => p.n > 0);
  const DONUT_C = 2 * Math.PI * 110;
  let donutOff = 0;
  const donutSegs = donutParts.map((p) => {
    const len = (p.n / (totalPedidos || 1)) * DONUT_C;
    const seg = `<circle cx="160" cy="160" r="110" fill="none" stroke="${p.color}" stroke-width="30" stroke-dasharray="${Math.max(len - 4, 1).toFixed(1)} ${(DONUT_C - Math.max(len - 4, 1)).toFixed(1)}" stroke-dashoffset="${(-donutOff).toFixed(1)}"/>`;
    donutOff += len;
    return seg;
  }).join("");

  // ── Documentos: chip claro según el estado real (solo tiene sentido zarpado) ──
  const docsChip = (c: Contract): string => {
    const d = docsState(c);
    if (d.state === "faltan") {
      const short = d.pending.length > 30 ? d.pending.slice(0, 30) + "…" : d.pending;
      return `<span class="chip pend" title="Documentos que faltan por recibir de origen: ${esc(d.pending)}">Faltan docs · ${esc(short)}</span>`;
    }
    if (d.state === "completos") {
      return `<span class="chip okc" title="${d.sent ? `Set documental completo. Enviados: ${esc(d.sent)}` : "Set documental completo"}">✓ Docs completos</span>`;
    }
    return `<span class="chip pend" title="Aún no se registran documentos recibidos de origen">Docs sin recibir</span>`;
  };

  const docsCompleteCount = groups.transito.filter((c) => docsState(c).state === "completos").length;

  // ── Pagos: señales cruzadas del módulo de contratos ──
  const isPaid = (v: string | null | undefined) => {
    const s = (v || "").trim().toUpperCase();
    return s === "SI" || s === "OK" || s === "PAGADO";
  };

  const payChips = (c: Contract, stage: Stage): string => {
    const chips: string[] = [];
    if ((c.advance_paid || "").trim() && !isPaid(c.advance_paid) && (stage === "produccion" || stage === "nominado" || stage === "equipos")) {
      chips.push(`<span class="chip pend" title="El cliente aún no paga el anticipo del contrato (registro: ${esc(c.advance_paid)})">Anticipo sin pagar</span>`);
    }
    if ((c.balance_paid || "").trim() && !isPaid(c.balance_paid) && stage === "transito") {
      chips.push(`<span class="chip pend" title="Saldo del contrato por cobrar al cliente antes de liberar el BL (registro: ${esc(c.balance_paid)})">Saldo por cobrar</span>`);
    }
    return chips.join(" ");
  };

  // ── Tarjeta por embarque ───────────────────────────────────────────────────
  const renderCard = (c: Contract, stage: Stage) => {
    const { code } = portAbbrev(c.arrival_port);
    const kd = keyDate(c, stage);
    const iso = keyISO(c, stage);
    const refMain = (c.client_contract || "").trim() && c.client_contract !== "N/A"
      ? c.client_contract!
      : (c.china_contract || "—");
    const refSub = refMain === c.client_contract ? c.china_contract : null;
    const mn = stage === "produccion" ? "Por nominar" : (c.vessel_name || "—").toUpperCase();
    const meta = c.id ? noteMeta.get(c.id) : undefined;
    const rawNote = (c.notes || "").trim();
    const noteText = meta?.es || rawNote;
    const detail = (c.detail || "").trim();
    const shortDetail = detail.length > 90 ? detail.slice(0, 90) + "…" : detail;

    const chips: string[] = [];
    if (c.id && derivedIds.has(c.id)) {
      chips.push(`<span class="chip warn" title="La motonave ya zarpó, pero este contrato sigue EN PRODUCCIÓN en el módulo — actualizar estado">▲ Estado según motonave</span>`);
    }
    if (stage === "transito") chips.push(docsChip(c));
    const pay = payChips(c, stage);
    if (pay) chips.push(pay);
    if (stage !== "transito" && meta?.delay) {
      chips.push(`<span class="chip warn" title="La nota menciona un retraso">▲ Retraso reportado</span>`);
    }
    if (stage !== "transito" && meta?.gapDays != null && meta.gapDays > EXW_GAP_ALERT_DAYS) {
      chips.push(`<span class="chip warn" title="La nota indica zarpe ~${meta.gapDays} días después de la fecha EXW (${fmtShortDate(c.exw_date)})">▲ +${meta.gapDays} días vs EXW</span>`);
    }

    const noteLine = rawNote
      ? `<div class="nline"><span class="ntag">NOTA</span><span title="Original: ${esc(rawNote)}">${esc(noteText)}</span></div>`
      : "";

    const searchable = [c.client_name, c.client_contract, c.china_contract, detail, c.vessel_name, materialBucket(c.detail)]
      .filter(Boolean).join(" ").toLowerCase();

    return `
    <div class="card" data-month="${iso ? iso.slice(0, 7) : "none"}" data-type="${esc(typeBucket(c))}" data-mt="${c.tons_agreed ?? 0}" data-q="${esc(searchable)}">
      <div class="c-id">
        <div class="cust">${esc(c.client_name)}</div>
        <div class="ref">${esc(refMain || "—")}</div>
        <div class="mat"><b>${esc(materialBucket(c.detail))}</b>${detail ? `<span title="${esc(detail)}">${esc(shortDetail)}</span>` : ""}</div>
      </div>
      <div class="c-kv">
        <div><span class="k">Cantidad</span><span class="v">${c.tons_agreed ? fmtMT(c.tons_agreed) + " MT" : "—"}</span></div>
        <div><span class="k">Destino</span><span class="v">${esc(code)}</span></div>
        <div><span class="k">Motonave</span><span class="v ${stage === "produccion" ? "dim" : "hl"}">${esc(mn)}</span></div>
        <div><span class="k">Contrato China</span><span class="v dim">${esc(refSub || "—")}</span></div>
      </div>
      <div class="c-side">
        <div class="f">${kd.value}</div>
        <div class="fl">${kd.label}</div>
      </div>
      ${chips.length ? `<div class="c-chips">${chips.join(" ")}</div>` : ""}
      ${noteLine}
    </div>`;
  };

  const renderGroup = (stage: Stage) => {
    const list = groups[stage];
    if (list.length === 0) return "";
    const meta = STAGE_META[stage];
    const mt = mtOf(list);
    const sub = stage === "transito"
      ? `${list.length} pedido${list.length !== 1 ? "s" : ""} · ${vesselsTransito.length} motonave${vesselsTransito.length !== 1 ? "s" : ""}${mt ? ` · ${fmtMT(mt)} MT` : ""} · documentos: ${docsCompleteCount} completos / ${list.length - docsCompleteCount} por completar`
      : `${list.length} pedido${list.length !== 1 ? "s" : ""}${mt ? ` · ${fmtMT(mt)} MT` : ""} · ${meta.hint}`;
    return `
    <div class="group" data-stage="${stage}">
      <div class="group-head" title="Clic para contraer o expandir este grupo">
        <span class="gdot" style="background:${STAGE_COLORS[stage]}"></span>
        <h3>${meta.title}</h3>
        <span class="gsub">${sub}</span>
        <span class="chev">▾</span>
      </div>
      <div class="cards">${list.map((c) => renderCard(c, stage)).join("")}</div>
    </div>`;
  };

  const stagesWithData = (Object.keys(groups) as Stage[]).filter((s) => groups[s].length > 0);

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>IBC · Status de Producción · Resumen · ${dateShort}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{
  --ink:#061B2E; --ink-2:#0A2A47; --blue:#0B5394; --blue-2:#1F6FB8; --blue-3:#3A8DD7; --blue-4:#7BB3E3;
  --blue-tint:#E8F1FB; --blue-paper:#F4F8FC; --cyan:#00B8E0;
  --line:#D7E2EE; --line-2:#EAF0F7; --bg:#F7FAFD;
  --grad:linear-gradient(135deg,#0B5394 0%,#1F6FB8 50%,#00B8E0 100%);
  --shadow-1:0 1px 0 rgba(11,83,148,.05),0 1px 2px rgba(11,83,148,.06);
  --shadow-2:0 14px 32px -16px rgba(11,83,148,.22),0 6px 14px -8px rgba(11,83,148,.10);
  --display:'Space Grotesk',system-ui,sans-serif;
  --sans:'Manrope',system-ui,sans-serif;
  --mono:'JetBrains Mono',ui-monospace,monospace;
  --ease:cubic-bezier(.22,.61,.36,1);
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--bg);color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased}
body{font-size:15px;line-height:1.55;letter-spacing:-0.005em}
::selection{background:var(--blue);color:#fff}
.wrap{max-width:1200px;margin:0 auto;padding:0 28px}

/* topbar */
.topbar{position:sticky;top:0;z-index:60;display:flex;align-items:center;justify-content:space-between;
  padding:13px 28px;background:rgba(255,255,255,.85);backdrop-filter:blur(14px);border-bottom:1px solid var(--line-2)}
.brand{display:flex;align-items:center;gap:11px}
.brand .mark{width:28px;height:28px;border-radius:7px;background:var(--grad);display:grid;place-items:center;color:#fff;font-family:var(--mono);font-size:11px;font-weight:700}
.brand .nm{font-size:12.5px;letter-spacing:.16em;color:var(--ink-2);font-weight:700}
.brand .nm b{color:var(--blue)}
.topbar .meta{font-family:var(--mono);font-size:10.5px;color:#6a7d92;letter-spacing:.08em;display:flex;align-items:center;gap:10px}
.topbar .meta .dot{width:6px;height:6px;border-radius:99px;background:var(--cyan)}

/* hero */
.hero{background:#fff;border-bottom:1px solid var(--line);padding:48px 0 40px}
.eyebrow{display:inline-flex;align-items:center;gap:10px;font-family:var(--mono);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--blue);font-weight:600}
.eyebrow .bar{width:30px;height:1px;background:var(--blue)}
h1{font-family:var(--display);font-weight:600;font-size:clamp(36px,4.8vw,58px);line-height:1.02;letter-spacing:-0.025em;margin-top:14px}
h1 em{font-style:normal;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:700}
.lead{margin-top:12px;max-width:660px;color:#3b526b;font-size:15.5px}
.lead b{color:var(--ink-2)}

.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:30px}
.kpi{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px 20px;position:relative;overflow:hidden;box-shadow:var(--shadow-1)}
.kpi::before{content:"";position:absolute;top:0;left:0;right:0;height:3px;background:var(--kc,var(--grad))}
.kpi .k{font-family:var(--mono);font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:#6a7d92;font-weight:600}
.kpi .v{font-family:var(--display);font-size:38px;font-weight:700;line-height:1;margin-top:9px;letter-spacing:-0.03em;
  background:linear-gradient(135deg,#0B5394,#00B8E0);-webkit-background-clip:text;background-clip:text;color:transparent}
.kpi .s{font-size:11.5px;color:#52687f;margin-top:7px;line-height:1.45}
.ticker{margin-top:20px;padding:11px 16px;border:1px solid var(--line);border-radius:12px;background:var(--blue-paper);
  font-family:var(--mono);font-size:11px;letter-spacing:.06em;color:var(--ink-2);display:flex;gap:18px;flex-wrap:wrap}
.ticker b{color:var(--blue)}

/* section */
section{padding:38px 0 8px}
.sec-head{display:flex;align-items:baseline;gap:14px;margin-bottom:18px;flex-wrap:wrap}
.sec-head h2{font-family:var(--display);font-weight:600;font-size:25px;letter-spacing:-0.02em}
.sec-head .hint{font-size:12.5px;color:#6a7d92;font-family:var(--mono)}

/* panorama con gráficas */
.pan{display:grid;grid-template-columns:1.05fr 1fr 1fr;gap:16px}
.panel{background:#fff;border:1px solid var(--line);border-radius:18px;padding:24px;box-shadow:var(--shadow-1)}
.panel h4{font-family:var(--mono);font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--blue);font-weight:700;margin-bottom:4px}
.panel .pt{font-family:var(--display);font-size:19px;font-weight:600;letter-spacing:-0.015em;margin-bottom:14px}
.donut-wrap{position:relative;width:200px;margin:4px auto 12px}
.donut-wrap svg{width:100%;height:auto;display:block}
.dcenter{position:absolute;inset:0;display:grid;place-items:center;text-align:center}
.dcenter .n{font-family:var(--display);font-size:42px;font-weight:700;line-height:1;letter-spacing:-0.03em;
  background:linear-gradient(135deg,#0B5394,#00B8E0);-webkit-background-clip:text;background-clip:text;color:transparent}
.dcenter .l{font-family:var(--mono);font-size:8.5px;letter-spacing:.22em;text-transform:uppercase;color:#6a7d92;margin-top:4px;font-weight:600}
.dleg{display:flex;flex-direction:column;gap:6px}
.dleg .dl{display:flex;align-items:center;gap:9px;font-family:var(--mono);font-size:10.5px;color:#3d556d}
.dleg .dl .sq{width:9px;height:9px;border-radius:3px;flex-shrink:0}
.dleg .dl b{margin-left:auto;color:var(--ink);font-weight:700}
.stat-row{margin-bottom:14px}
.stat-row .sh{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px}
.stat-row .sk{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;color:var(--ink-2);font-weight:700;text-transform:uppercase}
.stat-row .sv{font-family:var(--display);font-size:19px;font-weight:700;letter-spacing:-0.02em;
  background:linear-gradient(135deg,#0B5394,#00B8E0);-webkit-background-clip:text;background-clip:text;color:transparent}
.stat-row .sv small{font-size:11px;font-family:var(--mono);font-weight:600}
.stat-row .sd{font-family:var(--mono);font-size:9px;color:#8fa2b5;letter-spacing:.06em;margin-top:2px}
.bar{height:8px;border-radius:99px;background:var(--line-2);overflow:hidden}
.bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--blue),var(--cyan))}

/* toolbar */
.toolbar{position:sticky;top:53px;z-index:50;background:rgba(247,250,253,.94);backdrop-filter:blur(10px);
  padding:12px 0;border-bottom:1px solid var(--line-2);margin-bottom:20px}
.toolbar .in{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.search{position:relative;flex:1;min-width:220px;max-width:380px}
.search input{width:100%;padding:11px 38px 11px 18px;border-radius:99px;border:1px solid var(--line);
  font-family:var(--sans);font-size:13.5px;color:var(--ink);background:#fff;box-shadow:var(--shadow-1)}
.search input:focus{outline:none;border-color:var(--blue);box-shadow:0 0 0 4px var(--blue-tint)}
.search input::placeholder{color:#a8b8c9}
.search svg{position:absolute;right:14px;top:50%;transform:translateY(-50%);color:var(--blue);width:15px;height:15px}
.tabs{display:flex;gap:6px;flex-wrap:wrap}
.tab{padding:8px 15px;border-radius:99px;border:1px solid var(--line);background:#fff;
  font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:600;color:#6a7d92;cursor:pointer;transition:.2s var(--ease)}
.tab.active,.tab:hover{background:var(--blue);color:#fff;border-color:var(--blue)}
.tab.active{background:var(--grad);border-color:transparent}
.sel{padding:9px 12px;border-radius:12px;border:1px solid var(--line);background:#fff;color:var(--ink-2);
  font-family:var(--sans);font-size:12.5px;font-weight:600;cursor:pointer;box-shadow:var(--shadow-1)}
.sel:focus{outline:none;border-color:var(--blue)}
.count{margin-left:auto;font-family:var(--mono);font-size:11px;color:#6a7d92;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
.count b{color:var(--blue)}

/* grupos y tarjetas */
.group{margin-bottom:26px}
.group-head{display:flex;align-items:baseline;gap:12px;padding-bottom:12px;border-bottom:2px solid var(--ink);margin-bottom:14px;flex-wrap:wrap;cursor:pointer;user-select:none}
.group-head:hover h3{color:var(--blue)}
.gdot{width:11px;height:11px;border-radius:4px;align-self:center;flex-shrink:0}
.group-head h3{font-family:var(--display);font-size:22px;font-weight:600;letter-spacing:-0.02em;transition:color .2s var(--ease)}
.group-head .gsub{font-size:11.5px;color:#6a7d92;font-family:var(--mono);margin-left:auto}
.group-head .chev{font-size:13px;color:var(--blue);align-self:center;transition:transform .25s var(--ease)}
.group.collapsed .chev{transform:rotate(-90deg)}
.group.collapsed .cards{display:none}
.group.collapsed .group-head{margin-bottom:0;opacity:.75}
.cards{display:flex;flex-direction:column;gap:12px}

.card{display:grid;grid-template-columns:1.5fr 1.05fr .6fr;gap:24px;padding:22px 26px;background:#fff;
  border:1px solid var(--line);border-radius:16px;position:relative;overflow:hidden;transition:.25s var(--ease);box-shadow:var(--shadow-1)}
.card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--grad);opacity:0;transition:.25s var(--ease)}
.card:hover{border-color:var(--blue-3);box-shadow:var(--shadow-2);transform:translateY(-2px)}
.card:hover::before{opacity:1}
.card .cust{font-family:var(--display);font-size:18px;font-weight:600;color:var(--ink);letter-spacing:-0.015em;line-height:1.15}
.card .ref{font-family:var(--mono);font-size:14px;font-weight:700;margin-top:5px;letter-spacing:.01em;
  background:linear-gradient(135deg,#0B5394,#00B8E0);-webkit-background-clip:text;background-clip:text;color:transparent;display:inline-block}
.card .mat{margin-top:8px;font-size:12px;color:#8fa2b5;line-height:1.4}
.card .mat b{display:block;font-size:12.5px;color:var(--ink-2);font-weight:700;margin-bottom:1px}
.c-kv{display:grid;grid-template-columns:1fr 1fr;gap:12px 16px;align-content:center}
.c-kv .k{display:block;font-family:var(--mono);font-size:8.5px;letter-spacing:.16em;color:#8fa2b5;text-transform:uppercase;font-weight:600;margin-bottom:2px}
.c-kv .v{font-family:var(--mono);font-size:13px;font-weight:700;color:var(--ink);font-feature-settings:"tnum"}
.c-kv .v.hl{color:var(--blue)}
.c-kv .v.dim{color:#a8b8c9;font-weight:500}
.c-side{display:flex;flex-direction:column;justify-content:center;align-items:flex-end;text-align:right;border-left:1px dashed var(--line);padding-left:22px}
.c-side .f{font-family:var(--display);font-size:24px;font-weight:700;letter-spacing:-0.02em;line-height:1;white-space:nowrap;
  background:linear-gradient(135deg,#0B5394,#00B8E0);-webkit-background-clip:text;background-clip:text;color:transparent}
.c-side .fl{font-family:var(--mono);font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:#8fa2b5;font-weight:600;margin-top:6px}
.c-chips{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap}
.chip{display:inline-flex;align-items:center;font-family:var(--mono);font-size:9.5px;letter-spacing:.05em;font-weight:700;
  padding:4px 10px;border-radius:99px;white-space:nowrap}
.chip.okc{background:var(--blue-tint);color:var(--blue)}
.chip.pend{border:1px dashed var(--blue-3);color:var(--ink-2);background:#fff}
.chip.warn{border:1.5px dashed var(--cyan);color:#0089A8;background:#fff}
.nline{grid-column:1/-1;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;
  font-size:12.5px;color:#3b526b;background:var(--blue-paper);border:1px solid var(--line-2);
  border-radius:10px;padding:8px 14px;line-height:1.5}
.nline .ntag{font-family:var(--mono);font-size:8.5px;letter-spacing:.16em;color:var(--blue);font-weight:700;flex-shrink:0}

/* alertas */
.alerts{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:24px}
.alert{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px 22px;display:flex;gap:16px;box-shadow:var(--shadow-1)}
.alert .n{width:34px;height:34px;border-radius:10px;background:var(--grad);color:#fff;display:grid;place-items:center;
  font-family:var(--mono);font-size:12px;font-weight:700;flex-shrink:0}
.alert b{display:block;font-size:14.5px;color:var(--ink);margin-bottom:5px;font-weight:700}
.alert p{font-size:13px;color:#3d556d;line-height:1.55}

/* footer */
footer{margin-top:44px;padding:30px 28px;border-top:1px solid var(--line);background:#fff}
footer .wrap{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
footer .big{font-family:var(--display);font-size:24px;font-weight:700;letter-spacing:-0.02em;
  background:linear-gradient(135deg,#0B5394,#00B8E0);-webkit-background-clip:text;background-clip:text;color:transparent}
footer .meta{font-family:var(--mono);font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:#6a7d92;text-align:right;line-height:2}
footer .meta b{color:var(--blue)}

@media (max-width:1000px){
  .kpis{grid-template-columns:repeat(2,1fr)}
  .pan{grid-template-columns:1fr}
  .alerts{grid-template-columns:1fr}
  .card{grid-template-columns:1fr 1fr}
  .c-side{grid-column:1/-1;flex-direction:row;justify-content:space-between;align-items:center;border-left:none;border-top:1px dashed var(--line);padding:12px 0 0;text-align:left}
}
@media (max-width:620px){.card{grid-template-columns:1fr}}
@media print{
  .topbar,.toolbar{position:static}
  .toolbar .in{display:none}
  .card{break-inside:avoid;box-shadow:none}
  .group{break-inside:auto}
}
</style>
</head>
<body>

<div class="topbar">
  <div class="brand">
    <div class="mark">IBC</div>
    <div class="nm"><b>IBC</b> STEEL GROUP</div>
  </div>
  <div class="meta"><span class="dot"></span> STATUS PRODUCCIÓN · ${dateShort}</div>
</div>

<!-- HERO -->
<div class="hero">
  <div class="wrap">
    <div class="eyebrow"><span class="bar"></span>Status Production · Resumen ejecutivo</div>
    <h1>Status de <em>producción.</em></h1>
    <p class="lead">Corte al <b>${dateLong}</b>, cruzado con el módulo de contratos y el estado real de cada motonave.
      Clasificado por etapa: <b>en producción</b>, <b>con nominación · por zarpar</b> y <b>en tránsito</b>.</p>

    <div class="kpis">
      <div class="kpi" style="--kc:${STAGE_COLORS.produccion}">
        <div class="k">En producción</div>
        <div class="v">${groups.produccion.length}</div>
        <div class="s">${fmtMT(mtOf(groups.produccion))} MT sin nominar${groups.equipos.length ? ` · + ${groups.equipos.length} equipo${groups.equipos.length !== 1 ? "s" : ""}` : ""}</div>
      </div>
      <div class="kpi" style="--kc:${STAGE_COLORS.nominado}">
        <div class="k">Nominado · por zarpar</div>
        <div class="v">${groups.nominado.length}</div>
        <div class="s">${fmtMT(mtOf(groups.nominado))} MT con motonave asignada</div>
      </div>
      <div class="kpi" style="--kc:${STAGE_COLORS.transito}">
        <div class="k">En tránsito</div>
        <div class="v">${groups.transito.length}</div>
        <div class="s">${vesselsTransito.length} motonave${vesselsTransito.length !== 1 ? "s" : ""} navegando${derivedIds.size ? ` · ${derivedIds.size} cruzado${derivedIds.size !== 1 ? "s" : ""} por motonave` : ""}</div>
      </div>
      <div class="kpi">
        <div class="k">Plan por zarpar</div>
        <div class="v">${fmtMT(mtPlan)}</div>
        <div class="s">${ports.map(([code, e]) => `${code} ${fmtMT(e.mt)}`).join(" · ") || "MT"}</div>
      </div>
    </div>

    ${alerts.length > 0 ? `<div class="ticker">${alerts.slice(0, 3).map((a) => `<span><b>▲</b> ${a.title.toUpperCase()}</span>`).join("")}</div>` : ""}
  </div>
</div>

<!-- PANORAMA -->
<section>
  <div class="wrap">
    <div class="sec-head"><h2>Panorama del corte</h2><span class="hint">${totalPedidos} pedidos activos · ${fmtMT(mtOf(active))} MT</span></div>
    <div class="pan">
      <div class="panel">
        <h4>Embarques por etapa</h4>
        <div class="pt">¿Dónde está cada pedido?</div>
        <div class="donut-wrap">
          <svg viewBox="0 0 320 320">
            <circle cx="160" cy="160" r="110" fill="none" stroke="#EAF0F7" stroke-width="30"/>
            <g transform="rotate(-90 160 160)">${donutSegs}</g>
          </svg>
          <div class="dcenter"><div>
            <div class="n">${totalPedidos}</div>
            <div class="l">Pedidos</div>
          </div></div>
        </div>
        <div class="dleg">
          ${donutParts.map((p) => `<div class="dl"><span class="sq" style="background:${p.color}"></span>${STAGE_META[p.stage].title}<b>${p.n}</b></div>`).join("")}
        </div>
      </div>
      <div class="panel">
        <h4>Tonelaje por puerto</h4>
        <div class="pt">Plan por zarpar · ${fmtMT(mtPlan)} MT</div>
        ${ports.length === 0 ? `<p style="color:#6a7d92;font-size:13px">Sin plan pendiente.</p>` : ports.map(([code, e]) => `
        <div class="stat-row">
          <div class="sh"><span class="sk">${code} · ${esc(e.name)}</span><span class="sv">${fmtMT(e.mt)} <small>MT</small></span></div>
          <div class="bar"><i style="width:${Math.max(4, Math.round((e.mt / maxPort) * 100))}%"></i></div>
          <div class="sd">${e.count} EMBARQUE${e.count !== 1 ? "S" : ""}</div>
        </div>`).join("")}
      </div>
      <div class="panel">
        <h4>Tonelaje por material</h4>
        <div class="pt">Qué viaja, y cuánto</div>
        ${materials.map(([name, mt]) => `
        <div class="stat-row">
          <div class="sh"><span class="sk">${esc(name)}</span><span class="sv">${fmtMT(mt)} <small>MT</small></span></div>
          <div class="bar"><i style="width:${Math.max(4, Math.round((mt / maxMat) * 100))}%"></i></div>
        </div>`).join("")}
      </div>
    </div>
  </div>
</section>

<!-- DETALLE -->
<section>
  <div class="wrap">
    <div class="sec-head"><h2>Detalle por etapa</h2><span class="hint" id="visCount">${totalPedidos} pedidos · ${fmtMT(mtOf(active))} MT</span></div>
  </div>
  <div class="toolbar">
    <div class="wrap in">
      <div class="search">
        <input id="q" type="text" placeholder="Buscar cliente, contrato, material, motonave…">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>
      </div>
      <div class="tabs">
        <button class="tab stab active" data-f="all">Todos</button>
        ${stagesWithData.map((s) => `<button class="tab stab" data-f="${s}">${STAGE_META[s].title}</button>`).join("")}
      </div>
      <select class="sel" id="selMonth" title="Filtrar por mes de la fecha clave (EXW / ETD / ETA)">
        <option value="all">Todas las fechas</option>
        ${monthsSorted.map((k) => `<option value="${k}">${monthLabel(k)}</option>`).join("")}
        ${hasNoDate ? `<option value="none">Sin fecha</option>` : ""}
      </select>
      <select class="sel" id="selType" title="Filtrar por tipo de producto">
        <option value="all">Todos los tipos</option>
        ${typesPresent.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("")}
      </select>
      <div class="count" id="visCount2"></div>
    </div>
  </div>
  <div class="wrap">
    ${(Object.keys(groups) as Stage[]).map(renderGroup).join("")}
  </div>
</section>

<!-- ALERTAS -->
${alerts.length > 0 ? `
<section>
  <div class="wrap">
    <div class="sec-head"><h2>Para gestionar esta semana</h2><span class="hint">${alerts.length} punto${alerts.length !== 1 ? "s" : ""} de acción</span></div>
    <div class="alerts">
      ${alerts.map((a, i) => `
      <div class="alert">
        <div class="n">${String(i + 1).padStart(2, "0")}</div>
        <div><b>${a.title}</b><p>${a.body}</p></div>
      </div>`).join("")}
    </div>
  </div>
</section>` : ""}

<footer>
  <div class="wrap">
    <div class="big">Status de Producción</div>
    <div class="meta">
      Generado desde <b>IBC CORE</b> · ${dateLong}<br>
      BV = Buenaventura · BQ = Barranquilla · CTG = Cartagena · MT = toneladas métricas<br>
      ✓ Docs completos = set de origen recibido · Faltan docs = documentos por recibir · Saldo por cobrar = saldo del cliente pendiente
    </div>
  </div>
</footer>

<script>
  // Filtros combinados: búsqueda × etapa × mes × tipo
  var curStage = 'all';
  var curMonth = 'all';
  var curType = 'all';
  var query = '';
  function applyFilters(){
    var visible = 0, mt = 0;
    document.querySelectorAll('.group').forEach(function(g){
      var stageOk = (curStage === 'all' || g.getAttribute('data-stage') === curStage);
      var any = false;
      g.querySelectorAll('.card').forEach(function(r){
        var mOk = (curMonth === 'all' || r.getAttribute('data-month') === curMonth);
        var tOk = (curType === 'all' || r.getAttribute('data-type') === curType);
        var qOk = (!query || (r.getAttribute('data-q') || '').indexOf(query) !== -1);
        var show = stageOk && mOk && tOk && qOk;
        r.style.display = show ? '' : 'none';
        if (show){ any = true; visible += 1; mt += parseFloat(r.getAttribute('data-mt') || '0'); }
      });
      g.style.display = (stageOk && any) ? '' : 'none';
    });
    var txt = visible + ' pedido' + (visible !== 1 ? 's' : '') + (mt > 0 ? ' · ' + Math.round(mt).toLocaleString('es-CO') + ' MT' : '');
    var vc = document.getElementById('visCount');
    if (vc) vc.textContent = txt;
    var vc2 = document.getElementById('visCount2');
    if (vc2) vc2.textContent = txt;
  }
  document.querySelectorAll('.tab.stab').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('.tab.stab').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      curStage = btn.getAttribute('data-f');
      applyFilters();
    });
  });
  var selMonth = document.getElementById('selMonth');
  if (selMonth) selMonth.addEventListener('change', function(){ curMonth = this.value; applyFilters(); });
  var selType = document.getElementById('selType');
  if (selType) selType.addEventListener('change', function(){ curType = this.value; applyFilters(); });
  var qInput = document.getElementById('q');
  if (qInput) qInput.addEventListener('input', function(){ query = this.value.toLowerCase().trim(); applyFilters(); });
  // Contraer / expandir grupos (clic en el encabezado)
  document.querySelectorAll('.group-head').forEach(function(h){
    h.addEventListener('click', function(){ h.parentElement.classList.toggle('collapsed'); });
  });
  applyFilters();
</script>
</body>
</html>`;
}
