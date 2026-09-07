// TEMPORAL — borrar este archivo una vez resuelto el bug de datos en cero.
// No expone la credencial, solo la forma cruda de la respuesta de GA4.
const { getGA4Client } = require('../src/ga4/client');
const { buildDateRanges } = require('../src/ga4/dateUtils');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const productKey = req.query.product || 'bancor';
  const propertyId = productKey === 'bezza'
    ? process.env.GA4_PROPERTY_ID_BEZZA
    : process.env.GA4_PROPERTY_ID_BANCOR;

  try {
    const ranges = buildDateRanges(3);
    const client = getGA4Client();

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        { startDate: ranges.current.start, endDate: ranges.current.end },
        { startDate: ranges.previous.start, endDate: ranges.previous.end },
      ],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'activeUsers' }],
      limit: 10,
    });

    res.status(200).json({
      propertyId,
      ranges,
      dimensionHeaders: response.dimensionHeaders,
      metricHeaders: response.metricHeaders,
      rowCount: response.rowCount,
      totalRowsReturned: (response.rows || []).length,
      sampleRows: (response.rows || []).slice(0, 8),
    });
  } catch (err) {
    res.status(500).json({ error: err.message, propertyId });
  }
};
