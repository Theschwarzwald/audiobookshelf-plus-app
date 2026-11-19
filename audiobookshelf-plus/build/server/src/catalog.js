'use strict'
/**
 * Local library catalogue and Dewey Decimal browsing.
 *
 * Catalogue: a copy of Open Library's editions + authors dumps (CC0) built into <CATALOG_DIR>/catalog.sqlite
 * by worker/catalog.py (about 13 GB download; the build runs in the background and can be resumed).
 * Used to look up Dewey numbers (and ISBN details) without asking the internet.
 *
 * Dewey: every book in Audiobookshelf gets a Dewey number from, in order: a number set by an admin,
 * the local catalogue by ISBN, the local catalogue by title + author, then Open Library online; when no edition
 * has a Dewey number, its Library of Congress class converted to Dewey (lccToDdc).
 * Stored in <DATA_DIR>/dewey.json { <itemId>: { ddc, source, at } } (ddc null = looked, nothing found).
 */
const fs = require('fs')
const path = require('path')
const readline = require('readline')
const { spawn } = require('child_process')
const config = require('./config')
const log = require('./log')

const CATALOG_DIR = process.env.CATALOG_DIR || '/catalog'
const SCRIPT = path.join(__dirname, '..', '..', 'worker', 'catalog.py')

// ---------------------------------------------------------------- Dewey names (classes and divisions)
const CLASSES = {
  0: 'Computer science, information & general works',
  1: 'Philosophy & psychology',
  2: 'Religion',
  3: 'Social sciences',
  4: 'Language',
  5: 'Science',
  6: 'Technology',
  7: 'Arts & recreation',
  8: 'Literature',
  9: 'History & geography'
}
const DIVISIONS = {
  '00': 'Computer science, knowledge & systems', '01': 'Bibliographies', '02': 'Library & information sciences', '03': 'Encyclopedias & books of facts', '04': 'Unassigned', '05': 'Magazines, journals & serials', '06': 'Associations, organizations & museums', '07': 'News media, journalism & publishing', '08': 'Quotations', '09': 'Manuscripts & rare books',
  '10': 'Philosophy', '11': 'Metaphysics', '12': 'Epistemology', '13': 'Parapsychology & occultism', '14': 'Philosophical schools of thought', '15': 'Psychology', '16': 'Philosophical logic', '17': 'Ethics', '18': 'Ancient, medieval & eastern philosophy', '19': 'Modern western philosophy',
  '20': 'Religion', '21': 'Philosophy & theory of religion', '22': 'The Bible', '23': 'Christianity', '24': 'Christian practice & observance', '25': 'Christian pastoral practice & religious orders', '26': 'Christian organization, social work & worship', '27': 'History of Christianity', '28': 'Christian denominations', '29': 'Other religions',
  '30': 'Social sciences, sociology & anthropology', '31': 'Statistics', '32': 'Political science', '33': 'Economics', '34': 'Law', '35': 'Public administration & military science', '36': 'Social problems & social services', '37': 'Education', '38': 'Commerce, communications & transportation', '39': 'Customs, etiquette & folklore',
  '40': 'Language', '41': 'Linguistics', '42': 'English & Old English languages', '43': 'German & related languages', '44': 'French & related languages', '45': 'Italian, Romanian & related languages', '46': 'Spanish, Portuguese, Galician', '47': 'Latin & Italic languages', '48': 'Classical & modern Greek languages', '49': 'Other languages',
  '50': 'Science', '51': 'Mathematics', '52': 'Astronomy', '53': 'Physics', '54': 'Chemistry', '55': 'Earth sciences & geology', '56': 'Fossils & prehistoric life', '57': 'Biology', '58': 'Plants (Botany)', '59': 'Animals (Zoology)',
  '60': 'Technology', '61': 'Medicine & health', '62': 'Engineering', '63': 'Agriculture', '64': 'Home & family management', '65': 'Management & public relations', '66': 'Chemical engineering', '67': 'Manufacturing', '68': 'Manufacture for specific uses', '69': 'Construction of buildings',
  '70': 'Arts', '71': 'Area planning & landscape architecture', '72': 'Architecture', '73': 'Sculpture, ceramics & metalwork', '74': 'Graphic arts & decorative arts', '75': 'Painting', '76': 'Printmaking & prints', '77': 'Photography, computer art, film, video', '78': 'Music', '79': 'Sports, games & entertainment',
  '80': 'Literature, rhetoric & criticism', '81': 'American literature in English', '82': 'English & Old English literatures', '83': 'German & related literatures', '84': 'French & related literatures', '85': 'Italian, Romanian & related literatures', '86': 'Spanish, Portuguese, Galician literatures', '87': 'Latin & Italic literatures', '88': 'Classical & modern Greek literatures', '89': 'Other literatures',
  '90': 'History', '91': 'Geography & travel', '92': 'Biography & genealogy', '93': 'History of ancient world (to ca. 499)', '94': 'History of Europe', '95': 'History of Asia', '96': 'History of Africa', '97': 'History of North America', '98': 'History of South America', '99': 'History of other areas'
}
/** A few well-used sections, so the number reads as something */
const SECTIONS = { 813: 'American fiction', 823: 'English fiction', 833: 'German fiction', 843: 'French fiction', 853: 'Italian fiction', 863: 'Spanish fiction', 891: 'East Indo-European & Celtic literatures', 895: 'Literatures of East & Southeast Asia', 920: 'Biography', 940: 'History of Europe', 973: 'United States', 641: 'Food & drink', 650: 'Management', 658: 'General management', 155: 'Differential & developmental psychology', 158: 'Applied psychology', '004': 'Computer science', '005': 'Computer programming, programs & data', 306: 'Culture & institutions', 320: 'Political science', 327: 'International relations', 330: 'Economics', 332: 'Financial economics', 616: 'Diseases', 613: 'Personal health & safety', 796: 'Athletic & outdoor sports', 523: 'Specific celestial bodies', 576: 'Genetics & evolution', 599: 'Mammals', 909: 'World history', 910: 'Geography & travel', 133: 'Parapsychology & occultism', 179: 'Other ethical norms', 294: 'Religions of Indic origin', 297: 'Islam', 296: 'Judaism', 248: 'Christian experience, practice, life', 808: 'Rhetoric & collections of literature', 811: 'American poetry', 821: 'English poetry', 822: 'English drama', 791: 'Public performances (film, TV, radio)', 781: 'General principles & musical forms', 782: 'Vocal music' }
const pad3 = (n) => String(n).padStart(3, '0')
function describe(ddc) {
  if (!ddc) return null
  const m = String(ddc).match(/^(\d)(\d)(\d)/)
  if (!m) return null
  const cls = Number(m[1])
  const div = m[1] + m[2]
  const sec = Number(m[1] + m[2] + m[3])
  return { ddc, class: `${m[1]}00`, className: CLASSES[cls], division: `${div}0`, divisionName: DIVISIONS[div], section: pad3(sec), sectionName: SECTIONS[pad3(sec)] || null }
}

