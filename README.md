# RideConnect MVP

A mobile-friendly front-end demo for RideConnect, a ride-hailing concept starting in Mbala, Northern Province, Zambia. It uses plain HTML, CSS and JavaScript and runs without a build step or package installation.

## Run locally

1. Check out `copilot/rideconnect-mvp` (or your development branch).
2. Open `index.html` in a modern browser, or serve this folder:

   ```bash
   python3 -m http.server 8000
   ```

3. Visit `http://localhost:8000`.

No dependency install, API key, or environment variables are required. Google Fonts are optional; system sans-serif fonts are used if the font service is unavailable.

## Demo features and limitations

- Responsive landing page and navigation with passenger and driver registration/login tabs.
- Zambian mobile validation for 9 digits starting with 7 or 9, optionally with `+260`, `260`, or a leading `0`; spaces, hyphens, and parentheses are accepted for formatting.
- Passenger booking with route inputs, passenger count, phone validation, a clearly labelled illustrative Kwacha estimate, pending-request cancellation, status filtering, and success/error feedback.
- Driver dashboard with sample scenarios and passenger-created demo requests, availability controls, accept/reject confirmations, and a status filter limited to **All statuses, Pending, and Accepted**. The driver queue only includes pending requests and accepted requests assigned to the current driver; rejected and cancelled requests are not shown in that queue.
- Admin overview of local passenger/driver demo profiles, driver availability controls, statistics, and searchable/filterable passenger-created requests.
- Demo profiles and requests persist in the existing browser `localStorage` key (`rideconnect-mvp-v1`). The existing state structure is retained; sample request decisions are kept in `demoStatuses`. All data is local to the same browser/device.

This is not a deployed ride-hailing service. There is no backend, database, secure authentication or identity verification, password-based login, protected admin authorization, dispatch, payment integration, SMS/phone verification, route calculation, live GPS, or connected driver network. Login is a local demo lookup by phone number and is not account security. The admin view is not access-controlled. Do not enter real personal data.

Fare figures are deterministic illustrative demo values, not based on route distance, actual Mbala rates, a pricing provider, or a quote. Sample scenarios are fictional UI data, not actual drivers, bookings, operating services, or market prices. Submitting or accepting a request does not contact a passenger or driver.

## Manual testing checklist (not run in this environment)

Use a fresh browser profile or clear site data between full runs. All demo records are browser-local.

1. **Passenger registration/login:** Register with a name and a valid phone (try `971234567`, `0971234567`, and `+260 97 123 4567`). Confirm a success message and transition to booking. Log out only by using another account/browser context or clear local storage; use the header Log in button and the passenger Log in tab to sign in. Verify invalid length, prefix, and non-phone characters show an error; verify unknown number gives the register-first message.
2. **Driver registration/login:** Register name, valid Zambian phone, vehicle and registration. Verify driver dashboard profile. Log in using that phone after reloading. Check invalid phone and missing required profile fields.
3. **Passenger booking/fare:** Enter distinct pickup/destination and valid phone; change passenger count and confirm the illustrative K estimate updates. Submit and verify the success feedback, pending request card, passenger count, and matching request on driver/admin dashboards. Test blank/too-short/equal locations and invalid phone. Confirm fare copy never implies a live route quote.
4. **Driver acceptance/rejection:** Register or log in as a driver. Try accepting while unavailable and verify the error; set available, accept a pending request, confirm the prompt, then verify accepted state and success feedback. Reject a different pending request and verify its confirmation and result. Cancel either prompt and confirm no state change. Reload and verify accepted/rejected sample decisions persist where applicable.
5. **Passenger cancellation:** Cancel a pending passenger-created request and confirm the prompt. Verify cancelled state in admin; it should no longer appear in the driver queue. Cancel the confirmation once to ensure the request stays pending.
6. **Admin management/search:** Open Admin, inspect empty and populated driver/passenger lists and statistics. Toggle a driver's availability and verify the profile state. Search ride requests by ID, pickup, destination, and phone; verify no-match messaging and each available ride status filter. Admin search and filters should not affect the driver filter.
7. **Status filters:** Passenger list should filter among statuses present for that passenger's requests. Driver filter should offer only All statuses, Pending, Accepted; verify each view and empty state after decisions. Admin status filter should show accurate matches for created requests.
8. **Local storage/backward compatibility:** Verify the key `rideconnect-mvp-v1` and that profiles, rides, availability and sample decisions remain after reload in the same browser. With a backup, test old records that omit `demoStatuses`; they should load with an empty sample-status map. Malformed JSON or wrong collection types should fall back safely without a script crash. Clear the key to reset.
9. **Navigation/mobile:** Click header, footer, CTA, and dashboard navigation links; test URL hashes and browser back/forward. At narrow phone widths, open the mobile menu, choose a route, press Escape, and click outside to close; verify menu state, forms, cards, and filters remain usable without horizontal overflow. Also check keyboard focus and desktop layout.

## Runtime test status

No runtime tests were run for this change in the current environment. The checklist above is for manual verification; do not treat the documented behaviors as tested until exercised in a browser.

## Project files

- `index.html` — accessible page structure and passenger, driver and admin screens.
- `styles.css` — responsive visual system and layouts.
- `app.js` — navigation, validation, demo fare, local persistence, filters and dashboard actions.
- `driver-filter.js` — narrows the dynamically created driver status filter to the statuses used in the driver request queue.
