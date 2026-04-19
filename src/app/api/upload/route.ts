import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { uploadProofPhoto, uploadReferencePhoto } from '@/lib/storage'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const bucket = (formData.get('bucket') as string) ?? 'proof-photos'
  const ticketId = (formData.get('ticketId') as string) ?? 'temp'
  const claimId = (formData.get('claimId') as string) ?? session.user.id

  const files = formData.getAll('files') as File[]
  if (files.length === 0) return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  if (files.length > 5) return NextResponse.json({ error: 'Max 5 files' }, { status: 400 })

  const paths: string[] = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const buffer = Buffer.from(await file.arrayBuffer())

    const path = bucket === 'reference-photos'
      ? await uploadReferencePhoto(buffer, ticketId)
      : await uploadProofPhoto(buffer, ticketId, claimId, i)

    paths.push(path)
  }

  return NextResponse.json({ paths })
}