/** Most common Dewey class among several editions; the most precise number with that prefix */
function pickDdc(list) {
  const clean = (list || []).map((d) => (String(d).match(/\d{3}(?:\.\d+)?/) || [])[0]).filter(Boolean)
  if (!clean.length) return null
  const count = {}
  clean.forEach((d) => (count[d.slice(0, 3)] = (count[d.slice(0, 3)] || 0) + 1))
  const best = Object.keys(count).sort((a, b) => count[b] - count[a])[0]
  return clean.filter((d) => d.startsWith(best)).sort((a, b) => b.length - a.length)[0]
}

// ---------------------------------------------------------------- Library of Congress → Dewey
/**
 * Many editions in Open Library carry a Library of Congress class but no Dewey number (most recent books and
 * translations). Their LC class converts to the matching Dewey class or section: PS 3618 (American fiction)
 * → 813, QB (astronomy) → 520, PL 873 (Japanese literature) → 895.63. It's the class, not a library's exact
 * number, but it puts the book on the right shelf. Rows: [LC letters, from, to, Dewey]; the most specific
 * range wins. A Dewey literature entry ending in "L" becomes fiction (…3) or literature in general (…0).
 */
const LCC_TO_DDC = [
  ['A', 0, 1e9, '000'], ['AE', 0, 1e9, '030'], ['AG', 0, 1e9, '030'], ['AM', 0, 1e9, '069'], ['AP', 0, 1e9, '050'], ['AS', 0, 1e9, '060'], ['AZ', 0, 1e9, '001'],
  ['B', 0, 1e9, '100'], ['B', 69, 789, '180'], ['B', 790, 5802, '190'], ['BC', 0, 1e9, '160'], ['BD', 0, 1e9, '110'], ['BF', 0, 1e9, '150'], ['BF', 1001, 1400, '133'], ['BF', 1401, 2055, '133'], ['BH', 0, 1e9, '111'], ['BJ', 0, 1e9, '170'], ['BJ', 1518, 1697, '158'],
  ['BL', 0, 1e9, '200'], ['BL', 1000, 2370, '294'], ['BM', 0, 1e9, '296'], ['BP', 0, 1e9, '297'], ['BQ', 0, 1e9, '294.3'], ['BR', 0, 1e9, '270'], ['BS', 0, 1e9, '220'], ['BT', 0, 1e9, '230'], ['BV', 0, 1e9, '248'], ['BX', 0, 1e9, '280'],
  ['C', 0, 1e9, '900'], ['CB', 0, 1e9, '909'], ['CC', 0, 1e9, '930'], ['CS', 0, 1e9, '929'], ['CT', 0, 1e9, '920'],
  ['D', 0, 1e9, '909'], ['D', 501, 680, '940.3'], ['D', 731, 838, '940.53'], ['DA', 0, 1e9, '941'], ['DAW', 0, 1e9, '943'], ['DB', 0, 1e9, '943.6'], ['DC', 0, 1e9, '944'], ['DD', 0, 1e9, '943'], ['DE', 0, 1e9, '938'], ['DF', 0, 1e9, '938'], ['DG', 0, 1e9, '937'], ['DG', 401, 1e9, '945'], ['DH', 0, 1e9, '949.3'], ['DJ', 0, 1e9, '949.2'], ['DJK', 0, 1e9, '947'], ['DK', 0, 1e9, '947'], ['DL', 0, 1e9, '948'], ['DP', 0, 1e9, '946'], ['DQ', 0, 1e9, '949.4'], ['DR', 0, 1e9, '949.6'],
  ['DS', 0, 1e9, '950'], ['DS', 41, 329, '956'], ['DS', 330, 500, '954'], ['DS', 501, 937, '950'], ['DS', 701, 799, '951'], ['DS', 801, 897, '952'], ['DS', 901, 937, '951.9'], ['DT', 0, 1e9, '960'], ['DU', 0, 1e9, '990'], ['DX', 0, 1e9, '909'],
  ['E', 0, 1e9, '970'], ['E', 151, 1e9, '973'], ['F', 0, 1e9, '974'], ['F', 1001, 1145, '971'], ['F', 1201, 1392, '972'], ['F', 1401, 1e9, '980'],
  ['G', 0, 1e9, '910'], ['GA', 0, 1e9, '526'], ['GB', 0, 1e9, '551'], ['GC', 0, 1e9, '551.46'], ['GE', 0, 1e9, '333.7'], ['GF', 0, 1e9, '304.2'], ['GN', 0, 1e9, '306'], ['GR', 0, 1e9, '398'], ['GT', 0, 1e9, '390'], ['GV', 0, 1e9, '790'], ['GV', 557, 1198, '796'], ['GV', 1199, 1570, '793'], ['GV', 1580, 1799, '792.8'],
  ['H', 0, 1e9, '300'], ['HA', 0, 1e9, '310'], ['HB', 0, 1e9, '330'], ['HC', 0, 1e9, '330.9'], ['HD', 0, 1e9, '338'], ['HD', 4801, 8943, '331'], ['HE', 0, 1e9, '380'], ['HF', 0, 1e9, '380'], ['HF', 5001, 6182, '650'], ['HG', 0, 1e9, '332'], ['HJ', 0, 1e9, '336'], ['HM', 0, 1e9, '301'], ['HM', 846, 851, '303.48'], ['HN', 0, 1e9, '306'], ['HQ', 0, 1e9, '306'], ['HQ', 1101, 2030, '305.4'], ['HS', 0, 1e9, '366'], ['HT', 0, 1e9, '307'], ['HV', 0, 1e9, '360'], ['HV', 6001, 7220, '364'], ['HX', 0, 1e9, '335'],
  ['J', 0, 1e9, '320'], ['JA', 0, 1e9, '320'], ['JC', 0, 1e9, '320'], ['JF', 0, 1e9, '320'], ['JK', 0, 1e9, '320.973'], ['JS', 0, 1e9, '352'], ['JV', 0, 1e9, '325'], ['JX', 0, 1e9, '327'], ['JZ', 0, 1e9, '327'],
  ['K', 0, 1e9, '340'], ['L', 0, 1e9, '370'], ['M', 0, 1e9, '780'], ['ML', 0, 1e9, '780.9'], ['MT', 0, 1e9, '781'],
  ['N', 0, 1e9, '700'], ['NA', 0, 1e9, '720'], ['NB', 0, 1e9, '730'], ['NC', 0, 1e9, '741'], ['ND', 0, 1e9, '750'], ['NE', 0, 1e9, '760'], ['NK', 0, 1e9, '745'], ['NX', 0, 1e9, '700'],
  ['P', 0, 1e9, '400'], ['PA', 0, 1e9, '880'], ['PA', 2001, 2995, '870'], ['PA', 6000, 6971, '870'], ['PB', 0, 1e9, '891.6'], ['PC', 0, 1e9, '440'], ['PD', 0, 1e9, '439.5'], ['PE', 0, 1e9, '420'], ['PF', 0, 1e9, '439.3'], ['PG', 0, 1e9, '891.8'], ['PG', 2900, 3698, '891.7L'], ['PH', 0, 1e9, '894'],
  ['PJ', 0, 1e9, '892'], ['PJ', 7501, 8517, '892.7L'], ['PK', 0, 1e9, '891.4'], ['PL', 0, 1e9, '895'], ['PL', 501, 898, '895.6L'], ['PL', 901, 998, '895.7L'], ['PL', 1001, 3208, '895.1L'], ['PM', 0, 1e9, '897'],
  ['PN', 0, 1e9, '800'], ['PN', 1990, 1992.9, '791.44'], ['PN', 1993, 1999, '791.43'], ['PN', 2000, 3307, '792'], ['PN', 4699, 5650, '070'], ['PN', 6099, 6110, '808.81'], ['PN', 6110.5, 6790, '808.8'],
  ['PQ', 0, 3999, '84L'], ['PQ', 4001, 5999, '85L'], ['PQ', 6001, 8929, '86L'], ['PQ', 9000, 1e9, '869L'], ['PR', 0, 1e9, '82L'], ['PS', 0, 1e9, '81L'], ['PT', 0, 4899, '83L'], ['PT', 5001, 5980, '839.3L'], ['PT', 7001, 9999, '839.7L'], ['PZ', 0, 1e9, '813'],
  ['Q', 0, 1e9, '500'], ['QA', 0, 1e9, '510'], ['QA', 75, 76.99, '004'], ['QB', 0, 1e9, '520'], ['QC', 0, 1e9, '530'], ['QD', 0, 1e9, '540'], ['QE', 0, 1e9, '550'], ['QE', 701, 996, '560'], ['QH', 0, 1e9, '508'], ['QH', 301, 705, '570'], ['QH', 359, 425, '576'], ['QK', 0, 1e9, '580'], ['QL', 0, 1e9, '590'], ['QL', 700, 739.8, '599'], ['QM', 0, 1e9, '611'], ['QP', 0, 1e9, '612'], ['QR', 0, 1e9, '579'],
  ['R', 0, 1e9, '610'], ['RA', 0, 1e9, '613'], ['RC', 0, 1e9, '616'], ['RC', 435, 571, '616.89'], ['RJ', 0, 1e9, '618.92'], ['RM', 0, 1e9, '615'], ['RS', 0, 1e9, '615'], ['RT', 0, 1e9, '610.73'],
  ['S', 0, 1e9, '630'], ['SB', 0, 1e9, '635'], ['SD', 0, 1e9, '634.9'], ['SF', 0, 1e9, '636'], ['SH', 0, 1e9, '639'], ['SK', 0, 1e9, '799'],
  ['T', 0, 1e9, '600'], ['TA', 0, 1e9, '620'], ['TC', 0, 1e9, '627'], ['TD', 0, 1e9, '628'], ['TE', 0, 1e9, '625'], ['TF', 0, 1e9, '625.1'], ['TG', 0, 1e9, '624'], ['TH', 0, 1e9, '690'], ['TJ', 0, 1e9, '621'], ['TK', 0, 1e9, '621.3'], ['TK', 5101, 6720, '621.38'], ['TK', 5105.5, 5105.99, '004.6'], ['TK', 7882, 7882.99, '621.389'], ['TK', 7800, 8360, '621.381'], ['TL', 0, 1e9, '629'], ['TN', 0, 1e9, '622'], ['TP', 0, 1e9, '660'], ['TR', 0, 1e9, '770'], ['TS', 0, 1e9, '670'], ['TT', 0, 1e9, '745.5'], ['TX', 0, 1e9, '640'], ['TX', 641, 840, '641.5'],
  ['U', 0, 1e9, '355'], ['UB', 250, 271, '355.3432'], ['V', 0, 1e9, '359'], ['Z', 0, 1e9, '020'], ['Z', 4, 115, '002'], ['Z', 116, 659, '070.5'], ['Z', 1001, 8999, '016']
]
const FICTION = /fiction|novel|fantasy|sci-?fi|thriller|mystery|romance|horror|short stor|dystop|adventure|crime|western/i
const NONFICTION = /non-?fiction|memoir|biograph|essays?\b|poetry|history|criticism/i

