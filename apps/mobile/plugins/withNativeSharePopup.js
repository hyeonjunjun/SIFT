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

    @objc func getPendingUrls(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let defaults = UserDefaults(suiteName: SiftAppGroup.suiteName)
        let urls = defaults?.stringArray(forKey: "pendingSiftUrls") ?? []
        resolve(urls)
    }

    @objc func clearPendingUrls() {
        let defaults = UserDefaults(suiteName: SiftAppGroup.suiteName)
        defaults?.removeObject(forKey: "pendingSiftUrls")
        defaults?.synchronize()
    }

    @objc func syncIcon() {
        guard let groupURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: SiftAppGroup.suiteName) else { return }
        let dst = groupURL.appendingPathComponent("sift-icon-transparent.png")
        // Always re-copy to ensure latest icon is in shared container
        if let src = Bundle.main.path(forResource: "sift-icon-transparent", ofType: "png") {
            try? FileManager.default.removeItem(atPath: dst.path)
            try? FileManager.default.copyItem(atPath: src, toPath: dst.path)
            NSLog("[SiftAppGroup] Synced icon to shared container")
        } else {
            NSLog("[SiftAppGroup] Icon not found in main bundle")
        }
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
RCT_EXTERN_METHOD(getPendingUrls:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(clearPendingUrls)
RCT_EXTERN_METHOD(syncIcon)
@end
`, 'utf-8');

            // Copy icon to ShareExtension directory for bundle inclusion
            const shareExtDir = path.join(projectRoot, 'ios', 'ShareExtension');
            const iconSrc = path.join(projectRoot, 'assets', 'sift-icon-transparent.png');
            const iconDst = path.join(shareExtDir, 'sift-icon-transparent.png');
            if (fs.existsSync(iconSrc)) {
                fs.mkdirSync(shareExtDir, { recursive: true });
                fs.copyFileSync(iconSrc, iconDst);
                console.log('[withNativeSharePopup] Copied icon to ShareExtension/');
            }

            // Also copy icon to main app directory so syncIcon() can find it
            const mainIconDst = path.join(mainAppDir, 'sift-icon-transparent.png');
            if (fs.existsSync(iconSrc) && !fs.existsSync(mainIconDst)) {
                fs.copyFileSync(iconSrc, mainIconDst);
                console.log('[withNativeSharePopup] Copied icon to main app dir');
            }

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
                project.addSourceFile(`${projectName}/SiftAppGroup.swift`, { target: project.getFirstTarget().uuid }, groupKey);
                project.addSourceFile(`${projectName}/SiftAppGroupBridge.m`, { target: project.getFirstTarget().uuid }, groupKey);
                // Add icon as resource to main app so syncIcon() can copy it to shared container
                project.addResourceFile(`${projectName}/sift-icon-transparent.png`, { target: project.getFirstTarget().uuid }, groupKey);
                console.log('[withNativeSharePopup] Added SiftAppGroup + icon to Xcode');
            } else {
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

// Add icon to ShareExtension target's Copy Bundle Resources
const withShareExtensionIcon = (config) => {
    return withXcodeProject(config, (config) => {
        const project = config.modResults;

        try {
            // Find ShareExtension target UUID
            const nativeTargets = project.pbxNativeTargetSection();
            let shareExtTargetUuid = null;
            for (const key in nativeTargets) {
                if (typeof nativeTargets[key] === 'object' && nativeTargets[key].name === 'ShareExtension') {
                    shareExtTargetUuid = key;
                    break;
                }
            }

            // Find ShareExtension group
            const shareExtGroupKey = project.findPBXGroupKey({ name: 'ShareExtension' }) ||
                                    project.findPBXGroupKey({ path: 'ShareExtension' });

            if (shareExtTargetUuid && shareExtGroupKey) {
                // Check if already added
                const buildFiles = project.pbxBuildFileSection();
                const alreadyAdded = Object.values(buildFiles).some(
                    f => typeof f === 'object' && f.fileRef_comment === 'sift-icon-transparent.png'
                );
                if (!alreadyAdded) {
                    project.addResourceFile('sift-icon-transparent.png',
                        { target: shareExtTargetUuid, lastKnownFileType: 'image.png' },
                        shareExtGroupKey);
                    console.log('[withNativeSharePopup] Added sift-icon-transparent.png to ShareExtension bundle resources');
                } else {
                    console.log('[withNativeSharePopup] sift-icon-transparent.png already in ShareExtension resources');
                }
            } else {
                console.log('[withNativeSharePopup] ShareExtension target/group not found for icon, target:', shareExtTargetUuid, 'group:', shareExtGroupKey);
            }
        } catch (e) {
            console.log('[withNativeSharePopup] ShareExtension icon resource error:', e.message);
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

            // Copy icon to Android drawable resources
            const iconSrc = path.join(projectRoot, 'assets', 'sift-icon-transparent.png');
            const drawableDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'drawable');
            fs.mkdirSync(drawableDir, { recursive: true });
            const iconDst = path.join(drawableDir, 'sift_icon_transparent.png');
            if (fs.existsSync(iconSrc)) {
                fs.copyFileSync(iconSrc, iconDst);
                console.log('[withNativeSharePopup] Copied icon to Android drawable/');
            }

            // ShareReceiverActivity.java — Full bottom sheet matching iOS design
            fs.writeFileSync(path.join(javaDir, 'ShareReceiverActivity.java'), `package ${pkg};

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.ValueAnimator;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.view.animation.DecelerateInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.net.URI;

public class ShareReceiverActivity extends Activity {
    private static final String TAG = "SiftShare";
    private View backdrop;
    private LinearLayout sheet;
    private View progressFill;
    private ValueAnimator progressAnimator;
    private TextView statusLabel;
    private TextView subLabel;
    private View checkIcon;
    private View doneButton;
    private boolean isDark;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean dismissed = false;


    // Theme colors
    private int colCanvas, colCard, colInk, colStone, colAccent, colTrack, colBtnBg, colBtnText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);
        getWindow().setDimAmount(0f);

        isDark = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        initColors();

        Intent intent = getIntent();
        if (Intent.ACTION_SEND.equals(intent.getAction()) && intent.getType() != null) {
            String text = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (text != null) {
                String url = extractUrl(text);
                if (url != null) { showBottomSheet(url); return; }
            }
        }
        finish();
    }

    private void initColors() {
        if (isDark) {
            colCanvas = Color.parseColor("#1F1C1A");
            colCard   = Color.parseColor("#292624");
            colInk    = Color.parseColor("#F2F2F2");
            colStone  = Color.parseColor("#8B8178");
            colAccent = Color.parseColor("#CF957B");
            colTrack  = Color.parseColor("#383838");
            colBtnBg  = colInk;
            colBtnText = colCanvas;
        } else {
            colCanvas = Color.parseColor("#FBF8F1");
            colCard   = Color.argb(10, 0, 0, 0);
            colInk    = Color.parseColor("#3B3231");
            colStone  = Color.parseColor("#8B8178");
            colAccent = Color.parseColor("#CF957B");
            colTrack  = Color.argb(15, 0, 0, 0);
            colBtnBg  = colInk;
            colBtnText = colCanvas;
        }
    }

    private String extractUrl(String text) {
        for (String part : text.split("\\\\s+")) {
            if (part.startsWith("http://") || part.startsWith("https://")) return part;
        }
        String t = text.trim();
        if (t.startsWith("http://") || t.startsWith("https://")) return t;
        return null;
    }

    private String extractDomain(String url) {
        try {
            URI uri = new URI(url);
            String host = uri.getHost();
            if (host == null) return "";
            return host.startsWith("www.") ? host.substring(4) : host;
        } catch (Exception e) { return ""; }
    }

    private String extractPath(String url) {
        try {
            URI uri = new URI(url);
            String p = uri.getPath();
            if (p == null || p.equals("/")) return "";
            return p.length() > 40 ? p.substring(0, 40) + "..." : p;
        } catch (Exception e) { return ""; }
    }

    private int dp(int v) { return (int)(v * getResources().getDisplayMetrics().density); }

    /** Draws a filled circle with a checkmark — matches SF Symbol checkmark.circle.fill */
    private ImageView createCheckCircleIcon(int sizeDp, int circleColor, int checkColor) {
        int size = dp(sizeDp);
        Bitmap bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        float cx = size / 2f, cy = size / 2f, radius = size / 2f;

        // Filled circle
        Paint circlePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        circlePaint.setColor(circleColor);
        circlePaint.setStyle(Paint.Style.FILL);
        c.drawCircle(cx, cy, radius, circlePaint);

        // Checkmark path
        Paint checkPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        checkPaint.setColor(checkColor);
        checkPaint.setStyle(Paint.Style.STROKE);
        checkPaint.setStrokeWidth(size * 0.09f);
        checkPaint.setStrokeCap(Paint.Cap.ROUND);
        checkPaint.setStrokeJoin(Paint.Join.ROUND);
        Path path = new Path();
        path.moveTo(size * 0.28f, size * 0.52f);
        path.lineTo(size * 0.44f, size * 0.67f);
        path.lineTo(size * 0.72f, size * 0.35f);
        c.drawPath(path, checkPaint);

        ImageView iv = new ImageView(this);
        iv.setImageBitmap(bmp);
        iv.setScaleType(ImageView.ScaleType.FIT_CENTER);
        return iv;
    }

    /** Draws a link/chain icon — matches SF Symbol link */
    private ImageView createLinkIcon(int sizeDp, int color) {
        int size = dp(sizeDp);
        Bitmap bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(color);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(size * 0.1f);
        p.setStrokeCap(Paint.Cap.ROUND);

        float pad = size * 0.18f;
        float w = size - pad * 2;
        float h = size - pad * 2;
        float halfW = w / 2f;
        float linkH = h * 0.32f;
        float r = linkH * 0.5f;

        // Top link (rotated 45 degrees) — draw as two rounded rects
        c.save();
        c.rotate(-45, size / 2f, size / 2f);

        // Left capsule
        RectF left = new RectF(pad, size / 2f - linkH / 2f, pad + halfW + r, size / 2f + linkH / 2f);
        c.drawRoundRect(left, r, r, p);

        // Right capsule
        RectF right = new RectF(size - pad - halfW - r, size / 2f - linkH / 2f, size - pad, size / 2f + linkH / 2f);
        c.drawRoundRect(right, r, r, p);

        c.restore();

        ImageView iv = new ImageView(this);
        iv.setImageBitmap(bmp);
        iv.setScaleType(ImageView.ScaleType.FIT_CENTER);
        return iv;
    }

    private void showBottomSheet(String url) {
        SharedPreferences prefs = getSharedPreferences("sift_app_group", MODE_PRIVATE);
        String userId = prefs.getString("sift_user_id", "");
        String domain = extractDomain(url);
        String urlPath = extractPath(url);
        int screenH = getResources().getDisplayMetrics().heightPixels;
        int screenW = getResources().getDisplayMetrics().widthPixels;
        int sheetHeight = (int)(screenH * 0.85);
        int hPad = dp(24);

        // --- Root FrameLayout ---
        FrameLayout root = new FrameLayout(this);
        root.setLayoutParams(new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);

        // --- Backdrop (tap to dismiss when done) ---
        backdrop = new View(this);
        backdrop.setBackgroundColor(Color.TRANSPARENT);
        backdrop.setLayoutParams(new FrameLayout.LayoutParams(-1, -1));
        root.addView(backdrop);

        // --- Bottom Sheet ---
        sheet = new LinearLayout(this);
        sheet.setOrientation(LinearLayout.VERTICAL);
        sheet.setGravity(Gravity.CENTER_HORIZONTAL);
        GradientDrawable sheetBg = new GradientDrawable();
        sheetBg.setColor(colCanvas);
        float r = dp(24);
        sheetBg.setCornerRadii(new float[]{r, r, r, r, 0, 0, 0, 0});
        sheet.setBackground(sheetBg);
        sheet.setElevation(dp(16));
        sheet.setClipToPadding(false);
        FrameLayout.LayoutParams sheetLp = new FrameLayout.LayoutParams(-1, sheetHeight);
        sheetLp.gravity = Gravity.BOTTOM;
        sheet.setLayoutParams(sheetLp);
        sheet.setTranslationY(sheetHeight); // start off-screen
        root.addView(sheet);

        // --- Drag Handle ---
        View handle = new View(this);
        GradientDrawable handleBg = new GradientDrawable();
        handleBg.setColor(isDark ? Color.parseColor("#4D4D4D") : Color.parseColor("#1F000000"));
        handleBg.setCornerRadius(dp(3));
        handle.setBackground(handleBg);
        LinearLayout.LayoutParams handleLp = new LinearLayout.LayoutParams(dp(40), dp(5));
        handleLp.gravity = Gravity.CENTER_HORIZONTAL;
        handleLp.topMargin = dp(10);
        handleLp.bottomMargin = dp(28);
        sheet.addView(handle, handleLp);

        // --- Top spacer to vertically center content ---
        View topSpacer = new View(this);
        sheet.addView(topSpacer, new LinearLayout.LayoutParams(-1, 0, 1f));

        // --- App Icon (96x96 with accent shadow) ---
        int iconResId = getResources().getIdentifier("sift_icon_transparent", "drawable", getPackageName());
        View iconWidget;
        if (iconResId != 0) {
            ImageView iconImg = new ImageView(this);
            iconImg.setImageResource(iconResId);
            iconImg.setScaleType(ImageView.ScaleType.FIT_CENTER);
            iconWidget = iconImg;
        } else {
            // Fallback emoji if drawable not found
            TextView iconFallback = new TextView(this);
            iconFallback.setText("\\uD83E\\uDD50");
            iconFallback.setTextSize(48);
            iconFallback.setGravity(Gravity.CENTER);
            iconWidget = iconFallback;
        }
        LinearLayout.LayoutParams iconLp = new LinearLayout.LayoutParams(dp(96), dp(96));
        iconLp.gravity = Gravity.CENTER_HORIZONTAL;
        iconLp.bottomMargin = dp(8);
        sheet.addView(iconWidget, iconLp);

        // --- Brand Name ---
        TextView brand = new TextView(this);
        brand.setText("sift");
        brand.setTextSize(15);
        brand.setTextColor(colStone);
        brand.setGravity(Gravity.CENTER);
        brand.setTypeface(null, Typeface.BOLD);
        brand.setLetterSpacing(0.08f);
        LinearLayout.LayoutParams brandLp = new LinearLayout.LayoutParams(-2, -2);
        brandLp.gravity = Gravity.CENTER_HORIZONTAL;
        brandLp.bottomMargin = dp(28);
        sheet.addView(brand, brandLp);

        // --- URL Preview Card ---
        LinearLayout urlCard = new LinearLayout(this);
        urlCard.setOrientation(LinearLayout.VERTICAL);
        urlCard.setPadding(dp(16), dp(16), dp(16), dp(16));
        GradientDrawable urlCardBg = new GradientDrawable();
        urlCardBg.setColor(colCard);
        urlCardBg.setCornerRadius(dp(16));
        urlCard.setBackground(urlCardBg);
        LinearLayout.LayoutParams urlCardLp = new LinearLayout.LayoutParams(-1, -2);
        urlCardLp.leftMargin = hPad;
        urlCardLp.rightMargin = hPad;
        urlCardLp.bottomMargin = dp(32);

        // Domain row (link icon + domain text)
        LinearLayout domainRow = new LinearLayout(this);
        domainRow.setOrientation(LinearLayout.HORIZONTAL);
        domainRow.setGravity(Gravity.CENTER_VERTICAL);

        ImageView linkIcon = createLinkIcon(20, colAccent);
        LinearLayout.LayoutParams linkLp = new LinearLayout.LayoutParams(dp(20), dp(20));
        linkLp.rightMargin = dp(10);
        domainRow.addView(linkIcon, linkLp);

        TextView domainLabel = new TextView(this);
        domainLabel.setText(domain.isEmpty() ? "Shared link" : domain);
        domainLabel.setTextSize(16);
        domainLabel.setTextColor(colInk);
        domainLabel.setTypeface(null, Typeface.BOLD);
        domainLabel.setSingleLine(true);
        domainRow.addView(domainLabel, new LinearLayout.LayoutParams(-2, -2));

        urlCard.addView(domainRow, new LinearLayout.LayoutParams(-1, -2));

        // Path label
        if (!urlPath.isEmpty()) {
            TextView pathLabel = new TextView(this);
            pathLabel.setText(urlPath);
            pathLabel.setTextSize(13);
            pathLabel.setTextColor(colStone);
            pathLabel.setSingleLine(true);
            LinearLayout.LayoutParams pathLp = new LinearLayout.LayoutParams(-1, -2);
            pathLp.topMargin = dp(4);
            pathLp.leftMargin = dp(30); // align with domain text (20dp icon + 10dp gap)
            urlCard.addView(pathLabel, pathLp);
        }

        sheet.addView(urlCard, urlCardLp);

        // --- Status Row (checkmark + label) ---
        LinearLayout statusRow = new LinearLayout(this);
        statusRow.setOrientation(LinearLayout.HORIZONTAL);
        statusRow.setGravity(Gravity.CENTER);

        checkIcon = createCheckCircleIcon(28, Color.parseColor("#22C55E"), Color.WHITE);
        checkIcon.setAlpha(0f);
        LinearLayout.LayoutParams checkLp = new LinearLayout.LayoutParams(dp(28), dp(28));
        checkLp.rightMargin = dp(8);
        statusRow.addView(checkIcon, checkLp);

        statusLabel = new TextView(this);
        statusLabel.setText("Saving recipe...");
        statusLabel.setTextSize(22);
        statusLabel.setTextColor(colInk);
        statusLabel.setTypeface(null, Typeface.BOLD);
        statusLabel.setGravity(Gravity.CENTER);
        statusRow.addView(statusLabel, new LinearLayout.LayoutParams(-2, -2));

        LinearLayout.LayoutParams statusRowLp = new LinearLayout.LayoutParams(-2, -2);
        statusRowLp.gravity = Gravity.CENTER_HORIZONTAL;
        statusRowLp.bottomMargin = dp(20);
        sheet.addView(statusRow, statusRowLp);

        // --- Progress Bar ---
        FrameLayout progressTrack = new FrameLayout(this);
        GradientDrawable trackBg = new GradientDrawable();
        trackBg.setColor(colTrack);
        trackBg.setCornerRadius(dp(3));
        progressTrack.setBackground(trackBg);
        LinearLayout.LayoutParams trackLp = new LinearLayout.LayoutParams(-1, dp(6));
        trackLp.leftMargin = hPad;
        trackLp.rightMargin = hPad;
        trackLp.bottomMargin = dp(14);
        sheet.addView(progressTrack, trackLp);

        progressFill = new View(this);
        GradientDrawable fillBg = new GradientDrawable();
        fillBg.setColor(colAccent);
        fillBg.setCornerRadius(dp(3));
        progressFill.setBackground(fillBg);
        FrameLayout.LayoutParams fillLp = new FrameLayout.LayoutParams(0, -1);
        progressTrack.addView(progressFill, fillLp);

        // --- Subtitle ---
        subLabel = new TextView(this);
        subLabel.setText("It'll be ready in Sift");
        subLabel.setTextSize(14);
        subLabel.setTextColor(colStone);
        subLabel.setTypeface(null, Typeface.NORMAL);
        subLabel.setGravity(Gravity.CENTER);
        subLabel.setAlpha(0f);
        LinearLayout.LayoutParams subLp = new LinearLayout.LayoutParams(-2, -2);
        subLp.gravity = Gravity.CENTER_HORIZONTAL;
        sheet.addView(subLabel, subLp);

        // --- Spacer to push Done button to bottom ---
        View spacer = new View(this);
        sheet.addView(spacer, new LinearLayout.LayoutParams(-1, 0, 1f));

        // --- Done Button ---
        TextView doneBtn = new TextView(this);
        doneBtn.setText("Done");
        doneBtn.setTextSize(17);
        doneBtn.setTextColor(colBtnText);
        doneBtn.setTypeface(null, Typeface.BOLD);
        doneBtn.setGravity(Gravity.CENTER);
        GradientDrawable doneBg = new GradientDrawable();
        doneBg.setColor(colBtnBg);
        doneBg.setCornerRadius(dp(27));
        doneBtn.setBackground(doneBg);
        doneBtn.setPadding(0, dp(16), 0, dp(16));
        LinearLayout.LayoutParams doneLp = new LinearLayout.LayoutParams(-1, dp(54));
        doneLp.leftMargin = hPad;
        doneLp.rightMargin = hPad;
        doneLp.bottomMargin = dp(52);
        doneBtn.setOnClickListener(v -> dismissSheet());
        this.doneButton = doneBtn;
        sheet.addView(doneBtn, doneLp);

        // --- Slide-up entrance animation ---
        sheet.animate()
            .translationY(0)
            .setDuration(450)
            .setInterpolator(new DecelerateInterpolator(1.5f))
            .start();

        // Fade in backdrop
        ValueAnimator backdropAnim = ValueAnimator.ofInt(0, 128);
        backdropAnim.setDuration(450);
        backdropAnim.addUpdateListener(a -> {
            int alpha = (int) a.getAnimatedValue();
            backdrop.setBackgroundColor(Color.argb(alpha, 0, 0, 0));
        });
        backdropAnim.start();

        // --- Progress bar animation (0 → 70% over 2.5s) ---
        int trackWidth = screenW - (hPad * 2);
        handler.postDelayed(() -> {
            progressAnimator = ValueAnimator.ofInt(0, (int)(trackWidth * 0.7));
            progressAnimator.setDuration(2500);
            progressAnimator.setInterpolator(new AccelerateDecelerateInterpolator());
            progressAnimator.addUpdateListener(a -> {
                FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) progressFill.getLayoutParams();
                lp.width = (int) a.getAnimatedValue();
                progressFill.setLayoutParams(lp);
            });
            progressAnimator.start();
        }, 300);

        // --- Backdrop tap to dismiss (only after success) ---
        backdrop.setOnClickListener(v -> {
            // Only allow dismiss tap after animation
        });

        // Save URL for main app to sift on next open (no API call from extension)
        String pendingKey = "pendingSiftUrls";
        String existing = prefs.getString(pendingKey, "");
        String updated = existing.isEmpty() ? url : existing + "," + url;
        prefs.edit().putString(pendingKey, updated).apply();
        Log.d(TAG, "Saved URL to pendingSiftUrls: " + url);

        // Show success after brief delay
        handler.postDelayed(() -> showSuccess(trackWidth), 1200);
    }

    private void showSuccess(int trackWidth) {
        if (dismissed) return;

        // Complete progress bar
        ValueAnimator fillAnim = ValueAnimator.ofInt(
            ((FrameLayout.LayoutParams) progressFill.getLayoutParams()).width,
            trackWidth
        );
        fillAnim.setDuration(400);
        fillAnim.setInterpolator(new AccelerateDecelerateInterpolator());
        fillAnim.addUpdateListener(a -> {
            FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) progressFill.getLayoutParams();
            lp.width = (int) a.getAnimatedValue();
            progressFill.setLayoutParams(lp);
        });
        fillAnim.start();

        // Show checkmark
        checkIcon.animate().alpha(1f).setDuration(350).setStartDelay(100).start();

        // Update label
        handler.postDelayed(() -> {
            statusLabel.setText("Recipe saved!");
            subLabel.animate().alpha(1f).setDuration(300).start();
        }, 100);

        // Allow backdrop tap to dismiss
        backdrop.setOnClickListener(v -> dismissSheet());

        // Auto-dismiss after 3s
        handler.postDelayed(() -> {
            if (!dismissed) dismissSheet();
        }, 3000);
    }

    private void dismissSheet() {
        if (dismissed) return;
        dismissed = true;
        if (progressAnimator != null) progressAnimator.cancel();

        // Slide sheet down
        sheet.animate()
            .translationY(sheet.getHeight())
            .setDuration(350)
            .setInterpolator(new AccelerateDecelerateInterpolator())
            .start();

        // Fade out backdrop
        ValueAnimator backdropAnim = ValueAnimator.ofInt(128, 0);
        backdropAnim.setDuration(350);
        backdropAnim.addUpdateListener(a -> {
            int alpha = (int) a.getAnimatedValue();
            backdrop.setBackgroundColor(Color.argb(alpha, 0, 0, 0));
        });
        backdropAnim.addListener(new AnimatorListenerAdapter() {
            @Override
            public void onAnimationEnd(Animator animation) {
                finish();
                overridePendingTransition(0, 0);
            }
        });
        backdropAnim.start();
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (progressAnimator != null) progressAnimator.cancel();
        dismissed = true;
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        dismissSheet();
    }
}
`, 'utf-8');

            // SiftAppGroupModule.java
            fs.writeFileSync(path.join(javaDir, 'SiftAppGroupModule.java'), `package ${pkg};
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.Arguments;
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

    @ReactMethod public void getPendingUrls(Promise promise) {
        SharedPreferences prefs = getReactApplicationContext()
            .getSharedPreferences("sift_app_group", Context.MODE_PRIVATE);
        String raw = prefs.getString("pendingSiftUrls", "");
        WritableArray arr = Arguments.createArray();
        if (!raw.isEmpty()) {
            for (String url : raw.split(",")) {
                if (!url.isEmpty()) arr.pushString(url);
            }
        }
        promise.resolve(arr);
    }

    @ReactMethod public void clearPendingUrls() {
        getReactApplicationContext().getSharedPreferences("sift_app_group", Context.MODE_PRIVATE)
            .edit().remove("pendingSiftUrls").apply();
    }

    @ReactMethod public void syncIcon() {
        // No-op on Android — icon loaded from drawable resources
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
    config = withShareExtensionIcon(config);
    config = withAndroidNativeShare(config);
    config = withAndroidPackageRegistration(config);
    config = withAndroidShareManifest(config);
    return config;
};

module.exports = withNativeSharePopup;
