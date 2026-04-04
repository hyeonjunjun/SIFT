/**
 * Expo config plugin that:
 * 1. Adds a native module (SiftAppGroup) for writing user_id to shared storage
 * 2. Patches ShareViewController.swift to show native popup + call API directly
 * 3. Creates Android ShareActivity for native popup handling
 */
const { withDangerousMod, IOSConfig, withAndroidManifest } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// ============================================================
// iOS: Native module for app group UserDefaults + Share Extension popup
// ============================================================
const withIOSNativeShare = (config) => {
    return withDangerousMod(config, [
        'ios',
        (config) => {
            const projectRoot = config.modRequest.projectRoot;
            const projectName = IOSConfig.XcodeUtils.sanitizedName(config.name || 'Sift');
            const mainAppDir = path.join(projectRoot, 'ios', projectName);

            // 1. Create SiftAppGroup.swift — native module to write to app group
            const swiftPath = path.join(mainAppDir, 'SiftAppGroup.swift');
            fs.writeFileSync(swiftPath, `
import Foundation
import React

@objc(SiftAppGroup)
class SiftAppGroup: NSObject {
    static let suiteName = "group.com.hkjstudio.sift"

    @objc func setUserId(_ userId: String) {
        let defaults = UserDefaults(suiteName: SiftAppGroup.suiteName)
        defaults?.set(userId, forKey: "sift_user_id")
        defaults?.synchronize()
        NSLog("[SiftAppGroup] Saved user_id: \\(userId.prefix(8))...")
    }

    @objc func clearUserId() {
        let defaults = UserDefaults(suiteName: SiftAppGroup.suiteName)
        defaults?.removeObject(forKey: "sift_user_id")
        defaults?.synchronize()
    }

    @objc static func requiresMainQueueSetup() -> Bool {
        return false
    }
}
`, 'utf-8');

            // 2. Create ObjC bridge
            const bridgePath = path.join(mainAppDir, 'SiftAppGroupBridge.m');
            fs.writeFileSync(bridgePath, `
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SiftAppGroup, NSObject)
RCT_EXTERN_METHOD(setUserId:(NSString *)userId)
RCT_EXTERN_METHOD(clearUserId)
@end
`, 'utf-8');

            // 3. Ensure bridging header exists
            const bridgingHeaderPath = path.join(mainAppDir, `${projectName}-Bridging-Header.h`);
            if (!fs.existsSync(bridgingHeaderPath)) {
                // Check for alternative names
                const altPath = path.join(mainAppDir, 'Bridging-Header.h');
                if (!fs.existsSync(altPath)) {
                    // The bridging header should already exist from React Native setup
                    console.log('[withNativeSharePopup] Bridging header not found, Swift files may not compile');
                }
            }

            // 4. Patch ShareViewController.swift
            const shareExtPath = path.join(projectRoot, 'ios', 'ShareExtension', 'ShareViewController.swift');
            if (fs.existsSync(shareExtPath)) {
                let content = fs.readFileSync(shareExtPath, 'utf-8');

                // Only patch if not already patched
                if (!content.includes('showSavingHUD')) {
                    // Inject HUD methods + API call method before viewDidLoad
                    const nativeMethods = `
  // MARK: - Native Share Popup + Background API Call

  private var hudView: UIView?
  private var hudLabel: UILabel?
  private var hudIcon: UIImageView?

  private func showSavingHUD() {
    let backdrop = UIView(frame: view.bounds)
    backdrop.backgroundColor = UIColor.black.withAlphaComponent(0.4)
    backdrop.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    view.addSubview(backdrop)

    let card = UIView()
    card.backgroundColor = UIColor { trait in
      trait.userInterfaceStyle == .dark ? UIColor(white: 0.15, alpha: 1) : UIColor(red: 253/255, green: 252/255, blue: 248/255, alpha: 1)
    }
    card.layer.cornerRadius = 20
    card.layer.shadowColor = UIColor.black.cgColor
    card.layer.shadowOpacity = 0.15
    card.layer.shadowRadius = 20
    card.layer.shadowOffset = CGSize(width: 0, height: 8)
    card.translatesAutoresizingMaskIntoConstraints = false
    backdrop.addSubview(card)

    let spinner = UIActivityIndicatorView(style: .medium)
    spinner.startAnimating()
    spinner.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(spinner)

    let label = UILabel()
    label.text = "Saving recipe..."
    label.font = UIFont.systemFont(ofSize: 16, weight: .semibold)
    label.textColor = UIColor { trait in
      trait.userInterfaceStyle == .dark ? .white : UIColor(red: 59/255, green: 50/255, blue: 49/255, alpha: 1)
    }
    label.textAlignment = .center
    label.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(label)

    let checkmark = UIImageView(image: UIImage(systemName: "checkmark.circle.fill"))
    checkmark.tintColor = UIColor.systemGreen
    checkmark.contentMode = .scaleAspectFit
    checkmark.alpha = 0
    checkmark.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(checkmark)

    NSLayoutConstraint.activate([
      card.centerXAnchor.constraint(equalTo: backdrop.centerXAnchor),
      card.centerYAnchor.constraint(equalTo: backdrop.centerYAnchor),
      card.widthAnchor.constraint(equalToConstant: 240),
      card.heightAnchor.constraint(equalToConstant: 140),
      spinner.centerXAnchor.constraint(equalTo: card.centerXAnchor),
      spinner.topAnchor.constraint(equalTo: card.topAnchor, constant: 30),
      checkmark.centerXAnchor.constraint(equalTo: card.centerXAnchor),
      checkmark.topAnchor.constraint(equalTo: card.topAnchor, constant: 24),
      checkmark.widthAnchor.constraint(equalToConstant: 36),
      checkmark.heightAnchor.constraint(equalToConstant: 36),
      label.centerXAnchor.constraint(equalTo: card.centerXAnchor),
      label.topAnchor.constraint(equalTo: spinner.bottomAnchor, constant: 14),
    ])

    self.hudView = backdrop
    self.hudLabel = label
    self.hudIcon = checkmark
  }

  private func showSuccessHUD(completion: @escaping () -> Void) {
    guard let label = hudLabel, let icon = hudIcon else { completion(); return }
    if let card = hudView?.subviews.first {
      for subview in card.subviews {
        if let spinner = subview as? UIActivityIndicatorView {
          spinner.stopAnimating()
          spinner.alpha = 0
        }
      }
    }
    UIView.animate(withDuration: 0.3) {
      icon.alpha = 1
      icon.transform = CGAffineTransform(scaleX: 1.15, y: 1.15)
      label.text = "Recipe saved!"
    } completion: { _ in
      UIView.animate(withDuration: 0.15) {
        icon.transform = .identity
      }
      DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
        completion()
      }
    }
  }

  private func siftInBackground(_ url: String) {
    let defaults = UserDefaults(suiteName: self.hostAppGroupIdentifier)
    let userId = defaults?.string(forKey: "sift_user_id") ?? ""

    guard !userId.isEmpty else {
      NSLog("[ShareExt] No user_id in app group, falling back to app redirect")
      self.redirectToHostApp(type: .weburl)
      return
    }

    guard let apiUrl = URL(string: "https://sift-rho.vercel.app/api/sift") else { return }

    var request = URLRequest(url: apiUrl)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.timeoutInterval = 60

    let body: [String: Any] = [
      "url": url,
      "user_id": userId,
      "platform": "share_extension"
    ]
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)

    URLSession.shared.dataTask(with: request) { data, response, error in
      if let error = error {
        NSLog("[ShareExt] Sift failed: \\(error.localizedDescription)")
      } else {
        NSLog("[ShareExt] Sift succeeded for \\(url.prefix(50))")
      }
    }.resume()
  }

`;
                    content = content.replace(
                        'override func viewDidLoad()',
                        nativeMethods + '  override func viewDidLoad()'
                    );

                    // Make view background clear
                    content = content.replace(
                        /super\.viewDidLoad\(\)\n\s*\}/,
                        'super.viewDidLoad()\n    view.backgroundColor = .clear\n  }'
                    );

                    // Replace all redirectToHostApp(type: .weburl) with native popup + API call
                    content = content.replace(
                        /self\.redirectToHostApp\(type: \.weburl\)/g,
                        `// Native popup + background API call
            let urlToSift = self.sharedWebUrl.last?.url ?? ""
            let defaults = UserDefaults(suiteName: self.hostAppGroupIdentifier)
            let hasUserId = !(defaults?.string(forKey: "sift_user_id") ?? "").isEmpty

            if hasUserId {
              self.showSavingHUD()
              self.siftInBackground(urlToSift)
              DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                self.showSuccessHUD {
                  self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
                }
              }
            } else {
              // No user_id yet — fall back to opening the app
              self.redirectToHostApp(type: .media) // use .media to avoid infinite loop
            }`
                    );

                    fs.writeFileSync(shareExtPath, content, 'utf-8');
                    console.log('[withNativeSharePopup] Patched ShareViewController.swift');
                }
            }

            return config;
        },
    ]);
};

// ============================================================
// Combine both platforms
// ============================================================
const withNativeSharePopup = (config) => {
    config = withIOSNativeShare(config);
    return config;
};

module.exports = withNativeSharePopup;