/**
 * One LC class ("PS-3618.00000000.E5478D35 2019", "QB460.72 .T97", "PL873.U73") as a Dewey class, or null.
 * fiction: true / false / null (unknown, from the book's genres), for the literature classes.
 */
function lccToDdc(lcc, fiction) {
  const m = String(lcc || '')
    .toUpperCase()
    .match(/^\s*([A-Z]{1,3})[\s-]*0*(\d+(?:\.\d+)?)?/)
  if (!m) return null
  const letters = m[1]
  const num = m[2] != null ? Number(m[2]) : 0
  let best = null
  for (const row of LCC_TO_DDC) {
    if (row[0] !== letters || num < row[1] || num > row[2]) continue
    if (!best || row[2] - row[1] < best[2] - best[1]) best = row
  }
  if (!best) return null
  let d = best[3]
  if (d.endsWith('L')) {
    // literature: fiction is the …3 section ("81" → 813, "895.6" → 895.63); unknown counts as fiction (most audiobooks)
    const base = d.slice(0, -1)
    const fic = fiction !== false
    d = base.length === 2 ? base + (fic ? '3' : '0') : base + (fic ? '3' : '')
  }
  return d
}

/** The Dewey class most of these LC classes agree on */
function pickFromLcc(list, fiction) {
  return pickDdc((list || []).map((l) => lccToDdc(l, fiction)).filter(Boolean))
}

