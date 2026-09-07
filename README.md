# Product Analytics — Bancor / Bezza (GA4 + Vercel)

Repo listo para subir a GitHub y deployar en Vercel tal cual, sin build step:

- `public/index.html` — el tablero (estático, lo sirve Vercel en la raíz).
- `api/dashboard.js` — función serverless que consulta GA4 Data API.
- `api/health.js` — healthcheck.
- `src/` — config de eventos por producto y wrappers de GA4 (compartidos por `api/dashboard.js`).

El tablero llama a rutas relativas (`/api/dashboard?product=...`), así que
al vivir front y back en el mismo deploy de Vercel **no hay que configurar
CORS ni URLs**: funciona apenas abrís la URL del proyecto.

## 1. GA4 — dar acceso

1. En Google Cloud Console: crear/reusar un proyecto y habilitar **Google
   Analytics Data API**.
2. Crear una **service account** en ese proyecto → **Keys** → **Add key**
   → JSON. Descargarlo (no lo subas al repo).
3. En GA4 → Admin → **Property Access Management**, en **las dos
   properties** (Bancor y Bezza), agregar el email de la service account
   (`...@...iam.gserviceaccount.com`) con rol **Viewer**.
4. Anotar el **Property ID** de cada una (Admin → Property Settings).

## 2. GitHub

```bash
git init
git add .
git commit -m "Tablero product analytics + backend GA4"
git branch -M main
git remote add origin https://github.com/tu-org/tu-repo.git
git push -u origin main
```

`.gitignore` ya excluye `.env`, `.env.local` y `service-account.json` —
revisá antes del primer commit que ninguna credencial haya quedado suelta.

## 3. Vercel

1. **New Project** → **Import Git Repository** → elegir el repo.
2. Framework preset: **Other** (no hace falta build command ni output dir,
   Vercel detecta `api/*.js` como funciones y `public/` como estático).
3. En **Settings → Environment Variables**, cargar:
   - `GA4_PROPERTY_ID_BANCOR`
   - `GA4_PROPERTY_ID_BEZZA`
   - `GA4_CREDENTIALS_JSON` → pegar el contenido completo del JSON de la
     service account en una sola línea (Vercel no tiene filesystem
     persistente, por eso acá va el JSON directo y no una ruta a archivo).
   - `ALLOWED_ORIGIN` → opcional, solo si en el futuro el tablero se sirve
     desde otro dominio distinto a este backend.
4. **Deploy**.

Al terminar vas a tener:
- `https://tu-proyecto.vercel.app/` → el tablero.
- `https://tu-proyecto.vercel.app/api/dashboard?product=bancor` → JSON crudo.
- `https://tu-proyecto.vercel.app/api/health` → `{ ok: true }`.

## 4. Correrlo local antes de pushear

```bash
npm i -g vercel        # una vez
cp .env.example .env.local   # completar con tus valores
vercel dev
```

`vercel dev` levanta `public/` y `api/` juntos en `localhost:3000`, leyendo
`.env.local`. Es el mismo runtime que producción, así que si funciona acá
va a funcionar en el deploy.

## 5. Eventos por producto

Todo el mapeo vive en `src/config/products.js`. Lo marcado `// CONFIRMAR`
son eventos que todavía no tienen nombre definitivo en el plan de medición
(el funnel de enrollment completo de Bancor, y Beneficios / Cuenta
remunerada de Bezza). Es el único archivo a tocar cuando el equipo cierre
esos nombres — no hace falta tocar `api/dashboard.js` ni el frontend.

## 6. Cache y cuota de GA4

`src/cache.js` guarda cada respuesta 30 minutos en memoria del proceso.
En Vercel esto es **cache "best effort"**: cada función puede correr en
una instancia distinta, así que no es un cache compartido garantizado.
Si el tablero empieza a tener tráfico real, migrar ese cache a **Vercel
KV** o **Upstash Redis** (ambos tienen integración de un click desde el
marketplace de Vercel) para no golpear los límites de cuota de GA4 Data
API con cada visita.

## 7. Pendientes conocidos

- El endpoint `/api/dashboard` hoy es público. Si el tablero termina
  viviendo fuera de una red interna, sumarle un token simple (header
  `x-api-key` chequeado contra una env var) antes de compartir la URL.
- Medición Web (fuera de alcance de esta entrega): cuando se sume, agregar
  un query param `platform` y separar las series por canal en vez de
  combinarlas en un solo número.
