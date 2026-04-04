/**
 * Expo config plugin that:
 * 1. Adds a native module (SiftAppGroup) for writing user_id to shared storage
 * 2. Patches ShareViewController.swift to show native popup + call API directly
 * 3. Creates Android ShareActivity for native popup handling
 */
const { withDangerousMod, IOSConfig, withAndroidManifest, withXcodeProject } = require('expo/config-plugins');
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

            // Note: ShareViewController patching moved to withXcodeProject hook (runs later)

            return config;
        },
    ]);
};

// Patch ShareViewController.swift AFTER expo-share-intent writes it
const withIOSSharePatch = (config) => {
    return withXcodeProject(config, (config) => {
        const projectRoot = config.modRequest.projectRoot;
        const shareExtPath = path.join(projectRoot, 'ios', 'ShareExtension', 'ShareViewController.swift');
            if (fs.existsSync(shareExtPath)) {
                let content = fs.readFileSync(shareExtPath, 'utf-8');

                // Only patch if not already patched
                if (!content.includes('showSavingHUD')) {
                    // Inject HUD methods + API call method before viewDidLoad
                    const nativeMethods = `
  // MARK: - Native Share Popup + Background API Call

  private var hudBackdrop: UIView?
  private var hudCard: UIView?
  private var hudLabel: UILabel?
  private var hudSubLabel: UILabel?
  private var hudSpinner: UIActivityIndicatorView?
  private var hudCheckmark: UIImageView?

  private func showSavingHUD() {
    // Backdrop with fade-in
    let backdrop = UIView(frame: view.bounds)
    backdrop.backgroundColor = .clear
    backdrop.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    view.addSubview(backdrop)

    // Card with spring entrance
    let card = UIView()
    let cream = UIColor(red: 253/255, green: 252/255, blue: 248/255, alpha: 1)
    let darkBg = UIColor(red: 0.12, green: 0.11, blue: 0.10, alpha: 1)
    card.backgroundColor = UIColor { $0.userInterfaceStyle == .dark ? darkBg : cream }
    card.layer.cornerRadius = 24
    card.layer.shadowColor = UIColor.black.cgColor
    card.layer.shadowOpacity = 0.2
    card.layer.shadowRadius = 30
    card.layer.shadowOffset = CGSize(width: 0, height: 10)
    card.translatesAutoresizingMaskIntoConstraints = false
    card.transform = CGAffineTransform(scaleX: 0.95, y: 0.95)
    card.alpha = 0
    backdrop.addSubview(card)

    // Brand label "sift"
    let brand = UILabel()
    brand.text = "sift"
    brand.font = UIFont.systemFont(ofSize: 12, weight: .bold)
    brand.textColor = UIColor { $0.userInterfaceStyle == .dark ? UIColor(white: 0.5, alpha: 1) : UIColor(red: 139/255, green: 129/255, blue: 120/255, alpha: 1) }
    brand.textAlignment = .center
    brand.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(brand)

    // Spinner
    let spinner = UIActivityIndicatorView(style: .medium)
    spinner.startAnimating()
    spinner.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(spinner)

    // Main label
    let inkColor = UIColor { $0.userInterfaceStyle == .dark ? .white : UIColor(red: 59/255, green: 50/255, blue: 49/255, alpha: 1) }
    let label = UILabel()
    label.text = "Saving recipe..."
    label.font = UIFont.systemFont(ofSize: 17, weight: .semibold)
    label.textColor = inkColor
    label.textAlignment = .center
    label.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(label)

    // Subtitle
    let sub = UILabel()
    sub.text = "It'll be ready in Sift"
    sub.font = UIFont.systemFont(ofSize: 13, weight: .regular)
    sub.textColor = UIColor { $0.userInterfaceStyle == .dark ? UIColor(white: 0.5, alpha: 1) : UIColor(red: 139/255, green: 129/255, blue: 120/255, alpha: 1) }
    sub.textAlignment = .center
    sub.alpha = 0
    sub.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(sub)

    // Checkmark (hidden initially)
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

    // Animate entrance — gentle ease in out
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
      completion()
      return
    }

    // Haptic feedback
    let generator = UINotificationFeedbackGenerator()
    generator.notificationOccurred(.success)

    // Transition: spinner out, checkmark in — gentle ease
    UIView.animate(withDuration: 0.25, delay: 0, options: [.curveEaseInOut]) {
      spinner.alpha = 0
    }
    UIView.animate(withDuration: 0.35, delay: 0.15, options: [.curveEaseInOut]) {
      check.alpha = 1
    }
    UIView.animate(withDuration: 0.3, delay: 0.15, options: [.curveEaseInOut]) {
      label.text = "Recipe saved!"
      sub.alpha = 1
    }

    // Fade out everything after delay
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
      UIView.animate(withDuration: 0.35, delay: 0, options: [.curveEaseInOut], animations: {
        self.hudBackdrop?.alpha = 0
        self.hudCard?.alpha = 0
      }) { _ in
        completion()
      }
    }
  }

  private func siftInBackground(_ url: String) {
    let defaults = UserDefaults(suiteName: self.hostAppGroupIdentifier)
    let userId = defaults?.string(forKey: "sift_user_id") ?? ""

    guard !userId.isEmpty else {
      NSLog("[ShareExt] No user_id in app group, skipping API call")
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

                    // Replace all redirectToHostApp(type: .weburl) with native popup
                    content = content.replace(
                        /self\.redirectToHostApp\(type: \.weburl\)/g,
                        `// Always show native popup — never open the app
            let urlToSift = self.sharedWebUrl.last?.url ?? ""
            self.showSavingHUD()

            // Try background API call if we have user_id
            let defaults = UserDefaults(suiteName: self.hostAppGroupIdentifier)
            let userId = defaults?.string(forKey: "sift_user_id") ?? ""
            if !userId.isEmpty {
              self.siftInBackground(urlToSift)
            }
            // Also save URL for the app to pick up on next open (backup)
            var pending = defaults?.stringArray(forKey: "pendingSiftUrls") ?? []
            pending.append(urlToSift)
            defaults?.set(pending, forKey: "pendingSiftUrls")
            defaults?.synchronize()

            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
              self.showSuccessHUD {
                self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
              }
            }`
                    );

                    fs.writeFileSync(shareExtPath, content, 'utf-8');
                    console.log('[withNativeSharePopup] Patched ShareViewController.swift');
                }
            }

            return config;
    });
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

    private LinearLayout card;
    private ProgressBar spinner;
    private TextView label;
    private TextView subLabel;
    private TextView checkIcon;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Transparent window with dim
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
        getWindow().setDimAmount(0.35f);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);

        Intent intent = getIntent();
        String action = intent.getAction();
        String type = intent.getType();

        if (Intent.ACTION_SEND.equals(action) && type != null) {
            String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (sharedText != null) {
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
        String[] parts = text.split("\\\\s+");
        for (String part : parts) {
            if (part.startsWith("http://") || part.startsWith("https://")) {
                return part;
            }
        }
        if (text.trim().startsWith("http://") || text.trim().startsWith("https://")) {
            return text.trim();
        }
        return null;
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density);
    }

    private void showPopupAndProcess(String url) {
        SharedPreferences prefs = getSharedPreferences("sift_app_group", MODE_PRIVATE);
        String userId = prefs.getString("sift_user_id", "");

        // Root layout (centers the card)
        LinearLayout root = new LinearLayout(this);
        root.setGravity(Gravity.CENTER);
        root.setLayoutParams(new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);

        // Card
        card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER);
        card.setPadding(dp(40), dp(28), dp(40), dp(28));
        android.graphics.drawable.GradientDrawable cardBg = new android.graphics.drawable.GradientDrawable();
        cardBg.setColor(Color.parseColor("#FDFCF8"));
        cardBg.setCornerRadius(dp(24));
        card.setBackground(cardBg);
        card.setElevation(dp(12));
        LinearLayout.LayoutParams cardLp = new LinearLayout.LayoutParams(dp(260), LinearLayout.LayoutParams.WRAP_CONTENT);
        card.setLayoutParams(cardLp);

        // Start scaled down for entrance animation
        card.setScaleX(0.95f);
        card.setScaleY(0.95f);
        card.setAlpha(0f);
        root.addView(card);

        // Brand text "sift"
        TextView brand = new TextView(this);
        brand.setText("sift");
        brand.setTextSize(11);
        brand.setTextColor(Color.parseColor("#8B8178"));
        brand.setGravity(Gravity.CENTER);
        brand.setLetterSpacing(0.15f);
        brand.setTypeface(null, android.graphics.Typeface.BOLD);
        LinearLayout.LayoutParams brandLp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        brandLp.bottomMargin = dp(16);
        brand.setLayoutParams(brandLp);
        card.addView(brand);

        // Spinner
        spinner = new ProgressBar(this);
        LinearLayout.LayoutParams spinnerLp = new LinearLayout.LayoutParams(dp(32), dp(32));
        spinnerLp.bottomMargin = dp(14);
        spinner.setLayoutParams(spinnerLp);
        card.addView(spinner);

        // Checkmark (hidden)
        checkIcon = new TextView(this);
        checkIcon.setText("\\u2705");
        checkIcon.setTextSize(28);
        checkIcon.setGravity(Gravity.CENTER);
        checkIcon.setAlpha(0f);
        checkIcon.setScaleX(1f);
        checkIcon.setScaleY(1f);
        LinearLayout.LayoutParams checkLp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        checkLp.bottomMargin = dp(8);
        checkIcon.setLayoutParams(checkLp);
        card.addView(checkIcon);

        // Label
        label = new TextView(this);
        label.setText("Saving recipe...");
        label.setTextSize(16);
        label.setTextColor(Color.parseColor("#3B3231"));
        label.setGravity(Gravity.CENTER);
        label.setTypeface(null, android.graphics.Typeface.BOLD);
        card.addView(label);

        // Sub label
        subLabel = new TextView(this);
        subLabel.setText("It'll be ready in Sift");
        subLabel.setTextSize(12);
        subLabel.setTextColor(Color.parseColor("#8B8178"));
        subLabel.setGravity(Gravity.CENTER);
        subLabel.setAlpha(0f);
        LinearLayout.LayoutParams subLp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        subLp.topMargin = dp(4);
        subLabel.setLayoutParams(subLp);
        card.addView(subLabel);

        // Animate card entrance (spring-like)
        card.animate().scaleX(1f).scaleY(1f).alpha(1f).setDuration(400)
            .setInterpolator(new android.view.animation.AccelerateDecelerateInterpolator()).start();

        // Process in background
        if (!userId.isEmpty()) {
            siftInBackground(url, userId);
        }

        // Show success after delay
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            // Hide spinner, show checkmark
            spinner.animate().alpha(0f).setDuration(150).start();
            checkIcon.animate().alpha(1f).setDuration(350)
                .setInterpolator(new android.view.animation.AccelerateDecelerateInterpolator()).start();
            label.setText("Recipe saved!");
            subLabel.animate().alpha(1f).setDuration(300).start();

            // Fade out and dismiss
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                card.animate().scaleX(0.9f).scaleY(0.9f).alpha(0f).setDuration(250).start();
                new Handler(Looper.getMainLooper()).postDelayed(() -> finish(), 300);
            }, 1300);
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
    config = withIOSSharePatch(config);
    config = withAndroidNativeShare(config);
    config = withAndroidPackageRegistration(config);
    config = withAndroidShareManifest(config);
    return config;
};

module.exports = withNativeSharePopup;
