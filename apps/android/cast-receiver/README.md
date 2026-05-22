# samo Chromecast receiver

Google's default receiver shows **Default Media Receiver** on the TV. samo ships a
minimal custom Web Receiver so the idle backdrop reads **samo**.

## Receiver URL (for Cast console)

After GitHub Pages deploys (workflow `cast-receiver-pages.yml`), register this URL:

`https://bouliehaan.github.io/samo/`

Until Pages is enabled on the repo, you can use the `development` branch raw URL for
testing only (not recommended for production):

`https://raw.githubusercontent.com/bouliehaan/samo/development/apps/android/cast-receiver/index.html`

## One-time setup

1. Enable **GitHub Pages** on `bouliehaan/samo` (Settings → Pages → Source: GitHub Actions).
2. Open the [Google Cast SDK Developer Console](https://cast.google.com/publish) → **Add application**.
3. Choose **Custom Receiver**, name it **samo**, URL = `https://bouliehaan.github.io/samo/`.
4. Under **Android** sender details, add package name `app.samo.android`.
5. Copy the **Application ID** into **one** of:
   - `apps/android/cast-receiver/application-id.properties` (copy from `application-id.properties.example`), or
   - `apps/android/android/gradle.properties` as `samo.castReceiverAppId=…`, or
   - `apps/android/android/local.properties` as `samo.castReceiverAppId=…` (gitignored).
6. Rebuild the Android app. Allow up to ~15 minutes for new receivers to propagate to devices.

Until an Application ID is set, the app falls back to Google's default receiver.
