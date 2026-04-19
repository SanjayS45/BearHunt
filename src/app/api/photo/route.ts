import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getSignedUrl } from '@/lib/storage'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const path = searchParams.get('path')
  const bucket = (searchParams.get('bucket') ?? 'proof-photos') as 'proof-photos' | 'reference-photos'

  if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 })

  const url = await getSignedUrl(bucket, path)
  return NextResponse.redirect(url)
}