// ---------------------------------------------------------------- the local catalogue

class Catalog {
  constructor() {
    this.dir = CATALOG_DIR
    this.builder = null
    this.server = null
    this.pending = new Map()
    this.nextId = 1
  }

  file() {
    return path.join(this.dir, 'catalog.sqlite')
  }
  ready() {
    return fs.existsSync(this.file())
  }

  status() {
    let st = {}
    try {
      st = JSON.parse(fs.readFileSync(path.join(this.dir, 'status.json'), 'utf8'))
    } catch (e) {}
    let size = 0
    try {
      size = fs.statSync(this.file()).size
    } catch (e) {}
    let free = null
    try {
      const s = fs.statfsSync(fs.existsSync(this.dir) ? this.dir : '/')
      free = s.bavail * s.bsize
    } catch (e) {}
    return { ready: this.ready(), building: !!this.builder, size, freeBytes: free, dir: this.dir, ...st }
  }

  startBuild() {
    if (this.builder) return this.status()
    clearTimeout(this.retryTimer)
    this.cancelled = false
    fs.mkdirSync(this.dir, { recursive: true })
    this.stopServer()
    log.info('Catalogue: downloading and building the Open Library copy (this takes a while)')
    const p = spawn(config.workerCmd, [SCRIPT, 'build', this.dir], { stdio: ['ignore', 'ignore', 'pipe'] })
    try {
      require('os').setPriority(p.pid, 15) // background: everything else comes first
    } catch (e) {}
    const tail = []
    p.stderr.on('data', (d) => {
      tail.push(String(d))
      if (tail.length > 20) tail.shift()
    })
    p.on('exit', (code, signal) => {
      this.builder = null
      if (code === 0) {
        this.retries = 0
        log.info('Catalogue: ready')
        if (typeof this.onReady === 'function') setTimeout(() => this.onReady(), 5000) // Dewey: look again with it
        return
      }
      log.warn(`Catalogue build stopped (${signal || code}): ${tail.join('').slice(-300)}`)
      if (this.cancelled) return // an admin stopped it
      // it crashed: try again by itself, waiting longer each time (1, 5, 15, 30, then every 60 minutes);
      // the download resumes where it was
      this.retries = (this.retries || 0) + 1
      const mins = [1, 5, 15, 30][this.retries - 1] || 60
      log.info(`Catalogue: trying again in ${mins} minute${mins === 1 ? '' : 's'} (attempt ${this.retries + 1})`)
      clearTimeout(this.retryTimer)
      this.retryTimer = setTimeout(() => this.startBuild(), mins * 60 * 1000)
    })
    this.builder = p
    return this.status()
  }

