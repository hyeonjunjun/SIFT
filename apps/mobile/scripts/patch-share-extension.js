#!/usr/bin/env node
/**
 * Post-prebuild script that patches ShareViewController.swift
 * to show a branded native share page instead of opening the main app.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Generate embedded icon base64 (96x96 croissant)
let ICON_BASE64 = '';
const iconSrcPath = path.join(__dirname, '..', 'assets', 'sift-icon-transparent.png');
if (fs.existsSync(iconSrcPath)) {
    try {
        // Resize to 96x96 and encode as base64
        const tmpIcon = path.join('/tmp', 'sift-icon-share-96.png');
        execSync(`sips -z 96 96 "${iconSrcPath}" --out "${tmpIcon}" 2>/dev/null`);
        ICON_BASE64 = fs.readFileSync(tmpIcon).toString('base64');
        console.log(`[patch-share-ext] Embedded icon base64: ${ICON_BASE64.length} chars`);
    } catch (e) {
        // Fallback: use original (larger but works)
        ICON_BASE64 = fs.readFileSync(iconSrcPath).toString('base64');
        console.log(`[patch-share-ext] Embedded full icon base64: ${ICON_BASE64.length} chars`);
    }
}

const SHARE_EXT_PATH = path.join(__dirname, '..', 'ios', 'ShareExtension', 'ShareViewController.swift');

if (!fs.existsSync(SHARE_EXT_PATH)) {
    console.log('[patch-share-ext] ShareViewController.swift not found, skipping');
    process.exit(0);
}

let content = fs.readFileSync(SHARE_EXT_PATH, 'utf-8');

if (content.includes('showSavingHUD')) {
    console.log('[patch-share-ext] Already patched, skipping');
    process.exit(0);
}

const nativeMethods = `
  // MARK: - Branded Native Share Page
  private var hudIsDark: Bool = false
  private var hudBackdrop: UIView?
  private var hudCard: UIView?
  private var hudProgressFill: UIView?
  private var hudProgressWidth: NSLayoutConstraint?
  private var hudLabel: UILabel?
  private var hudSubLabel: UILabel?
  private var hudCheckmark: UIImageView?
  private var hudIcon: UIImageView?
  private var hudDoneButton: UIButton?
  private var hudUrlCard: UIView?

  private func showSavingHUD(urlString: String = "") {
    let domain: String = {
      guard let url = URL(string: urlString), let host = url.host else { return "" }
      return host.replacingOccurrences(of: "www.", with: "")
    }()
    let urlPath: String = {
      guard let url = URL(string: urlString) else { return "" }
      let p = url.path
      return p.count > 40 ? String(p.prefix(40)) + "..." : p
    }()

    // --- Colors (detect SYSTEM appearance, not host app) ---
    let isDark: Bool = {
      if let style = UserDefaults.standard.string(forKey: "AppleInterfaceStyle") {
        return style.lowercased() == "dark"
      }
      return false
    }()
    let cream = UIColor(red: 251/255, green: 248/255, blue: 241/255, alpha: 1)
    let darkBg = UIColor(red: 0.12, green: 0.11, blue: 0.10, alpha: 1)
    let darkCard = UIColor(red: 0.16, green: 0.15, blue: 0.14, alpha: 1)
    let stone = UIColor(red: 139/255, green: 129/255, blue: 120/255, alpha: 1)
    let ink = isDark ? UIColor(white: 0.95, alpha: 1) : UIColor(red: 59/255, green: 50/255, blue: 49/255, alpha: 1)
    let accent = UIColor(red: 207/255, green: 149/255, blue: 123/255, alpha: 1)
    self.hudIsDark = isDark
    let sheetBg = isDark ? darkBg : cream
    let urlCardBg = isDark ? darkCard : UIColor(red: 0, green: 0, blue: 0, alpha: 0.04)
    let trackBg = isDark ? UIColor(white: 0.22, alpha: 1) : UIColor(red: 0, green: 0, blue: 0, alpha: 0.06)
    let btnBg = ink
    let btnText = isDark ? darkBg : cream

    // --- Backdrop ---
    let backdrop = UIView(frame: view.bounds)
    backdrop.backgroundColor = .clear
    backdrop.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    view.addSubview(backdrop)

    // --- Bottom Sheet ---
    let sheet = UIView()
    sheet.backgroundColor = sheetBg
    sheet.layer.cornerRadius = 24
    sheet.layer.maskedCorners = [.layerMinXMinYCorner, .layerMaxXMinYCorner]
    sheet.layer.shadowColor = UIColor.black.cgColor
    sheet.layer.shadowOpacity = 0.15
    sheet.layer.shadowRadius = 30
    sheet.layer.shadowOffset = CGSize(width: 0, height: -8)
    sheet.translatesAutoresizingMaskIntoConstraints = false
    sheet.clipsToBounds = false
    backdrop.addSubview(sheet)

    let sheetBottom = sheet.bottomAnchor.constraint(equalTo: backdrop.bottomAnchor, constant: 600)
    let screenH = UIScreen.main.bounds.height
    let sheetHeight = screenH * 0.85

    NSLayoutConstraint.activate([
      sheet.leadingAnchor.constraint(equalTo: backdrop.leadingAnchor),
      sheet.trailingAnchor.constraint(equalTo: backdrop.trailingAnchor),
      sheet.heightAnchor.constraint(equalToConstant: sheetHeight),
      sheetBottom,
    ])

    // --- Drag Handle ---
    let handle = UIView()
    handle.backgroundColor = isDark ? UIColor(white: 0.3, alpha: 1) : UIColor(red: 0, green: 0, blue: 0, alpha: 0.12)
    handle.layer.cornerRadius = 2.5
    handle.translatesAutoresizingMaskIntoConstraints = false
    sheet.addSubview(handle)

    // --- Icon Container (soft circle with accent glow) ---
    let iconContainer = UIView()
    iconContainer.translatesAutoresizingMaskIntoConstraints = false
    iconContainer.backgroundColor = isDark ? UIColor(white: 0.18, alpha: 1) : UIColor(red: 0, green: 0, blue: 0, alpha: 0.03)
    iconContainer.layer.cornerRadius = 56
    iconContainer.layer.shadowColor = accent.cgColor
    iconContainer.layer.shadowOpacity = isDark ? 0.3 : 0.15
    iconContainer.layer.shadowRadius = 24
    iconContainer.layer.shadowOffset = CGSize(width: 0, height: 6)
    sheet.addSubview(iconContainer)

    // --- App Icon (croissant — embedded as base64) ---
    let icon = UIImageView()
    let iconB64 = "SIFT_ICON_BASE64_PLACEHOLDER"
    if let data = Data(base64Encoded: iconB64), let img = UIImage(data: data) {
      icon.image = img
    }
    icon.contentMode = .scaleAspectFit
    icon.translatesAutoresizingMaskIntoConstraints = false
    icon.transform = CGAffineTransform(scaleX: 0.8, y: 0.8)
    iconContainer.addSubview(icon)

    // --- Brand Name ---
    let brand = UILabel()
    brand.text = "sift"
    brand.font = UIFont(name: "Georgia-Bold", size: 18) ?? UIFont.systemFont(ofSize: 18, weight: .bold)
    brand.textColor = ink
    brand.textAlignment = .center
    brand.alpha = 0.85
    brand.translatesAutoresizingMaskIntoConstraints = false
    sheet.addSubview(brand)

    // --- URL Preview Card ---
    let urlCard = UIView()
    urlCard.backgroundColor = urlCardBg
    urlCard.layer.cornerRadius = 16
    if !isDark {
      urlCard.layer.borderWidth = 1
      urlCard.layer.borderColor = UIColor(red: 0, green: 0, blue: 0, alpha: 0.06).cgColor
    }
    urlCard.translatesAutoresizingMaskIntoConstraints = false
    sheet.addSubview(urlCard)

    let linkIcon = UIImageView(image: UIImage(systemName: "link")?.withConfiguration(UIImage.SymbolConfiguration(pointSize: 16, weight: .medium)))
    linkIcon.tintColor = accent
    linkIcon.translatesAutoresizingMaskIntoConstraints = false
    urlCard.addSubview(linkIcon)

    let domainLabel = UILabel()
    domainLabel.text = domain.isEmpty ? "Shared link" : domain
    domainLabel.font = UIFont.systemFont(ofSize: 16, weight: .semibold)
    domainLabel.textColor = ink
    domainLabel.translatesAutoresizingMaskIntoConstraints = false
    urlCard.addSubview(domainLabel)

    let pathLabel = UILabel()
    pathLabel.text = urlPath.isEmpty ? urlString.prefix(50).description : urlPath
    pathLabel.font = UIFont.systemFont(ofSize: 13, weight: .regular)
    pathLabel.textColor = stone
    pathLabel.lineBreakMode = .byTruncatingTail
    pathLabel.translatesAutoresizingMaskIntoConstraints = false
    urlCard.addSubview(pathLabel)

    // --- Status Section ---
    let check = UIImageView(image: UIImage(systemName: "checkmark.circle.fill")?.withConfiguration(UIImage.SymbolConfiguration(pointSize: 28, weight: .medium)))
    check.tintColor = UIColor(red: 34/255, green: 197/255, blue: 94/255, alpha: 1)
    check.contentMode = .scaleAspectFit
    check.alpha = 0
    check.translatesAutoresizingMaskIntoConstraints = false
    sheet.addSubview(check)

    let label = UILabel()
    label.text = "Saving recipe..."
    label.font = UIFont(name: "Georgia-Bold", size: 22) ?? UIFont.systemFont(ofSize: 22, weight: .bold)
    label.textColor = ink
    label.textAlignment = .center
    label.translatesAutoresizingMaskIntoConstraints = false
    sheet.addSubview(label)

    // --- Progress Bar ---
    let track = UIView()
    track.backgroundColor = trackBg
    track.layer.cornerRadius = 4
    track.clipsToBounds = true
    track.translatesAutoresizingMaskIntoConstraints = false
    sheet.addSubview(track)

    let fill = UIView()
    fill.backgroundColor = accent
    fill.layer.cornerRadius = 4
    fill.translatesAutoresizingMaskIntoConstraints = false
    track.addSubview(fill)

    let fillWidth = fill.widthAnchor.constraint(equalToConstant: 0)

    // --- Subtitle ---
    let sub = UILabel()
    sub.text = "It'll be ready in Sift"
    sub.font = UIFont.systemFont(ofSize: 14, weight: .medium)
    sub.textColor = stone
    sub.textAlignment = .center
    sub.alpha = 0
    sub.translatesAutoresizingMaskIntoConstraints = false
    sheet.addSubview(sub)

    // --- Done Button ---
    let doneBtn = UIButton(type: .system)
    doneBtn.setTitle("Done", for: .normal)
    doneBtn.titleLabel?.font = UIFont.systemFont(ofSize: 17, weight: .semibold)
    doneBtn.setTitleColor(btnText, for: .normal)
    doneBtn.backgroundColor = btnBg
    doneBtn.layer.cornerRadius = 27
    doneBtn.translatesAutoresizingMaskIntoConstraints = false
    doneBtn.addTarget(self, action: #selector(hudDoneTapped), for: .touchUpInside)
    sheet.addSubview(doneBtn)

    // --- Content wrapper to center everything vertically ---
    let contentStack = UIView()
    contentStack.translatesAutoresizingMaskIntoConstraints = false
    sheet.addSubview(contentStack)

    // Move elements into content stack
    iconContainer.removeFromSuperview(); contentStack.addSubview(iconContainer)
    brand.removeFromSuperview(); contentStack.addSubview(brand)
    urlCard.removeFromSuperview(); contentStack.addSubview(urlCard)
    label.removeFromSuperview(); contentStack.addSubview(label)
    check.removeFromSuperview(); contentStack.addSubview(check)
    track.removeFromSuperview(); contentStack.addSubview(track)
    sub.removeFromSuperview(); contentStack.addSubview(sub)

    // --- Layout ---
    let hPad: CGFloat = 24
    NSLayoutConstraint.activate([
      // Handle stays at top of sheet
      handle.centerXAnchor.constraint(equalTo: sheet.centerXAnchor),
      handle.topAnchor.constraint(equalTo: sheet.topAnchor, constant: 10),
      handle.widthAnchor.constraint(equalToConstant: 40),
      handle.heightAnchor.constraint(equalToConstant: 5),

      // Content stack centered between handle and done button
      contentStack.leadingAnchor.constraint(equalTo: sheet.leadingAnchor),
      contentStack.trailingAnchor.constraint(equalTo: sheet.trailingAnchor),
      contentStack.topAnchor.constraint(greaterThanOrEqualTo: handle.bottomAnchor, constant: 16),
      contentStack.bottomAnchor.constraint(lessThanOrEqualTo: doneBtn.topAnchor, constant: -24),
      contentStack.centerYAnchor.constraint(equalTo: sheet.centerYAnchor, constant: -20),

      // Icon container — circle with icon inside
      iconContainer.centerXAnchor.constraint(equalTo: contentStack.centerXAnchor),
      iconContainer.topAnchor.constraint(equalTo: contentStack.topAnchor),
      iconContainer.widthAnchor.constraint(equalToConstant: 112),
      iconContainer.heightAnchor.constraint(equalToConstant: 112),

      // Icon inside container
      icon.centerXAnchor.constraint(equalTo: iconContainer.centerXAnchor),
      icon.centerYAnchor.constraint(equalTo: iconContainer.centerYAnchor),
      icon.widthAnchor.constraint(equalToConstant: 72),
      icon.heightAnchor.constraint(equalToConstant: 72),

      // Brand name below icon
      brand.centerXAnchor.constraint(equalTo: contentStack.centerXAnchor),
      brand.topAnchor.constraint(equalTo: iconContainer.bottomAnchor, constant: 12),

      // URL card
      urlCard.leadingAnchor.constraint(equalTo: contentStack.leadingAnchor, constant: hPad),
      urlCard.trailingAnchor.constraint(equalTo: contentStack.trailingAnchor, constant: -hPad),
      urlCard.topAnchor.constraint(equalTo: brand.bottomAnchor, constant: 24),

      linkIcon.leadingAnchor.constraint(equalTo: urlCard.leadingAnchor, constant: 16),
      linkIcon.topAnchor.constraint(equalTo: urlCard.topAnchor, constant: 16),
      linkIcon.widthAnchor.constraint(equalToConstant: 20),
      linkIcon.heightAnchor.constraint(equalToConstant: 20),

      domainLabel.leadingAnchor.constraint(equalTo: linkIcon.trailingAnchor, constant: 10),
      domainLabel.trailingAnchor.constraint(equalTo: urlCard.trailingAnchor, constant: -16),
      domainLabel.centerYAnchor.constraint(equalTo: linkIcon.centerYAnchor),

      pathLabel.leadingAnchor.constraint(equalTo: domainLabel.leadingAnchor),
      pathLabel.trailingAnchor.constraint(equalTo: urlCard.trailingAnchor, constant: -16),
      pathLabel.topAnchor.constraint(equalTo: domainLabel.bottomAnchor, constant: 4),
      pathLabel.bottomAnchor.constraint(equalTo: urlCard.bottomAnchor, constant: -16),

      // Status label centered
      label.centerXAnchor.constraint(equalTo: contentStack.centerXAnchor),
      label.topAnchor.constraint(equalTo: urlCard.bottomAnchor, constant: 28),

      // Checkmark to the left of label
      check.trailingAnchor.constraint(equalTo: label.leadingAnchor, constant: -8),
      check.centerYAnchor.constraint(equalTo: label.centerYAnchor),
      check.widthAnchor.constraint(equalToConstant: 28),
      check.heightAnchor.constraint(equalToConstant: 28),

      // Progress bar
      track.leadingAnchor.constraint(equalTo: contentStack.leadingAnchor, constant: hPad),
      track.trailingAnchor.constraint(equalTo: contentStack.trailingAnchor, constant: -hPad),
      track.topAnchor.constraint(equalTo: label.bottomAnchor, constant: 20),
      track.heightAnchor.constraint(equalToConstant: 4),

      fill.leadingAnchor.constraint(equalTo: track.leadingAnchor),
      fill.topAnchor.constraint(equalTo: track.topAnchor),
      fill.bottomAnchor.constraint(equalTo: track.bottomAnchor),
      fillWidth,

      // Subtitle
      sub.centerXAnchor.constraint(equalTo: contentStack.centerXAnchor),
      sub.topAnchor.constraint(equalTo: track.bottomAnchor, constant: 14),
      sub.bottomAnchor.constraint(equalTo: contentStack.bottomAnchor),

      // Done button pinned to bottom
      doneBtn.leadingAnchor.constraint(equalTo: sheet.leadingAnchor, constant: hPad),
      doneBtn.trailingAnchor.constraint(equalTo: sheet.trailingAnchor, constant: -hPad),
      doneBtn.heightAnchor.constraint(equalToConstant: 54),
      doneBtn.bottomAnchor.constraint(equalTo: sheet.bottomAnchor, constant: -44),
    ])

    backdrop.layoutIfNeeded()

    // Store refs
    self.hudBackdrop = backdrop
    self.hudCard = sheet
    self.hudProgressFill = fill
    self.hudProgressWidth = fillWidth
    self.hudLabel = label
    self.hudSubLabel = sub
    self.hudCheckmark = check
    self.hudIcon = iconContainer
    self.hudDoneButton = doneBtn
    self.hudUrlCard = urlCard

    // --- Prepare haptic generators ---
    let impactGen = UIImpactFeedbackGenerator(style: .light)
    impactGen.prepare()

    // --- Slide-up Animation ---
    sheetBottom.constant = 0
    UIView.animate(withDuration: 0.5, delay: 0, usingSpringWithDamping: 0.85, initialSpringVelocity: 0.5, options: []) {
      backdrop.backgroundColor = UIColor.black.withAlphaComponent(0.45)
      backdrop.layoutIfNeeded()
    } completion: { _ in
      // Haptic when sheet lands
      impactGen.impactOccurred()
    }

    // --- Icon entrance: spring scale (starts after sheet begins moving) ---
    UIView.animate(withDuration: 0.7, delay: 0.25, usingSpringWithDamping: 0.55, initialSpringVelocity: 0.6, options: []) {
      icon.transform = .identity
    } completion: { _ in
      // Start pulsing glow after icon settles
      let pulseAnim = CABasicAnimation(keyPath: "shadowOpacity")
      pulseAnim.fromValue = isDark ? 0.3 : 0.15
      pulseAnim.toValue = isDark ? 0.55 : 0.32
      pulseAnim.duration = 1.4
      pulseAnim.autoreverses = true
      pulseAnim.repeatCount = .infinity
      pulseAnim.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
      iconContainer.layer.add(pulseAnim, forKey: "glowPulse")
    }

    // --- Progress bar animation (starts slightly after sheet) ---
    let trackWidth: CGFloat = UIScreen.main.bounds.width - (hPad * 2)
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
      fillWidth.constant = trackWidth * 0.7
      UIView.animate(withDuration: 2.0, delay: 0, options: [.curveEaseOut]) {
        track.layoutIfNeeded()
      }
    }
  }

  private func showSuccessHUD(completion: @escaping () -> Void) {
    guard let label = hudLabel, let sub = hudSubLabel, let check = hudCheckmark,
          let fill = hudProgressFill, let fillWidth = hudProgressWidth else {
      completion(); return
    }

    // Stop the pulsing glow smoothly
    let fadeGlow = CABasicAnimation(keyPath: "shadowOpacity")
    fadeGlow.fromValue = self.hudIcon?.layer.presentation()?.shadowOpacity ?? 0.3
    fadeGlow.toValue = self.hudIsDark ? 0.3 : 0.15
    fadeGlow.duration = 0.4
    fadeGlow.fillMode = .forwards
    fadeGlow.isRemovedOnCompletion = false
    self.hudIcon?.layer.removeAnimation(forKey: "glowPulse")
    self.hudIcon?.layer.add(fadeGlow, forKey: "glowFade")

    // Success haptic
    let gen = UINotificationFeedbackGenerator()
    gen.notificationOccurred(.success)

    // Complete progress bar
    let trackWidth: CGFloat = UIScreen.main.bounds.width - 48
    fillWidth.constant = trackWidth
    UIView.animate(withDuration: 0.5, delay: 0, options: [.curveEaseOut]) {
      fill.superview?.layoutIfNeeded()
    }

    // Crossfade status text
    UIView.transition(with: label, duration: 0.3, options: .transitionCrossDissolve, animations: {
      label.text = "Recipe saved!"
    })

    // Checkmark fades in
    UIView.animate(withDuration: 0.4, delay: 0.15, options: [.curveEaseOut]) {
      check.alpha = 1
    }

    // Subtitle fades in
    UIView.animate(withDuration: 0.4, delay: 0.25, options: [.curveEaseOut]) {
      sub.alpha = 1
    }

    // Auto-dismiss after 2s
    DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
      guard self.hudBackdrop != nil else { return }
      self.dismissSheet(completion: completion)
    }
  }

  private func dismissSheet(completion: @escaping () -> Void) {
    guard let backdrop = self.hudBackdrop else { return }
    self.hudBackdrop = nil
    let card = self.hudCard
    self.hudCard = nil
    // Smooth slide-down with deceleration
    UIView.animate(withDuration: 0.4, delay: 0, usingSpringWithDamping: 1.0, initialSpringVelocity: 0.3, options: [.curveEaseIn], animations: {
      backdrop.backgroundColor = .clear
      card?.transform = CGAffineTransform(translationX: 0, y: UIScreen.main.bounds.height)
    }) { _ in completion() }
  }

  @objc private func hudDoneTapped() {
    guard self.hudBackdrop != nil else { return }
    // Soft tap on dismiss
    let gen = UIImpactFeedbackGenerator(style: .light)
    gen.impactOccurred()
    self.hudBackdrop = nil
    let card = self.hudCard
    self.hudCard = nil
    UIView.animate(withDuration: 0.35, delay: 0, usingSpringWithDamping: 1.0, initialSpringVelocity: 0.3, options: [.curveEaseIn], animations: {
      card?.superview?.backgroundColor = .clear
      card?.transform = CGAffineTransform(translationX: 0, y: UIScreen.main.bounds.height)
    }) { _ in
      self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }
  }

`;

// Inject methods before viewDidLoad
content = content.replace('override func viewDidLoad()', nativeMethods + '  override func viewDidLoad()');

// Make view background clear
content = content.replace(
    /super\.viewDidLoad\(\)\n\s*\}/,
    'super.viewDidLoad()\n    view.backgroundColor = .clear\n  }'
);

// Replace ALL redirectToHostApp(type: .weburl) with native popup
content = content.replace(
    /self\.redirectToHostApp\(type: \.weburl\)/g,
    `// Native branded popup — save URL for main app to process
            let urlToSift = self.sharedWebUrl.last?.url ?? ""
            self.showSavingHUD(urlString: urlToSift)

            // Save URL to shared container for main app to sift on next open
            let defaults = UserDefaults(suiteName: self.hostAppGroupIdentifier)
            var pending = defaults?.stringArray(forKey: "pendingSiftUrls") ?? []
            pending.append(urlToSift)
            defaults?.set(pending, forKey: "pendingSiftUrls")
            defaults?.synchronize()
            NSLog("[ShareExt] Saved URL to pendingSiftUrls: %@", urlToSift)

            // Show success after brief delay, then auto-dismiss
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
              self.showSuccessHUD {
                self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
              }
            }`
);

// Inject the embedded icon base64 into the Swift code
if (ICON_BASE64) {
    content = content.replace('SIFT_ICON_BASE64_PLACEHOLDER', ICON_BASE64);
}

fs.writeFileSync(SHARE_EXT_PATH, content, 'utf-8');

// Ensure ShareExtension Info.plist supports automatic dark/light mode
const plistPath = path.join(__dirname, '..', 'ios', 'ShareExtension', 'ShareExtension-Info.plist');
if (fs.existsSync(plistPath)) {
    let plist = fs.readFileSync(plistPath, 'utf-8');
    if (!plist.includes('UIUserInterfaceStyle')) {
        plist = plist.replace('</dict>\n</plist>', '    <key>UIUserInterfaceStyle</key>\n    <string>Automatic</string>\n  </dict>\n</plist>');
        fs.writeFileSync(plistPath, plist, 'utf-8');
        console.log('[patch-share-ext] Added UIUserInterfaceStyle=Automatic to Info.plist');
    }
}

// Copy icon to share extension bundle
const iconSrc = path.join(__dirname, '..', 'assets', 'sift-icon-transparent.png');
const shareExtDir = path.join(__dirname, '..', 'ios', 'ShareExtension');
const iconDst = path.join(shareExtDir, 'sift-icon-transparent.png');
if (fs.existsSync(iconSrc)) {
    fs.copyFileSync(iconSrc, iconDst);
    console.log('[patch-share-ext] Copied icon to ShareExtension/');
}

// Also copy icon to shared app group container so extension can load it
// This is the most reliable method since bundle resources can be flaky
const groupContainerPath = path.join(
    require('os').homedir(),
    'Library/Group Containers/group.com.hkjstudio.sift'
);
if (fs.existsSync(iconSrc) && fs.existsSync(groupContainerPath)) {
    const groupIconDst = path.join(groupContainerPath, 'sift-icon-transparent.png');
    fs.copyFileSync(iconSrc, groupIconDst);
    console.log('[patch-share-ext] Copied icon to app group container');
}

// Patch pbxproj to add icon to ShareExtension's Copy Bundle Resources
const pbxprojPath = path.join(__dirname, '..', 'ios', 'Sift.xcodeproj', 'project.pbxproj');
if (fs.existsSync(pbxprojPath)) {
    let pbx = fs.readFileSync(pbxprojPath, 'utf-8');
    if (!pbx.includes('sift-icon-transparent.png')) {
        const fileRefUuid = 'SIFTICON0001FILEREF00001';
        const buildFileUuid = 'SIFTICON0001BUILDFILE001';

        // Add PBXFileReference
        pbx = pbx.replace(
            '/* End PBXFileReference section */',
            `\t\t${fileRefUuid} /* sift-icon-transparent.png */ = {isa = PBXFileReference; lastKnownFileType = image.png; name = "sift-icon-transparent.png"; path = "sift-icon-transparent.png"; sourceTree = "<group>"; };\n/* End PBXFileReference section */`
        );

        // Add PBXBuildFile
        pbx = pbx.replace(
            '/* End PBXBuildFile section */',
            `\t\t${buildFileUuid} /* sift-icon-transparent.png in Resources */ = {isa = PBXBuildFile; fileRef = ${fileRefUuid} /* sift-icon-transparent.png */; };\n/* End PBXBuildFile section */`
        );

        // Add to ShareExtension group children
        pbx = pbx.replace(
            /(BB00CDC669774DA28A466792 \/\* ShareExtension \*\/ = \{\s*isa = PBXGroup;\s*children = \()/,
            `$1\n\t\t\t\t${fileRefUuid} /* sift-icon-transparent.png */,`
        );

        // Add to ShareExtension Resources build phase
        pbx = pbx.replace(
            /(98029176711A44D5A2D65C00 \/\* Resources \*\/ = \{\s*isa = PBXResourcesBuildPhase;\s*buildActionMask = \d+;\s*files = \()/,
            `$1\n\t\t\t\t${buildFileUuid} /* sift-icon-transparent.png in Resources */,`
        );

        fs.writeFileSync(pbxprojPath, pbx, 'utf-8');
        console.log('[patch-share-ext] Added icon to ShareExtension pbxproj resources');
    }
}

const remaining = (content.match(/redirectToHostApp.*weburl/g) || []).length;
console.log(`[patch-share-ext] Done! showSavingHUD: ${content.includes('showSavingHUD')}, redirects remaining: ${remaining}`);
