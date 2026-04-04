#!/usr/bin/env node
/**
 * Post-prebuild script that patches ShareViewController.swift
 * to show a branded native popup instead of opening the main app.
 *
 * Run after `expo prebuild`: node scripts/patch-share-extension.js
 * Also configured as eas-build-post-install hook.
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
  private var hudLabel: UILabel?
  private var hudSubLabel: UILabel?
  private var hudSpinner: UIActivityIndicatorView?
  private var hudCheckmark: UIImageView?
  private var hudIcon: UIImageView?

  private func showSavingHUD() {
    // Backdrop
    let backdrop = UIView(frame: view.bounds)
    backdrop.backgroundColor = .clear
    backdrop.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    view.addSubview(backdrop)

    // Colors
    let cream = UIColor(red: 251/255, green: 248/255, blue: 241/255, alpha: 1)
    let darkBg = UIColor(red: 0.12, green: 0.11, blue: 0.10, alpha: 1)
    let stoneColor = UIColor(red: 139/255, green: 129/255, blue: 120/255, alpha: 1)
    let inkColor = UIColor { tc in tc.userInterfaceStyle == .dark ? .white : UIColor(red: 59/255, green: 50/255, blue: 49/255, alpha: 1) }
    let accentColor = UIColor(red: 207/255, green: 149/255, blue: 123/255, alpha: 1)

    // Card
    let card = UIView()
    card.backgroundColor = UIColor { tc in tc.userInterfaceStyle == .dark ? darkBg : cream }
    card.layer.cornerRadius = 28
    card.layer.shadowColor = UIColor.black.cgColor
    card.layer.shadowOpacity = 0.18
    card.layer.shadowRadius = 40
    card.layer.shadowOffset = CGSize(width: 0, height: 12)
    card.translatesAutoresizingMaskIntoConstraints = false
    card.transform = CGAffineTransform(scaleX: 0.95, y: 0.95)
    card.alpha = 0
    backdrop.addSubview(card)

    // App icon (croissant)
    let icon = UIImageView()
    if let bundle = Bundle.main.url(forResource: "sift-icon", withExtension: "png"),
       let data = try? Data(contentsOf: bundle) {
      icon.image = UIImage(data: data)
    } else {
      // Fallback: try loading from the share extension bundle
      icon.image = UIImage(named: "sift-icon")
    }
    icon.contentMode = .scaleAspectFit
    icon.layer.cornerRadius = 16
    icon.clipsToBounds = true
    icon.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(icon)

    // Spinner (accent colored)
    let spinner = UIActivityIndicatorView(style: .medium)
    spinner.color = accentColor
    spinner.startAnimating()
    spinner.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(spinner)

    // Main label
    let label = UILabel()
    label.text = "Saving recipe..."
    label.font = UIFont.systemFont(ofSize: 16, weight: .semibold)
    label.textColor = inkColor
    label.textAlignment = .center
    label.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(label)

    // Subtitle
    let sub = UILabel()
    sub.text = "It'll be ready in Sift"
    sub.font = UIFont.systemFont(ofSize: 12, weight: .regular)
    sub.textColor = stoneColor
    sub.textAlignment = .center
    sub.alpha = 0
    sub.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(sub)

    // Checkmark (hidden)
    let check = UIImageView(image: UIImage(systemName: "checkmark.circle.fill"))
    check.tintColor = UIColor(red: 34/255, green: 197/255, blue: 94/255, alpha: 1)
    check.contentMode = .scaleAspectFit
    check.alpha = 0
    check.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(check)

    // Progress bar track
    let progressTrack = UIView()
    progressTrack.backgroundColor = UIColor { tc in tc.userInterfaceStyle == .dark ? UIColor(white: 0.2, alpha: 1) : UIColor(white: 0, alpha: 0.06) }
    progressTrack.layer.cornerRadius = 2
    progressTrack.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(progressTrack)

    let progressFill = UIView()
    progressFill.backgroundColor = accentColor
    progressFill.layer.cornerRadius = 2
    progressFill.translatesAutoresizingMaskIntoConstraints = false
    progressTrack.addSubview(progressFill)

    let fillWidth = progressFill.widthAnchor.constraint(equalToConstant: 0)
    fillWidth.isActive = true

    NSLayoutConstraint.activate([
      card.centerXAnchor.constraint(equalTo: backdrop.centerXAnchor),
      card.centerYAnchor.constraint(equalTo: backdrop.centerYAnchor),
      card.widthAnchor.constraint(equalToConstant: 280),

      icon.centerXAnchor.constraint(equalTo: card.centerXAnchor),
      icon.topAnchor.constraint(equalTo: card.topAnchor, constant: 24),
      icon.widthAnchor.constraint(equalToConstant: 56),
      icon.heightAnchor.constraint(equalToConstant: 56),

      label.centerXAnchor.constraint(equalTo: card.centerXAnchor),
      label.topAnchor.constraint(equalTo: icon.bottomAnchor, constant: 14),

      spinner.trailingAnchor.constraint(equalTo: label.leadingAnchor, constant: -8),
      spinner.centerYAnchor.constraint(equalTo: label.centerYAnchor),

      check.centerXAnchor.constraint(equalTo: spinner.centerXAnchor),
      check.centerYAnchor.constraint(equalTo: spinner.centerYAnchor),
      check.widthAnchor.constraint(equalToConstant: 20),
      check.heightAnchor.constraint(equalToConstant: 20),

      sub.centerXAnchor.constraint(equalTo: card.centerXAnchor),
      sub.topAnchor.constraint(equalTo: label.bottomAnchor, constant: 4),

      progressTrack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 32),
      progressTrack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -32),
      progressTrack.topAnchor.constraint(equalTo: sub.bottomAnchor, constant: 16),
      progressTrack.heightAnchor.constraint(equalToConstant: 3),
      progressTrack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -24),

      progressFill.leadingAnchor.constraint(equalTo: progressTrack.leadingAnchor),
      progressFill.topAnchor.constraint(equalTo: progressTrack.topAnchor),
      progressFill.bottomAnchor.constraint(equalTo: progressTrack.bottomAnchor),
    ])

    self.hudBackdrop = backdrop
    self.hudCard = card
    self.hudLabel = label
    self.hudSubLabel = sub
    self.hudSpinner = spinner
    self.hudCheckmark = check
    self.hudIcon = icon

    // Animate entrance
    UIView.animate(withDuration: 0.3, delay: 0, options: [.curveEaseInOut]) {
      backdrop.backgroundColor = UIColor.black.withAlphaComponent(0.35)
    }
    UIView.animate(withDuration: 0.35, delay: 0.05, options: [.curveEaseInOut]) {
      card.transform = .identity
      card.alpha = 1
    }
    // Animate progress bar
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
      fillWidth.constant = 216 * 0.7 // 70% of track width
      UIView.animate(withDuration: 1.8, delay: 0, options: [.curveEaseInOut]) {
        progressTrack.layoutIfNeeded()
      }
    }
  }

  private func showSuccessHUD(completion: @escaping () -> Void) {
    guard let label = hudLabel, let sub = hudSubLabel, let check = hudCheckmark, let spinner = hudSpinner else {
      completion(); return
    }

    // Haptic
    let generator = UINotificationFeedbackGenerator()
    generator.notificationOccurred(.success)

    // Complete progress bar
    if let track = label.superview?.subviews.compactMap({ $0.subviews.first }).first {
      if let fillConstraint = track.constraints.first(where: { $0.firstAttribute == .width }) {
        fillConstraint.constant = 216
        UIView.animate(withDuration: 0.3, delay: 0, options: [.curveEaseInOut]) {
          track.superview?.layoutIfNeeded()
        }
      }
    }

    // Spinner out, checkmark in
    UIView.animate(withDuration: 0.2, delay: 0, options: [.curveEaseInOut]) {
      spinner.alpha = 0
    }
    UIView.animate(withDuration: 0.3, delay: 0.1, options: [.curveEaseInOut]) {
      check.alpha = 1
    }
    UIView.animate(withDuration: 0.3, delay: 0.1, options: [.curveEaseInOut]) {
      label.text = "Recipe saved!"
      sub.alpha = 1
    }

    // Fade out
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
      UIView.animate(withDuration: 0.3, delay: 0, options: [.curveEaseInOut], animations: {
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

const remaining = (content.match(/redirectToHostApp.*weburl/g) || []).length;
console.log(`[patch-share-ext] Done! showSavingHUD: ${content.includes('showSavingHUD')}, redirects remaining: ${remaining}`);
