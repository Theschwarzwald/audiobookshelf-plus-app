<template>
  <!--
    The reader's bars, laid out like Grimmory's (and its web reader):
      top    ☰ sidebar · title · bookmark · tools · ⚙ · ✕   (narrow screens move the tools into ⋮)
      bottom « ‹ 15 of 288 › » · slider with ticks · Page + GO (wide) · Book Viewer / Doc Viewer
  -->
  <div class="reader-bars pointer-events-none absolute inset-0 z-40 flex flex-col justify-between" :style="{ color: p.fg, top: topOffset !== null ? `${topOffset}px` : 0 }">
    <!-- top -->
    <div class="pointer-events-auto rb-bar rb-top" :class="{ 'rb-hidden': !visible && !fade, 'rb-faded': !visible && fade, 'rb-noanim': p.eink }" :style="{ backgroundColor: p.bar, borderColor: p.border, paddingTop: topOffset !== null ? '0px' : 'max(env(safe-area-inset-top), 28px)' }" @touchstart.stop @touchend.stop @mousedown.stop @mouseup.stop>
      <div ref="top" class="flex items-center h-12 px-1">
        <rb-icon icon="view_sidebar" tour="rd-sidebar" label="Contents, pages and bookmarks" @click="$emit('sidebar')" />
        <p class="flex-grow min-w-0 text-center font-semibold truncate px-2 text-[15px]">{{ title }}</p>
        <rb-icon :icon="bookmarked ? 'bookmark' : 'bookmark_border'" tour="rd-bookmark" :label="bookmarked ? 'Remove bookmark' : 'Bookmark this page'" :selected="bookmarked" :fill="bookmarked" @click="$emit('bookmark')" />
        <template v-if="wide">
          <template v-if="kind === 'pages'">
            <rb-icon icon="zoom_out" label="Zoom out" @click="$emit('zoomOut')" />
            <button class="rb-text" @click="$emit('fit')">{{ fit === 'width' ? 'fit-width' : 'fit-page' }}</button>
            <rb-icon icon="zoom_in" label="Zoom in" @click="$emit('zoomIn')" />
            <rb-icon icon="description" label="One page" :selected="!double" @click="$emit('double', false)" />
            <rb-icon icon="auto_stories" label="Two pages" :selected="double" @click="$emit('double', true)" />
            <rb-icon icon="rotate_right" label="Rotate" @click="$emit('rotate')" />
            <rb-icon v-if="rtl !== null" icon="swap_horiz" :label="rtl ? 'Left to right' : 'Right to left (manga)'" :selected="rtl" @click="$emit('rtl')" />
            <rb-icon :icon="night ? 'dark_mode' : 'light_mode'" :label="night ? 'Normal pages' : 'Night mode'" :selected="night" @click="$emit('night')" />
          </template>
          <template v-else>
            <rb-icon icon="text_decrease" label="Smaller text" @click="$emit('fontSmaller')" />
            <rb-icon icon="text_increase" label="Larger text" @click="$emit('fontLarger')" />
          </template>
          <rb-icon v-if="reflow !== null" icon="wrap_text" tour="rd-reflow" :label="reflow ? 'Original pages' : 'Reflow text to the screen'" :selected="reflow" @click="$emit('reflow')" />
          <rb-icon v-if="searchable" icon="search" label="Search in book" @click="$emit('search')" />
          <rb-icon :icon="fullscreen ? 'fullscreen_exit' : 'fullscreen'" :label="fullscreen ? 'Exit fullscreen' : 'Fullscreen'" @click="$emit('fullscreen')" />
          <rb-icon icon="settings" tour="rd-settings" label="Reader settings" @click="$emit('settings')" />
        </template>
        <template v-else>
          <button v-if="kind === 'pages' && !reflow" class="rb-text" @click="$emit('fit')">{{ fit === 'width' ? 'fit-width' : 'fit-page' }}</button>
          <rb-icon v-if="reflow !== null" icon="wrap_text" tour="rd-reflow" :label="reflow ? 'Original pages' : 'Reflow text to the screen'" :selected="reflow" @click="$emit('reflow')" />
          <rb-icon v-if="searchable" icon="search" label="Search in book" @click="$emit('search')" />
          <rb-icon icon="more_vert" tour="rd-tools" label="More tools" @click="menu = !menu" />
        </template>
        <rb-icon icon="close" tour="rd-close" label="Close" @click="$emit('close')" />
      </div>
    </div>

    <!-- ⋮ on phones -->
    <div v-if="menu && visible" class="pointer-events-auto absolute right-2 z-50 rounded-lg py-1 shadow-xl min-w-[220px]" :style="{ top: menuTop, backgroundColor: p.panel, border: `1px solid ${p.border}` }" @touchstart.stop @touchend.stop @mousedown.stop @mouseup.stop>
      <button v-for="item in menuItems" :key="item.label" class="w-full flex items-center px-4 py-3 text-left text-sm" @click="menu = false; item.action()">
        <span class="material-symbols text-xl mr-3" :style="{ color: item.selected ? p.accent : p.fg }">{{ item.icon }}</span>{{ item.label }}
      </button>
    </div>

    <!-- bottom -->
    <div class="pointer-events-auto rb-bar rb-bottom" :class="{ 'rb-hidden-bottom': !visible && !fade, 'rb-faded': !visible && fade, 'rb-noanim': p.eink }" :style="{ backgroundColor: p.bar, borderColor: p.border, bottom: `${bottomOffset}px` }" @touchstart.stop @touchend.stop @mousedown.stop @mouseup.stop>
      <div v-if="wide" data-tour="rd-pages" class="flex items-center px-3 py-1.5">
        <div class="flex items-center gap-1">
          <rb-box icon="first_page" label="First page" @click="go('first')" />
          <rb-box icon="chevron_left" label="Previous page" @click="go('prev')" />
          <input v-if="editingPos" ref="posInput" v-model="posText" class="rb-pos rb-posinput" inputmode="numeric" enterkeyhint="go" :placeholder="positionLabel" :style="{ borderColor: p.accent, color: p.accent, backgroundColor: p.field }" @keyup.enter="finishPos" @blur="editingPos = false" @click.stop />
          <button v-else class="rb-pos" :style="{ borderColor: p.border, color: p.accent }" title="Type a page number" @click.stop="startPos">{{ positionLabel }}</button>
          <rb-box icon="chevron_right" label="Next page" @click="go('next')" />
          <rb-box icon="last_page" label="Last page" @click="go('last')" />
        </div>
        <rb-slider class="flex-grow mx-3" />
        <div v-if="kind === 'pages'" class="flex items-center mr-3">
          <input v-model="jump" class="rb-jump" inputmode="numeric" placeholder="Page" :style="{ backgroundColor: p.field, borderColor: p.border, color: p.fg }" @keyup.enter="doJump" />
          <button class="rb-go" :style="{ backgroundColor: p.accentSoft, color: p.accent }" @click="doJump">GO</button>
        </div>
        <rb-modes :compact="false" />
      </div>
      <div v-else data-tour="rd-pages" class="px-2 pb-1.5">
        <rb-slider class="px-1" />
        <div class="flex items-center">
          <div class="flex items-center gap-1">
            <rb-box icon="first_page" label="First page" @click="go('first')" />
            <rb-box icon="chevron_left" label="Previous page" @click="go('prev')" />
            <input v-if="editingPos" ref="posInput" v-model="posText" class="rb-pos rb-posinput" inputmode="numeric" enterkeyhint="go" :placeholder="positionLabel" :style="{ borderColor: p.accent, color: p.accent, backgroundColor: p.field }" @keyup.enter="finishPos" @blur="editingPos = false" @click.stop />
            <button v-else class="rb-pos" :style="{ borderColor: p.border, color: p.accent }" title="Type a page number" @click.stop="startPos">{{ positionLabel }}</button>
            <rb-box icon="chevron_right" label="Next page" @click="go('next')" />
            <rb-box icon="last_page" label="Last page" @click="go('last')" />
          </div>
          <div class="flex-grow" />
          <rb-modes :compact="true" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  components: {
    RbIcon: {
      props: { icon: String, label: String, selected: Boolean, fill: Boolean, tour: String },
      inject: ['rbPalette'],
      render(h) {
        const p = this.rbPalette()
        return h('button', { class: 'rb-icon', attrs: { 'aria-label': this.label, title: this.label, 'data-tour': this.tour || null }, on: { click: (e) => (e.stopPropagation(), this.$emit('click')) } }, [h('span', { class: ['material-symbols', { fill: this.fill }], style: { color: this.selected ? p.accent : p.fg, fontSize: '22px' } }, this.icon)])
      }
    },
    RbBox: {
      props: { icon: String, label: String },
      inject: ['rbPalette'],
      render(h) {
        const p = this.rbPalette()
        return h('button', { class: 'rb-box', style: { borderColor: p.border }, attrs: { 'aria-label': this.label, title: this.label }, on: { click: (e) => (e.stopPropagation(), this.$emit('click')) } }, [h('span', { class: 'material-symbols', style: { fontSize: '18px', color: p.fg } }, this.icon)])
      }
    },
    RbSlider: {
      inject: ['rbBars'],
      render(h) {
        const bars = this.rbBars()
        const p = bars.p
        const ticks = []
        for (let i = 0; i <= 12; i++) ticks.push(h('span', { class: 'rb-tick', style: { left: `${(i / 12) * 100}%`, backgroundColor: p.faint } }))
        return h('div', { class: 'rb-slider' }, [
          h('div', { class: 'rb-ticks' }, ticks),
          h('input', {
            attrs: { type: 'range', min: 0, max: bars.sliderMax, step: 1 },
            domProps: { value: bars.sliderValue },
            style: { accentColor: p.accent },
            on: { change: (e) => bars.slide(Number(e.target.value)), input: (e) => bars.sliding(Number(e.target.value)) }
          })
        ])
      }
    },
    RbModes: {
      props: { compact: Boolean },
      inject: ['rbBars'],
      render(h) {
        const bars = this.rbBars()
        const p = bars.p
        const modes = [
          { id: 'book', icon: 'auto_stories', label: 'Book Viewer' },
          { id: 'doc', icon: 'description', label: 'Doc Viewer' }
        ]
        return h(
          'div',
          { class: 'rb-modes', style: { borderColor: p.border }, attrs: { 'data-tour': 'rd-viewer' } },
          modes.map((m) =>
            h(
              'button',
              {
                class: 'rb-mode',
                style: { backgroundColor: bars.mode === m.id ? p.accent : 'transparent', color: bars.mode === m.id ? p.onAccent : p.fg, borderColor: p.border },
                attrs: { 'aria-label': m.label, title: m.label },
                on: { click: (e) => (e.stopPropagation(), bars.$emit('mode', m.id)) }
              },
              [h('span', { class: 'material-symbols', style: { fontSize: '16px' } }, m.icon), this.compact ? null : h('span', { class: 'ml-1.5 text-[13px] font-semibold' }, m.label)]
            )
          )
        )
      }
    }
  },
  provide() {
    return { rbPalette: () => this.p, rbBars: () => this }
  },
  props: {
    p: { type: Object, required: true },
    visible: Boolean,
    /** Hide by fading out in place (Read along while the audio plays) rather than sliding away */
    fade: Boolean,
    /** pages (PDF, comics) | ebook */
    kind: { type: String, default: 'ebook' },
    title: String,
    bookmarked: Boolean,
    searchable: Boolean,
    fullscreen: Boolean,
    // pages
    page: { type: Number, default: 0 },
    pageCount: { type: Number, default: 0 },
    fit: { type: String, default: 'page' },
    double: Boolean,
    rtl: { type: Boolean, default: null },
    night: Boolean,
    /** PDF text reflowed to the screen: true / false; null = not offered (comics, scanned pages) */
    reflow: { type: Boolean, default: null },
    // ebook
    fraction: { type: Number, default: 0 },
    location: { type: String, default: '' },
    // both: book | doc
    mode: { type: String, default: 'book' },
    bottomOffset: { type: Number, default: 0 },
    /** Foldable on a table: the bars live below the hinge */
    topOffset: { type: Number, default: null }
  },
  data() {
    return { width: window.innerWidth, menu: false, jump: '', slidingValue: null, editingPos: false, posText: '' }
  },
  computed: {
    wide() {
      return this.width >= 720
    },
    menuTop() {
      return 'calc(max(env(safe-area-inset-top), 28px) + 48px)'
    },
    positionLabel() {
      if (this.kind === 'pages') return `${this.page + 1} of ${this.pageCount || 1}`
      return this.location || `${Math.round(this.fraction * 100)}%`
    },
    sliderMax() {
      return this.kind === 'pages' ? Math.max(0, this.pageCount - 1) : 1000
    },
    sliderValue() {
      if (this.slidingValue !== null) return this.slidingValue
      return this.kind === 'pages' ? this.page : Math.round(this.fraction * 1000)
    },
    menuItems() {
      const items = []
      if (this.kind === 'pages') {
        items.push({ label: 'Zoom in', icon: 'zoom_in', action: () => this.$emit('zoomIn') })
        items.push({ label: 'Zoom out', icon: 'zoom_out', action: () => this.$emit('zoomOut') })
        items.push({ label: this.double ? 'One page' : 'Two pages', icon: this.double ? 'description' : 'auto_stories', action: () => this.$emit('double', !this.double) })
        items.push({ label: 'Rotate', icon: 'rotate_right', action: () => this.$emit('rotate') })
        if (this.rtl !== null) items.push({ label: this.rtl ? 'Left to right' : 'Right to left (manga)', icon: 'swap_horiz', selected: this.rtl, action: () => this.$emit('rtl') })
        items.push({ label: this.night ? 'Normal pages' : 'Night mode', icon: this.night ? 'light_mode' : 'dark_mode', selected: this.night, action: () => this.$emit('night') })
      } else {
        items.push({ label: 'Larger text', icon: 'text_increase', action: () => this.$emit('fontLarger') })
        items.push({ label: 'Smaller text', icon: 'text_decrease', action: () => this.$emit('fontSmaller') })
      }
      items.push({ label: this.fullscreen ? 'Exit fullscreen' : 'Fullscreen', icon: this.fullscreen ? 'fullscreen_exit' : 'fullscreen', action: () => this.$emit('fullscreen') })
      items.push({ label: 'Reader settings', icon: 'settings', action: () => this.$emit('settings') })
      return items
    }
  },
  watch: {
    visible(v) {
      if (!v) this.menu = false
    }
  },
  methods: {
    go(where) {
      if (this.kind === 'pages') {
        const last = Math.max(0, this.pageCount - 1)
        const target = { first: 0, prev: this.page - 1, next: this.page + 1, last }[where]
        if (where === 'prev' || where === 'next') this.$emit('step', where === 'next' ? 1 : -1)
        else this.$emit('goPage', Math.max(0, Math.min(last, target)))
      } else {
        if (where === 'first') this.$emit('goFraction', 0)
        else if (where === 'last') this.$emit('goFraction', 0.9999)
        else this.$emit('step', where === 'next' ? 1 : -1)
      }
    },
    sliding(v) {
      this.slidingValue = v
      this.$emit('sliding', this.kind === 'pages' ? v : v / 1000)
    },
    slide(v) {
      this.slidingValue = null
      if (this.kind === 'pages') this.$emit('goPage', v)
      else this.$emit('goFraction', v / 1000)
    },
    /** "4 of 350": tap it and type the page */
    startPos() {
      this.posText = ''
      this.editingPos = true
      this.$nextTick(() => this.$refs.posInput && this.$refs.posInput.focus())
    },
    finishPos() {
      const n = parseInt(this.posText, 10)
      this.editingPos = false
      if (isNaN(n)) return
      if (this.kind === 'pages') this.$emit('goPage', Math.max(0, Math.min(this.pageCount - 1, n - 1)))
      else this.$emit('goPageNumber', n)
    },
    doJump() {
      const n = parseInt(this.jump, 10)
      this.jump = ''
      if (!isNaN(n)) this.$emit('goPage', Math.max(0, Math.min(this.pageCount - 1, n - 1)))
    },
    onResize() {
      this.width = window.innerWidth
    }
  },
  mounted() {
    window.addEventListener('resize', this.onResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResize)
  }
}
</script>

