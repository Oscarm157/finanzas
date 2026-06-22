const mxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
});

export function money(value: number) {
  return mxn.format(value);
}

const dayMonth = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" });

// Las fechas vienen 'YYYY-MM-DD'; se parsean a mano para no recorrer husos.
export function shortDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return dayMonth.format(new Date(y, m - 1, d));
}

export function period(start: string, end: string) {
  return `${shortDate(start)} al ${shortDate(end)}`;
}
