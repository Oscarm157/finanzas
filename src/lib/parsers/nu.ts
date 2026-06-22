import { createHash } from "node:crypto";
import { extractText, getDocumentProxy } from "unpdf";
import type { TxDirection, TxKind } from "@/lib/schema";

export type ParsedTransaction = {
  date: string; // YYYY-MM-DD
  description: string;
  counterparty: string | null;
  rawDetail: string | null;
  amount: string; // positivo, "165.00"
  direction: TxDirection;
  kind: TxKind;
  isInternal: boolean;
  currency: string;
  fxRate: string | null;
  fxAmount: string | null;
  dedupeKey: string;
};

export type ParsedStatement = {
  bank: "nu";
  clabeLast4: string | null;
  accountNumber: string | null;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;
  summary: {
    saldoInicial: string | null;
    depositos: string | null;
    gastos: string | null;
    comisiones: string | null;
    saldoFinal: string | null;
  };
  transactions: ParsedTransaction[];
};

const MONTHS: Record<string, string> = {
  ENE: "01", FEB: "02", MAR: "03", ABR: "04", MAY: "05", JUN: "06",
  JUL: "07", AGO: "08", SEP: "09", OCT: "10", NOV: "11", DIC: "12",
};

// Línea de movimiento: "31 MAY 2026 OXXOSAN BENITO TIJ Compra -$165.00"
const MOVEMENT =
  /^(\d{1,2})\s+([A-ZÁÉÍÓÚ]{3})\s+(\d{4})\s+(.+?)\s+([+-])\$([\d,]+\.\d{2})$/;

// Líneas de encabezado/pie que no son ni movimiento ni sub-detalle.
const NOISE = [
  /^FECHA\b/,
  /^Detalle de movimientos/,
  /^Nu México Financiera/i,
  /^C\.P\.\s/,
  /^\d+\s+de\s+\d+$/,
  /^Oscar Arredondo Mayoral$/,
  /^Cuenta Nu:/,
  /^MONTO EN PESOS/,
];

function toAmount(raw: string): string {
  return raw.replace(/,/g, "");
}

function toIsoDate(day: string, monthAbbr: string, year: string): string {
  const mm = MONTHS[monthAbbr.toUpperCase()] ?? "01";
  return `${year}-${mm}-${day.padStart(2, "0")}`;
}

function classify(
  description: string,
  direction: TxDirection,
): { kind: TxKind; isInternal: boolean; counterparty: string | null } {
  const cajita = description.match(/^(?:Retiro de|Depósito en) Cajita:\s*(.+)$/i);
  if (cajita) {
    return { kind: "cajita", isInternal: true, counterparty: cajita[1].trim() };
  }
  if (/Devoluci[óo]n$/i.test(description)) {
    return { kind: "devolucion", isInternal: false, counterparty: stripSuffix(description, "Devolución") };
  }
  if (/Comisi[óo]n/i.test(description)) {
    return { kind: "comision", isInternal: false, counterparty: null };
  }
  if (/Compra$/i.test(description)) {
    return { kind: "compra", isInternal: false, counterparty: stripSuffix(description, "Compra") };
  }
  if (/Transferencia$/i.test(description)) {
    return {
      kind: direction === "in" ? "transfer_in" : "transfer_out",
      isInternal: false,
      counterparty: stripSuffix(description, "Transferencia"),
    };
  }
  // SPEI recibido: nombre del remitente + referencia, monto en verde.
  if (direction === "in") {
    return { kind: "deposito", isInternal: false, counterparty: description };
  }
  return { kind: "compra", isInternal: false, counterparty: description };
}

function stripSuffix(description: string, suffix: string): string | null {
  return description.replace(new RegExp(`\\s*${suffix}$`, "i"), "").trim() || null;
}

function parseDetail(detail: string): { fxRate: string | null; fxAmount: string | null; clave: string | null } {
  const fxRate = detail.match(/USD\s+1\.00\s*=\s*MXN\s+([\d.]+)/i)?.[1] ?? null;
  // Quitar la línea del tipo de cambio para no confundir su "USD 1.00" con el monto original.
  const withoutRate = detail.replace(/USD\s+1\.00\s*=\s*MXN\s+[\d.]+/i, "");
  const fxAmount = withoutRate.match(/USD\s+([\d,]+(?:\.\d+)?)/i)?.[1]?.replace(/,/g, "") ?? null;
  const clave = detail.match(/Clave de rastreo\s+(\w+)/i)?.[1] ?? null;
  return { fxRate, fxAmount, clave };
}

