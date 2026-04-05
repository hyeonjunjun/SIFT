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
  - [x] Responsive card width (`min(320, screenWidth - 48)`, was fixed 280px)
  - [x] 80x80 croissant icon with warm accent glow (was 72px)
  - [x] 20pt bold title with proper ellipsis character (was 17pt)
  - [x] Domain subtitle — smart subdomain stripping (m.youtube.com → youtube.com), truncation at 30 chars
  - [x] 5px progress bar, faster 1.2s fill to 70% (was 2.0s to 75%)
  - [x] "It'll be ready in Sift" subtitle (13pt, matches domain visual weight)
  - [x] **Done button** — accent bg in dark mode, ink bg in light (fixes invisible text in dark mode)
  - [x] Button: 48pt height, 24pt corners, shadow glow, spring entrance animation
  - [x] `hudDoneTapped()` with medium haptic feedback + scale-down exit animation
  - [x] Auto-dismiss after 3s with matching scale-down exit
  - [x] Spring entrance (0.88→1.0, damping 0.78, velocity 0.4) + light haptic on appear
  - [x] Adaptive card shadow (radius 28, higher opacity in dark mode)
  - [x] Improved stone subtitle color with better contrast in both modes
  - [x] Accessibility labels on title, checkmark, Done button
  - [x] Domain label with leading/trailing constraints and `truncatingMiddle` line break
  - [x] Coordinated success choreography: progress → check+text → subtitle → button spring
  - [x] Method signature: `showSavingHUD(urlString: String = "")`
  - [x] Updated replacement regex to pass `urlString: urlToSift` to `showSavingHUD`

## After UI Redesign
- [ ] Rebuild and test the share extension popup
- [ ] Verify icon loads from bundle
- [ ] Verify light mode shows cream card, dark mode shows dark card
- [ ] Verify Done button dismisses extension
- [ ] Verify domain shows correctly (e.g. "from instagram.com")
- [ ] Verify API call processes the URL in background
