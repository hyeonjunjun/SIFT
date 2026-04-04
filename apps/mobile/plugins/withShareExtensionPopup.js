const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withShareExtensionPopup = (config) => {
    return withDangerousMod(config, [
        'ios',
        (config) => {
            const projectRoot = config.modRequest.projectRoot;
            const shareExtPath = path.join(projectRoot, 'ios', 'ShareExtension', 'ShareViewController.swift');

            // Only modify if the file exists (after prebuild)
            if (!fs.existsSync(shareExtPath)) {
                console.warn('[withShareExtensionPopup] ShareViewController.swift not found, skipping...');
                return config;
            }

            let content = fs.readFileSync(shareExtPath, 'utf-8');

            // Replace the redirectToHostApp calls in handleUrl with native popup
            // Find the handleUrl method's redirect block
            const handleUrlRedirect = `self.redirectToHostApp(type: .weburl)
          }

        }
      } else {
        NSLog("[ERROR] Cannot load url content`;

            const handleUrlPopup = `// Show native confirmation popup instead of opening the app
            self.showSavingHUD()

            // Store URL for processing when main app opens
            let pendingUrls = userDefaults?.stringArray(forKey: "pendingSiftUrls") ?? []
            userDefaults?.set(pendingUrls + [item.absoluteString], forKey: "pendingSiftUrls")
            userDefaults?.synchronize()

            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
              self.showSuccessHUD {
                self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
              }
            }
          }

        }
      } else {
        NSLog("[ERROR] Cannot load url content`;

            // Inject the HUD methods before viewDidLoad
            const hudCode = `
  // MARK: - Native Share Extension Popup
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

`;

            // Inject HUD methods before viewDidLoad
            if (!content.includes('showSavingHUD')) {
                content = content.replace(
                    'override func viewDidLoad()',
                    hudCode + '  override func viewDidLoad()'
                );
            }

            // Make view background clear for the popup overlay
            if (content.includes('super.viewDidLoad()') && !content.includes('view.backgroundColor = .clear')) {
                content = content.replace(
                    'super.viewDidLoad()\n  }',
                    'super.viewDidLoad()\n    view.backgroundColor = .clear\n  }'
                );
            }

            // Replace redirect in handleUrl with popup
            // The handleUrl saves to userDefaults then calls redirectToHostApp
            // We need to replace that redirect with our popup
            content = content.replace(
                /self\.redirectToHostApp\(type: \.weburl\)/g,
                `// Show native popup instead of opening the app
            self.showSavingHUD()
            let pendingUrls = userDefaults?.stringArray(forKey: "pendingSiftUrls") ?? []
            userDefaults?.set(pendingUrls + [self.sharedWebUrl.last?.url ?? ""], forKey: "pendingSiftUrls")
            userDefaults?.synchronize()
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
              self.showSuccessHUD {
                self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
              }
            }`
            );

            fs.writeFileSync(shareExtPath, content, 'utf-8');
            console.log('[withShareExtensionPopup] Successfully patched ShareViewController.swift');

            return config;
        },
    ]);
};

module.exports = withShareExtensionPopup;
