/**
 * Config central del tablero.
 *
 * Actualizado a partir de un export real de GA4 (Admin > Eventos, últimos 90
 * días) compartido por el equipo: Eventos_GA4_Bancon.xlsx / Eventos_GA4_Bezza.xlsx.
 * Estos SÍ son nombres que están disparando en producción — a diferencia de
 * la primera versión de este archivo, que tenía varios placeholders basados
 * solo en el plan de medición teórico.
 *
 * Marcados con "// NO IMPLEMENTADO" los que seguimos sin encontrar en el
 * export — no existen todavía en la app, hay que esperar a que el equipo
 * los instrumente.
 *
 * Marcados con "// CONFIRMAR" los que sí encontramos pero con dudas sobre
 * si es semánticamente el evento correcto (ej: un click de acceso a una
 * sección vs. una confirmación real de la acción).
 */

module.exports = {
  bancor: {
    label: 'Bancor',
    propertyEnvVar: 'GA4_PROPERTY_ID_BANCOR',

    // Nivel 1 — funnel de onboarding.
    // welcome_view / registro_click no existen en el export: no hay evento
    // de "entrada" al funnel todavía, arranca directo en clic_onboarding_paso1.
    // Orden asumido por el nombre (paso1 -> paso2 -> paso3 -> enrollment_paso3B),
    // pero el volumen de paso1 (1.060) es menor al de paso2 (17.204) y paso3
    // (35.167) — puede ser normal (usuarios totales por evento, no funnel de
    // sesión) o puede ser que el orden real sea otro. CONFIRMAR con dev.
    funnel: [
      { name: 'Onboarding paso 1', event: 'clic_onboarding_paso1' },
      { name: 'Onboarding paso 2', event: 'clic_onboarding_paso2' },
      { name: 'Onboarding paso 3', event: 'clic_onboarding_paso3' },
      { name: 'Enrollment completo', event: 'clic_enrollment_paso3B' }, // CONFIRMAR: nombre sugiere cierre del flujo, no hay evento "completed" explícito
    ],

    kpis: [
      {
        key: 'new_accounts',
        label: 'Cuentas nuevas (enrollment)',
        type: 'count',
        events: ['clic_enrollment_paso3B'], // CONFIRMAR
      },
      {
        key: 'onboarding_conversion',
        label: 'Conversión onboarding',
        type: 'ratio',
        numerator: ['clic_enrollment_paso3B'], // CONFIRMAR
        denominator: ['clic_onboarding_paso1'], // CONFIRMAR (ver nota de volumen arriba)
      },
      {
        key: 'core_transactions',
        label: 'Transacciones core',
        type: 'count',
        events: ['clic_solicitar_prestamo_step4', 'clic_echeq'], // pap_pdh sacado: no implementado todavía
      },
    ],

    // Nivel 2 — engagement por feature
    features: [
      { name: 'Préstamos', event: 'clic_solicitar_prestamo_step4' }, // confirmado (hoja "Eventos Bancor - PROD")
      { name: 'ECHEQ', event: 'clic_echeq' }, // CONFIRMAR: es un click de acceso a la sección, no una emisión confirmada
      { name: 'Pago de servicios', event: 'clic_pago_servicios' }, // reemplaza a "Firma electrónica" (no implementada) — proxy de conversión, no hay evento de "pago exitoso" separado del click de acción
      { name: 'Alta tarjeta de crédito', event: 'clic_habillitar_TC' }, // reemplaza a "PaP / PdH" (no implementada) — proxy, no confirma éxito real de la alta
    ],
  },

  bezza: {
    label: 'Bezza',
    propertyEnvVar: 'GA4_PROPERTY_ID_BEZZA',

    // Funnel confirmado contra el export real — todos existen y están activos.
    funnel: [
      { name: 'Tutorial', event: 'tutorial_start' },
      { name: 'Signup iniciado', event: 'signup_start' },
      { name: 'Signup exitoso', event: 'signup_success' },
      { name: 'KYC iniciado', event: 'onboarding_dnigender' }, // CAMBIO: onboarding_kyc_start NO existe en el export real, se reemplaza por el primer paso de datos de KYC que sí existe
      { name: 'KYC completo', event: 'onboarding_kyc_complete' },
    ],

    kpis: [
      {
        key: 'new_accounts',
        label: 'Cuentas nuevas',
        type: 'count',
        events: ['account_creation_success'], // confirmado, alto volumen en el export
      },
      {
        key: 'onboarding_conversion',
        label: 'Conversión onboarding',
        type: 'ratio',
        numerator: ['onboarding_kyc_complete'],
        denominator: ['onboarding_dnigender'], // CAMBIO: ver nota arriba — antes era onboarding_kyc_start, que no existe
      },
      {
        key: 'core_transactions',
        label: 'Transacciones core',
        type: 'count',
        events: ['transfer_success', 'qr_payment_confirmed'], // ambos confirmados en el export
      },
    ],

    features: [
      { name: 'Transferencias', event: 'transfer_success' },
      { name: 'Pago con QR', event: 'qr_payment_confirmed' },
      { name: 'Beneficios', event: 'benefits_list_view' }, // CAMBIO: benefit_redeemed no existe; benefits_list_view sí está y con buen volumen (25.238)
      { name: 'Cuenta remunerada', event: 'rewarded_account_modal_view' }, // CAMBIO: "cuenta remunerada" = "rewarded account" en el naming real; yield_account_active no existía
    ],
  },
};
