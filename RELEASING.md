# Getting the app onto your phone

The APK is built by GitHub Actions (this sandbox-free route also works for anyone forking the repo).

1. Put this folder in a GitHub repository (private is fine).
2. **One time, for installable updates:** make a signing key and add it as secrets:
   ```bash
   keytool -genkeypair -v -keystore release.jks -alias abs -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 release.jks   # copy the output
   ```
   Repository → Settings → Secrets and variables → Actions → New secret:
   `ANDROID_KEYSTORE_BASE64` (the base64 text), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`abs`),
   `ANDROID_KEY_PASSWORD`. Keep `release.jks` somewhere safe: updates must be signed with the same key.
3. Tag a version and push it:
   ```bash
   git tag v6.0.0 && git push origin v6.0.0
   ```
4. Actions → **Release APK** runs (about 10 minutes). The APK appears under **Releases** with a
   normal download link. Open that page on the phone, download, and install (allow "install unknown
   apps" for your browser the first time).

Without the signing secrets you still get an APK (a debug build) under the workflow run's
**Artifacts**; each one has a different signature, so uninstall the previous one first.

Which app it installs as:
- **Signed release build** (with the secrets): package `com.audiobookshelf.app`, the same as the official
  Audiobookshelf app, so it *replaces* it. If you have the Play Store version, uninstall it first
  (Android won't update a store app with a differently signed one); downloads on the phone are lost.
- **Debug build** (no secrets): package `com.audiobookshelf.app.debug`, installed *next to* the official
  app, so you can try it without removing anything.
