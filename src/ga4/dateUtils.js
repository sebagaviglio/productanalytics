/**
 * Arma los dos rangos de fecha que usa todo el tablero:
 *  - current: últimos `months` meses hasta ayer
 *  - previous: los `months` meses inmediatamente anteriores
 * Esto es lo que alimenta el comparador "vs. período anterior" del Nivel 0/1.
 */
function pad(n) { return String(n).padStart(2, '0'); }

function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function buildDateRanges(months = 3) {
  const today = new Date();
  const currentEnd = addDays(today, -1); // GA4 suele tener el día de hoy incompleto
  const currentStart = addMonths(currentEnd, -months);
  const previousEnd = addDays(currentStart, -1);
  const previousStart = addMonths(previousEnd, -months);

  return {
    current: { start: toISODate(currentStart), end: toISODate(currentEnd) },
    previous: { start: toISODate(previousStart), end: toISODate(previousEnd) },
  };
}

// Lista de fechas en formato YYYYMMDD (formato que devuelve GA4 en la dimensión "date")
function dateListYYYYMMDD(startISO, endISO) {
  const dates = [];
  let cur = new Date(startISO);
  const last = new Date(endISO);
  while (cur <= last) {
    dates.push(`${cur.getFullYear()}${pad(cur.getMonth() + 1)}${pad(cur.getDate())}`);
    cur = addDays(cur, 1);
  }
  return dates;
}

module.exports = { buildDateRanges, dateListYYYYMMDD, toISODate };
