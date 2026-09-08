const productsConfig = require('../src/config/products');
const { buildDateRanges } = require('../src/ga4/dateUtils');
const { getActiveUsersSeries, getEventSeries, getEngagementSeries, getAcquisitionChannels } = require('../src/ga4/queries');
const { getCached, setCached } = require('../src/cache');

const CACHE_TTL_MS = 1000 * 60 * 30; // 30 min — ajustable según cuota de GA4

// Envuelve cada query para que un fallo puntual (ej: una métrica no
// compatible con otra en el mismo report) no tire abajo todo el dashboard.
// Devuelve { ok: true, data } o { ok: false, error }.
async function safeCall(label, fn) {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    console.error(`Falló ${label}:`, err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');

  const productKey = req.query.product;
  const cfg = productsConfig[productKey];

  if (!cfg) {
    return res.status(400).json({ error: `Producto desconocido: "${productKey}". Usar "bancor" o "bezza".` });
  }

  const propertyId = process.env[cfg.propertyEnvVar];
  if (!propertyId) {
    return res.status(500).json({ error: `Falta configurar ${cfg.propertyEnvVar} en las variables de entorno.` });
  }

  // Período: ?months=30|90|180|365 (preset) o ?start=YYYY-MM-DD&end=YYYY-MM-DD (custom)
  const months = req.query.months ? Number(req.query.months) / 30 : undefined;
  const ranges = buildDateRanges({
    months,
    start: req.query.start,
    end: req.query.end,
  });

  const cacheKey = `dashboard:${productKey}:${ranges.current.start}_${ranges.current.end}`;
  const bypassCache = req.query.refresh === 'true';

  if (!bypassCache) {
    const cached = getCached(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });
  }

  // Junta todos los eventos que necesita el tablero para no hacer N llamadas
  const eventSet = new Set();
  eventSet.add(cfg.acquisition.registrationEvent);
  eventSet.add(cfg.acquisition.kyc.start);
  eventSet.add(cfg.acquisition.kyc.complete);
  eventSet.add('first_open');
  cfg.monetizationFunnel.forEach((step) => eventSet.add(step.event));

  const [activeUsersR, eventsR, engagementR, channelsR] = await Promise.all([
    safeCall('activeUsers', () => getActiveUsersSeries(propertyId, ranges)),
    safeCall('events', () => getEventSeries(propertyId, Array.from(eventSet), ranges)),
    safeCall('engagement', () => getEngagementSeries(propertyId, ranges)),
    safeCall('channels', () => getAcquisitionChannels(propertyId, ranges.current)),
  ]);

  // Si falló TODO, ahí sí devolvemos error real — algo más de fondo está roto
  // (permisos, property inválida, etc).
  if (!activeUsersR.ok && !eventsR.ok && !engagementR.ok && !channelsR.ok) {
    return res.status(502).json({
      error: 'No se pudo consultar GA4 Data API (todas las queries fallaron)',
      detail: activeUsersR.error || eventsR.error || engagementR.error || channelsR.error,
    });
  }

  const payload = {
    product: productKey,
    generatedAt: new Date().toISOString(),
    dateRanges: ranges,
    activeUsers: activeUsersR.ok ? activeUsersR.data : null,
    events: eventsR.ok ? eventsR.data : null,
    engagement: engagementR.ok ? engagementR.data : null,
    channels: channelsR.ok ? channelsR.data : null,
    errors: {
      activeUsers: activeUsersR.ok ? null : activeUsersR.error,
      events: eventsR.ok ? null : eventsR.error,
      engagement: engagementR.ok ? null : engagementR.error,
      channels: channelsR.ok ? null : channelsR.error,
    },
    config: cfg,
  };

  setCached(cacheKey, payload, CACHE_TTL_MS);
  res.json(payload);
};
