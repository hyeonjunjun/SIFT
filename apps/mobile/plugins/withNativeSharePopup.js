/**
 * Expo config plugin that:
 * 1. Creates SiftAppGroup native module (iOS Swift + ObjC bridge) for writing user_id to app group
 * 2. Adds the native module files to the Xcode project
 * 3. Creates Android ShareReceiverActivity + SiftAppGroupModule
 * 4. ShareViewController patching is done by scripts/patch-share-extension.js (eas-build-post-install)
 */
const { withDangerousMod, IOSConfig, withAndroidManifest, withXcodeProject } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// ============================================================
// iOS: Create native module files for app group UserDefaults
// ============================================================
const withIOSNativeModule = (config) => {
    return withDangerousMod(config, [
        'ios',
        (config) => {
            const projectRoot = config.modRequest.projectRoot;
            const projectName = IOSConfig.XcodeUtils.sanitizedName(config.name || 'Sift');
            const mainAppDir = path.join(projectRoot, 'ios', projectName);

            // SiftAppGroup.swift
            fs.writeFileSync(path.join(mainAppDir, 'SiftAppGroup.swift'), `
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

            // ObjC bridge
            fs.writeFileSync(path.join(mainAppDir, 'SiftAppGroupBridge.m'), `
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SiftAppGroup, NSObject)
RCT_EXTERN_METHOD(setUserId:(NSString *)userId)
RCT_EXTERN_METHOD(clearUserId)
@end
`, 'utf-8');

            console.log('[withNativeSharePopup] Created SiftAppGroup native module files');
            return config;
        },
    ]);
};

// Add native module files to Xcode project compile sources
const withIOSXcodeFiles = (config) => {
    return withXcodeProject(config, (config) => {
        const project = config.modResults;
        const projectName = IOSConfig.XcodeUtils.sanitizedName(config.name || 'Sift');

        try {
            // Find the main group name from the project
            const mainGroup = project.getFirstProject().firstProject.mainGroup;
            const groupKey = project.findPBXGroupKey({ name: projectName }) ||
                             project.findPBXGroupKey({ path: projectName });

            if (groupKey) {
                project.addSourceFile(`SiftAppGroup.swift`, { target: project.getFirstTarget().uuid }, groupKey);
                project.addSourceFile(`SiftAppGroupBridge.m`, { target: project.getFirstTarget().uuid }, groupKey);
                console.log('[withNativeSharePopup] Added SiftAppGroup to Xcode compile sources');
            } else {
                // Fallback: add without group
                project.addSourceFile(`${projectName}/SiftAppGroup.swift`, {});
                project.addSourceFile(`${projectName}/SiftAppGroupBridge.m`, {});
                console.log('[withNativeSharePopup] Added SiftAppGroup to Xcode (no group)');
            }
        } catch (e) {
            console.log('[withNativeSharePopup] Xcode source files:', e.message);
        }

        return config;
    });
};

// ============================================================
// Android: ShareReceiverActivity + SiftAppGroupModule
// ============================================================
const withAndroidNativeShare = (config) => {
    return withDangerousMod(config, [
        'android',
        (config) => {
            const projectRoot = config.modRequest.projectRoot;
            const pkg = config.android?.package || 'com.hkjstudio.sift';
            const pkgPath = pkg.replace(/\./g, '/');
            const javaDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', ...pkgPath.split('/'));
            fs.mkdirSync(javaDir, { recursive: true });

            // ShareReceiverActivity.java
            fs.writeFileSync(path.join(javaDir, 'ShareReceiverActivity.java'), `package ${pkg};

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.Window;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class ShareReceiverActivity extends Activity {
    private LinearLayout card;
    private ProgressBar spinner;
    private TextView label;
    private TextView checkIcon;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
        getWindow().setDimAmount(0.35f);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);

        Intent intent = getIntent();
        if (Intent.ACTION_SEND.equals(intent.getAction()) && intent.getType() != null) {
            String text = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (text != null) {
                String url = extractUrl(text);
                if (url != null) { showPopupAndProcess(url); return; }
            }
        }
        finish();
    }

    private String extractUrl(String text) {
        for (String part : text.split("\\\\s+")) {
            if (part.startsWith("http://") || part.startsWith("https://")) return part;
        }
        String t = text.trim();
        if (t.startsWith("http://") || t.startsWith("https://")) return t;
        return null;
    }

    private int dp(int v) { return (int)(v * getResources().getDisplayMetrics().density); }

    private void showPopupAndProcess(String url) {
        SharedPreferences prefs = getSharedPreferences("sift_app_group", MODE_PRIVATE);
        String userId = prefs.getString("sift_user_id", "");

        LinearLayout root = new LinearLayout(this);
        root.setGravity(Gravity.CENTER);
        root.setLayoutParams(new LinearLayout.LayoutParams(-1, -1));
        setContentView(root);

        card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER);
        card.setPadding(dp(40), dp(28), dp(40), dp(28));
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.parseColor("#FBF8F1"));
        bg.setCornerRadius(dp(24));
        card.setBackground(bg);
        card.setElevation(dp(12));
        card.setScaleX(0.95f); card.setScaleY(0.95f); card.setAlpha(0f);
        root.addView(card, new LinearLayout.LayoutParams(dp(260), LinearLayout.LayoutParams.WRAP_CONTENT));

        TextView brand = new TextView(this);
        brand.setText("sift"); brand.setTextSize(11); brand.setTextColor(Color.parseColor("#8B8178"));
        brand.setGravity(Gravity.CENTER); brand.setTypeface(null, android.graphics.Typeface.BOLD);
        brand.setLetterSpacing(0.15f);
        LinearLayout.LayoutParams blp = new LinearLayout.LayoutParams(-2, -2); blp.bottomMargin = dp(16);
        card.addView(brand, blp);

        spinner = new ProgressBar(this);
        LinearLayout.LayoutParams slp = new LinearLayout.LayoutParams(dp(32), dp(32)); slp.bottomMargin = dp(14);
        card.addView(spinner, slp);

        checkIcon = new TextView(this);
        checkIcon.setText("\\u2705"); checkIcon.setTextSize(28); checkIcon.setGravity(Gravity.CENTER);
        checkIcon.setAlpha(0f);
        LinearLayout.LayoutParams clp = new LinearLayout.LayoutParams(-2, -2); clp.bottomMargin = dp(8);
        card.addView(checkIcon, clp);

        label = new TextView(this);
        label.setText("Saving recipe..."); label.setTextSize(16); label.setTextColor(Color.parseColor("#3B3231"));
        label.setGravity(Gravity.CENTER); label.setTypeface(null, android.graphics.Typeface.BOLD);
        card.addView(label);

        card.animate().scaleX(1f).scaleY(1f).alpha(1f).setDuration(350)
            .setInterpolator(new android.view.animation.AccelerateDecelerateInterpolator()).start();

        if (!userId.isEmpty()) siftInBackground(url, userId);

        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            spinner.animate().alpha(0f).setDuration(150).start();
            checkIcon.animate().alpha(1f).setDuration(300)
                .setInterpolator(new android.view.animation.AccelerateDecelerateInterpolator()).start();
            label.setText("Recipe saved!");
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                card.animate().alpha(0f).setDuration(250).start();
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
                conn.setConnectTimeout(60000); conn.setReadTimeout(60000);
                conn.setDoOutput(true);
                String json = "{\\"url\\":\\"" + sharedUrl.replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\"") + "\\","
                    + "\\"user_id\\":\\"" + userId + "\\",\\"platform\\":\\"share_extension\\"}";
                try (OutputStream os = conn.getOutputStream()) { os.write(json.getBytes(StandardCharsets.UTF_8)); }
                conn.getResponseCode();
                conn.disconnect();
            } catch (Exception e) { android.util.Log.e("SiftShare", "Failed: " + e.getMessage()); }
        }).start();
    }
}
`, 'utf-8');

            // SiftAppGroupModule.java
            fs.writeFileSync(path.join(javaDir, 'SiftAppGroupModule.java'), `package ${pkg};
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import android.content.SharedPreferences;
import android.content.Context;

