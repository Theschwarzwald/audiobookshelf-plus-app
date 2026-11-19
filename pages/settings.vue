<template>
  <div class="w-full h-full px-4 py-8 overflow-y-auto">
    <!-- Display settings -->
    <p class="uppercase text-xs font-semibold text-fg-muted mb-2">{{ $strings.HeaderUserInterfaceSettings }}</p>
    <div class="flex items-center py-3">
      <div class="w-10 flex justify-center" @click="toggleEnableAltView">
        <ui-toggle-switch v-model="enableBookshelfView" @input="saveSettings" />
      </div>
      <p class="pl-4">{{ $strings.LabelUseBookshelfView }}</p>
    </div>
    <!-- screen.orientation.lock not supported on iOS webview -->
    <div v-if="!isiOS" class="flex items-center py-3">
      <div class="w-10 flex justify-center" @click.stop="toggleLockOrientation">
        <ui-toggle-switch v-model="lockCurrentOrientation" class="pointer-events-none" />
      </div>
      <p class="pl-4">{{ $strings.LabelLockOrientation }}</p>
    </div>
    <div class="py-3 flex items-center">
      <p class="pr-4 w-36">{{ $strings.LabelHapticFeedback }}</p>
      <div @click.stop="showHapticFeedbackOptions">
        <ui-text-input :value="hapticFeedbackOption" readonly append-icon="expand_more" style="max-width: 200px" />
      </div>
    </div>
    <div class="py-3 flex items-center">
      <p class="pr-4 w-36">{{ $strings.LabelLanguage }}</p>
      <div @click.stop="showLanguageOptions">
        <ui-text-input :value="languageOption" readonly append-icon="expand_more" style="max-width: 200px" />
      </div>
    </div>
    <div class="py-3 flex items-center">
      <p class="pr-4 w-36">{{ $strings.LabelTheme }}</p>
      <div @click.stop="showThemeOptions">
        <ui-text-input :value="themeOption" readonly append-icon="expand_more" style="max-width: 200px" />
      </div>
    </div>
    <!-- E-ink: black & white or colour e-ink versions of the theme (Automatic: detected from the device) -->
    <div class="py-3 flex items-center flex-wrap">
      <p class="pr-4 w-36">E-ink</p>
      <ui-toggle-btns :value="einkChoice" name="eink-choice" :items="einkItems" @input="setEink" />
    </div>
    <p class="text-xs text-fg-muted -mt-1 mb-2">{{ einkHint }}</p>
    <!-- Screen lock (the lock button in the player and the transcription views): how to unlock it -->
    <div class="py-3 flex items-center flex-wrap">
      <p class="pr-4 w-36">Screen lock</p>
      <ui-toggle-btns :value="einkPinOnly ? 'pin' : screenLock.method" name="screenlock" :items="screenLockItems" @input="setScreenLockMethod" />
    </div>
    <p class="text-xs text-fg-muted -mt-1 mb-2">{{ screenLockHint }}</p>
    <button v-if="screenLock.method === 'pin' || einkPinOnly" class="mb-3 px-4 py-1.5 rounded-full border border-border text-sm font-semibold" @click="setScreenLockPin">{{ screenLock.pinHash ? 'Change PIN' : 'Set PIN' }}</button>
    <!-- Lock screen: the artwork with the narrated line under it (black, for OLED) -->
    <template v-if="$platform === 'android'">
      <div class="py-3 flex items-center flex-wrap">
        <p class="pr-4 w-36">Lock screen transcription</p>
        <ui-toggle-btns :value="lockscreen.mode" name="lockscreen" :items="lockscreenItems" @input="setLockscreen" />
      </div>
      <p class="text-xs text-fg-muted -mt-1 mb-2">{{ lockscreenHint }}</p>
      <button v-if="lockscreen.enabled && !lockscreen.allowed" class="mb-3 px-4 py-1.5 rounded-full border border-border text-sm font-semibold" @click="allowLockscreen">Allow ABS+ on the lock screen</button>
      <template v-if="lockscreen.enabled && !lockscreen.overlay">
        <p class="text-xs text-fg-muted mb-1">Some phones (Samsung included) only open the card by itself with “Display over other apps” on.</p>
        <button class="mb-3 px-4 py-1.5 rounded-full border border-border text-sm font-semibold" @click="allowOverlay">Allow display over other apps</button>
      </template>
    </template>
    <div v-if="theme !== 'light' && theme !== 'default' && !$store.getters['device/isEink']" class="flex items-center py-3">
      <div class="w-10 flex justify-center" @click.stop="toggleTrueBlack">
        <ui-toggle-switch :value="$store.getters['device/trueBlack']" class="pointer-events-none" />
      </div>
      <div class="pl-4">
        <p>True black (OLED)</p>
        <p class="text-xs text-fg-muted">{{ trueBlackHint }}</p>
      </div>
    </div>
    <div class="py-3 flex items-center">
      <p class="pr-4 w-36">Colour vision</p>
      <div @click.stop="showColorVisionOptions">
        <ui-text-input :value="colorVisionOption" readonly append-icon="expand_more" style="max-width: 200px" />
      </div>
    </div>

    <!-- Device & performance: everything Automatic by default -->
    <p class="uppercase text-xs font-semibold text-fg-muted mb-2 mt-10">Device &amp; performance</p>
    <p v-if="deviceSummary" class="text-xs text-fg-muted mb-2">{{ deviceSummary }}</p>
    <div class="py-3 flex items-center">
      <p class="pr-4 w-36">Device type</p>
      <div @click.stop="showDevicePref('formFactor')">
        <ui-text-input :value="devicePrefLabel('formFactor')" readonly append-icon="expand_more" style="max-width: 200px" />
      </div>
    </div>
    <div class="py-3 flex items-center">
      <p class="pr-4 w-36">Screen</p>
      <div @click.stop="showDevicePref('screen')">
        <ui-text-input :value="devicePrefLabel('screen')" readonly append-icon="expand_more" style="max-width: 200px" />
      </div>
    </div>
    <div class="py-3 flex items-center">
      <p class="pr-4 w-36">Animation speed</p>
      <div @click.stop="showDevicePref('refresh')">
        <ui-text-input :value="devicePrefLabel('refresh')" readonly append-icon="expand_more" style="max-width: 200px" />
      </div>
    </div>
    <div class="py-3 flex items-center">
      <p class="pr-4 w-36">Performance</p>
      <div @click.stop="showDevicePref('power')">
        <ui-text-input :value="devicePrefLabel('power')" readonly append-icon="expand_more" style="max-width: 200px" />
      </div>
    </div>
    <p class="text-xs text-fg-muted -mt-1 mb-2">Automatic starts at full quality and eases off by itself if this device drops frames, runs low on memory, gets warm or the battery runs low; it tries full quality again later. Low power also sets the screen to 60 Hz.</p>
    <div class="py-3 flex items-center cursor-pointer" @click="resetDeviceAdaptation">
      <span class="material-symbols mr-3">restart_alt</span>
      <p class="flex-grow">Set everything back to Automatic</p>
    </div>
    <div class="py-2 cursor-pointer" @click="showAutomationHelp = !showAutomationHelp">
      <p class="text-sm text-fg-muted flex items-center"><span class="material-symbols mr-2 text-base">bolt</span>Automate with Tasker, MacroDroid or adb</p>
    </div>
    <div v-if="showAutomationHelp" class="text-xs text-fg-muted bg-bg-hover rounded-lg p-3 mb-2 select-text">
      <p class="mb-1">Send a broadcast with action <code>com.audiobookshelf.app.plus.SET</code> to package <code>{{ appPackage }}</code> and any of these extras:</p>
      <p class="mb-1"><code>power</code> auto · max · balanced · saver &nbsp; <code>refresh</code> auto · max · 120 · 90 · 60 &nbsp; <code>screen</code> auto · lcd · oled · eink · eink-color &nbsp; <code>formFactor</code> auto · phone · tablet · desktop &nbsp; <code>background</code> auto · charging · always · manual &nbsp; <code>lowBatteryAt</code> 5–50 &nbsp; <code>theme</code> &nbsp; <code>colorVision</code> none · protan · deutan · tritan · mono &nbsp; <code>reset</code> true</p>
      <p>Example: <code>adb shell am broadcast -a com.audiobookshelf.app.plus.SET -p {{ appPackage }} --es power saver --es refresh 60</code></p>
    </div>

    <!-- Transcription -->
    <p class="uppercase text-xs font-semibold text-fg-muted mb-2 mt-10">Transcription</p>
    <div class="py-3 flex items-center">
      <div class="pr-4 w-36">
        <p>When offline</p>
      </div>
      <div @click.stop="showOfflineTranscribeOptions">
        <ui-text-input :value="offlineTranscribeOption" readonly append-icon="expand_more" style="max-width: 200px" />
      </div>
    </div>
    <div class="py-3 flex items-center">
      <p class="pr-4 w-36">Run on its own</p>
      <div @click.stop="showDevicePref('background')">
        <ui-text-input :value="devicePrefLabel('background')" readonly append-icon="expand_more" style="max-width: 200px" />
      </div>
    </div>
    <p class="text-xs text-fg-muted -mt-1 mb-2">For transcribing on this phone. Automatic keeps going in the background, pauses on battery saver or when the battery is low off the charger, and carries on by itself when you plug in. It always pauses if the phone gets too hot.</p>
    <p class="text-xs text-fg-muted -mt-1 mb-2">Books are transcribed on your server. When it can't be reached, the app can offer to transcribe on this phone instead (slow, uses battery). It's always available from the ⋮ menu in Transcription.</p>


    <!-- Help -->
    <p class="uppercase text-xs font-semibold text-fg-muted mb-2 mt-10">Help</p>
    <div class="py-3 flex items-center cursor-pointer" @click="$store.dispatch('onboarding/openTutorial')">
      <span class="material-symbols mr-3">school</span>
      <p class="flex-grow">Show the tutorial again</p>
      <span class="material-symbols text-fg-muted">chevron_right</span>
    </div>
    <div class="py-3 flex items-center cursor-pointer" @click="showAroundAgain">
      <span class="material-symbols mr-3">explore</span>
      <div class="flex-grow">
        <p>Show me around again</p>
        <p class="text-xs text-fg-muted">Points out the buttons on each screen the next time you open it</p>
      </div>
      <span class="material-symbols text-fg-muted">chevron_right</span>
    </div>
    <div class="py-3 flex items-center cursor-pointer" @click="$store.dispatch('onboarding/openSetup')">
      <span class="material-symbols mr-3">palette</span>
      <p class="flex-grow">Run first-time setup again</p>
      <span class="material-symbols text-fg-muted">chevron_right</span>
    </div>

    <!-- Dictionaries: hold a word (audio paused) in Lyrics, Karaoke or the book for its meaning -->
    <p class="uppercase text-xs font-semibold text-fg-muted mb-2 mt-10">Dictionaries</p>
    <p class="text-xs text-fg-muted mb-2">Hold a word while the audio is paused, in Lyrics, Karaoke or the book, to see what it means. Download dictionaries for offline lookups; the server's dictionaries (Settings → Dictionaries on the web) can be copied here too.</p>
    <readers-dictionary-manager :p="settingsPalette" />

    <!-- ABS+ updating itself from the server -->
    <app-app-update-settings />

    <!-- Playback settings -->
    <p class="uppercase text-xs font-semibold text-fg-muted mb-2 mt-10">{{ $strings.HeaderPlaybackSettings }}</p>
    <div class="py-3 flex items-center">
      <p class="pr-4 w-36">{{ $strings.LabelJumpBackwardsTime }}</p>
      <div @click.stop="showJumpBackwardsOptions">
        <ui-text-input :value="jumpBackwardsOption" readonly append-icon="expand_more" style="width: 145px; max-width: 145px" />
      </div>
    </div>
    <div class="py-3 flex items-center">
      <p class="pr-4 w-36">{{ $strings.LabelJumpForwardsTime }}</p>
      <div @click.stop="showJumpForwardOptions">
        <ui-text-input :value="jumpForwardOption" readonly append-icon="expand_more" style="width: 145px; max-width: 145px" />
      </div>
    </div>
    <div class="flex items-center py-3">
      <div class="w-10 flex justify-center" @click="toggleDisableAutoRewind">
        <ui-toggle-switch v-model="settings.disableAutoRewind" @input="saveSettings" />
      </div>
      <p class="pl-4">{{ $strings.LabelDisableAutoRewind }}</p>
    </div>
    <div v-if="!isiOS" class="flex items-center py-3">
      <div class="w-10 flex justify-center" @click="toggleEnableMp3IndexSeeking">
        <ui-toggle-switch v-model="settings.enableMp3IndexSeeking" @input="saveSettings" />
      </div>
      <p class="pl-4">{{ $strings.LabelEnableMp3IndexSeeking }}</p>
      <span class="material-symbols text-xl ml-2" @click.stop="showConfirmMp3IndexSeeking">info</span>
    </div>
    <div class="flex items-center py-3">
      <div class="w-10 flex justify-center" @click="toggleAllowSeekingOnMediaControls">
        <ui-toggle-switch v-model="settings.allowSeekingOnMediaControls" @input="saveSettings" />
      </div>
      <p class="pl-4">{{ $strings.LabelAllowSeekingOnMediaControls }}</p>
    </div>

    <!-- Sleep timer settings -->
    <template v-if="!isiOS">
      <p class="uppercase text-xs font-semibold text-fg-muted mb-2 mt-10">{{ $strings.HeaderSleepTimerSettings }}</p>
      <div class="flex items-center py-3">
        <div class="w-10 flex justify-center" @click="toggleDisableShakeToResetSleepTimer">
          <ui-toggle-switch v-model="settings.disableShakeToResetSleepTimer" @input="saveSettings" />
        </div>
        <p class="pl-4">{{ $strings.LabelDisableShakeToReset }}</p>
        <span class="material-symbols text-xl ml-2" @click.stop="showInfo('disableShakeToResetSleepTimer')">info</span>
      </div>
      <div v-if="!settings.disableShakeToResetSleepTimer" class="py-3 flex items-center">
        <p class="pr-4 w-36">{{ $strings.LabelShakeSensitivity }}</p>
        <div @click.stop="showShakeSensitivityOptions">
          <ui-text-input :value="shakeSensitivityOption" readonly append-icon="expand_more" style="width: 145px; max-width: 145px" />
        </div>
      </div>
    </template>
    <div class="flex items-center py-3">
      <div class="w-10 flex justify-center" @click="toggleDisableSleepTimerFadeOut">
        <ui-toggle-switch v-model="settings.disableSleepTimerFadeOut" @input="saveSettings" />
      </div>
      <p class="pl-4">{{ $strings.LabelDisableAudioFadeOut }}</p>
      <span class="material-symbols text-xl ml-2" @click.stop="showInfo('disableSleepTimerFadeOut')">info</span>
    </div>
    <template v-if="!isiOS">
      <div class="flex items-center py-3">
        <div class="w-10 flex justify-center" @click="toggleDisableSleepTimerResetFeedback">
          <ui-toggle-switch v-model="settings.disableSleepTimerResetFeedback" @input="saveSettings" />
        </div>
        <p class="pl-4">{{ $strings.LabelDisableVibrateOnReset }}</p>
        <span class="material-symbols text-xl ml-2" @click.stop="showInfo('disableSleepTimerResetFeedback')">info</span>
      </div>
      <div class="flex items-center py-3">
        <div class="w-10 flex justify-center" @click="toggleSleepTimerAlmostDoneChime">
          <ui-toggle-switch v-model="settings.enableSleepTimerAlmostDoneChime" @input="saveSettings" />
        </div>
        <p class="pl-4">{{ $strings.LabelSleepTimerAlmostDoneChime }}</p>
        <span class="material-symbols text-xl ml-2" @click.stop="showInfo('enableSleepTimerAlmostDoneChime')">info</span>
      </div>
      <div class="flex items-center py-3">
        <div class="w-10 flex justify-center" @click="toggleAutoSleepTimer">
          <ui-toggle-switch v-model="settings.autoSleepTimer" @input="saveSettings" />
        </div>
        <p class="pl-4">{{ $strings.LabelAutoSleepTimer }}</p>
        <span class="material-symbols text-xl ml-2" @click.stop="showInfo('autoSleepTimer')">info</span>
      </div>
    </template>
    <!-- Auto Sleep timer settings -->
    <div v-if="settings.autoSleepTimer" class="py-3 flex items-center">
      <p class="pr-4 w-36">{{ $strings.LabelStartTime }}</p>
      <ui-text-input type="time" v-model="settings.autoSleepTimerStartTime" style="width: 145px; max-width: 145px" @input="autoSleepTimerTimeUpdated" />
    </div>
    <div v-if="settings.autoSleepTimer" class="py-3 flex items-center">
      <p class="pr-4 w-36">{{ $strings.LabelEndTime }}</p>
      <ui-text-input type="time" v-model="settings.autoSleepTimerEndTime" style="width: 145px; max-width: 145px" @input="autoSleepTimerTimeUpdated" />
    </div>
    <div v-if="settings.autoSleepTimer" class="py-3 flex items-center">
      <p class="pr-4 w-36">{{ $strings.LabelSleepTimer }}</p>
      <div @click.stop="showSleepTimerOptions">
        <ui-text-input :value="sleepTimerLengthOption" readonly append-icon="expand_more" style="width: 145px; max-width: 145px" />
      </div>
    </div>
    <div v-if="settings.autoSleepTimer" class="flex items-center py-3">
      <div class="w-10 flex justify-center" @click="toggleAutoSleepTimerAutoRewind">
        <ui-toggle-switch v-model="settings.autoSleepTimerAutoRewind" @input="saveSettings" />
      </div>
      <p class="pl-4">{{ $strings.LabelAutoSleepTimerAutoRewind }}</p>
      <span class="material-symbols text-xl ml-2" @click.stop="showInfo('autoSleepTimerAutoRewind')">info</span>
    </div>
    <div v-if="settings.autoSleepTimerAutoRewind" class="py-3 flex items-center">
      <p class="pr-4 w-36">{{ $strings.LabelAutoRewindTime }}</p>
      <div @click.stop="showAutoSleepTimerRewindOptions">
        <ui-text-input :value="autoSleepTimerRewindLengthOption" readonly append-icon="expand_more" style="width: 145px; max-width: 145px" />
      </div>
    </div>

    <!-- Data settings -->
    <p class="uppercase text-xs font-semibold text-fg-muted mb-2 mt-10">{{ $strings.HeaderDataSettings }}</p>
    <div class="py-3 flex items-center">
      <p class="pr-4 w-36">{{ $strings.LabelDownloadUsingCellular }}</p>
      <div @click.stop="showDownloadUsingCellularOptions">
        <ui-text-input :value="downloadUsingCellularOption" readonly append-icon="expand_more" style="max-width: 200px" />
      </div>
    </div>
    <div class="py-3 flex items-center">
      <p class="pr-4 w-36">{{ $strings.LabelStreamingUsingCellular }}</p>
      <div @click.stop="showStreamingUsingCellularOptions">
        <ui-text-input :value="streamingUsingCellularOption" readonly append-icon="expand_more" style="max-width: 200px" />
      </div>
    </div>

    <!-- Android Auto settings -->
    <template v-if="!isiOS">
      <p class="uppercase text-xs font-semibold text-fg-muted mb-2 mt-10">{{ $strings.HeaderAndroidAutoSettings }}</p>
      <div class="py-3 flex items-center">
        <p class="pr-4 w-36">{{ $strings.LabelAndroidAutoBrowseLimitForGrouping }}</p>
        <ui-text-input type="number" v-model="settings.androidAutoBrowseLimitForGrouping" style="width: 145px; max-width: 145px" @input="androidAutoBrowseLimitForGroupingUpdated" />
        <span class="material-symbols text-xl ml-2" @click.stop="showInfo('androidAutoBrowseLimitForGrouping')">info</span>
      </div>
      <div class="py-3 flex items-center">
        <p class="pr-4 w-36">{{ $strings.LabelAndroidAutoBrowseSeriesSequenceOrder }}</p>
        <div @click.stop="showAndroidAutoBrowseSeriesSequenceOrderOptions">
          <ui-text-input :value="androidAutoBrowseSeriesSequenceOrderOption" readonly append-icon="expand_more" style="max-width: 200px" />
        </div>
      </div>
    </template>

    <div v-show="loading" class="w-full h-full absolute top-0 left-0 flex items-center justify-center z-10">
      <ui-loading-indicator />
    </div>

    <modals-dialog v-model="showMoreMenuDialog" :items="moreMenuItems" :selected="moreMenuSelected" @action="clickMenuAction" />
    <modals-sleep-timer-length-modal v-model="showSleepTimerLengthModal" @change="sleepTimerLengthModalSelection" />
    <modals-auto-sleep-timer-rewind-length-modal v-model="showAutoSleepTimerRewindLengthModal" @change="showAutoSleepTimerRewindLengthModalSelection" />
  </div>
