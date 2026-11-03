// Vercel Serverless Function — Монгол хэлний TTS (Azure Speech, mn-MN)
// GET /api/tts?id=<exhibit uuid>  →  audio/mpeg
//
// Текстийг клиентээс авахгүй, нийтлэгдсэн үзмэрийн мэдээллээс сервер өөрөө бүрдүүлнэ.
// Ингэснээр бусад хүн энэ endpoint-ыг дурын текст уншуулахад ашиглаж чадахгүй.
// Хариуг Vercel CDN кэшлэх тул нэг үзмэрийг дахин дахин Azure-аар уншуулахгүй.
//
// Шаардлагатай env: AZURE_SPEECH_KEY, AZURE_SPEECH_REGION (жишээ: eastasia)
// Сонголттой: AZURE_SPEECH_VOICE (default: mn-MN-YesuiNeural, эсвэл mn-MN-BataaNeural)

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const xml = (s) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]))

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const key = process.env.AZURE_SPEECH_KEY
  const region = process.env.AZURE_SPEECH_REGION
  if (!key || !region) return res.status(501).json({ error: 'Монгол TTS тохируулаагүй (AZURE_SPEECH_KEY, AZURE_SPEECH_REGION)' })

  const id = String(req.query.id || '')
  if (!UUID.test(id)) return res.status(400).json({ error: 'Буруу id' })

  // Нийтлэгдсэн үзмэрийг anon key-ээр уншина (RLS хамгаална)
  const sbUrl = process.env.VITE_SUPABASE_URL
  const sbKey = process.env.VITE_SUPABASE_ANON_KEY
  const q = `${sbUrl}/rest/v1/exhibits?id=eq.${id}&status=eq.published&select=title,description,year_created,creator_name,profiles(display_name)`
  const er = await fetch(q, { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } })
  if (!er.ok) return res.status(502).json({ error: 'Өгөгдөл татаж чадсангүй' })
  const [e] = await er.json()
  if (!e) return res.status(404).json({ error: 'Үзмэр олдсонгүй' })

  const creator = e.profiles?.display_name || e.creator_name || ''
  const text = [e.title, creator && `Зохиогч: ${creator}`, e.year_created && `${e.year_created} он`, e.description]
    .filter(Boolean).join('. ').slice(0, 1500)

  const voice = process.env.AZURE_SPEECH_VOICE || 'mn-MN-YesuiNeural'
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="mn-MN"><voice name="${voice}"><prosody rate="-5%">${xml(text)}</prosody></voice></speak>`

  const r = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'ism-digital-museum',
    },
    body: ssml,
  })
  if (!r.ok) return res.status(502).json({ error: `Azure TTS алдаа ${r.status}` })

  res.setHeader('Content-Type', 'audio/mpeg')
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800')
  res.status(200).send(Buffer.from(await r.arrayBuffer()))
}
