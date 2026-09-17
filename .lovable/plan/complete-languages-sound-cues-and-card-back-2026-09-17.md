# Complete languages, sound cues, and card back

## Goal
Finish English, Tamil, and Hindi across the main app experience, add clear emergency and QR-scan sounds, and prevent the health-card back from overflowing.

## Changes
- Make the language setting available in Settings, persist the choice, and apply translated text across shared navigation and the core Home, Locker, Blood, Scan, Settings, SOS, and safety check-in experiences.
- Play the emergency alarm when SOS is successfully activated and when a safety check-in is missed; stop it when the SOS result is dismissed or the user confirms they are safe.
- Play a short success tone and vibration after a valid QR code is detected, before opening the emergency card.
- Redesign the health-card back as one compact row with only the first two emergency contacts, stronger text contrast, and emergency numbers kept safely inside the card.

## Validation
- Switch among English, Tamil, and Hindi and confirm translated labels persist after reload.
- Verify the SOS alarm, missed-check-in alarm, QR success cue, and their stop behavior.
- Check the front and back card at the current mobile size and confirm no text or emergency numbers overflow.
- Check the main pages for runtime errors and mobile layout regressions.

## Technical details
- Reuse the existing language context and semantic color tokens.
- Use the existing Web Audio helper for browser-safe audio; scanning receives a separate short success tone.
- Limit card rendering only; saved profile contacts remain unchanged.
