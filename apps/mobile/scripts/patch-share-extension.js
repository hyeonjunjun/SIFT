#!/usr/bin/env node
/**
 * Post-prebuild script that patches ShareViewController.swift
 * to show a native popup instead of opening the main app.
 *
 * Run after `expo prebuild`: node scripts/patch-share-extension.js
 * Also configured as eas-build pre-install hook.
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
  // MARK: - Native Share Popup
  private var hudBackdrop: UIView?
  private var hudCard: UIView?
  private var hudLabel: UILabel?
  private var hudSubLabel: UILabel?
  private var hudSpinner: UIActivityIndicatorView?
  private var hudCheckmark: UIImageView?

  private func showSavingHUD() {
    let backdrop = UIView(frame: view.bounds)
    backdrop.backgroundColor = .clear
    backdrop.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    view.addSubview(backdrop)

    let card = UIView()
    let cream = UIColor(red: 251/255, green: 248/255, blue: 241/255, alpha: 1)
    let darkBg = UIColor(red: 0.12, green: 0.11, blue: 0.10, alpha: 1)
    card.backgroundColor = UIColor { tc in tc.userInterfaceStyle == .dark ? darkBg : cream }
    card.layer.cornerRadius = 24
    card.layer.shadowColor = UIColor.black.cgColor
    card.layer.shadowOpacity = 0.2
    card.layer.shadowRadius = 30
    card.layer.shadowOffset = CGSize(width: 0, height: 10)
    card.translatesAutoresizingMaskIntoConstraints = false
    card.transform = CGAffineTransform(scaleX: 0.95, y: 0.95)
    card.alpha = 0
    backdrop.addSubview(card)

    let brand = UILabel()
    brand.text = "sift"
    brand.font = UIFont.systemFont(ofSize: 12, weight: .bold)
    brand.textColor = UIColor(red: 139/255, green: 129/255, blue: 120/255, alpha: 1)
    brand.textAlignment = .center
    brand.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(brand)

    let spinner = UIActivityIndicatorView(style: .medium)
    spinner.startAnimating()
    spinner.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(spinner)

    let inkColor = UIColor { tc in tc.userInterfaceStyle == .dark ? .white : UIColor(red: 59/255, green: 50/255, blue: 49/255, alpha: 1) }
    let label = UILabel()
    label.text = "Saving recipe..."
    label.font = UIFont.systemFont(ofSize: 17, weight: .semibold)
    label.textColor = inkColor
    label.textAlignment = .center
    label.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(label)

    let sub = UILabel()
    sub.text = "It'll be ready in Sift"
    sub.font = UIFont.systemFont(ofSize: 13, weight: .regular)
    sub.textColor = UIColor(red: 139/255, green: 129/255, blue: 120/255, alpha: 1)
    sub.textAlignment = .center
    sub.alpha = 0
    sub.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(sub)

    let check = UIImageView(image: UIImage(systemName: "checkmark.circle.fill"))
    check.tintColor = UIColor(red: 34/255, green: 197/255, blue: 94/255, alpha: 1)
    check.contentMode = .scaleAspectFit
    check.alpha = 0
    check.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(check)

    NSLayoutConstraint.activate([
      card.centerXAnchor.constraint(equalTo: backdrop.centerXAnchor),
      card.centerYAnchor.constraint(equalTo: backdrop.centerYAnchor),
      card.widthAnchor.constraint(equalToConstant: 260),
      card.heightAnchor.constraint(equalToConstant: 160),
      brand.centerXAnchor.constraint(equalTo: card.centerXAnchor),
      brand.topAnchor.constraint(equalTo: card.topAnchor, constant: 18),
      spinner.centerXAnchor.constraint(equalTo: card.centerXAnchor),
      spinner.topAnchor.constraint(equalTo: brand.bottomAnchor, constant: 16),
      check.centerXAnchor.constraint(equalTo: card.centerXAnchor),
      check.centerYAnchor.constraint(equalTo: spinner.centerYAnchor),
      check.widthAnchor.constraint(equalToConstant: 32),
      check.heightAnchor.constraint(equalToConstant: 32),
      label.centerXAnchor.constraint(equalTo: card.centerXAnchor),
      label.topAnchor.constraint(equalTo: spinner.bottomAnchor, constant: 12),
      sub.centerXAnchor.constraint(equalTo: card.centerXAnchor),
      sub.topAnchor.constraint(equalTo: label.bottomAnchor, constant: 4),
    ])

    self.hudBackdrop = backdrop
    self.hudCard = card
    self.hudLabel = label
    self.hudSubLabel = sub
    self.hudSpinner = spinner
    self.hudCheckmark = check

    UIView.animate(withDuration: 0.3, delay: 0, options: [.curveEaseInOut]) {
      backdrop.backgroundColor = UIColor.black.withAlphaComponent(0.35)
    }
    UIView.animate(withDuration: 0.35, delay: 0.05, options: [.curveEaseInOut]) {
      card.transform = .identity
      card.alpha = 1
    }
  }

  private func showSuccessHUD(completion: @escaping () -> Void) {
    guard let label = hudLabel, let sub = hudSubLabel, let check = hudCheckmark, let spinner = hudSpinner else {
      completion(); return
    }
    let generator = UINotificationFeedbackGenerator()
    generator.notificationOccurred(.success)
    UIView.animate(withDuration: 0.25, delay: 0, options: [.curveEaseInOut]) { spinner.alpha = 0 }
    UIView.animate(withDuration: 0.35, delay: 0.15, options: [.curveEaseInOut]) { check.alpha = 1 }
    UIView.animate(withDuration: 0.3, delay: 0.15, options: [.curveEaseInOut]) {
      label.text = "Recipe saved!"
      sub.alpha = 1
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
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
    `// Native popup — never open the app
            let urlToSift = self.sharedWebUrl.last?.url ?? ""
            self.showSavingHUD()
            self.siftInBackground(urlToSift)
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
              self.showSuccessHUD {
                self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
              }
            }`
);

fs.writeFileSync(SHARE_EXT_PATH, content, 'utf-8');

const remaining = (content.match(/redirectToHostApp.*weburl/g) || []).length;
console.log(`[patch-share-ext] Done! showSavingHUD: ${content.includes('showSavingHUD')}, redirects remaining: ${remaining}`);
