# RideConnect MVP

A mobile-friendly front-end demo for RideConnect, a ride-hailing concept starting in Mbala, Northern Province, Zambia. This repository currently uses plain HTML, CSS and JavaScript so it can be tried without a build step or package installation.

## Run locally

1. Clone the repository and check out `copilot/rideconnect-mvp` (or the branch you are developing).
2. Open `index.html` in a modern browser, or serve this folder with any static file server, for example:

   ```bash
   python3 -m http.server 8000
   ```

3. Visit `http://localhost:8000`.

No dependency install, API key, or environment variables are required. The Google Fonts link is optional; the page falls back to system sans-serif fonts if offline.

## Demo features

- Responsive RideConnect landing page and navigation.
- Passenger and driver registration/login screens using Zambian mobile number validation (9 digits after optional `+260` or leading `0`; mobile prefixes 7 or 9).
- Passenger ride request form with pickup, destination, passenger count, phone number and a clearly labelled illustrative fare estimate in Zambian Kwacha.
- Driver availability toggle and accept/reject actions for sample scenarios and requests created in the passenger flow.
- Admin overview of local demo profiles and real demo-form requests, with driver availability controls.
- Demo profiles and requests persist in the current browser using `localStorage`; they are not sent to a server. Use the same browser/device to see shared demo data across the screens. Clear site data to reset it.

## Important limitations

This is a user-interface MVP, not a deployed ride-hailing service. There is no backend, database, secure identity verification, password-based authentication, dispatch, payment integration, SMS/phone verification, route calculation, live GPS, or real driver network. Login is a local demo lookup by phone number and must not be used to protect real accounts. The admin view is also not access-controlled. Demo fare values are illustrative placeholders, not actual market prices or a fare quote. Sample driver requests are explicitly labelled and are not real bookings. Do not enter real personal data.

Before launch, add a server-side API and persistent database, proper authentication and authorization (including protected admin access), consent and privacy/security practices, validated Mbala fare and route rules, operational driver onboarding, and any required communications and payment providers. Keep all service credentials on the server, never in browser code.

## Project files

- `index.html` — accessible page structure and passenger, driver and admin screens.
- `styles.css` — responsive visual system and layouts.
- `app.js` — navigation, validation, demo fare, local persistence and dashboard actions.