public class SiftAppGroupModule extends ReactContextBaseJavaModule {
    SiftAppGroupModule(ReactApplicationContext context) { super(context); }
    @Override public String getName() { return "SiftAppGroup"; }
    @ReactMethod public void setUserId(String userId) {
        getReactApplicationContext().getSharedPreferences("sift_app_group", Context.MODE_PRIVATE)
            .edit().putString("sift_user_id", userId).apply();
    }
    @ReactMethod public void clearUserId() {
        getReactApplicationContext().getSharedPreferences("sift_app_group", Context.MODE_PRIVATE)
            .edit().remove("sift_user_id").apply();
    }
}
`, 'utf-8');

            // SiftAppGroupPackage.java
            fs.writeFileSync(path.join(javaDir, 'SiftAppGroupPackage.java'), `package ${pkg};
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class SiftAppGroupPackage implements ReactPackage {
    @Override public List<NativeModule> createNativeModules(ReactApplicationContext ctx) {
        List<NativeModule> m = new ArrayList<>(); m.add(new SiftAppGroupModule(ctx)); return m;
    }
    @Override public List<ViewManager> createViewManagers(ReactApplicationContext ctx) {
        return Collections.emptyList();
    }
}
`, 'utf-8');

            console.log('[withNativeSharePopup] Created Android native files');
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
                    content = content.replace(
                        'import com.facebook.react.ReactApplication',
                        `import com.facebook.react.ReactApplication\nimport ${pkg}.SiftAppGroupPackage`
                    );
                    content = content.replace(
                        /override val packages: List<ReactPackage>\s*get\(\) =\s*PackageList\(this\)\.packages\.apply\s*\{/,
                        (match) => match + '\n              add(SiftAppGroupPackage())'
                    );
                    fs.writeFileSync(mainAppPath, content, 'utf-8');
                    console.log('[withNativeSharePopup] Registered SiftAppGroupPackage');
                }
            }
            return config;
        },
    ]);
};

// Register ShareReceiverActivity in AndroidManifest
const withAndroidShareManifest = (config) => {
    return withAndroidManifest(config, (config) => {
        const mainApp = config.modResults.manifest.application?.[0];
        if (!mainApp) return config;
        const activities = mainApp.activity || [];
        if (!activities.some(a => a.$?.['android:name'] === '.ShareReceiverActivity')) {
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
// Combined
// ============================================================
const withNativeSharePopup = (config) => {
    config = withIOSNativeModule(config);
    config = withIOSXcodeFiles(config);
    config = withAndroidNativeShare(config);
    config = withAndroidPackageRegistration(config);
    config = withAndroidShareManifest(config);
    return config;
};

module.exports = withNativeSharePopup;
