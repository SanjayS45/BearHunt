import sharp from 'sharp'
import { createSupabaseAdminClient } from './supabase'

export async function uploadProofPhoto(
  file: Buffer,
  ticketId: string,
  claimId: string,
  index: number
): Promise<string> {
  const stripped = await sharp(file)
    .rotate()
    .jpeg({ quality: 85 })
    .toBuffer()

  const supabase = createSupabaseAdminClient()
  const filename = `${ticketId}/${claimId}/${index}-${Date.now()}.jpg`

  const { error } = await supabase.storage
    .from('proof-photos')
    .upload(filename, stripped, { contentType: 'image/jpeg', upsert: false })

  if (error) throw new Error(`Upload failed: ${error.message}`)
  return filename
}

export async function uploadReferencePhoto(
  file: Buffer,
  ticketId: string
): Promise<string> {
  const stripped = await sharp(file)
    .rotate()
    .jpeg({ quality: 85 })
    .toBuffer()

  const supabase = createSupabaseAdminClient()
  const filename = `${ticketId}/reference-${Date.now()}.jpg`

  const { error } = await supabase.storage
    .from('reference-photos')
    .upload(filename, stripped, { contentType: 'image/jpeg', upsert: false })

  if (error) throw new Error(`Upload failed: ${error.message}`)
  return filename
}

export async function getSignedUrl(
  bucket: 'proof-photos' | 'reference-photos',
  path: string,
  expiresIn = 3600
): Promise<string> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error) throw new Error(`Signed URL failed: ${error.message}`)
  return data.signedUrl
}
