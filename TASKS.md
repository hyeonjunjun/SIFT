# Sift Share Extension - Current Tasks

## Context
Redesigning the native iOS share extension popup to be more polished and premium (reference: Lasso-style save popup with large preview, lists, Done button).

## What's Done
- [x] Light/dark mode fix: Replaced dynamic `UIColor { tc in ... }` with `UserDefaults.standard.string(forKey: "AppleInterfaceStyle")` to detect SYSTEM appearance instead of inheriting host app's (Instagram/TikTok dark mode was bleeding through)
- [x] Icon bundle fix (plugin): `plugins/withNativeSharePopup.js` now copies icon to ShareExtension/ and adds it to Xcode Copy Bundle Resources via `withXcodeProject`
- [x] Icon bundle fix (local): Manually added `sift-icon-transparent.png` to `project.pbxproj` (PBXFileReference, PBXBuildFile, ShareExtension group, Resources build phase)
- [x] Color fix applied to both `scripts/patch-share-extension.js` and local `ios/ShareExtension/ShareViewController.swift`

## What's Done (UI Redesign)
- [x] **Complete UI redesign of share extension popup** in `scripts/patch-share-extension.js`:
  - [x] Larger card (320px wide, was 280px)
  - [x] 80x80 croissant icon with enhanced accent glow (was 72px)
  - [x] 20pt bold title "Saving recipe..." (was 17pt)
  - [x] Domain subtitle "from instagram.com" extracted from shared URL
  - [x] Thicker progress bar (5px, rounded 3)
  - [x] "It'll be ready in Sift" subtitle
  - [x] **Done button** (pill, ink bg, cream text) — appears on success
  - [x] `hudDoneTapped()` method to dismiss immediately
  - [x] Auto-dismiss after 3s if Done not tapped
  - [x] Better entrance animation (scale 0.92→1.0, spring damping)
  - [x] New properties: `hudDomainLabel`, `hudDoneButton`, `hudDismissTimer`
  - [x] Method signature: `showSavingHUD(urlString: String = "")`
  - [x] Updated replacement regex to pass `urlString: urlToSift` to `showSavingHUD`

## After UI Redesign
- [ ] Rebuild and test the share extension popup
- [ ] Verify icon loads from bundle
- [ ] Verify light mode shows cream card, dark mode shows dark card
- [ ] Verify Done button dismisses extension
- [ ] Verify domain shows correctly (e.g. "from instagram.com")
- [ ] Verify API call processes the URL in background
