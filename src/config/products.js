/**
 * Config central del tablero — reorganizada en 3 secciones de negocio:
 * Adquisición y Activación / Compromiso y Uso (Engagement) / Conversión y
 * Monetización, en vez de la estructura anterior de "niveles" genéricos.
 *
 * Basada en el export real de GA4 (Eventos_GA4_Bancon.xlsx / Eventos_GA4_Bezza.xlsx).
 * Marcados con "// CONFIRMAR" los mapeos que son el mejor proxy disponible
 * pero no un evento 1:1 con el concepto pedido.
 */

module.exports = {
  bancor: {
    label: 'Bancor',
    propertyEnvVar: 'GA4_PROPERTY_ID_BANCOR',

    // Adquisición y Activación
    acquisition: {
      // Tasa de conversión de registro = altas / primeras aperturas de la app
      registrationEvent: 'clic_enrollment_paso3B', // CONFIRMAR: no hay evento "sign_up" literal, se usa el cierre del enrollment
      // Tasa de completitud de KYC. Bancor no tiene un evento de KYC explícito
      // (a diferencia de Bezza) — se usa el onboarding de datos como proxy.
      kyc: {
        start: 'clic_onboarding_paso1', // CONFIRMAR
        complete: 'clic_onboarding_paso3', // CONFIRMAR — no hay evento "completed" para este flujo
      },
    },

    // Conversión y Monetización — funnel principal
    monetizationFunnel: [
      { name: 'Cuenta creada', event: 'clic_enrollment_paso3B' }, // CONFIRMAR
      { name: 'KYC verificado', event: 'clic_onboarding_paso3' }, // CONFIRMAR
      { name: 'Primera transacción', event: 'clic_solicitar_prestamo_step4' }, // CONFIRMAR: no hay evento genérico de "primer depósito", se usa préstamos como proxy de primera transacción de valor
    ],
  },

  bezza: {
    label: 'Bezza',
    propertyEnvVar: 'GA4_PROPERTY_ID_BEZZA',

    acquisition: {
      registrationEvent: 'account_creation_success', // confirmado
      kyc: {
        start: 'onboarding_dnigender', // proxy — onboarding_kyc_start no existe en el export real
        complete: 'onboarding_kyc_complete', // confirmado
      },
    },

    monetizationFunnel: [
      { name: 'Cuenta creada', event: 'account_creation_success' },
      { name: 'KYC verificado', event: 'onboarding_kyc_complete' },
      { name: 'Primera transacción', event: 'transfer_success' }, // CONFIRMAR: podría ser transfer_success o qr_payment_confirmed según qué cuente como "primera transacción de valor"
    ],
  },
};
