/*
 * ALFIK configuration
 * Public PayPal client ID and subscription plan IDs only.
 * Never put a PayPal client secret or Supabase service-role key here.
 *
 * NOTE: The IDs below were copied from PayPal Business button code.
 * Checkout must not be treated as verified payment until server-side
 * PayPal webhook verification is implemented and tested.
 */
window.ALFIK_CONFIG = {
  PAYPAL_CLIENT_ID: "BAAmGftSPPI536zKFVUyHTuTrAEWOlZkhrPbFdekTiTlZ_M_UUDUdH2vvahtMm0mswxKlHwW4HGoYGCMpY",

  PAYPAL_PREMIUM_PLAN_ID: "P-9UB95413X81597349NLO6LBA",

  PAYPAL_PRO_PLAN_ID: "P-27W16528KF508712XNLO6PWQ",

  PREMIUM_PRICE_GBP: "5.99",

  PRO_PRICE_GBP: "9.99",

  CURRENCY: "GBP"
};