<style scoped>
.rb-posinput {
  width: 96px;
  text-align: center;
  outline: none;
}
.rb-bar {
  transition: transform 0.2s ease, opacity 0.3s ease;
}
.rb-faded {
  opacity: 0;
  pointer-events: none !important;
  transition: opacity 1.2s ease;
}
.rb-top {
  border-bottom: 1px solid;
}
.rb-bottom {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1px solid;
  padding-bottom: env(safe-area-inset-bottom);
}
.rb-hidden {
  transform: translateY(-110%);
}
.rb-hidden-bottom {
  transform: translateY(110%);
}
.rb-noanim {
  transition: none;
}
.reader-bars >>> .rb-icon {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  flex-shrink: 0;
}
.rb-text {
  font-size: 13px;
  font-weight: 600;
  padding: 0 8px;
  white-space: nowrap;
}
.reader-bars >>> .rb-box {
  width: 34px;
  height: 34px;
  border: 1px solid;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.rb-pos {
  border: 1px solid;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}
.reader-bars >>> .rb-slider {
  position: relative;
  height: 36px;
  display: flex;
  align-items: center;
}
.reader-bars >>> .rb-ticks {
  position: absolute;
  left: 10px;
  right: 10px;
  top: 13px;
  height: 10px;
}
.reader-bars >>> .rb-tick {
  position: absolute;
  width: 1px;
  height: 10px;
}
.reader-bars >>> .rb-slider input {
  position: relative;
  width: 100%;
}
.rb-jump {
  width: 72px;
  height: 34px;
  border: 1px solid;
  border-radius: 6px 0 0 6px;
  padding: 0 10px;
  font-size: 13px;
  outline: none;
}
.rb-go {
  height: 34px;
  padding: 0 12px;
  border-radius: 0 6px 6px 0;
  font-size: 12px;
  font-weight: 700;
}
.reader-bars >>> .rb-modes {
  display: flex;
  border: 1px solid;
  border-radius: 8px;
  overflow: hidden;
}
.reader-bars >>> .rb-mode {
  height: 34px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
}
.reader-bars >>> .rb-mode + .rb-mode {
  border-left: 1px solid;
}
</style>
