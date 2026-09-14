/**
 * Config central del tablero.
 *
 * "funnels" es una lista (antes era un solo "monetizationFunnel") porque
 * Bancor necesita dos funnels separados (Onboarding y Login) para no
 * confundir los pasos - ver nota en cada uno.
 */

module.exports = {
  bancor: {
    label: 'Bancor',
    propertyEnvVar: 'GA4_PROPERTY_ID_BANCOR',

    acquisition: {
      registrationEvent: 'clic_enrollment_paso3B',
      kyc: {
        start: 'clic_onboarding_paso3', // Inicio (confirmado por volumen: paso3 > paso2 > paso1)
        complete: 'clic_onboarding_paso1', // Finalizado
      },
    },

    // Dos funnels separados para no confundir onboarding con login.
    // Nombres y orden confirmados por el equipo de producto:
    // paso3 = Inicio, paso2 = Validación, paso1 = Finalizado (para ambos).
    funnels: [
      {
        title: 'Funnel de Onboarding',
        steps: [
          { name: 'Inicio', event: 'clic_onboarding_paso3' },
          { name: 'Validación', event: 'clic_onboarding_paso2' },
          { name: 'Finalizado', event: 'clic_onboarding_paso1' },
        ],
      },
      {
        title: 'Funnel de Login',
        steps: [
          { name: 'Inicio', event: 'login_paso3' },
          { name: 'Validación', event: 'login_paso2' },
          { name: 'Finalizado', event: 'login_paso1' },
        ],
      },
    ],
  },

  bezza: {
    label: 'Bezza',
    propertyEnvVar: 'GA4_PROPERTY_ID_BEZZA',

    acquisition: {
      registrationEvent: 'account_creation_success',
      kyc: {
        start: 'onboarding_dnigender',
        complete: 'onboarding_kyc_complete',
      },
    },

    funnels: [
      {
        title: 'Funnel principal',
        steps: [
          { name: 'Cuenta creada', event: 'account_creation_success' },
          { name: 'KYC verificado', event: 'onboarding_kyc_complete' },
          { name: 'Primera transacción', event: 'transfer_success' },
        ],
      },
    ],
  },
};
