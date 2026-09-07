const productsConfig = require('../src/config/products');
const { buildDateRanges } = require('../src/ga4/dateUtils');
const { getActiveUsersSeries, getEventSeries } = require('../src/ga4/queries');
const { getCached, setCached } = require('../src/cache');

const CACHE_TTL_MS = 1000 * 60 * 30; // 30 min — cache "best effort" por instancia (ver README)

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const productKey = req.query.product;
  const cfg = productsConfig[productKey];

  if (!cfg) {
    return res.status(400).json({ error: `Producto desconocido: "${productKey}". Usar "bancor" o "bezza".` });
  }

  const propertyId = process.env[cfg.propertyEnvVar];
  if (!propertyId) {
    return res.status(500).json({
      error: `Falta configurar ${cfg.propertyEnvVar} en Vercel → Settings → Environment Variables.`,
    });
  }

  const cacheKey = `dashboard:${productKey}`;
  const cached = getCached(cacheKey);
  if (cached) return res.status(200).json({ ...cached, cached: true });

  try {
    const ranges = buildDateRanges(3); // fijo en 3 meses

    const eventSet = new Set();
    cfg.funnel.forEach((step) => eventSet.add(step.event));
    cfg.features.forEach((f) => eventSet.add(f.event));
    cfg.kpis.forEach((kpi) => {
      (kpi.events || []).forEach((e) => eventSet.add(e));
      (kpi.numerator || []).forEach((e) => eventSet.add(e));
      (kpi.denominator || []).forEach((e) => eventSet.add(e));
    });

    const [activeUsers, events] = await Promise.all([
      getActiveUsersSeries(propertyId, ranges),
      getEventSeries(propertyId, Array.from(eventSet), ranges),
    ]);

    const payload = {
      product: productKey,
      generatedAt: new Date().toISOString(),
      dateRanges: ranges,
      activeUsers,
      events,
      config: cfg,
    };

    setCached(cacheKey, payload, CACHE_TTL_MS);
    res.status(200).json(payload);
  } catch (err) {
    console.error('Error consultando GA4 Data API:', err);
    res.status(502).json({ error: 'No se pudo consultar GA4 Data API', detail: err.message });
  }
};
