const productsConfig = require('../src/config/products');
const { buildDateRanges } = require('../src/ga4/dateUtils');
const { getActiveUsersSeries, getEventSeries, getEngagementSeries, getAcquisitionChannels } = require('../src/ga4/queries');
const { getCached, setCached } = require('../src/cache');

const CACHE_TTL_MS = 1000 * 60 * 30; // 30 min — ajustable según cuota de GA4

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

  const cacheKey = `dashboard:${productKey}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  try {
    const ranges = buildDateRanges(3); // fijo en 3 meses

    // Junta todos los eventos que necesita el tablero para no hacer N llamadas
    const eventSet = new Set();
    eventSet.add(cfg.acquisition.registrationEvent);
    eventSet.add(cfg.acquisition.kyc.start);
    eventSet.add(cfg.acquisition.kyc.complete);
    eventSet.add('first_open');
    cfg.monetizationFunnel.forEach((step) => eventSet.add(step.event));

    const [activeUsers, events, engagement, channels] = await Promise.all([
      getActiveUsersSeries(propertyId, ranges),
      getEventSeries(propertyId, Array.from(eventSet), ranges),
      getEngagementSeries(propertyId, ranges),
      getAcquisitionChannels(propertyId, ranges.current),
    ]);

    const payload = {
      product: productKey,
      generatedAt: new Date().toISOString(),
      dateRanges: ranges,
      activeUsers,
      events,
      engagement,
      channels,
      config: cfg,
    };

    setCached(cacheKey, payload, CACHE_TTL_MS);
    res.json(payload);
  } catch (err) {
    console.error('Error consultando GA4 Data API:', err);
    res.status(502).json({ error: 'No se pudo consultar GA4 Data API', detail: err.message });
  }
};
