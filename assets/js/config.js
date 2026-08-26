/* ==================================================================
   SIDVIN CELESTE — SITE CONFIGURATION
   The only file you need to edit before going live.
   ================================================================== */

window.SITE_CONFIG = {

  /* ----------------------------------------------------------------
     1. GOOGLE SHEETS
     Paste the Apps Script Web App /exec URL here.
     (Deploy apps-script/Code.gs -> New deployment -> Web app ->
      Execute as: Me, Who has access: Anyone -> copy the /exec URL)
     ---------------------------------------------------------------- */
  SHEET_ENDPOINT: 'https://script.google.com/macros/s/AKfycby9McTeXKLskn2V2CbAVgVVEpec_SWZSR_sKVZFR3DjvdX8sIYm36mUhAqOv3gE-DxP/exec',


  /* ----------------------------------------------------------------
     2. MSG91 SMS OTP WIDGET
     MSG91 dashboard -> OTP -> Widget -> create/select a widget.
     Both of these values are meant to be public / client-side safe.
     Remember to whitelist your Vercel domain in the widget settings.
     ---------------------------------------------------------------- */
  MSG91_WIDGET_ID: '3668796c7969303635303436',
  MSG91_TOKEN_AUTH: '563888TxtQOjkc7n6a8d8a44P1',

  /* Country code prepended to the 10-digit number before sending to MSG91 */
  COUNTRY_CODE: '91',

  /* Seconds before "Resend OTP" becomes clickable */
  OTP_RESEND_SECONDS: 30,

  /* While the two MSG91 values above are still placeholders the site runs in
     DEMO MODE: the OTP box appears and behaves exactly the same, and any
     6-digit code is accepted so you can test the full flow end to end.
     As soon as real credentials are pasted in, demo mode switches itself off. */


  /* ----------------------------------------------------------------
     3. PAGES & TIMING
     ---------------------------------------------------------------- */
  THANK_YOU_URL: 'thank-you.html',

  /* Auto-open the enquiry popup this many milliseconds after page load */
  POPUP_DELAY_MS: 8000,

  /* Show the auto-popup only once per browser session (true) or on every
     page load (false). */
  POPUP_ONCE_PER_SESSION: true,


  /* ----------------------------------------------------------------
     4. CONTACT
     ---------------------------------------------------------------- */
  WHATSAPP_NUMBER: '918123456789',      // digits only, with country code
  PHONE_NUMBER: '+91 81234 56789'
};
