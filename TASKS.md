# Sift - Current Tasks

## Completed

### Share Extension — Foundation
- [x] Light/dark mode fix: `UserDefaults.standard.string(forKey: "AppleInterfaceStyle")` to detect system appearance (not host app's)
- [x] Icon bundle fix: plugin copies icon to ShareExtension/, adds to Xcode Copy Bundle Resources
- [x] Color fix applied to `scripts/patch-share-extension.js`

### Share Extension — UI Redesign
- [x] Responsive card width (`min(320, screenWidth - 48)`)
- [x] 80x80 icon with warm accent glow
- [x] 20pt bold title, 13pt domain subtitle with smart subdomain stripping
- [x] Done button — accent bg (dark mode) / ink bg (light mode), 48pt, spring animation
- [x] `hudDoneTapped()` with haptic + scale-down exit
- [x] Auto-dismiss after 3s, coordinated success choreography
- [x] Spring entrance (0.88→1.0), light haptic on appear
- [x] Adaptive shadows, improved contrast, accessibility labels
- [x] `showSavingHUD(urlString:)` with domain extraction and urlString passthrough

### Build Pipeline — Verified
- [x] `eas-build-post-install` hook runs after prebuild + pod install (correct timing)
- [x] All 3 patch regex patterns match expo-share-intent v5.1.1 generated code
- [x] Icon copy, Info.plist patching, "already patched" guard all verified

## Next Up — Post-Build Verification
- [ ] Run development build and install on device
- [ ] Verify share extension popup appears when sharing from Safari/Instagram/TikTok
- [ ] Verify icon loads from bundle (not blank)
- [ ] Verify light mode: cream card, dark ink text, ink Done button
- [ ] Verify dark mode: dark card, light text, accent Done button
- [ ] Verify domain subtitle shows correctly (e.g. "from instagram.com")
- [ ] Verify Done button dismisses extension immediately with haptic
- [ ] Verify auto-dismiss after 3s if Done not tapped
- [ ] Verify API call processes URL in background (check server logs)
- [ ] Verify progress bar animates smoothly (1.2s to 70%, then completes on success)
