# Google Play Store Submission Guide for SIFT

Follow these steps to upload your Expo app to the Google Play Store.

## 1. Prerequisites
- **Google Play Developer Account**: You must have a developer account ($25 one-time fee). [Sign up here](https://play.google.com/console/signup).
- **EAS Account**: Ensure you are logged into your Expo account (`npx eas login`).

## 2. Configure `app.json`
Your `app.json` is already mostly configured, but ensure these fields are correct for production:

```json
{
  "expo": {
    "version": "1.1.0",
    "android": {
      "package": "com.hkjstudio.sift",
      "versionCode": 6,
      "adaptiveIcon": {
        "foregroundImage": "./assets/sift-white-new.png",
        "backgroundColor": "#ffffff"
      }
    }
  }
}
```
> [!IMPORTANT]
> Every time you submit a new version, you **must** increment the `versionCode` (e.g., from 6 to 7).

## 3. Generate Android Build (AAB)
Google Play Store requires an **Android App Bundle (.aab)**.

Run the following command in the `apps/mobile` directory:
```bash
npx eas build --platform android --profile production
```
- If this is your first time, EAS will ask to generate a keystore. Choose **Yes**.
- This will take 10-20 minutes on the Expo servers.

## 4. First-Time Submission (Google Play Console)
For the very first upload, you need to manually create the app entry:
1. Go to [Google Play Console](https://play.google.com/console/).
2. Click **Create app**.
3. Fill in the name ("Sift"), language, and app type (App/Free).
4. Navigate to **Testing > Closed testing** or **Release > Production**.
5. Upload the `.aab` file you downloaded from the Expo dashboard.

## 5. Automated Submissions (Optional)
Once the app is created in the console, you can use EAS for one-command submissions:
```bash
npx eas submit --platform android
```

## 6. Store Listing Checklist
- **Screenshots**: You need at least 2-4 screenshots of the app.
- **Privacy Policy**: Use your hosted policy (e.g., `https://sift-rho.vercel.app/privacy`).
- **Data Safety**: Expo apps typically use "Internet" and "Auth". You will need to fill out the Data Safety questionnaire in the console.

---

### Need Help?
If the build fails, check the logs at [expo.dev](https://expo.dev). Common issues include missing icons or duplicate package names.