  cancelBuild() {
    this.cancelled = true
    clearTimeout(this.retryTimer)
    if (this.builder) this.builder.kill('SIGTERM')
    this.builder = null
    try {
      const st = JSON.parse(fs.readFileSync(path.join(this.dir, 'status.json'), 'utf8'))
      st.phase = 'cancelled'
      fs.writeFileSync(path.join(this.dir, 'status.json'), JSON.stringify(st))
    } catch (e) {}
    return this.status()
  }

  remove() {
    this.cancelBuild()
    this.stopServer()
    for (const f of ['catalog.sqlite', 'catalog.sqlite.building', 'ol_dump_editions.txt.gz', 'ol_dump_editions.txt.gz.part', 'ol_dump_authors.txt.gz', 'ol_dump_authors.txt.gz.part', 'status.json']) {
      try {
        fs.rmSync(path.join(this.dir, f), { force: true })
      } catch (e) {}
    }
    // removed on purpose: a restart doesn't download it again (Build starts it again)
    try {
      fs.writeFileSync(path.join(this.dir, 'status.json'), JSON.stringify({ phase: 'cancelled' }))
    } catch (e) {}
    return this.status()
  }

  stopServer() {
    if (this.server) this.server.kill()
    this.server = null
    this.pending.forEach((p) => p.reject(new Error('stopped')))
    this.pending.clear()
  }

  query(msg, timeoutMs = 8000) {
    if (!this.ready() || this.builder) return Promise.resolve(null)
    if (!this.server) {
      const p = spawn(config.workerCmd, [SCRIPT, 'serve', this.dir], { stdio: ['pipe', 'pipe', 'ignore'] })
      readline.createInterface({ input: p.stdout }).on('line', (line) => {
        let j
        try {
          j = JSON.parse(line)
        } catch (e) {
          return
        }
        const w = this.pending.get(j.id)
        if (!w) return
        this.pending.delete(j.id)
        j.ok ? w.resolve(j) : w.reject(new Error(j.error || 'catalogue error'))
      })
      p.on('exit', () => {
        if (this.server === p) this.server = null
        this.pending.forEach((w) => w.reject(new Error('catalogue stopped')))
        this.pending.clear()
      })
      this.server = p
    }
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error('catalogue timeout'))
      }, timeoutMs)
      this.pending.set(id, {
        resolve: (v) => (clearTimeout(t), resolve(v)),
        reject: (e) => (clearTimeout(t), reject(e))
      })
      this.server.stdin.write(JSON.stringify({ ...msg, id }) + '\n')
    })
  }

  async byIsbn(isbn) {
    const r = await this.query({ op: 'isbn', isbn }).catch(() => null)
    return (r && r.rows) || []
  }
  async search(title, author, limit = 10) {
    const r = await this.query({ op: 'search', title, author, limit }).catch(() => null)
    return (r && r.rows) || []
  }
  async stats() {
    const r = await this.query({ op: 'stats' }, 30000).catch(() => null)
    return r ? { books: r.books, withDdc: r.withDdc, built: r.built } : null
  }
}

// ---------------------------------------------------------------- Dewey numbers for the library

