// ===========================================================================
// IBC CORE — Parser del reporte STATUS PRODUCTION devuelto por China
// El equipo de China recibe el Excel exportado desde /reports/status-production
// y lo devuelve con VESSEL NAME / ESTIMATED DEPARTURE DATE / ADDITIONAL NOTES
// diligenciados. Este parser lo lee de vuelta para aplicar los cambios.
// ===========================================================================

export interface ParsedReturnRow {
  /** CUSTOMER CONTRACT (client_contract) — clave principal de cruce */
  ref: string | null;
  /** CHINA CONTRACT — clave de respaldo */
  cn: string | null;
  vessel: string | null;
  /** Fecha de zarpe en ISO yyyy-mm-dd si fue interpretable */
  departureISO: string | null;
  /** Texto crudo de la fecha cuando no es interpretable (ej. "FIN JUL") */
  departureText: string | null;
  notes: string | null;
}

// Encabezados esperados (tolerante a variaciones menores)
const H = {
  ref: ["CUSTOMER CONTRACT", "CONTRATO CLIENTE"],
  cn: ["CHINA CONTRACT", "CONTRATO CHINA"],
  vessel: ["VESSEL NAME", "VESSEL", "MOTONAVE"],
  departure: ["ESTIMATED DEPARTURE", "DEPARTURE", "ZARPE", "ETD"],
  notes: ["ADDITIONAL NOTES", "NOTES", "NOTAS", "OBSERVACION"],
};

function matchHeader(text: string, candidates: string[]): boolean {
  const t = text.trim().toUpperCase();
  return candidates.some((c) => t.includes(c));
}

/** dd/mm/yyyy · d/m/yyyy · yyyy-mm-dd → ISO. null si no es fecha. */
export function parseDepartureDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) {
    const d = m[1].padStart(2, "0");
    const mo = m[2].padStart(2, "0");
    if (Number(mo) >= 1 && Number(mo) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
      return `${m[3]}-${mo}-${d}`;
    }
  }
  return null;
}

function dateToISO(d: Date): string {
  // exceljs entrega fechas en UTC
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function parseStatusProductionExcel(buffer: ArrayBuffer): Promise<ParsedReturnRow[]> {
  const excelMod = await import("exceljs");
  const ExcelJS = excelMod.default || excelMod;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const ws = wb.worksheets[0];
  if (!ws) throw new Error("El archivo no tiene hojas");

  // Localizar la fila de encabezados (contiene CUSTOMER CONTRACT y VESSEL)
  let headerRowIdx = -1;
  const colIdx: Partial<Record<keyof typeof H, number>> = {};
  for (let r = 1; r <= Math.min(ws.rowCount, 12); r++) {
    const row = ws.getRow(r);
    const found: Partial<Record<keyof typeof H, number>> = {};
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const txt = String(cell.text || "");
      (Object.keys(H) as (keyof typeof H)[]).forEach((key) => {
        if (found[key] === undefined && matchHeader(txt, H[key])) found[key] = col;
      });
    });
    if (found.ref !== undefined && found.vessel !== undefined) {
      headerRowIdx = r;
      Object.assign(colIdx, found);
      break;
    }
  }

  if (headerRowIdx === -1) {
    throw new Error(
      'No se encontró la fila de encabezados (se esperaba "CUSTOMER CONTRACT" y "VESSEL NAME"). ¿Es el archivo devuelto del STATUS PRODUCTION?'
    );
  }

  const rows: ParsedReturnRow[] = [];
  for (let r = headerRowIdx + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const cellText = (key: keyof typeof H): string => {
      const col = colIdx[key];
      if (!col) return "";
      return String(row.getCell(col).text || "").trim();
    };

    const ref = cellText("ref");
    const cn = cellText("cn");
    // Fin de datos: fila sin ninguna clave (banner de totales, footer, vacías)
    if (!ref && !cn) continue;

    // Fecha de zarpe: puede venir como Date real o como texto
    let departureISO: string | null = null;
    let departureText: string | null = null;
    const depCol = colIdx.departure;
    if (depCol) {
      const cell = row.getCell(depCol);
      if (cell.value instanceof Date) {
        departureISO = dateToISO(cell.value);
      } else {
        const txt = String(cell.text || "").trim();
        if (txt) {
          departureISO = parseDepartureDate(txt);
          if (!departureISO) departureText = txt;
        }
      }
    }

    rows.push({
      ref: ref || null,
      cn: cn || null,
      vessel: cellText("vessel") || null,
      departureISO,
      departureText,
      notes: cellText("notes") || null,
    });
  }

  return rows;
}
