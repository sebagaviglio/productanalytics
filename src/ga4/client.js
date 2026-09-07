const { BetaAnalyticsDataClient } = require('@google-analytics/data');

let cachedClient = null;

/**
 * Dos formas de autenticar, elegí la que corresponda a donde hostees esto:
 *
 * A) GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
 *    Recomendado en local o en un server con filesystem persistente.
 *    La librería de Google lo detecta sola, no hace falta pasar nada acá.
 *
 * B) GA4_CREDENTIALS_JSON='{"type":"service_account", ...}'
 *    Para hosting serverless (Vercel, Render, Cloud Run) donde no querés
 *    subir el .json como archivo: pegás el contenido completo en una
 *    variable de entorno.
 *
 * Nunca commitear el archivo de la service account ni pegar el JSON
 * directamente en el código.
 */
function getGA4Client() {
  if (cachedClient) return cachedClient;

  if (process.env.GA4_CREDENTIALS_JSON) {
    const credentials = JSON.parse(process.env.GA4_CREDENTIALS_JSON);
    cachedClient = new BetaAnalyticsDataClient({ credentials });
  } else {
    cachedClient = new BetaAnalyticsDataClient();
  }
  return cachedClient;
}

module.exports = { getGA4Client };