</template>

<script>
import { palette, themeForApp } from '@/components/readers/readerThemes'
import { AbsDevice } from '@/plugins/capacitor'
import { lockSettings, saveLockSettings } from '@/plugins/screenLock'
import { MODES as COLOR_VISION_MODES } from '@/components/onboarding/colorVision'
import { Dialog } from '@capacitor/dialog'
import jumpLabelMixin from '@/mixins/jumpLabel'

export default {
  mixins: [jumpLabelMixin],
  data() {
    return {
      loading: false,
      lockscreen: { mode: 'auto', enabled: false, allowed: true, oled: false },
      screenLock: lockSettings(),
      // e-ink without a face / fingerprint: the ABS+ PIN only
      biometricOk: true,
      biometricHardware: true,
      deviceData: null,
      showMoreMenuDialog: false,
      showSleepTimerLengthModal: false,
      showAutoSleepTimerRewindLengthModal: false,
      moreMenuSetting: '',
      settings: {
        disableAutoRewind: false,
        enableAltView: true,
        allowSeekingOnMediaControls: false,
        jumpForwardTime: 10,
        jumpBackwardsTime: 10,
        enableMp3IndexSeeking: true,
        disableShakeToResetSleepTimer: false,
        shakeSensitivity: 'MEDIUM',
        lockOrientation: 0,
        hapticFeedback: 'LIGHT',
        autoSleepTimer: false,
        autoSleepTimerStartTime: '22:00',
        autoSleepTimerEndTime: '06:00',
        sleepTimerLength: 900000, // 15 minutes
        disableSleepTimerFadeOut: false,
        disableSleepTimerResetFeedback: false,
        enableSleepTimerAlmostDoneChime: false,
        autoSleepTimerAutoRewind: false,
        autoSleepTimerAutoRewindTime: 300000, // 5 minutes
        languageCode: 'en-us',
        downloadUsingCellular: 'ALWAYS',
        streamingUsingCellular: 'ALWAYS',
        androidAutoBrowseLimitForGrouping: 100,
        androidAutoBrowseSeriesSequenceOrder: 'ASC'
      },
      theme: 'dark',
      showAutomationHelp: false,
      offlineTranscribe: localStorage.getItem('offlineTranscribe') === 'never' ? 'never' : 'ask',
      lockCurrentOrientation: false,
      settingInfo: {
        disableShakeToResetSleepTimer: {
          name: this.$strings.LabelDisableShakeToReset,
          message: this.$strings.LabelDisableShakeToResetHelp
        },
        autoSleepTimer: {
          name: this.$strings.LabelAutoSleepTimer,
          message: this.$strings.LabelAutoSleepTimerHelp
        },
        disableSleepTimerFadeOut: {
          name: this.$strings.LabelDisableAudioFadeOut,
          message: this.$strings.LabelDisableAudioFadeOutHelp
        },
        disableSleepTimerResetFeedback: {
          name: this.$strings.LabelDisableVibrateOnReset,
          message: this.$strings.LabelDisableVibrateOnResetHelp
        },
        enableSleepTimerAlmostDoneChime: {
          name: this.$strings.LabelSleepTimerAlmostDoneChime,
          message: this.$strings.LabelSleepTimerAlmostDoneChimeHelp
        },
        autoSleepTimerAutoRewind: {
          name: this.$strings.LabelAutoSleepTimerAutoRewind,
          message: this.$strings.LabelAutoSleepTimerAutoRewindHelp
        },
        enableMp3IndexSeeking: {
          name: this.$strings.LabelEnableMp3IndexSeeking,
          message: this.$strings.LabelEnableMp3IndexSeekingHelp
        },
        androidAutoBrowseLimitForGrouping: {
          name: this.$strings.LabelAndroidAutoBrowseLimitForGrouping,
          message: this.$strings.LabelAndroidAutoBrowseLimitForGroupingHelp
        }
      },
      hapticFeedbackItems: [
        {
          text: this.$strings.LabelOff,
          value: 'OFF'
        },
        {
          text: this.$strings.LabelLight,
          value: 'LIGHT'
        },
        {
          text: this.$strings.LabelMedium,
          value: 'MEDIUM'
        },
        {
          text: this.$strings.LabelHeavy,
          value: 'HEAVY'
        }
      ],
      shakeSensitivityItems: [
        {
          text: this.$strings.LabelVeryLow,
          value: 'VERY_LOW'
        },
        {
          text: this.$strings.LabelLow,
          value: 'LOW'
        },
        {
          text: this.$strings.LabelMedium,
          value: 'MEDIUM'
        },
        {
          text: this.$strings.LabelHigh,
          value: 'HIGH'
        },
        {
          text: this.$strings.LabelVeryHigh,
          value: 'VERY_HIGH'
        }
      ],
      downloadUsingCellularItems: [
        {
          text: this.$strings.LabelAskConfirmation,
          value: 'ASK'
        },
        {
          text: this.$strings.LabelAlways,
          value: 'ALWAYS'
        },
        {
          text: this.$strings.LabelNever,
          value: 'NEVER'
        }
      ],
      streamingUsingCellularItems: [
        {
          text: this.$strings.LabelAskConfirmation,
          value: 'ASK'
        },
        {
          text: this.$strings.LabelAlways,
          value: 'ALWAYS'
        },
        {
          text: this.$strings.LabelNever,
          value: 'NEVER'
        }
      ],
      androidAutoBrowseSeriesSequenceOrderItems: [
        {
          text: this.$strings.LabelSequenceAscending,
          value: 'ASC'
        },
        {
          text: this.$strings.LabelSequenceDescending,
          value: 'DESC'
        }
      ]
    }
  },
  computed: {
    // This is flipped because alt view was the default until v0.9.61-beta
    enableBookshelfView: {
      get() {
        return !this.settings.enableAltView
      },
      set(val) {
        this.settings.enableAltView = !val
      }
    },
    isiOS() {
      return this.$platform === 'ios'
    },
    jumpForwardSecondsOptions() {
      return this.$store.state.globals.jumpForwardSecondsOptions || []
    },
    jumpBackwardsSecondsOptions() {
      return this.$store.state.globals.jumpBackwardsSecondsOptions || []
    },
    languageOptionItems() {
      return this.$languageCodeOptions || []
    },
    jumpForwardOption() {
      return this.getJumpLabel(this.settings.jumpForwardTime)
    },
    jumpBackwardsOption() {
      return this.getJumpLabel(this.settings.jumpBackwardsTime)
    },
    settingsPalette() {
      return palette(themeForApp(this.$store.getters['device/theme'] || document.documentElement.dataset.theme))
    },
    /** PIN only: no face or fingerprint sensor on this device, or an e-reader with none set up */
    einkPinOnly() {
      return !this.biometricHardware || (this.$store.getters['device/isEink'] && !this.biometricOk)
    },
    screenLockItems() {
      return [
        { text: 'Face / fingerprint', value: 'device', disabled: this.einkPinOnly },
        { text: 'PIN', value: 'pin' }
      ]
    },
    screenLockHint() {
      const what = 'The lock button (full player, Lyrics, Karaoke, Read along) keeps the screen on and dimmed while you follow along, and ignores touches. Double-tap to unlock'
      const why = !this.biometricHardware ? 'this device has no face or fingerprint sensor' : 'no face or fingerprint is set up on this e-reader'
      if (this.einkPinOnly) return this.screenLock.pinHash ? `${what} with your ABS+ PIN (${why}).` : `${what} with a PIN: set one below (${why}).`
      if (this.screenLock.method === 'pin') return this.screenLock.pinHash ? `${what} with your ABS+ PIN.` : `${what} with a PIN: set one below.`
      return `${what} the way you unlock your phone (face, fingerprint or its PIN).`
    },
    lockscreenItems() {
      return [
        { text: 'Auto', value: 'auto' },
        { text: 'On', value: 'on' },
        { text: 'Off', value: 'off' }
      ]
    },
    lockscreenHint() {
      const l = this.lockscreen
      const what = 'When the screen turns off while a transcribed book plays, waking the phone shows the player (artwork, the line being narrated, progress and buttons), dimmed like the lock screen. Double-tap it to use the buttons, then swipe up to unlock.'
      if (l.mode === 'off') return 'Off: the normal lock screen only.'
      if (l.mode === 'auto' && !l.enabled) return `Automatic: on for OLED screens; this screen doesn't look like OLED, so it's off. ${what}`
      if (!l.allowed) return `${what} Android needs your OK once for ABS+ to show on the lock screen.`
      return what
    },
    einkItems() {
      return [
        { text: 'Auto', value: 'auto' },
        { text: 'Off', value: 'off' },
        { text: 'Black & white', value: 'bw' },
        { text: 'Colour', value: 'color' }
      ]
    },
    einkChoice() {
      const sc = this.$store.state.device.prefs.screen
      return sc === 'eink' ? 'bw' : sc === 'eink-color' ? 'color' : sc === 'auto' || !sc ? 'auto' : 'off'
    },
    einkHint() {
      const g = this.$store.getters
      const now = g['device/isEink'] ? (g['device/isColorEink'] ? 'colour e-ink' : 'black & white e-ink') : 'not e-ink'
      if (this.einkChoice === 'auto') return `Automatic: this screen looks ${now === 'not e-ink' ? 'like a normal screen' : 'like ' + now}. E-ink versions of the theme have no animations and high contrast.`
      if (this.einkChoice === 'bw') return 'Black & white e-ink: crisp black on white (or white on black in Dark), no animations'
      if (this.einkChoice === 'color') return 'Colour e-ink (Kaleido / Gallery): e-ink contrast with a few strong colours for highlights'
      return 'Off: a normal screen, whatever the device'
    },
    themeOptionItems() {
      // System / Light / Dark (the screen type picks e-ink versions), or Default: the app's own colours, unchanging
      return [
        { text: 'System', value: 'system' },
        { text: this.$strings.LabelThemeLight, value: 'light' },
        { text: this.$strings.LabelThemeDark, value: 'dark' },
        { text: 'Default colours', value: 'default' }
      ]
    },
    trueBlackHint() {
      const t = this.$store.state.device.appearance.trueBlack
      if (t === 'auto') return this.$store.getters['device/isOled'] ? 'Automatic: on, this screen looks like OLED' : 'Automatic: off, this screen doesn\'t look like OLED'
      return t === 'on' ? 'Pure black backgrounds, saves battery on OLED' : 'Dark grey backgrounds'
    },
    shakeSensitivityOption() {
      const item = this.shakeSensitivityItems.find((i) => i.value === this.settings.shakeSensitivity)
      return item?.text || 'Error'
    },
    hapticFeedbackOption() {
      const item = this.hapticFeedbackItems.find((i) => i.value === this.settings.hapticFeedback)
      return item?.text || 'Error'
    },
    languageOption() {
      return this.languageOptionItems.find((i) => i.value === this.settings.languageCode)?.text || ''
    },
    offlineTranscribeItems() {
      return [
        { text: 'Ask to transcribe on this phone', value: 'ask' },
        { text: 'Never ask', value: 'never' }
      ]
    },
    offlineTranscribeOption() {
      return this.offlineTranscribe === 'never' ? 'Never ask' : 'Ask me'
    },
    colorVisionItems() {
      return COLOR_VISION_MODES.map((m) => ({ text: m.label, value: m.id }))
    },
    colorVisionOption() {
      const m = COLOR_VISION_MODES.find((x) => x.id === this.$store.state.onboarding.colorVision)
      return m ? m.label : 'Standard colours'
    },
    themeOption() {
      return this.themeOptionItems.find((i) => i.value === this.theme)?.text || ''
    },
    sleepTimerLengthOption() {
      if (!this.settings.sleepTimerLength) return this.$strings.LabelEndOfChapter
      const minutes = Number(this.settings.sleepTimerLength) / 1000 / 60
      return `${minutes} min`
    },
    autoSleepTimerRewindLengthOption() {
      const minutes = Number(this.settings.autoSleepTimerAutoRewindTime) / 1000 / 60
      return `${minutes} min`
    },
    downloadUsingCellularOption() {
      const item = this.downloadUsingCellularItems.find((i) => i.value === this.settings.downloadUsingCellular)
      return item?.text || 'Error'
    },
    streamingUsingCellularOption() {
      const item = this.streamingUsingCellularItems.find((i) => i.value === this.settings.streamingUsingCellular)
      return item?.text || 'Error'
    },
    androidAutoBrowseSeriesSequenceOrderOption() {
      const item = this.androidAutoBrowseSeriesSequenceOrderItems.find((i) => i.value === this.settings.androidAutoBrowseSeriesSequenceOrder)
      return item?.text || 'Error'
    },
    deviceSummary() {
      return this.$store.getters['device/summary']
    },
    appPackage() {
      return process.env.NODE_ENV === 'production' ? 'com.audiobookshelf.app.plus' : 'com.audiobookshelf.app.plus.debug'
    },
    devicePrefOptions() {
      const rates = this.$store.getters['device/refreshRates'] || []
      const top = rates.length ? Math.max(...rates) : 60
      const refresh = [
        { text: top > 61 ? '60 Hz · saves battery (default)' : 'Automatic', value: 'auto' },
        { text: top > 61 ? `Fastest (${top} Hz) · smoothest` : 'Always the fastest', value: 'max' }
      ]
      ;[120, 90].forEach((hz) => {
        if (rates.some((r) => r >= hz - 1)) refresh.push({ text: `${hz} Hz${hz === 120 ? ' · smoother, uses more battery' : ''}`, value: String(hz) })
      })
      return {
        formFactor: [
          { text: 'Automatic', value: 'auto' },
          { text: 'Phone', value: 'phone' },
          { text: 'Tablet', value: 'tablet' },
          { text: 'Desktop (mouse & keyboard)', value: 'desktop' }
        ],
        screen: [
          { text: 'Automatic', value: 'auto' },
          { text: 'LCD', value: 'lcd' },
          { text: 'OLED (true black)', value: 'oled' },
          { text: 'E-ink (black & white)', value: 'eink' },
          { text: 'Colour e-ink', value: 'eink-color' }
        ],
        refresh,
        power: [
          { text: 'Automatic (full, eases off)', value: 'auto' },
          { text: 'Always full quality', value: 'max' },
          { text: 'Balanced', value: 'balanced' },
          { text: 'Battery saver', value: 'saver' }
        ],
        background: [
          { text: 'Automatic', value: 'auto' },
          { text: 'Only while charging', value: 'charging' },
          { text: 'Any time', value: 'always' },
          { text: 'Only when I start it', value: 'manual' }
        ]
      }
    },
    moreMenuItems() {
      const ms = this.moreMenuSetting || ''
      if (ms.startsWith('dev:')) return this.devicePrefOptions[ms.slice(4)] || []
      if (this.moreMenuSetting === 'shakeSensitivity') return this.shakeSensitivityItems
      else if (this.moreMenuSetting === 'hapticFeedback') return this.hapticFeedbackItems
      else if (this.moreMenuSetting === 'language') return this.languageOptionItems
      else if (this.moreMenuSetting === 'theme') return this.themeOptionItems
      else if (this.moreMenuSetting === 'colorVision') return this.colorVisionItems
      else if (this.moreMenuSetting === 'offlineTranscribe') return this.offlineTranscribeItems
      else if (this.moreMenuSetting === 'downloadUsingCellular') return this.downloadUsingCellularItems
      else if (this.moreMenuSetting === 'streamingUsingCellular') return this.streamingUsingCellularItems
      else if (this.moreMenuSetting === 'androidAutoBrowseSeriesSequenceOrder') return this.androidAutoBrowseSeriesSequenceOrderItems
      else if (this.moreMenuSetting === 'jumpForward')
        return this.jumpForwardSecondsOptions.map((value) => ({
          text: this.getJumpLabel(value),
          value: value
        }))
      else if (this.moreMenuSetting === 'jumpBackwards')
        return this.jumpBackwardsSecondsOptions.map((value) => ({
          text: this.getJumpLabel(value),
          value: value
        }))
      return []
    },
    moreMenuSelected() {
      if ((this.moreMenuSetting || '').startsWith('dev:')) return this.$store.state.device.prefs[this.moreMenuSetting.slice(4)]
      if (this.moreMenuSetting === 'jumpForward') return this.settings.jumpForwardTime
      if (this.moreMenuSetting === 'jumpBackwards') return this.settings.jumpBackwardsTime
      if (this.moreMenuSetting === 'language') return this.settings.languageCode
      if (this.moreMenuSetting === 'theme') return this.theme
      if (this.moreMenuSetting === 'colorVision') return this.$store.state.onboarding.colorVision
      if (this.moreMenuSetting === 'offlineTranscribe') return this.offlineTranscribe
      if (this.moreMenuSetting === 'downloadUsingCellular') return this.settings.downloadUsingCellular
      if (this.moreMenuSetting === 'streamingUsingCellular') return this.settings.streamingUsingCellular
      if (this.moreMenuSetting === 'androidAutoBrowseSeriesSequenceOrder') return this.settings.androidAutoBrowseSeriesSequenceOrder
      if (this.moreMenuSetting === 'shakeSensitivity') return this.settings.shakeSensitivity
      if (this.moreMenuSetting === 'hapticFeedback') return this.settings.hapticFeedback
      return null
    }
  },
  methods: {
    setScreenLockMethod(method) {
      this.screenLock = saveLockSettings({ method })
      if (method === 'pin' && !this.screenLock.pinHash) this.setScreenLockPin()
    },
    /** The app's own PIN pad (the system text box is unreadable on some e-readers) */
    setScreenLockPin() {
      this.$eventBus.$emit('screen-lock-setpin')
    },
    async checkBiometrics() {
      const r = await AbsDevice.biometricAvailable().catch(() => ({ available: false, hardware: true }))
      this.biometricOk = !!r.available
      this.biometricHardware = r.hardware !== false
    },
    onScreenLockPinSet() {
      this.screenLock = lockSettings()
    },
    sleepTimerLengthModalSelection(value) {
      this.settings.sleepTimerLength = value
      this.saveSettings()
    },
    showAutoSleepTimerRewindLengthModalSelection(value) {
      this.settings.autoSleepTimerAutoRewindTime = value
      this.saveSettings()
    },
    showSleepTimerOptions() {
      this.showSleepTimerLengthModal = true
    },
    showAutoSleepTimerRewindOptions() {
      this.showAutoSleepTimerRewindLengthModal = true
    },
    showHapticFeedbackOptions() {
      this.moreMenuSetting = 'hapticFeedback'
      this.showMoreMenuDialog = true
    },
    showShakeSensitivityOptions() {
      this.moreMenuSetting = 'shakeSensitivity'
      this.showMoreMenuDialog = true
    },
    showLanguageOptions() {
      this.moreMenuSetting = 'language'
      this.showMoreMenuDialog = true
    },
    async loadLockscreen() {
      if (this.$platform !== 'android') return
      try {
        this.lockscreen = await AbsDevice.getLockscreen()
      } catch (e) {}
    },
    async setLockscreen(mode) {
      try {
        this.lockscreen = await AbsDevice.setLockscreen({ mode })
      } catch (e) {}
    },
    async allowLockscreen() {
      await AbsDevice.openLockscreenPermission().catch(() => {})
      this.recheckLockscreenOnReturn()
    },
    async allowOverlay() {
      await AbsDevice.openOverlayPermission().catch(() => {})
      this.recheckLockscreenOnReturn()
    },
    recheckLockscreenOnReturn() {
      // back from Android's settings: look again
      const back = () => {
        if (document.visibilityState === 'visible') {
          document.removeEventListener('visibilitychange', back)
          this.loadLockscreen()
    this.$eventBus.$on('screen-lock-pin-set', this.onScreenLockPinSet)
    this.checkBiometrics()
        }
      }
      document.addEventListener('visibilitychange', back)
    },
    setEink(v) {
      const screen = { auto: 'auto', off: 'lcd', bw: 'eink', color: 'eink-color' }[v] || 'auto'
      this.$store.dispatch('device/setPrefs', { screen })
    },
    devicePrefLabel(key) {
      const v = this.$store.state.device.prefs[key]
      const item = (this.devicePrefOptions[key] || []).find((i) => i.value === v)
      return item ? item.text : 'Automatic'
    },
    showDevicePref(key) {
      this.moreMenuSetting = 'dev:' + key
      this.showMoreMenuDialog = true
    },
    resetDeviceAdaptation() {
      this.$store.dispatch('device/setPrefs', { reset: true, formFactor: 'auto', screen: 'auto', refresh: 'auto', power: 'auto', background: 'auto', lowBatteryAt: '20' })
      this.$toast.info('Back to Automatic: the app adapts to this device again')
    },
    showThemeOptions() {
      this.moreMenuSetting = 'theme'
      this.showMoreMenuDialog = true
    },
    showOfflineTranscribeOptions() {
      this.moreMenuSetting = 'offlineTranscribe'
      this.showMoreMenuDialog = true
    },
    showColorVisionOptions() {
      this.moreMenuSetting = 'colorVision'
      this.showMoreMenuDialog = true
    },
    showAroundAgain() {
      this.$store.dispatch('onboarding/resetTours')
      this.$toast.info('The tour will show you around each screen the next time you open it')
    },
    showJumpForwardOptions() {
      this.moreMenuSetting = 'jumpForward'
      this.showMoreMenuDialog = true
    },
    showJumpBackwardsOptions() {
      this.moreMenuSetting = 'jumpBackwards'
      this.showMoreMenuDialog = true
    },
    showDownloadUsingCellularOptions() {
      this.moreMenuSetting = 'downloadUsingCellular'
      this.showMoreMenuDialog = true
    },
    showStreamingUsingCellularOptions() {
      this.moreMenuSetting = 'streamingUsingCellular'
      this.showMoreMenuDialog = true
    },
    showAndroidAutoBrowseSeriesSequenceOrderOptions() {
      this.moreMenuSetting = 'androidAutoBrowseSeriesSequenceOrder'
      this.showMoreMenuDialog = true
    },
    clickMenuAction(action) {
      this.showMoreMenuDialog = false
      if ((this.moreMenuSetting || '').startsWith('dev:')) {
        this.$store.dispatch('device/setPrefs', { [this.moreMenuSetting.slice(4)]: action })
        return
      }
      if (this.moreMenuSetting === 'shakeSensitivity') {
        this.settings.shakeSensitivity = action
        this.saveSettings()
      } else if (this.moreMenuSetting === 'hapticFeedback') {
        this.settings.hapticFeedback = action
        this.hapticFeedbackUpdated(action)
      } else if (this.moreMenuSetting === 'language') {
        this.settings.languageCode = action
        this.saveSettings()
      } else if (this.moreMenuSetting === 'theme') {
        this.theme = action
        this.saveTheme(action)
      } else if (this.moreMenuSetting === 'colorVision') {
        this.$store.dispatch('onboarding/setColorVision', action)
      } else if (this.moreMenuSetting === 'offlineTranscribe') {
        this.offlineTranscribe = action
        localStorage.setItem('offlineTranscribe', action)
      } else if (this.moreMenuSetting === 'downloadUsingCellular') {
        this.settings.downloadUsingCellular = action
        this.saveSettings()
      } else if (this.moreMenuSetting === 'streamingUsingCellular') {
        this.settings.streamingUsingCellular = action
        this.saveSettings()
      } else if (this.moreMenuSetting === 'androidAutoBrowseSeriesSequenceOrder') {
        this.settings.androidAutoBrowseSeriesSequenceOrder = action
        this.saveSettings()
      } else if (this.moreMenuSetting === 'jumpForward') {
        this.settings.jumpForwardTime = action
        this.saveSettings()
      } else if (this.moreMenuSetting === 'jumpBackwards') {
        this.settings.jumpBackwardsTime = action
        this.saveSettings()
      }
    },
    saveTheme(theme) {
      this.$store.dispatch('device/setAppearance', { mode: theme })
    },
    toggleTrueBlack() {
      const on = this.$store.getters['device/trueBlack']
      // Back to Automatic when it would match the detection anyway
      const next = on ? 'off' : 'on'
      const auto = this.$store.getters['device/isOled'] ? 'on' : 'off'
      this.$store.dispatch('device/setAppearance', { trueBlack: next === auto ? 'auto' : next })
    },
    autoSleepTimerTimeUpdated(val) {
      if (!val) return // invalid times return falsy
      this.saveSettings()
    },
    androidAutoBrowseLimitForGroupingUpdated(val) {
      if (!val) return // invalid times return falsy
      if (val > 1000) val = 1000
      if (val < 30) val = 30
      this.saveSettings()
    },
    hapticFeedbackUpdated(val) {
      this.$store.commit('globals/setHapticFeedback', val)
      this.saveSettings()
    },
    showInfo(setting) {
      if (this.settingInfo[setting]) {
        Dialog.alert({
          title: this.settingInfo[setting].name,
          message: this.settingInfo[setting].message
        })
      }
    },
    async showConfirmMp3IndexSeeking() {
      const confirmResult = await Dialog.confirm({
        title: this.settingInfo.enableMp3IndexSeeking.name,
        message: this.settingInfo.enableMp3IndexSeeking.message,
        cancelButtonTitle: 'View More'
      })
      if (!confirmResult.value) {
        window.open('https://exoplayer.dev/troubleshooting.html#why-is-seeking-inaccurate-in-some-mp3-files', '_blank')
      }
    },
    toggleEnableMp3IndexSeeking() {
      this.settings.enableMp3IndexSeeking = !this.settings.enableMp3IndexSeeking
      this.saveSettings()
    },
    toggleAutoSleepTimer() {
      this.settings.autoSleepTimer = !this.settings.autoSleepTimer
      this.saveSettings()
    },
    toggleAutoSleepTimerAutoRewind() {
      this.settings.autoSleepTimerAutoRewind = !this.settings.autoSleepTimerAutoRewind
      this.saveSettings()
    },
    toggleDisableSleepTimerFadeOut() {
      this.settings.disableSleepTimerFadeOut = !this.settings.disableSleepTimerFadeOut
      this.saveSettings()
    },
    toggleDisableShakeToResetSleepTimer() {
      this.settings.disableShakeToResetSleepTimer = !this.settings.disableShakeToResetSleepTimer
      this.saveSettings()
    },
    toggleDisableSleepTimerResetFeedback() {
      this.settings.disableSleepTimerResetFeedback = !this.settings.disableSleepTimerResetFeedback
      this.saveSettings()
    },
    toggleSleepTimerAlmostDoneChime() {
      this.settings.enableSleepTimerAlmostDoneChime = !this.settings.enableSleepTimerAlmostDoneChime
      this.saveSettings()
    },
    toggleDisableAutoRewind() {
      this.settings.disableAutoRewind = !this.settings.disableAutoRewind
      this.saveSettings()
    },
    toggleEnableAltView() {
      this.settings.enableAltView = !this.settings.enableAltView
      this.saveSettings()
    },
    toggleAllowSeekingOnMediaControls() {
      this.settings.allowSeekingOnMediaControls = !this.settings.allowSeekingOnMediaControls
      this.saveSettings()
    },
    getCurrentOrientation() {
      const orientation = window.screen?.orientation || {}
      const type = orientation.type || ''

      if (type.includes('landscape')) return 'LANDSCAPE'
      return 'PORTRAIT' // default
    },
    toggleLockOrientation() {
      this.lockCurrentOrientation = !this.lockCurrentOrientation
      if (this.lockCurrentOrientation) {
        this.settings.lockOrientation = this.getCurrentOrientation()
      } else {
        this.settings.lockOrientation = 'NONE'
      }
      this.$setOrientationLock(this.settings.lockOrientation)
      this.saveSettings()
    },
    async saveSettings() {
      await this.$hapticsImpact()
      const updatedDeviceData = await this.$db.updateDeviceSettings({ ...this.settings })
      if (updatedDeviceData) {
        this.$store.commit('setDeviceData', updatedDeviceData)
        this.deviceData = updatedDeviceData
        this.$setLanguageCode(updatedDeviceData.deviceSettings?.languageCode || 'en-us')
        this.setDeviceSettings()
      }
    },
    setDeviceSettings() {
      const deviceSettings = this.deviceData.deviceSettings || {}
      this.settings.disableAutoRewind = !!deviceSettings.disableAutoRewind
      this.settings.enableAltView = !!deviceSettings.enableAltView
      this.settings.allowSeekingOnMediaControls = !!deviceSettings.allowSeekingOnMediaControls
      this.settings.jumpForwardTime = deviceSettings.jumpForwardTime || 10
      this.settings.jumpBackwardsTime = deviceSettings.jumpBackwardsTime || 10
      this.settings.enableMp3IndexSeeking = !!deviceSettings.enableMp3IndexSeeking

      this.settings.lockOrientation = deviceSettings.lockOrientation || 'NONE'
      this.lockCurrentOrientation = this.settings.lockOrientation !== 'NONE'
      this.settings.hapticFeedback = deviceSettings.hapticFeedback || 'LIGHT'

      this.settings.disableShakeToResetSleepTimer = !!deviceSettings.disableShakeToResetSleepTimer
      this.settings.shakeSensitivity = deviceSettings.shakeSensitivity || 'MEDIUM'
      this.settings.autoSleepTimer = !!deviceSettings.autoSleepTimer
      this.settings.autoSleepTimerStartTime = deviceSettings.autoSleepTimerStartTime || '22:00'
      this.settings.autoSleepTimerEndTime = deviceSettings.autoSleepTimerEndTime || '06:00'
      this.settings.sleepTimerLength = !isNaN(deviceSettings.sleepTimerLength) ? deviceSettings.sleepTimerLength : 900000 // 15 minutes
      this.settings.disableSleepTimerFadeOut = !!deviceSettings.disableSleepTimerFadeOut
      this.settings.disableSleepTimerResetFeedback = !!deviceSettings.disableSleepTimerResetFeedback
      this.settings.enableSleepTimerAlmostDoneChime = !!deviceSettings.enableSleepTimerAlmostDoneChime

      this.settings.autoSleepTimerAutoRewind = !!deviceSettings.autoSleepTimerAutoRewind
      this.settings.autoSleepTimerAutoRewindTime = !isNaN(deviceSettings.autoSleepTimerAutoRewindTime) ? deviceSettings.autoSleepTimerAutoRewindTime : 300000 // 5 minutes

      this.settings.languageCode = deviceSettings.languageCode || 'en-us'

      this.settings.downloadUsingCellular = deviceSettings.downloadUsingCellular || 'ALWAYS'
      this.settings.streamingUsingCellular = deviceSettings.streamingUsingCellular || 'ALWAYS'

      this.settings.androidAutoBrowseLimitForGrouping = deviceSettings.androidAutoBrowseLimitForGrouping
      this.settings.androidAutoBrowseSeriesSequenceOrder = deviceSettings.androidAutoBrowseSeriesSequenceOrder || 'ASC'
    },
    async init() {
      this.loading = true
      this.theme = this.$store.state.device.appearance.mode || 'system'
      this.deviceData = await this.$db.getDeviceData()
      this.$store.commit('setDeviceData', this.deviceData)
      this.setDeviceSettings()
      this.loading = false
    }
  },
  mounted() {
    this.init()
    this.loadLockscreen()
  }
}
</script>