const norm = (s) =>
  String(s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

// Background Dewey: how often the whole library is looked over, and when "not found" is tried again
const DEWEY_EVERY_MS = Math.max(1, parseInt(process.env.DEWEY_RECHECK_HOURS || '6', 10)) * 3600 * 1000
// Bumped when the lookup gets better: books it found nothing for are looked up again once
const DEWEY_LOOKUP_V = 3
const DEWEY_RETRY_MS = Math.max(1, parseInt(process.env.DEWEY_RETRY_DAYS || '7', 10)) * 24 * 3600 * 1000

/** Words that are a collection, a producer or a format, not a person who wrote the book */
const NOT_AN_AUTHOR = /top \d+|various|bbc|productions?|studios?|audio ?go|radio|\btranslation\b|introduction|collection|books?$/i
// two to four words, the first and last capitalised ("Neil deGrasse Tyson", "Robert A. Heinlein")
const looksLikeName = (s) => /^[A-Z][\p{L}.'’-]+(?:\s+[\p{L}][\p{L}.'’-]*){0,2}\s+[A-Z][\p{L}.'’-]*$/u.test(String(s || '').trim()) && !NOT_AN_AUTHOR.test(s)

/**
 * A few (title, author) guesses for a messy library title, best first: the title cleaned of numbering,
 * "(Unabridged)", "[…]", ".mp3" and "by … (Audiobook)"; split on " - " ("24 - Snow Crash - Neal Stephenson -
 * 1992", "Heinlein-Juveniles-#6-The Rolling Stones"); and each without its subtitle (the catalogue often has
 * the main title only). The author is the book's first author, or a name found in the title when the
 * book's "author" is a collection ("Top 100 Sci-Fi Books").
 */
function titleGuesses(rawTitle, rawAuthor) {
  let t = String(rawTitle || '').replace(/\.(mp3|m4b|m4a|flac|ogg)$/i, '')
  // "… by Neil deGrasse Tyson (Audiobook)": the name after "by" is the author
  let byAuthor = ''
  t = t.replace(/\s+by\s+([^()[\]]+?)\s*(?:\((?:unabridged\s*)?audiobook\))?\s*$/i, (m, name) => {
    if (!looksLikeName(name)) return m
    byAuthor = name.trim()
    return ''
  })
  t = t
    .replace(/\s*[([][^)\]]*[)\]]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  let author = String(rawAuthor || '')
    .split(/,|\/|&| and /)[0]
    .replace(/\s+-\s+.*$/, '')
    .trim()
  if (NOT_AN_AUTHOR.test(author)) author = ''
  if (!author) author = byAuthor
  // " - " separates parts when it's there ("24 - Snow Crash - Neal Stephenson - 1992"); otherwise a hyphen
  // between a word and a capital or number does ("Robert A. Heinlein-Juveniles-#6-The Rolling Stones")
  let parts = (/\s-\s/.test(t) ? t.split(/\s+-\s+/) : t.split(/-(?=#?\d)|(?<=\d)-|(?<=[a-z.])-(?=[A-Z#])/))
    .map((p) => p.trim())
    .filter((p) => p && !/^#\d+$/.test(p) && !/^(juveniles?|unabridged|audiobook)$/i.test(p))
  // numbering in front ("24", "Book 1"), a year at the end ("1992"); a year-like title on its own (1984) stays
  const numbering = (p) => /^\d{1,3}$/.test(p) || /^(book|part|vol(ume)?|no\.?)\s*\d+$/i.test(p)
  while (parts.length > 1 && numbering(parts[0])) parts.shift()
  while (parts.length > 1 && /^(1[5-9]|20)\d\d$/.test(parts[parts.length - 1])) parts.pop()
  parts = parts.filter((p, i) => i === 0 || !numbering(p))
  // the book's author written into the title goes; with no usable author, a name at the end is the author
  if (author && parts.length > 1) parts = parts.filter((p) => norm(p) !== norm(author)) || parts
  if (!author && parts.length > 1 && looksLikeName(parts[parts.length - 1])) author = parts.pop()
  if (!parts.length) parts = [t]
  const out = []
  const add = (title, a) => {
    title = String(title || '').trim()
    if (title.length < 1 || !/[\p{L}\p{N}]/u.test(title)) return
    const key = norm(title) + '|' + norm(a)
    if (!out.some((g) => g.key === key)) out.push({ title, author: a || '', key })
  }
  // in order: the first part is usually the title, later ones a subtitle; each also without its ": subtitle"
  for (const p of parts) {
    const main = p.split(/:\s/)[0]
    add(main, author)
    if (main !== p) add(p, author)
    // "Expanded Universe Volume 1", "The DEDA Files, Book 2": catalogues often list the title without the number
    const bare = main.replace(/[\s,]+(vol(ume)?\.?|book|part)\s*\d+$/i, '')
    if (bare !== main) add(bare, author)
  }
  return out.slice(0, 4).map(({ title, author: a }) => ({ title, author: a }))
}

/** What a book's lookup depends on: when it changes (edited title, author or ISBN), look again */
function deweySig(b) {
  const md = (b && b.media && b.media.metadata) || {}
  return [md.title || '', md.authorName || '', md.isbn || ''].join('|').toLowerCase()
}

class Dewey {
  constructor(catalog) {
    this.catalog = catalog
    this.file = path.join(config.dataDir, 'dewey.json')
    this.map = {}
    try {
      this.map = JSON.parse(fs.readFileSync(this.file, 'utf8')) || {}
    } catch (e) {}
    this.job = null // { total, done, found }
    this.saveTimer = null
  }

  save() {
    clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => {
      try {
        fs.mkdirSync(config.dataDir, { recursive: true })
        fs.writeFileSync(this.file, JSON.stringify(this.map))
      } catch (e) {
        log.warn(`Couldn't save Dewey numbers: ${e.message}`)
      }
    }, 500)
  }

  get(id) {
    return this.map[id] || null
  }

  set(id, ddc, source) {
    const clean = ddc ? (String(ddc).match(/\d{3}(?:\.\d+)?/) || [])[0] : null
    this.map[id] = { ddc: clean || null, source: source || 'admin', at: Date.now() }
    this.save()
    return this.map[id]
  }

  /**
   * Looks a book up: local catalogue (ISBN, then title + author), then Open Library online, trying the
   * cleaned-up title guesses (titleGuesses) in turn; title alone when title + author finds nothing.
   */
  async lookup(b) {
    const md = (b.media && b.media.metadata) || {}
    const isbn = String(md.isbn || '').replace(/[^0-9Xx]/g, '')
    const guesses = titleGuesses(md.title, md.authorName)
    // fiction or not, for literature LC classes: from the book's genres and tags
    const kinds = [].concat(md.genres || [], (b.media && b.media.tags) || []).join(' ')
    const fiction = NONFICTION.test(kinds) && !/\bfiction\b/i.test(kinds.replace(/non-?fiction/gi, '')) ? false : FICTION.test(kinds) ? true : null
    const lccs = [] // LC classes met on the way, for when no edition has a Dewey number
    if (this.catalog.ready()) {
      if (isbn) {
        const rows = await this.catalog.byIsbn(isbn)
        const d = pickDdc(rows.map((r) => r.ddc))
        if (d) return { ddc: d, source: 'catalogue (ISBN)' }
        rows.forEach((r) => r.lcc && lccs.push(r.lcc))
      }
      for (const g of guesses) {
        const want = norm(g.title).split(' ').slice(0, 4).join(' ')
        const ok = (r) => {
          const t = norm(r.title)
          return t.startsWith(want) || (t.split(' ').length >= 2 && norm(g.title).startsWith(t))
        }
        let rows = (await this.catalog.search(g.title, g.author, 15)).filter(ok)
        if (!rows.length && g.author) rows = (await this.catalog.search(g.title, '', 25)).filter(ok).slice(0, 15)
        const d = pickDdc(rows.map((r) => r.ddc))
        if (d) return { ddc: d, source: 'catalogue' }
      }
    }
    // Online: Open Library's search returns the Dewey numbers (and LC classes) of every edition it knows
    const tries = isbn ? [{ isbn }, ...guesses.slice(0, 2)] : guesses.slice(0, 3)
    if (!tries.length) return { ddc: null, source: 'nothing to look up' }
    const ask = async (g, withAuthor) => {
      const q = new URLSearchParams({ fields: 'title,ddc,lcc,author_name', limit: '5' })
      if (g.isbn) q.set('isbn', g.isbn)
      else {
        q.set('title', g.title)
        if (withAuthor && g.author) q.set('author', g.author)
      }
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 8000)
      try {
        const r = await fetch(`https://openlibrary.org/search.json?${q}`, { headers: { 'user-agent': 'ABS+ (Audiobookshelf add-on)' }, signal: ctrl.signal })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return (await r.json()).docs || []
      } finally {
        clearTimeout(t)
      }
    }
    for (const g of tries) {
      let docs = await ask(g, true)
      // the "author" is often a narrator or translator ("Wil Wheaton, Cory Doctorow"): try the title alone,
      // keeping only editions with this title
      const want = g.title ? norm(g.title).split(' ').slice(0, 3).join(' ') : ''
      const titled = (x) => !want || norm(x.title).startsWith(want)
      // …and only editions by one of the people the book lists (a different book can share the title)
      const people = norm(md.authorName || '')
      const byThem = (x) => (x.author_name || []).some((n) => {
        const last = norm(n).split(' ').pop()
        return last && last.length > 1 && people.split(' ').includes(last)
      })
      if (!docs.length && g.author) docs = (await ask(g, false)).filter((x) => titled(x) && byThem(x))
      const d = pickDdc(docs.flatMap((x) => x.ddc || []))
      if (d) return { ddc: d, source: 'Open Library' }
      // LC classes only from editions of this book (the title search can return near misses)
      for (const x of docs) if (titled(x)) (x.lcc || []).forEach((l) => lccs.push(l))
    }
    const fromLcc = pickFromLcc(lccs, fiction)
    if (fromLcc) return { ddc: fromLcc, source: 'Library of Congress class' }
    return { ddc: null, source: 'not found' }
  }

  /**
   * Does this book need (another) look? Never looked up; not found and it's been a while (the catalogue or
   * Open Library may know it now); or its title, author or ISBN changed since. Admin-set numbers stay.
   */
  needs(b) {
    const m = this.map[b.id]
    if (!m) return true
    if (m.source === 'admin') return false
    if (m.sig && m.sig !== deweySig(b)) return true
    if (!m.sig && m.ddc) return false // looked up before signatures existed: keep it
    if (!m.ddc && (m.v || 1) < DEWEY_LOOKUP_V) return true
    if (!m.ddc && Date.now() - (m.at || 0) > DEWEY_RETRY_MS) return true
    return false
  }

  /** Keeps the whole library classified by itself: as soon as the server is up, then every few hours */
  startBackground(library) {
    if (this.bgTimer) return
    this.library = library
    const pass = () => {
      if (this.job) return
      library
        .allBooks()
        .then((books) => {
          this.passFails = 0
          const n = books.filter((b) => this.needs(b)).length
          if (!n) return
          log.info(`Dewey: ${n} book${n === 1 ? '' : 's'} to look up or recheck`)
          this.classify(library)
        })
        .catch((e) => {
          // Audiobookshelf not answering yet (it starts alongside this server) or gone for a moment: try again soon
          this.passFails = (this.passFails || 0) + 1
          const secs = Math.min(600, 30 * this.passFails)
          log.debug(`Dewey background pass: ${e.message}; trying again in ${secs}s`)
          setTimeout(pass, secs * 1000).unref()
        })
    }
    setTimeout(pass, 20 * 1000).unref()
    this.bgTimer = setInterval(pass, DEWEY_EVERY_MS)
    this.bgTimer.unref()
    // the local catalogue just finished building: books not found online may be in it
    this.onCatalogReady = () => {
      for (const m of Object.values(this.map)) if (m && !m.ddc && m.source !== 'admin') m.at = 0
      pass()
    }
  }

  /**
   * The library watcher's look (every few minutes): books added or edited since get their number now,
   * not at the next pass hours later
   */
  catchUp(library, books) {
    const ids = books.filter((b) => this.needs(b)).map((b) => b.id)
    if (!ids.length) return
    log.info(`Dewey: ${ids.length} new or changed book${ids.length === 1 ? '' : 's'} to classify`)
    this.classify(library, { ids })
  }

  /** Classifies books (all, or only those not looked up yet) in the background, gently */
  classify(library, { ids, redo } = {}) {
    if (this.job) {
      // one already running: these go next instead of waiting for the next pass
      if (ids && ids.length) {
        this.waiting = [...new Set([...(this.waiting || []), ...ids])]
      }
      return this.job
    }
    this.job = { total: 0, done: 0, found: 0, startedAt: Date.now() }
    const run = async () => {
      const books = await library.allBooks()
      const todo = books.filter((b) => (ids ? ids.includes(b.id) : redo || this.needs(b)) && (!this.map[b.id] || this.map[b.id].source !== 'admin'))
      this.job.total = todo.length
      for (const b of todo) {
        try {
          const r = await this.lookup(b)
          this.map[b.id] = { ddc: r.ddc, source: r.source, at: Date.now(), sig: deweySig(b), v: DEWEY_LOOKUP_V }
          if (r.ddc) this.job.found++
        } catch (e) {
          log.debug(`Dewey lookup for ${b.id}: ${e.message}`)
        }
        this.job.done++
        if (this.job.done % 10 === 0) this.save()
        // Be polite to Open Library when the local catalogue isn't there
        if (!this.catalog.ready()) await new Promise((r) => setTimeout(r, 1100))
      }
      this.save()
      log.info(`Dewey: classified ${this.job.found} of ${this.job.total} books`)
    }
    let crashed = false
    run()
      .catch((e) => {
        crashed = true
        this.save() // keep what was found before it stopped
        log.warn(`Dewey classification stopped: ${e.message}; trying again in 2 minutes`)
      })
      .finally(() => {
        this.job = null
        const next = this.waiting
        this.waiting = null
        if (crashed) {
          // the same books (and any that came in meanwhile) again; for a whole-library run, the ones it
          // already did are skipped
          setTimeout(() => this.classify(library, ids ? { ids: [...new Set([...ids, ...(next || [])])] } : {}), 2 * 60 * 1000).unref()
          if (!ids && next && next.length) this.waiting = next
        } else if (next && next.length) setTimeout(() => this.classify(library, { ids: next }), 1000)
      })
    return this.job
  }

  /**
   * Browse tree for a list of books (already filtered to what the viewer may open):
   * { classes: [{ id, name, count, divisions: [{ id, name, count }] }], unclassified }
   */
  tree(books) {
    const classes = Object.entries(CLASSES).map(([n, name]) => ({ id: `${n}00`, name, count: 0, divisions: {} }))
    let unclassified = 0
    for (const b of books) {
      const e = this.map[b.id]
      const d = e && describe(e.ddc)
      if (!d) {
        unclassified++
        continue
      }
      const c = classes[Number(d.class[0])]
      c.count++
      c.divisions[d.division] = c.divisions[d.division] || { id: d.division, name: d.divisionName, count: 0 }
      c.divisions[d.division].count++
    }
    return { classes: classes.map((c) => ({ ...c, divisions: Object.values(c.divisions).sort((a, b) => a.id.localeCompare(b.id)) })), unclassified }
  }
}

module.exports = { Catalog, Dewey, describe, pickDdc, lccToDdc, CLASSES, DIVISIONS }
