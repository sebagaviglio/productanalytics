const { getGA4Client } = require('./client');
const { dateListYYYYMMDD } = require('./dateUtils');

/**
 * GA4 Data API: cuando pedís más de un dateRange, Google agrega automáticamente
 * una dimensión "dateRange" a la respuesta (no hay que declararla en el request,
 * ver client.js). Importante: esa dimensión aparece AL FINAL de dimensionValues,
 * después de las dimensiones que sí pediste explícitamente — no al principio.
 * Confirmado contra la respuesta real de la API:
 *   dimensionHeaders: [{name:"date"}, {name:"dateRange"}]
 * Valores: "date_range_0" = primer rango de dateRanges (current), "date_range_1" = segundo (previous).
 */

// Usuarios activos por día -> hero del tablero
async function getActiveUsersSeries(propertyId, ranges) {
  const client = getGA4Client();
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      { startDate: ranges.current.start, endDate: ranges.current.end },
      { startDate: ranges.previous.start, endDate: ranges.previous.end },
    ],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'activeUsers' }],
    limit: 100000,
  });

  return shapeSingleMetricSeries(response, ranges);
}

// Conteo diario de una lista de eventos -> funnel y KPIs basados en eventos.
// Devuelve { [eventName]: { current: number[], previous: number[] } }
async function getEventSeries(propertyId, eventNames, ranges) {
  if (eventNames.length === 0) return {};

  const client = getGA4Client();
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      { startDate: ranges.current.start, endDate: ranges.current.end },
      { startDate: ranges.previous.start, endDate: ranges.previous.end },
    ],
    dimensions: [{ name: 'date' }, { name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        inListFilter: { values: eventNames },
      },
    },
    limit: 100000,
  });

  const result = {};
  eventNames.forEach((name) => {
    result[name] = { current: [], previous: [] };
  });

  const currentDates = dateListYYYYMMDD(ranges.current.start, ranges.current.end);
  const previousDates = dateListYYYYMMDD(ranges.previous.start, ranges.previous.end);

  const buckets = {};
  (response.rows || []).forEach((row) => {
    // Orden real: [date, eventName, dateRange]
    const date = row.dimensionValues[0].value;
    const eventName = row.dimensionValues[1].value;
    const rangeIdx = row.dimensionValues[2].value === 'date_range_0' ? 0 : 1;
    const value = Number(row.metricValues[0].value || 0);
    buckets[eventName] = buckets[eventName] || [{}, {}];
    buckets[eventName][rangeIdx][date] = value;
  });

  eventNames.forEach((name) => {
    const [curBucket, prevBucket] = buckets[name] || [{}, {}];
    result[name].current = currentDates.map((d) => curBucket[d] || 0);
    result[name].previous = previousDates.map((d) => prevBucket[d] || 0);
  });

  return result;
}

// Métricas nativas de engagement de GA4 — no dependen de ningún evento nuestro,
// las calcula Google directamente sobre la property.
// engagementRate: % de sesiones "comprometidas" (10s+, 2+ pantallas, o evento clave)
// userEngagementDuration: segundos totales de interacción (para promediar por usuario)
// active1DayUsers / active28DayUsers: para el índice de stickiness DAU/MAU
async function getEngagementSeries(propertyId, ranges) {
  const client = getGA4Client();
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      { startDate: ranges.current.start, endDate: ranges.current.end },
      { startDate: ranges.previous.start, endDate: ranges.previous.end },
    ],
    dimensions: [{ name: 'date' }],
    metrics: [
      { name: 'engagementRate' },
      { name: 'userEngagementDuration' },
      { name: 'activeUsers' },
      { name: 'active1DayUsers' },
      { name: 'active28DayUsers' },
    ],
    limit: 100000,
  });

  const metricNames = ['engagementRate', 'userEngagementDuration', 'activeUsers', 'active1DayUsers', 'active28DayUsers'];
  const currentDates = dateListYYYYMMDD(ranges.current.start, ranges.current.end);
  const previousDates = dateListYYYYMMDD(ranges.previous.start, ranges.previous.end);

  const result = {};
  metricNames.forEach((m) => { result[m] = { current: [], previous: [] }; });

  const buckets = {};
  metricNames.forEach((m) => { buckets[m] = [{}, {}]; });

  (response.rows || []).forEach((row) => {
    // Orden real: [date, dateRange] (una sola dimensión pedida -> dateRange va justo después)
    const date = row.dimensionValues[0].value;
    const rangeIdx = row.dimensionValues[1].value === 'date_range_0' ? 0 : 1;
    metricNames.forEach((m, i) => {
      buckets[m][rangeIdx][date] = Number(row.metricValues[i].value || 0);
    });
  });

  metricNames.forEach((m) => {
    result[m].current = currentDates.map((d) => buckets[m][0][d] || 0);
    result[m].previous = previousDates.map((d) => buckets[m][1][d] || 0);
  });

  return result;
}

// Usuarios nuevos por canal de adquisición (solo período actual — es un
// desglose, no una serie temporal). Sustituto de "costo de adquisición":
// GA4 solo expone costo en $ si la property está vinculada a Google Ads,
// cosa que no podemos confirmar acá — esto es la mitad del dato (de dónde
// vienen los usuarios nuevos), sin el costo.
async function getAcquisitionChannels(propertyId, range) {
  const client = getGA4Client();
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: range.start, endDate: range.end }],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'newUsers' }],
    orderBys: [{ metric: { metricName: 'newUsers' }, desc: true }],
    limit: 8,
  });

  return (response.rows || []).map((row) => ({
    channel: row.dimensionValues[0].value,
    newUsers: Number(row.metricValues[0].value || 0),
  }));
}

function shapeSingleMetricSeries(response, ranges) {
  const currentDates = dateListYYYYMMDD(ranges.current.start, ranges.current.end);
  const previousDates = dateListYYYYMMDD(ranges.previous.start, ranges.previous.end);
  const curBucket = {};
  const prevBucket = {};

  (response.rows || []).forEach((row) => {
    // Orden real: [date, dateRange]
    const date = row.dimensionValues[0].value;
    const rangeIdx = row.dimensionValues[1].value === 'date_range_0' ? 0 : 1;
    const value = Number(row.metricValues[0].value || 0);
    (rangeIdx === 0 ? curBucket : prevBucket)[date] = value;
  });

  return {
    current: currentDates.map((d) => curBucket[d] || 0),
    previous: previousDates.map((d) => prevBucket[d] || 0),
  };
}

module.exports = { getActiveUsersSeries, getEventSeries, getEngagementSeries, getAcquisitionChannels };
