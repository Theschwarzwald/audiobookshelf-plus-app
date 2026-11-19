/**
 * This app's ABS+ build number. Raise it for every release (the APK's versionCode follows it as 1000 + build,
 * see android/app/build.gradle) and publish the APK to the server with publish-app.js: phones on an older
 * build then show "Update available".
 */
export const ABS_PLUS_BUILD = 141

/** GitHub repository whose releases carry new ABS+ Android builds (the app also checks here for updates) */
export const ABS_PLUS_RELEASES_REPO = 'Theschwarzwald/audiobookshelf-plus-server'
