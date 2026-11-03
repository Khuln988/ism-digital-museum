/**
 * Монгол хэлээр унших (Text-to-Speech)
 *
 * 1) Хөтөчид монгол (mn-MN) дуу хоолой байвал түүнийг ашиглана.
 *    Microsoft Edge-д "Microsoft Yesui / Bataa Online (Natural) - Mongolian" хоолой байдаг.
 * 2) Байхгүй бол серверийн /api/tts (Azure Speech, mn-MN-YesuiNeural) руу хандана.
 * 3) Аль нь ч боломжгүй бол ОРОС ХЭЛЭЭР УНШИХГҮЙ — 'none' буцаана.
 */

let audio = null
let runId = 0
let voicesPromise = null
const audioCache = new Map() // exhibitId -> objectURL

function loadVoices() {
  if (!('speechSynthesis' in window)) return Promise.resolve([])
  if (voicesPromise) return voicesPromise
  voicesPromise = new Promise((resolve) => {
    const now = window.speechSynthesis.getVoices()
    if (now.length) return resolve(now)
    // Chrome/Edge дээр хоолойн жагсаалт хожуу ачаалагддаг
    const done = () => resolve(window.speechSynthesis.getVoices())
    const t = setTimeout(done, 1500)
    window.speechSynthesis.addEventListener('voiceschanged', () => { clearTimeout(t); done() }, { once: true })
  })
  return voicesPromise
}

export async function findMongolianVoice() {
  const voices = await loadVoices()
  return (
    voices.find((v) => /^mn([-_]|$)/i.test(v.lang || '')) ||
    voices.find((v) => /mongol/i.test(v.name || '')) ||
    null
  )
}

export function stopSpeaking() {
  runId++
  window.speechSynthesis?.cancel()
  if (audio) { audio.onended = null; audio.pause(); audio = null }
}

/**
 * @param {string} text  — унших текст (хөтчийн хоолойд)
 * @param {string} exhibitId — серверийн TTS-д (текстийг сервер өөрөө DB-ээс бүрдүүлнэ)
 * @returns {Promise<'browser'|'server'|'none'|'cancelled'>}
 */
export async function speakMongolian(text, exhibitId, { onend } = {}) {
  stopSpeaking()
  const id = runId

  const voice = await findMongolianVoice()
  if (id !== runId) return 'cancelled'
  if (voice) {
    const u = new SpeechSynthesisUtterance(text)
    u.voice = voice
    u.lang = voice.lang
    u.rate = 0.95
    u.onend = () => { if (id === runId) onend?.() }
    window.speechSynthesis.speak(u)
    return 'browser'
  }

  try {
    let url = audioCache.get(exhibitId)
    if (!url) {
      const r = await fetch(`/api/tts?id=${encodeURIComponent(exhibitId)}`)
      if (!r.ok) throw new Error(`TTS ${r.status}`)
      url = URL.createObjectURL(await r.blob())
      audioCache.set(exhibitId, url)
    }
    if (id !== runId) return 'cancelled'
    audio = new Audio(url)
    audio.onended = () => { if (id === runId) onend?.() }
    await audio.play()
    return 'server'
  } catch {
    return id === runId ? 'none' : 'cancelled'
  }
}

/** Бүтээлийн тайлбарыг уншихад зориулсан текст */
export function narrationText(e) {
  const creator = e.profiles?.display_name || e.creator_name || ''
  return [e.title, creator && `Зохиогч: ${creator}`, e.year_created && `${e.year_created} он`, e.description]
    .filter(Boolean)
    .join('. ')
}