function parseSummary(text: string): ParsedStatement["summary"] {
  const num = (re: RegExp) => text.match(re)?.[1]?.replace(/,/g, "") ?? null;
  return {
    saldoInicial: num(/Saldo inicial\s+\$([\d,]+\.\d{2})/),
    depositos: num(/Dep[óo]sitos\s+\+?\$([\d,]+\.\d{2})/),
    gastos: num(/Gastos\s+-?\$([\d,]+\.\d{2})/),
    comisiones: num(/Comisiones cobradas por Nu\s+\$([\d,]+\.\d{2})/),
    saldoFinal: num(/Saldo al generar este estado de cuenta\s+\$([\d,]+\.\d{2})/),
  };
}

function parsePeriod(text: string): { start: string; end: string } {
  // "Periodo: del 01 al 31 may 2026"
  const m = text.match(/Periodo:\s*del\s+(\d{1,2})\s+al\s+(\d{1,2})\s+([a-záéíóú]{3})\s+(\d{4})/i);
  if (!m) return { start: "", end: "" };
  const [, d1, d2, mon, year] = m;
  return { start: toIsoDate(d1, mon, year), end: toIsoDate(d2, mon, year) };
}

export async function parseNuStatement(buffer: Uint8Array): Promise<ParsedStatement> {
  const pdf = await getDocumentProxy(buffer);
  const { text: pages } = await extractText(pdf, { mergePages: false });

  const firstPage = pages[0] ?? "";
  const summary = parseSummary(firstPage);
  const period = parsePeriod(firstPage);
  const clabeLast4 = firstPage.match(/CLABE:\s*(\d+)/)?.[1]?.slice(-4) ?? null;
  const accountNumber = firstPage.match(/Cuenta Nu:\s*(\d+)/)?.[1] ?? null;

  const transactions: ParsedTransaction[] = [];
  let current: ParsedTransaction | null = null;
  let detailBuffer: string[] = [];

  const flushDetail = () => {
    if (current && detailBuffer.length) {
      const detail = detailBuffer.join(" ").replace(/\s+/g, " ").trim();
      current.rawDetail = detail;
      const { fxRate, fxAmount, clave } = parseDetail(detail);
      current.fxRate = fxRate;
      current.fxAmount = fxAmount;
      if (clave) current.dedupeKey = clave;
    }
    detailBuffer = [];
  };

  const pushMovement = (m: RegExpMatchArray) => {
    flushDetail();
    const [, day, mon, year, descRaw, sign, amountRaw] = m;
    const description = descRaw.replace(/\s+/g, " ").trim();
    const direction: TxDirection = sign === "+" ? "in" : "out";
    const { kind, isInternal, counterparty } = classify(description, direction);
    const date = toIsoDate(day, mon, year);
    const amount = toAmount(amountRaw);
    current = {
      date,
      description,
      counterparty,
      rawDetail: null,
      amount,
      direction,
      kind,
      isInternal,
      currency: "MXN",
      fxRate: null,
      fxAmount: null,
      dedupeKey: createHash("sha1")
        .update(`${date}|${description}|${sign}${amount}|${transactions.length}`)
        .digest("hex"),
    };
    transactions.push(current);
  };

  for (let p = 1; p < pages.length; p++) {
    const lines = pages[p].split("\n").map((l) => l.trim()).filter(Boolean);
    // Descripciones largas se parten en dos líneas: una con fecha y sin monto,
    // y la siguiente con el monto al final. Se reconstruyen aquí.
    let pendingWrap: string | null = null;
    for (const line of lines) {
      if (NOISE.some((re) => re.test(line))) continue;
      const startsWithDate = /^\d{1,2}\s+[A-ZÁÉÍÓÚ]{3}\s+\d{4}\b/.test(line);

      if (pendingWrap) {
        const combined: string = `${pendingWrap} ${line}`;
        const cm = combined.match(MOVEMENT);
        if (cm) {
          pushMovement(cm);
          pendingWrap = null;
        } else if (startsWithDate) {
          pendingWrap = line; // el wrap previo no cerró; arranca uno nuevo
        } else {
          pendingWrap = combined; // wrap de más de dos líneas
        }
        continue;
      }

      const m = line.match(MOVEMENT);
      if (m) {
        pushMovement(m);
      } else if (startsWithDate) {
        flushDetail();
        pendingWrap = line; // inicio de línea partida (fecha sin monto)
      } else if (current) {
        detailBuffer.push(line);
      }
    }
    pendingWrap = null; // no arrastrar wraps entre páginas
  }
  flushDetail();

  return {
    bank: "nu",
    clabeLast4,
    accountNumber,
    periodStart: period.start,
    periodEnd: period.end,
    summary,
    transactions,
  };
}
