import { registerPlugin, WebPlugin } from '@capacitor/core'

// On-device transcription is Android-only for now. The web stub keeps the UI from crashing.
class AbsTranscriberWeb extends WebPlugin {
  async getModels() {
    return { models: [], defaultModelId: null }
  }
  async getTranscriptStatus({ key }) {
    return { key, status: 'none' }
  }
  async getTranscript() {
    return { lines: [], fromIndex: 0, status: { status: 'none' } }
  }
  async listTranscripts() {
    return { transcripts: [] }
  }
  async startTranscription() {
    throw new Error('Transcription is only available in the Android app')
  }
  async downloadModel() {
    throw new Error('Transcription is only available in the Android app')
  }
  async importModel() {
    throw new Error('Transcription is only available in the Android app')
  }
  async checkWithEbook() {
    throw new Error('Transcription is only available in the Android app')
  }
  async getEbookCheck() {
    return { check: null }
  }
  async updateSuggestions() {
    return { pending: 0 }
  }
  async cancelTranscription() {}
  async cancelModelDownload() {}
  async deleteModel() {}
  async pauseTranscription() {}
  async deleteTranscript() {}
  async syncTranscript() {
    return { result: 'unsupported' }
  }
  async syncAll() {}
  async getEbookText() {
    return { text: null }
  }
}

const AbsTranscriber = registerPlugin('AbsTranscriber', {
  web: () => new AbsTranscriberWeb()
})

export { AbsTranscriber }
