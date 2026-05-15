# Fuwu Voice Command Plan

This is a preparation layer, not an always-listening feature.

## Current behavior

- The microphone is requested only after the user clicks **Sesli Komut**.
- If the browser does not support the Web Speech API, the UI shows: “Bu tarayıcı sesli komutu desteklemiyor.”
- Supported Turkish commands are intentionally simple:
  - “tesisatçı ara”
  - “elektrikçi ara”
  - “Kadıköy ustaları”
  - “WhatsApp ile yaz”
  - “profilleri oku”
- “Profilleri Sesli Oku” uses speech synthesis only after the user clicks.
- The feature does not record, store, or send voice input from application code.

## Privacy and safety

- No always-listening behavior.
- No microphone request on page load.
- No automatic audio playback.
- Voice commands should keep visible status feedback for screen-reader users.
- Opening third-party links should remain user-confirmed. The current WhatsApp command focuses the first WhatsApp action instead of opening it automatically.

## i18n and RTL readiness

- Turkish remains the default interface language.
- English and Arabic labels are prepared as “yakında” states until translations are complete.
- Arabic should be tested with `dir="rtl"` before enabling translated UI. Layout checks should cover navigation, filters, provider cards, and policy pages.

## Future hardening

- Add command aliases from real user searches.
- Add opt-in browser permission education text before the first microphone request.
- Add a manual command list in an accessible dialog.
- Add integration tests for command parsing without invoking real microphone APIs.
