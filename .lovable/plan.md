# Finish Helth core app

## Goal
Turn the current UI prototype into a usable emergency-card app, prioritizing the QR-to-emergency-info flow.

## Core work
- Replace the broken hardcoded QR destination with the app's real address and correct `/card/{id}` path.
- Store emergency card details in Lovable Cloud so a scanned card works on a different phone, not only the owner's browser.
- Load scanner-facing pages directly from Cloud with clear loading, invalid-card, and offline/error states.
- Make sharing actually copy or share the live emergency link.
- Improve onboarding so the first profile uses the person's real name and blood group.
- Make profile edits validated and synchronize emergency details to the scanned card.
- Make document selection use real phone camera/file inputs, show selected file details, and support opening/removing saved records.
- Replace simulated settings actions with honest, usable states; remove misleading fake scan history.

## Validation
- Test onboarding, profile editing, family switching, file selection, link sharing, and direct emergency-card access.
- Verify a card URL in a fresh browser session to confirm cross-device availability.
- Check mobile layout, runtime errors, and the final app build.

## Technical details
- Add a narrowly scoped public emergency-card table and safe lookup/update functions in Lovable Cloud.
- Keep private editing capability on the owner's device; scanner pages receive read-only emergency details only.
- Continue using local device storage for prototype-only preferences while Cloud powers the public QR record.
