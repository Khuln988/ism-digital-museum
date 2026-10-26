import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && anonKey)

// Зөвхөн нийтийн anon түлхүүр ашиглана. Эрхийн хамгаалалтыг RLS хийнэ.
export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder')

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/** Зургийг media/{userId}/{folder}/... замд байршуулж public URL буцаана */
export async function uploadImage(file, userId, folder = 'misc') {
  if (!file) throw new Error('Файл сонгоогүй байна')
  if (!ALLOWED.includes(file.type)) throw new Error('Зөвхөн JPG, PNG, WEBP, GIF зураг оруулна уу')
  if (file.size > MAX_SIZE) throw new Error('Зургийн хэмжээ 5MB-аас ихгүй байх ёстой')
  const ext = file.name.split('.').pop().toLowerCase()
  const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('media').upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}

export function errorText(err) {
  if (!err) return ''
  const m = err.message || String(err)
  if (m.includes('Invalid login credentials')) return 'Имэйл эсвэл нууц үг буруу байна'
  if (m.includes('User already registered')) return 'Энэ имэйлээр бүртгэл үүссэн байна'
  if (m.includes('Password should be')) return 'Нууц үг хамгийн багадаа 6 тэмдэгт байна'
  if (m.includes('row-level security')) return 'Танд энэ үйлдлийг хийх эрх байхгүй байна'
  if (m.includes('Failed to fetch')) return 'Сервертэй холбогдож чадсангүй. Интернэтээ шалгана уу'
  return m
}
