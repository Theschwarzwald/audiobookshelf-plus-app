# Releasing ABS+

## 1. Raise the build number

Every release needs a new build number, in two places:

- `plugins/absPlusBuild.js`: `export const ABS_PLUS_BUILD = 140`
- `android/app/build.gradle`: `versionCode 1140` (always 1000 + the build number)

Android only installs a new APK over an old one when its `versionCode` is higher, and the app compares
`ABS_PLUS_BUILD` with the server's to offer updates.

## 2. Build the APK

### On GitHub (Actions)

The **Release APK** workflow (`.github/workflows/release-apk.yml`) builds the APK and attaches it to a
GitHub release whenever a tag starting with `v` is pushed.

1. **One time:** forks have Actions switched off. Turn them on under the repository's **Actions** tab.
   The workflows inherited from the Audiobookshelf app are switched on too; disable any you don't
   want there (they target the official app's store listings).
2. **One time, for a signed release build:** make a signing key and add it as repository secrets:
   ```bash
   keytool -genkeypair -v -keystore release.jks -alias abs -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 release.jks   # copy the output
   ```
   Repository → Settings → Secrets and variables → Actions → New secret:
   `ANDROID_KEYSTORE_BASE64` (the base64 text), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`abs`),
   `ANDROID_KEY_PASSWORD`. Keep `release.jks` and its passwords safe and out of the repository: every
   later update must be signed with the same key.
3. Commit the new build number, then tag and push:
   ```bash
   git tag v140 && git push origin v140
   ```
4. The workflow runs for about 10 minutes and the APK appears under **Releases**.

Without the signing secrets the workflow still builds a debug APK, under the run's **Artifacts**.

### On your own computer

Follow *Building from source* in the readme, then build a debug APK:

```bash
npm run generate && npx cap sync android
cd android && ./gradlew assembleDebug
```

The APK is `android/app/build/outputs/apk/debug/app-debug.apk`. Attach it to a release with
`gh release create v140 app-debug.apk --target abs-plus`, or on the website under **Releases → Draft a new release**.

## 3. Offer it from ABS+ servers

Phones connected to an ABS+ server show **Update available** when the server has a newer build. ABS+ servers
fetch new builds by themselves from the releases of the
[server repository](https://github.com/Theschwarzwald/audiobookshelf-plus-server): attach the APK to a release
there, tagged `v<build>` (for example `v140`), and every ABS+ server picks it up within 12 hours. Phones also check
that repository's latest release themselves.

Attach the APK twice: as `ABS-Plus-<build>.apk`, and as `ABS-Plus.apk` (the readmes' download links point at
`releases/latest/download/ABS-Plus.apk`, which always serves the newest release's file of that name). Do the same
in this repository's releases.

To put a build on one server straight away, use `publish-app.js` from the server repository:

```bash
node publish-app.js path/to/app.apk 140 "What's new, in a sentence or two"
```

`publish-app.js` deploys through Portainer: set your Portainer address in `PORTAINER_URL` (or a
`~/.portainer_url` file) and your Portainer API key in `~/.portainer_token`.

## Which app it installs as

ABS+ has its own package name, so it installs **next to** the official Audiobookshelf app and never replaces it.

| Build | Package | Notes |
|---|---|---|
| Signed release (with the secrets) | `com.audiobookshelf.app.plus` | Updates install over each other as long as they're signed with the same key |
| Debug (no secrets, or built locally) | `com.audiobookshelf.app.plus.debug` | Each computer or workflow run signs with its own debug key: switching to a build from somewhere else means uninstalling first |

A release build and a debug build are two separate apps on the phone. Transcripts and downloads don't
carry over between them, although transcripts on the ABS+ server sync back.
