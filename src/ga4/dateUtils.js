/**
 * Arma los dos rangos de fecha que usa el tablero: current (el período que
 * el usuario eligió) y previous (mismo largo de días, inmediatamente anterior).
 *
 * Acepta dos formas de pedir el rango:
 *  - { months: 3 }              -> últimos 3 meses hasta ayer (default si no se manda nada)
 *  - { start: '2026-01-01', end: '2026-03-01' } -> rango explícito
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

function buildDateRanges(opts = {}) {
  const { months, start, end } = typeof opts === 'number' ? { months: opts } : opts;

  let currentStart, currentEnd;
  if (start && end) {
    currentStart = new Date(`${start}T00:00:00`);
    currentEnd = new Date(`${end}T00:00:00`);
  } else {
    const today = new Date();
    currentEnd = addDays(today, -1); // GA4 suele tener el día de hoy incompleto
    currentStart = addMonths(currentEnd, -(months || 3));
  }

  // período anterior: mismo largo en días, inmediatamente antes del actual
  const spanDays = Math.max(1, Math.round((currentEnd - currentStart) / 86400000));
  const previousEnd = addDays(currentStart, -1);
  const previousStart = addDays(previousEnd, -spanDays);

  return {
    current: { start: toISODate(currentStart), end: toISODate(currentEnd) },
    previous: { start: toISODate(previousStart), end: toISODate(previousEnd) },
  };
}

function dateListYYYYMMDD(startISO, endISO) {
  const dates = [];
  let cur = new Date(`${startISO}T00:00:00`);
  const last = new Date(`${endISO}T00:00:00`);
  while (cur <= last) {
    dates.push(`${cur.getFullYear()}${pad(cur.getMonth() + 1)}${pad(cur.getDate())}`);
    cur = addDays(cur, 1);
  }
  return dates;
}

module.exports = { buildDateRanges, dateListYYYYMMDD, toISODate };
