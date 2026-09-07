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

// Usuarios activos por día -> alimenta el hero del Nivel 0
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

  return shapeSingleSeries(response, ranges);
}

// Conteo diario de una lista de eventos -> alimenta funnel, KPIs y features.
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

  // buckets[eventName][rangeIndex][date] = valor
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

function shapeSingleSeries(response, ranges) {
