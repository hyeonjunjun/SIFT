#!/usr/bin/env node
/**
 * Post-prebuild script that patches ShareViewController.swift
 * to show a branded native popup instead of opening the main app.
 */
const fs = require('fs');
const path = require('path');

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
  // MARK: - Branded Native Share Popup
  private var hudBackdrop: UIView?
  private var hudCard: UIView?
  private var hudProgressFill: UIView?
  private var hudProgressWidth: NSLayoutConstraint?
  private var hudLabel: UILabel?
  private var hudSubLabel: UILabel?
  private var hudDomainLabel: UILabel?
  private var hudCheckmark: UIImageView?
  private var hudIcon: UIImageView?
  private var hudDoneButton: UIButton?
  private var hudDismissTimer: DispatchWorkItem?

  private func showSavingHUD(urlString: String = "") {
    // --- Colors (detect SYSTEM appearance, not host app) ---
    let isDark: Bool = {
      if let style = UserDefaults.standard.string(forKey: "AppleInterfaceStyle") {
        return style.lowercased() == "dark"
      }
      return false
    }()
    let cream = UIColor(red: 251/255, green: 248/255, blue: 241/255, alpha: 1)
    let darkBg = UIColor(red: 0.08, green: 0.07, blue: 0.06, alpha: 1)
    let stone = UIColor(red: 139/255, green: 129/255, blue: 120/255, alpha: 1)
    let ink = isDark ? UIColor(white: 0.95, alpha: 1) : UIColor(red: 59/255, green: 50/255, blue: 49/255, alpha: 1)
    let accent = UIColor(red: 207/255, green: 149/255, blue: 123/255, alpha: 1)
    let cardBg = isDark ? darkBg : cream
    let trackBg = isDark ? UIColor(white: 0.18, alpha: 1) : UIColor(red: 0, green: 0, blue: 0, alpha: 0.05)

    // --- Extract domain from URL ---
    var domainText = ""
    if !urlString.isEmpty, let comps = URLComponents(string: urlString), let host = comps.host {
      let domain = host.hasPrefix("www.") ? String(host.dropFirst(4)) : host
      domainText = "from \\(domain)"
    }

    // --- Backdrop ---
    let backdrop = UIView(frame: view.bounds)
    backdrop.backgroundColor = .clear
    backdrop.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    view.addSubview(backdrop)

    // --- Card ---
    let card = UIView()
    card.backgroundColor = cardBg
    card.layer.cornerRadius = 28
    card.layer.shadowColor = UIColor.black.cgColor
    card.layer.shadowOpacity = 0.22
    card.layer.shadowRadius = 50
    card.layer.shadowOffset = CGSize(width: 0, height: 16)
    card.translatesAutoresizingMaskIntoConstraints = false
    card.transform = CGAffineTransform(scaleX: 0.92, y: 0.92)
    card.alpha = 0
    backdrop.addSubview(card)

    // --- Croissant Icon (large, centerpiece) ---
    let icon = UIImageView()
    let extBundle = Bundle(for: type(of: self))
    if let imgPath = extBundle.path(forResource: "sift-icon-transparent", ofType: "png"),
       let img = UIImage(contentsOfFile: imgPath) {
      icon.image = img
    } else if let img = UIImage(named: "sift-icon-transparent") {
      icon.image = img
    }
    icon.contentMode = .scaleAspectFit
    icon.translatesAutoresizingMaskIntoConstraints = false
    // Soft glow behind the icon
    icon.layer.shadowColor = accent.cgColor
    icon.layer.shadowOpacity = 0.4
    icon.layer.shadowRadius = 24
    icon.layer.shadowOffset = CGSize(width: 0, height: 6)
    card.addSubview(icon)

    // --- "Saving recipe..." label ---
    let label = UILabel()
    label.text = "Saving recipe..."
    label.font = UIFont.systemFont(ofSize: 20, weight: .bold)
    label.textColor = ink
    label.textAlignment = .center
    label.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(label)

    // --- Domain subtitle ---
    let domain = UILabel()
    domain.text = domainText
    domain.font = UIFont.systemFont(ofSize: 13, weight: .medium)
    domain.textColor = stone
    domain.textAlignment = .center
    domain.alpha = domainText.isEmpty ? 0 : 1
    domain.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(domain)

    // --- Subtitle ---
    let sub = UILabel()
    sub.text = "It'll be ready in Sift"
    sub.font = UIFont.systemFont(ofSize: 12, weight: .medium)
    sub.textColor = stone
    sub.textAlignment = .center
    sub.alpha = 0
    sub.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(sub)

    // --- Checkmark (hidden) ---
    let check = UIImageView(image: UIImage(systemName: "checkmark.circle.fill")?.withConfiguration(UIImage.SymbolConfiguration(pointSize: 24, weight: .medium)))
    check.tintColor = UIColor(red: 34/255, green: 197/255, blue: 94/255, alpha: 1)
    check.contentMode = .scaleAspectFit
    check.alpha = 0
    check.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(check)

    // --- Progress Bar ---
    let track = UIView()
    track.backgroundColor = trackBg
    track.layer.cornerRadius = 3
    track.clipsToBounds = true
    track.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(track)

    let fill = UIView()
    fill.backgroundColor = accent
    fill.layer.cornerRadius = 3
    fill.translatesAutoresizingMaskIntoConstraints = false
    track.addSubview(fill)

    let fillWidth = fill.widthAnchor.constraint(equalToConstant: 0)

    // --- Done Button (hidden, shown on success) ---
    let doneBtn = UIButton(type: .system)
    doneBtn.setTitle("Done", for: .normal)
    doneBtn.titleLabel?.font = UIFont.systemFont(ofSize: 16, weight: .semibold)
    doneBtn.setTitleColor(cream, for: .normal)
    doneBtn.backgroundColor = ink
    doneBtn.layer.cornerRadius = 22
    doneBtn.translatesAutoresizingMaskIntoConstraints = false
    doneBtn.alpha = 0
    doneBtn.addTarget(self, action: #selector(hudDoneTapped), for: .touchUpInside)
    card.addSubview(doneBtn)

    // --- Layout ---
    NSLayoutConstraint.activate([
      card.centerXAnchor.constraint(equalTo: backdrop.centerXAnchor),
      card.centerYAnchor.constraint(equalTo: backdrop.centerYAnchor),
      card.widthAnchor.constraint(equalToConstant: 320),

      // Icon: large, top-center
      icon.centerXAnchor.constraint(equalTo: card.centerXAnchor),
      icon.topAnchor.constraint(equalTo: card.topAnchor, constant: 32),
      icon.widthAnchor.constraint(equalToConstant: 80),
      icon.heightAnchor.constraint(equalToConstant: 80),

      // Label below icon
      label.centerXAnchor.constraint(equalTo: card.centerXAnchor),
      label.topAnchor.constraint(equalTo: icon.bottomAnchor, constant: 18),

      // Checkmark inline with label
      check.trailingAnchor.constraint(equalTo: label.leadingAnchor, constant: -6),
      check.centerYAnchor.constraint(equalTo: label.centerYAnchor),
      check.widthAnchor.constraint(equalToConstant: 22),
      check.heightAnchor.constraint(equalToConstant: 22),

      // Domain subtitle
      domain.centerXAnchor.constraint(equalTo: card.centerXAnchor),
      domain.topAnchor.constraint(equalTo: label.bottomAnchor, constant: 4),

      // Subtitle
      sub.centerXAnchor.constraint(equalTo: card.centerXAnchor),
      sub.topAnchor.constraint(equalTo: domain.bottomAnchor, constant: 4),

      // Progress bar
      track.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 36),
      track.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -36),
      track.topAnchor.constraint(equalTo: sub.bottomAnchor, constant: 18),
      track.heightAnchor.constraint(equalToConstant: 5),

      // Fill
      fill.leadingAnchor.constraint(equalTo: track.leadingAnchor),
      fill.topAnchor.constraint(equalTo: track.topAnchor),
      fill.bottomAnchor.constraint(equalTo: track.bottomAnchor),
      fillWidth,

      // Done button below progress bar
      doneBtn.centerXAnchor.constraint(equalTo: card.centerXAnchor),
      doneBtn.topAnchor.constraint(equalTo: track.bottomAnchor, constant: 20),
      doneBtn.widthAnchor.constraint(equalToConstant: 160),
      doneBtn.heightAnchor.constraint(equalToConstant: 44),
      doneBtn.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -28),
    ])

    // Store refs
    self.hudBackdrop = backdrop
    self.hudCard = card
    self.hudProgressFill = fill
    self.hudProgressWidth = fillWidth
    self.hudLabel = label
    self.hudSubLabel = sub
    self.hudDomainLabel = domain
    self.hudCheckmark = check
    self.hudIcon = icon
    self.hudDoneButton = doneBtn

    // --- Entrance Animation (scale 0.92 → 1.0) ---
    UIView.animate(withDuration: 0.35, delay: 0, options: [.curveEaseInOut]) {
      backdrop.backgroundColor = UIColor.black.withAlphaComponent(0.4)
    }
    UIView.animate(withDuration: 0.4, delay: 0.05, usingSpringWithDamping: 0.85, initialSpringVelocity: 0, options: [.curveEaseInOut]) {
      card.transform = .identity
      card.alpha = 1
    }

    // --- Progress bar animation (fills to ~75% during saving) ---
    let trackWidth: CGFloat = 320 - 72 // card width minus padding
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
      fillWidth.constant = trackWidth * 0.75
      UIView.animate(withDuration: 2.0, delay: 0, options: [.curveEaseInOut]) {
        track.layoutIfNeeded()
      }
    }
  }

  @objc private func hudDoneTapped() {
    self.hudDismissTimer?.cancel()
    UIView.animate(withDuration: 0.3, delay: 0, options: [.curveEaseInOut], animations: {
      self.hudBackdrop?.alpha = 0
      self.hudCard?.alpha = 0
    }) { _ in
      self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }
  }

  private func showSuccessHUD(completion: @escaping () -> Void) {
    guard let label = hudLabel, let sub = hudSubLabel, let check = hudCheckmark,
          let fill = hudProgressFill, let fillWidth = hudProgressWidth,
          let doneBtn = hudDoneButton else {
      completion(); return
    }

    // Haptic
    let gen = UINotificationFeedbackGenerator()
    gen.notificationOccurred(.success)

    // Complete progress bar to 100%
    let trackWidth: CGFloat = 320 - 72
    fillWidth.constant = trackWidth
    UIView.animate(withDuration: 0.3, delay: 0, options: [.curveEaseInOut]) {
      fill.superview?.layoutIfNeeded()
    }

    // Checkmark fades in
    UIView.animate(withDuration: 0.3, delay: 0.1, options: [.curveEaseInOut]) {
      check.alpha = 1
    }

    // Text updates
    UIView.animate(withDuration: 0.3, delay: 0.1, options: [.curveEaseInOut]) {
      label.text = "Recipe saved!"
      sub.alpha = 1
    }

    // Show Done button
    UIView.animate(withDuration: 0.3, delay: 0.2, options: [.curveEaseInOut]) {
      doneBtn.alpha = 1
    }

    // Auto-dismiss after 3s if Done not tapped
    let dismissTimer = DispatchWorkItem {
      UIView.animate(withDuration: 0.35, delay: 0, options: [.curveEaseInOut], animations: {
        self.hudBackdrop?.alpha = 0
        self.hudCard?.alpha = 0
      }) { _ in completion() }
    }
    self.hudDismissTimer = dismissTimer
    DispatchQueue.main.asyncAfter(deadline: .now() + 3.0, execute: dismissTimer)
  }

  private func siftInBackground(_ url: String, completion: @escaping (Bool) -> Void) {
    let defaults = UserDefaults(suiteName: self.hostAppGroupIdentifier)
    let userId = defaults?.string(forKey: "sift_user_id") ?? ""

    guard !userId.isEmpty else {
      NSLog("[ShareExt] No user_id in app group — URL saved to pendingSiftUrls for app to process")
      completion(false)
      return
    }
    guard let apiUrl = URL(string: "https://sift-rho.vercel.app/api/sift") else {
      completion(false)
      return
    }

    NSLog("[ShareExt] Calling /api/sift for: %@", url)
    var request = URLRequest(url: apiUrl)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.timeoutInterval = 30
    let body: [String: Any] = ["url": url, "user_id": userId, "platform": "share_extension"]
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)
    URLSession.shared.dataTask(with: request) { data, response, error in
      if let error = error {
        NSLog("[ShareExt] API call failed: %@", error.localizedDescription)
        completion(false)
      } else if let httpResp = response as? HTTPURLResponse {
        NSLog("[ShareExt] API response: %d", httpResp.statusCode)
        completion(httpResp.statusCode >= 200 && httpResp.statusCode < 300)
      } else {
        completion(false)
      }
    }.resume()
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
    `// Native branded popup + background processing
            let urlToSift = self.sharedWebUrl.last?.url ?? ""
            self.showSavingHUD(urlString: urlToSift)

            // Save URL as backup for main app to process
            let defaults = UserDefaults(suiteName: self.hostAppGroupIdentifier)
            var pending = defaults?.stringArray(forKey: "pendingSiftUrls") ?? []
            pending.append(urlToSift)
            defaults?.set(pending, forKey: "pendingSiftUrls")
            defaults?.synchronize()

            // API call — wait for completion before showing success
            self.siftInBackground(urlToSift) { _ in
              DispatchQueue.main.async {
                self.showSuccessHUD {
                  self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
                }
              }
            }`
);

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
if (fs.existsSync(iconSrc) && !fs.existsSync(iconDst)) {
    fs.copyFileSync(iconSrc, iconDst);
    console.log('[patch-share-ext] Copied icon to ShareExtension bundle');
}

const remaining = (content.match(/redirectToHostApp.*weburl/g) || []).length;
console.log(`[patch-share-ext] Done! showSavingHUD: ${content.includes('showSavingHUD')}, redirects remaining: ${remaining}`);
