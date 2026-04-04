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
  private var hudCheckmark: UIImageView?
  private var hudIcon: UIImageView?

  private func showSavingHUD() {
    // --- Colors ---
    let cream = UIColor(red: 251/255, green: 248/255, blue: 241/255, alpha: 1)
    let darkBg = UIColor(red: 0.08, green: 0.07, blue: 0.06, alpha: 1)
    let stone = UIColor(red: 139/255, green: 129/255, blue: 120/255, alpha: 1)
    let ink = UIColor { tc in tc.userInterfaceStyle == .dark ? UIColor(white: 0.95, alpha: 1) : UIColor(red: 59/255, green: 50/255, blue: 49/255, alpha: 1) }
    let accent = UIColor(red: 207/255, green: 149/255, blue: 123/255, alpha: 1)
    let cardBg = UIColor { tc in tc.userInterfaceStyle == .dark ? darkBg : cream }
    let trackBg = UIColor { tc in tc.userInterfaceStyle == .dark ? UIColor(white: 0.18, alpha: 1) : UIColor(red: 0, green: 0, blue: 0, alpha: 0.05) }

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
    card.transform = CGAffineTransform(scaleX: 0.96, y: 0.96)
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
    icon.layer.shadowOpacity = 0.3
    icon.layer.shadowRadius = 20
    icon.layer.shadowOffset = CGSize(width: 0, height: 4)
    card.addSubview(icon)

    // --- "Saving recipe..." label ---
    let label = UILabel()
    label.text = "Saving recipe..."
    label.font = UIFont.systemFont(ofSize: 17, weight: .bold)
    label.textColor = ink
    label.textAlignment = .center
    label.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(label)

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
    track.layer.cornerRadius = 2.5
    track.clipsToBounds = true
    track.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(track)

    let fill = UIView()
    fill.backgroundColor = accent
    fill.layer.cornerRadius = 2.5
    fill.translatesAutoresizingMaskIntoConstraints = false
    track.addSubview(fill)

    let fillWidth = fill.widthAnchor.constraint(equalToConstant: 0)

    // --- Layout ---
    NSLayoutConstraint.activate([
      card.centerXAnchor.constraint(equalTo: backdrop.centerXAnchor),
      card.centerYAnchor.constraint(equalTo: backdrop.centerYAnchor),
      card.widthAnchor.constraint(equalToConstant: 280),

      // Icon: large, top-center
      icon.centerXAnchor.constraint(equalTo: card.centerXAnchor),
      icon.topAnchor.constraint(equalTo: card.topAnchor, constant: 28),
      icon.widthAnchor.constraint(equalToConstant: 72),
      icon.heightAnchor.constraint(equalToConstant: 72),

      // Label below icon
      label.centerXAnchor.constraint(equalTo: card.centerXAnchor),
      label.topAnchor.constraint(equalTo: icon.bottomAnchor, constant: 16),

      // Checkmark inline with label
      check.trailingAnchor.constraint(equalTo: label.leadingAnchor, constant: -6),
      check.centerYAnchor.constraint(equalTo: label.centerYAnchor),
      check.widthAnchor.constraint(equalToConstant: 22),
      check.heightAnchor.constraint(equalToConstant: 22),

      // Subtitle
      sub.centerXAnchor.constraint(equalTo: card.centerXAnchor),
      sub.topAnchor.constraint(equalTo: label.bottomAnchor, constant: 4),

      // Progress bar at bottom
      track.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 36),
      track.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -36),
      track.topAnchor.constraint(equalTo: sub.bottomAnchor, constant: 18),
      track.heightAnchor.constraint(equalToConstant: 4),
      track.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -28),

      // Fill
      fill.leadingAnchor.constraint(equalTo: track.leadingAnchor),
      fill.topAnchor.constraint(equalTo: track.topAnchor),
      fill.bottomAnchor.constraint(equalTo: track.bottomAnchor),
      fillWidth,
    ])

    // Store refs
    self.hudBackdrop = backdrop
    self.hudCard = card
    self.hudProgressFill = fill
    self.hudProgressWidth = fillWidth
    self.hudLabel = label
    self.hudSubLabel = sub
    self.hudCheckmark = check
    self.hudIcon = icon

    // --- Entrance Animation (ease in out) ---
    UIView.animate(withDuration: 0.35, delay: 0, options: [.curveEaseInOut]) {
      backdrop.backgroundColor = UIColor.black.withAlphaComponent(0.4)
    }
    UIView.animate(withDuration: 0.4, delay: 0.05, options: [.curveEaseInOut]) {
      card.transform = .identity
      card.alpha = 1
    }

    // --- Progress bar animation (fills to ~75% during saving) ---
    let trackWidth: CGFloat = 280 - 72 // card width minus padding
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
      fillWidth.constant = trackWidth * 0.75
      UIView.animate(withDuration: 2.0, delay: 0, options: [.curveEaseInOut]) {
        track.layoutIfNeeded()
      }
    }
  }

  private func showSuccessHUD(completion: @escaping () -> Void) {
    guard let label = hudLabel, let sub = hudSubLabel, let check = hudCheckmark,
          let fill = hudProgressFill, let fillWidth = hudProgressWidth else {
      completion(); return
    }

    // Haptic
    let gen = UINotificationFeedbackGenerator()
    gen.notificationOccurred(.success)

    // Complete progress bar to 100%
    let trackWidth: CGFloat = 280 - 72
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

    // Dismiss with fade
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) {
      UIView.animate(withDuration: 0.35, delay: 0, options: [.curveEaseInOut], animations: {
        self.hudBackdrop?.alpha = 0
        self.hudCard?.alpha = 0
      }) { _ in completion() }
    }
  }

  private func siftInBackground(_ url: String) {
    let defaults = UserDefaults(suiteName: self.hostAppGroupIdentifier)
    let userId = defaults?.string(forKey: "sift_user_id") ?? ""
    guard !userId.isEmpty else { return }
    guard let apiUrl = URL(string: "https://sift-rho.vercel.app/api/sift") else { return }
    var request = URLRequest(url: apiUrl)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.timeoutInterval = 60
    let body: [String: Any] = ["url": url, "user_id": userId, "platform": "share_extension"]
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)
    URLSession.shared.dataTask(with: request) { _, _, _ in }.resume()
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
    `// Native branded popup — never open the app
            let urlToSift = self.sharedWebUrl.last?.url ?? ""
            self.showSavingHUD()
            self.siftInBackground(urlToSift)
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
              self.showSuccessHUD {
                self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
              }
            }`
);

fs.writeFileSync(SHARE_EXT_PATH, content, 'utf-8');

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
