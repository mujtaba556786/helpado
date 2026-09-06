/**
 * Helpado AdSense Configuration
 *
 * Publisher ID: Replace ca-pub-XXXXXXXXXXXXXXXX with your real AdSense Publisher ID
 * Ad Slots: Replace slot IDs below with your real AdSense ad unit IDs
 *
 * ── Blocked categories (configure in AdSense Dashboard) ───────────────────────
 * Go to: AdSense → Content → Sensitive Categories → Block the following:
 *   ✗  Gambling & Betting
 *   ✗  Adult & Explicit Sexual Content
 *   ✗  Finance: Loans & Financial Services (bank interest / payday loans)
 *   ✗  Dating
 *   ✗  Get Rich Quick
 *
 * ── Ad placements ─────────────────────────────────────────────────────────────
 *   Slot 1111111111 → Banner above helper list (50px height, horizontal)
 *   Slot 2222222222 → Banner below helper list (50px height, horizontal)
 *
 * ── Rules ─────────────────────────────────────────────────────────────────────
 *   • No ads on login / OTP verification screens
 *   • No ads on booking confirmation flow
 *   • No interstitials / popups
 *   • Providers with active subscription (€9.99/mo) see NO ads
 */

window.HELPHUB_ADS = {
    publisherId: "ca-pub-XXXXXXXXXXXXXXXX",
    slots: {
        listTop:    "1111111111",
        listBottom: "2222222222"
    },
    // Set to false to hide all ads (e.g. for subscribed providers)
    enabled: true
};
