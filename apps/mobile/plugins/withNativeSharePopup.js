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
// Android: Native ShareReceiverActivity with popup + background API call
// ============================================================
const withAndroidNativeShare = (config) => {
    return withDangerousMod(config, [
        'android',
        (config) => {
            const projectRoot = config.modRequest.projectRoot;
            const pkg = config.android?.package || 'com.hkjstudio.sift';
            const pkgPath = pkg.replace(/\./g, '/');
            const javaDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', ...pkgPath.split('/'));

            // Create ShareReceiverActivity.java
            const activityCode = `package ${pkg};

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.Window;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.ImageView;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class ShareReceiverActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Make activity transparent
        getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL);

        Intent intent = getIntent();
        String action = intent.getAction();
        String type = intent.getType();

        if (Intent.ACTION_SEND.equals(action) && type != null) {
            String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (sharedText != null) {
                // Extract URL from shared text
                String url = extractUrl(sharedText);
                if (url != null) {
                    showPopupAndProcess(url);
                    return;
                }
            }
        }

        finish();
    }

    private String extractUrl(String text) {
        // Find the first URL in the shared text
        String[] parts = text.split("\\\\s+");
        for (String part : parts) {
            if (part.startsWith("http://") || part.startsWith("https://")) {
                return part;
            }
        }
        // If the whole text looks like a URL
        if (text.trim().startsWith("http://") || text.trim().startsWith("https://")) {
            return text.trim();
        }
        return null;
    }

    private void showPopupAndProcess(String url) {
        SharedPreferences prefs = getSharedPreferences("sift_app_group", MODE_PRIVATE);
        String userId = prefs.getString("sift_user_id", "");

        // Build popup layout
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER);
        layout.setPadding(80, 60, 80, 60);
        layout.setBackgroundColor(Color.parseColor("#FDFCF8"));

        ProgressBar spinner = new ProgressBar(this);
        layout.addView(spinner);

        TextView label = new TextView(this);
        label.setText("Saving recipe...");
        label.setTextSize(16);
        label.setTextColor(Color.parseColor("#3B3231"));
        label.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        lp.topMargin = 32;
        label.setLayoutParams(lp);
        layout.addView(label);

        AlertDialog.Builder builder = new AlertDialog.Builder(this, android.R.style.Theme_DeviceDefault_Light_Dialog);
        builder.setView(layout);
        builder.setCancelable(false);
        AlertDialog dialog = builder.create();

        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            dialog.getWindow().setDimAmount(0.4f);
        }

        dialog.show();

        // Process in background
        if (!userId.isEmpty()) {
            siftInBackground(url, userId);
        }

        // Show success after delay
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            spinner.setVisibility(android.view.View.GONE);
            label.setText("\\u2705 Recipe saved!");
            label.setTextSize(18);

            // Dismiss after showing success
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                dialog.dismiss();
                finish();
            }, 1200);
        }, 1000);
    }

    private void siftInBackground(String sharedUrl, String userId) {
        new Thread(() -> {
            try {
                URL apiUrl = new URL("https://sift-rho.vercel.app/api/sift");
                HttpURLConnection conn = (HttpURLConnection) apiUrl.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setConnectTimeout(60000);
                conn.setReadTimeout(60000);
                conn.setDoOutput(true);

                String json = "{\\"url\\":\\"" + sharedUrl.replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\"") + "\\","
                    + "\\"user_id\\":\\"" + userId + "\\","
                    + "\\"platform\\":\\"share_extension\\"}";

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(json.getBytes(StandardCharsets.UTF_8));
                }

                int code = conn.getResponseCode();
                android.util.Log.d("SiftShare", "API response: " + code);
                conn.disconnect();
            } catch (Exception e) {
                android.util.Log.e("SiftShare", "Sift failed: " + e.getMessage());
            }
        }).start();
    }
}
`;

            // Ensure the directory exists
            fs.mkdirSync(javaDir, { recursive: true });
            fs.writeFileSync(path.join(javaDir, 'ShareReceiverActivity.java'), activityCode, 'utf-8');

            // Create SiftAppGroupModule.java — native module to write user_id to SharedPreferences
            const moduleCode = `package ${pkg};

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import android.content.SharedPreferences;
import android.content.Context;

public class SiftAppGroupModule extends ReactContextBaseJavaModule {
    private static final String PREFS_NAME = "sift_app_group";

    SiftAppGroupModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "SiftAppGroup";
    }

    @ReactMethod
    public void setUserId(String userId) {
        SharedPreferences prefs = getReactApplicationContext()
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString("sift_user_id", userId).apply();
    }

    @ReactMethod
    public void clearUserId() {
        SharedPreferences prefs = getReactApplicationContext()
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().remove("sift_user_id").apply();
    }
}
`;

            // Create SiftAppGroupPackage.java — package to register the module
            const packageCode = `package ${pkg};

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class SiftAppGroupPackage implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new SiftAppGroupModule(reactContext));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
`;

            fs.writeFileSync(path.join(javaDir, 'SiftAppGroupModule.java'), moduleCode, 'utf-8');
            fs.writeFileSync(path.join(javaDir, 'SiftAppGroupPackage.java'), packageCode, 'utf-8');
            console.log('[withNativeSharePopup] Created Android native module + ShareReceiverActivity');

            return config;
        },
    ]);
};

