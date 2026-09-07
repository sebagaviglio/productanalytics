/**
 * Config central del tablero.
 *
 * Cada producto apunta a una property de GA4 distinta (Bancor y Bezza son
 * apps separadas). Los nombres de evento salen del plan de medición
 * (Plan_de_medicion_-_Bezza_-_GA4_-_Analytics.xlsx y _Bancon_-_GA4_-_Analytics.xlsx).
 *
 * Marcados con "// CONFIRMAR" los eventos que todavía no tienen un nombre
 * definitivo en el plan de medición o que no vimos con estado "validado" —
 * quedan como placeholder para no bloquear el desarrollo, pero hay que
 * cerrarlos con el equipo de producto/dev antes de ir a producción.
 */

module.exports = {
  bancor: {
    label: 'Bancor',
    propertyEnvVar: 'GA4_PROPERTY_ID_BANCOR',

    // Nivel 1 — funnel de enrollment
    funnel: [
      { name: 'Welcome', event: 'welcome_view' }, // CONFIRMAR - hoja "Eventos finales" no tiene columna Nombre del Evento cerrada
      { name: 'Registro iniciado', event: 'registro_click' }, // CONFIRMAR
      { name: 'Documento / sexo', event: 'enrollment_doc_view' }, // CONFIRMAR
      { name: 'Continúa enrollment', event: 'enrollment_continue' }, // CONFIRMAR
      { name: 'Enrollment completo', event: 'enrollment_completed' }, // CONFIRMAR
    ],

    // Nivel 0 — KPIs ejecutivos
    kpis: [
      {
        key: 'new_accounts',
        label: 'Cuentas nuevas (enrollment)',
        type: 'count',
        events: ['enrollment_completed'], // CONFIRMAR
      },
      {
        key: 'onboarding_conversion',
        label: 'Conversión onboarding',
        type: 'ratio',
        numerator: ['enrollment_completed'], // CONFIRMAR
        denominator: ['welcome_view'], // CONFIRMAR
      },
      {
        key: 'core_transactions',
        label: 'Transacciones core',
        type: 'count',
        // clic_solicitar_prestamo_step4 confirmado en hoja "Eventos Bancor - PROD"
        events: ['clic_solicitar_prestamo_step4', 'echeq_emitido', 'pap_pdh_confirmado'], // 2 últimos: CONFIRMAR
      },
    ],

    // Nivel 2 — engagement por feature
    features: [
      { name: 'Préstamos', event: 'clic_solicitar_prestamo_step4' }, // confirmado
      { name: 'ECHEQ', event: 'echeq_emitido' }, // CONFIRMAR
      { name: 'Firma electrónica', event: 'firma_completada' }, // CONFIRMAR
      { name: 'PaP / PdH', event: 'pap_pdh_confirmado' }, // CONFIRMAR
    ],
  },

  bezza: {
    label: 'Bezza',
    propertyEnvVar: 'GA4_PROPERTY_ID_BEZZA',

    // Nivel 1 — funnel de signup + KYC (confirmado en hoja "Eventos GA")
    funnel: [
      { name: 'Tutorial', event: 'tutorial_start' },
      { name: 'Signup iniciado', event: 'signup_start' },
      { name: 'Signup exitoso', event: 'signup_success' },
      { name: 'KYC iniciado', event: 'onboarding_kyc_start' },
      { name: 'KYC completo', event: 'onboarding_kyc_complete' },
    ],

    kpis: [
      {
        key: 'new_accounts',
        label: 'Cuentas nuevas',
        type: 'count',
        events: ['account_creation_success'],
      },
      {
        key: 'onboarding_conversion',
        label: 'Conversión onboarding',
        type: 'ratio',
        numerator: ['onboarding_kyc_complete'],
        denominator: ['onboarding_kyc_start'],
      },
      {
        key: 'core_transactions',
        label: 'Transacciones core',
        type: 'count',
        events: ['transfer_success', 'qr_payment_confirmed'],
      },
    ],

    features: [
      { name: 'Transferencias', event: 'transfer_success' },
      { name: 'Pago con QR', event: 'qr_payment_confirmed' },
      { name: 'Beneficios', event: 'benefit_redeemed' }, // CONFIRMAR - no aparece en el plan de medición actual
      { name: 'Cuenta remunerada', event: 'yield_account_active' }, // CONFIRMAR - idem
    ],
  },
};
