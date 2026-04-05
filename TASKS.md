# Sift Share Extension - Current Tasks

## Context
Redesigning the native iOS share extension popup to be more polished and premium (reference: Lasso-style save popup with large preview, lists, Done button).

## What's Done
- [x] Light/dark mode fix: Replaced dynamic `UIColor { tc in ... }` with `UserDefaults.standard.string(forKey: "AppleInterfaceStyle")` to detect SYSTEM appearance instead of inheriting host app's (Instagram/TikTok dark mode was bleeding through)
- [x] Icon bundle fix (plugin): `plugins/withNativeSharePopup.js` now copies icon to ShareExtension/ and adds it to Xcode Copy Bundle Resources via `withXcodeProject`
- [x] Icon bundle fix (local): Manually added `sift-icon-transparent.png` to `project.pbxproj` (PBXFileReference, PBXBuildFile, ShareExtension group, Resources build phase)
- [x] Color fix applied to both `scripts/patch-share-extension.js` and local `ios/ShareExtension/ShareViewController.swift`

## What's In Progress
- [ ] **Complete UI redesign of share extension popup** — the current popup is too minimal (small card, no icon visible, no Done button). Needs to match premium quality:
  - Larger card (320px wide, currently 280px)
  - 80x80 croissant icon with accent glow (currently 72px, icon not loading)
  - 20pt bold title "Saving recipe..." (currently 17pt)
  - Domain subtitle "from instagram.com" extracted from shared URL (NEW)
  - Thicker progress bar (5px, rounded 3)
  - "It'll be ready in Sift" subtitle
  - **Done button** (pill, ink bg, cream text) — appears on success (NEW)
  - `hudDoneTapped()` method to dismiss immediately (NEW)
  - Auto-dismiss after 3s if Done not tapped
  - Better entrance animation (scale 0.92→1.0)

### Files to Update
1. **`ios/ShareExtension/ShareViewController.swift`** (lines 29-274) — Replace the entire `// MARK: - Branded Native Share Popup` block with redesigned UI. Also update call sites:
   - Line 383: `self.showSavingHUD()` → `self.showSavingHUD(urlString: urlToSift)`
   - Line 436: `self.showSavingHUD()` → `self.showSavingHUD(urlString: urlToSift)`

2. **`scripts/patch-share-extension.js`** (the `nativeMethods` template string) — Mirror the same redesigned UI so future EAS builds get it. Also update the replacement regex to pass `urlString: urlToSift` to `showSavingHUD`.

### New Properties to Add
```swift
private var hudDomainLabel: UILabel?
private var hudDoneButton: UIButton?
```

### New Methods to Add
```swift
@objc private func hudDoneTapped()
```

### Method Signature Changes
```swift
// Old:
private func showSavingHUD()
// New:
private func showSavingHUD(urlString: String = "")
```

## After UI Redesign
- [ ] Rebuild and test the share extension popup
- [ ] Verify icon loads from bundle
- [ ] Verify light mode shows cream card, dark mode shows dark card
- [ ] Verify Done button dismisses extension
- [ ] Verify domain shows correctly (e.g. "from instagram.com")
- [ ] Verify API call processes the URL in background
- [ ] Commit all changes
