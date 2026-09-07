const { getGA4Client } = require('./client');
const { dateListYYYYMMDD } = require('./dateUtils');

/**
 * GA4 Data API: cuando pedís más de un dateRange, hay que incluir la
 * dimensión "dateRange" para saber a qué rango pertenece cada fila
 * (viene como "date_range_0", "date_range_1", en el mismo orden en que
 * los mandaste en dateRanges).
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
    dimensions: [{ name: 'dateRange' }, { name: 'date' }],
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
    dimensions: [{ name: 'dateRange' }, { name: 'date' }, { name: 'eventName' }],
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
    const rangeIdx = row.dimensionValues[0].value === 'date_range_0' ? 0 : 1;
    const date = row.dimensionValues[1].value;
    const eventName = row.dimensionValues[2].value;
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
  const currentDates = dateListYYYYMMDD(ranges.current.start, ranges.current.end);
  const previousDates = dateListYYYYMMDD(ranges.previous.start, ranges.previous.end);
  const curBucket = {};
  const prevBucket = {};

  (response.rows || []).forEach((row) => {
    const rangeIdx = row.dimensionValues[0].value === 'date_range_0' ? 0 : 1;
    const date = row.dimensionValues[1].value;
    const value = Number(row.metricValues[0].value || 0);
    (rangeIdx === 0 ? curBucket : prevBucket)[date] = value;
  });

  return {
    current: currentDates.map((d) => curBucket[d] || 0),
    previous: previousDates.map((d) => prevBucket[d] || 0),
  };
}

module.exports = { getActiveUsersSeries, getEventSeries };
