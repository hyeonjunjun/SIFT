# Sift Share Extension - Current Tasks

## What's Done
- [x] Light/dark mode fix — system appearance detection via UserDefaults
- [x] Icon bundle fix — plugin copies + adds to Xcode Copy Bundle Resources
- [x] **Full-page bottom sheet redesign** — complete rewrite of share extension UI:
  - Bottom sheet that slides up (not a small centered card)
  - Drag handle at top
  - 96x96 croissant icon with accent glow + "sift" brand text
  - URL preview card showing domain + path (e.g. "instagram.com" + "/reel/...")
  - 22pt bold status text ("Saving recipe..." → "Recipe saved!")
  - 6px accent progress bar
  - "It'll be ready in Sift" subtitle
  - Full-width Done button (ink bg, cream text, 54pt tall, rounded 27)
  - Slide-up entrance, slide-down dismiss animations
  - Auto-dismiss after 3s or tap Done
  - Updated both `ShareViewController.swift` and `patch-share-extension.js`
  - Updated call sites to pass URL string for domain extraction

## Remaining
- [ ] Rebuild and test the share extension
- [ ] Verify icon loads from bundle
- [ ] Verify light/dark mode colors match system
- [ ] Verify Done button + slide-down dismiss
- [ ] Verify domain/path shows correctly
- [ ] Verify API call processes URL in background
- [ ] Commit all changes
