# samo Chromecast receiver

The default Google receiver shows **Default Media Receiver** on the TV. samo uses a
minimal custom Web Receiver so the idle state reads **samo** (all lowercase).

## One-time setup

1. Host `index.html` at a public HTTPS URL (GitHub Pages, your CDN, etc.).
2. Open the [Google Cast SDK Developer Console](https://cast.google.com/publish).
3. Register a **Custom Receiver** named `samo` pointing at that URL.
4. Copy the generated **Application ID** into `apps/android/android/gradle.properties`:

```properties
samo.castReceiverAppId=YOUR_APPLICATION_ID_HERE
```

5. Rebuild the Android app.

Until that property is set, the app falls back to Google's default receiver.
