<template>
  <!-- After 30+ days away -->
  <div class="fixed inset-0 flex items-center justify-center px-6" style="z-index: 160; background: rgba(0, 0, 0, 0.55)">
    <div class="w-full max-w-sm rounded-2xl bg-secondary text-fg border border-border p-5" role="dialog" aria-labelledby="welcome-back-title">
      <span class="material-symbols text-4xl mb-2 block">waving_hand</span>
      <p id="welcome-back-title" class="text-lg font-semibold mb-4">It's been a while, need a refresher on how to use me?</p>
      <div class="flex gap-3">
        <button class="flex-1 py-2.5 rounded-full border border-border font-semibold" @click="answer(false)">No</button>
        <button class="flex-1 py-2.5 rounded-full bg-fg text-bg font-semibold" @click="answer(true)">Yes</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  methods: {
    answer(yes) {
      this.$store.dispatch('onboarding/answerWelcomeBack', yes)
    }
  }
}
</script>