// Register SiftAppGroupPackage in MainApplication
const withAndroidPackageRegistration = (config) => {
    return withDangerousMod(config, [
        'android',
        (config) => {
            const projectRoot = config.modRequest.projectRoot;
            const pkg = config.android?.package || 'com.hkjstudio.sift';
            const pkgPath = pkg.replace(/\./g, '/');
            const mainAppPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', ...pkgPath.split('/'), 'MainApplication.kt');

            if (fs.existsSync(mainAppPath)) {
                let content = fs.readFileSync(mainAppPath, 'utf-8');
                if (!content.includes('SiftAppGroupPackage')) {
                    // Add import
                    content = content.replace(
                        'import com.facebook.react.ReactApplication',
                        `import com.facebook.react.ReactApplication\nimport ${pkg}.SiftAppGroupPackage`
                    );
                    // Add to packages list
                    content = content.replace(
                        /override val packages: List<ReactPackage>\s*get\(\) =\s*PackageList\(this\)\.packages\.apply\s*\{/,
                        (match) => match + '\n              add(SiftAppGroupPackage())'
                    );
                    fs.writeFileSync(mainAppPath, content, 'utf-8');
                    console.log('[withNativeSharePopup] Registered SiftAppGroupPackage in MainApplication');
                }
            } else {
                // Try .java variant
                const javaMainAppPath = mainAppPath.replace('.kt', '.java');
                if (fs.existsSync(javaMainAppPath)) {
                    console.log('[withNativeSharePopup] Found Java MainApplication, manual registration may be needed');
                }
            }

            return config;
        },
    ]);
};

// Register the ShareReceiverActivity in AndroidManifest
const withAndroidShareManifest = (config) => {
    return withAndroidManifest(config, (config) => {
        const mainApp = config.modResults.manifest.application?.[0];
        if (!mainApp) return config;

        // Check if already added
        const activities = mainApp.activity || [];
        const exists = activities.some(a =>
            a.$?.['android:name'] === '.ShareReceiverActivity'
        );

        if (!exists) {
            activities.push({
                $: {
                    'android:name': '.ShareReceiverActivity',
                    'android:theme': '@android:style/Theme.Translucent.NoTitleBar',
                    'android:exported': 'true',
                    'android:excludeFromRecents': 'true',
                    'android:noHistory': 'true',
                },
                'intent-filter': [{
                    action: [{ $: { 'android:name': 'android.intent.action.SEND' } }],
                    category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
                    data: [{ $: { 'android:mimeType': 'text/plain' } }],
                }],
            });
            mainApp.activity = activities;
        }

        return config;
    });
};

// ============================================================
// Combine both platforms
// ============================================================
const withNativeSharePopup = (config) => {
    config = withIOSNativeShare(config);
    config = withAndroidNativeShare(config);
    config = withAndroidPackageRegistration(config);
    config = withAndroidShareManifest(config);
    return config;
};

module.exports = withNativeSharePopup;
