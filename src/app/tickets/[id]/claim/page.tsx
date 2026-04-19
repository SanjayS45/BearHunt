'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { LocationInput } from '@/components/LocationInput'
import { toast } from '@/hooks/use-toast'
import { Camera, X } from 'lucide-react'

export default function ClaimPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [photos, setPhotos] = useState<string[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (photos.length + files.length > 5) {
      toast('Max 5 photos', 'error')
      return
    }
    setUploading(true)
    const fd = new FormData()
    files.forEach(f => fd.append('files', f))
    fd.append('bucket', 'proof-photos')
    fd.append('ticketId', params.id)
    fd.append('claimId', 'pending')
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (res.ok) {
      const { paths } = await res.json()
      setPhotos(p => [...p, ...paths])
      files.forEach(f => setPreviews(p => [...p, URL.createObjectURL(f)]))
    } else {
      toast('Upload failed', 'error')
    }
    setUploading(false)
  }

  function removePhoto(i: number) {
    setPhotos(p => p.filter((_, idx) => idx !== i))
    setPreviews(p => p.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (photos.length === 0) { toast('Add at least one photo', 'error'); return }
    if (!location) { toast('Enter where you found it', 'error'); return }
    setSubmitting(true)
    const res = await fetch(`/api/tickets/${params.id}/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proofPhotoUrls: photos, foundLocation: location, finderNote: note || undefined }),
    })
    const data = await res.json()
    if (res.ok) {
      toast('Claim submitted! Waiting for owner review.', 'success')
      router.push(`/tickets/${params.id}`)
    } else {
      toast(data.error ?? 'Failed to submit', 'error')
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-1">Claim Bounty</h1>
      <p className="text-slate text-sm mb-6">Submit proof that you found this item</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-mist p-5 space-y-5">
        <div>
          <Label>Photos of the found item <span className="text-danger">*</span></Label>
          <p className="text-xs text-fog mb-2">Up to 5 photos — clear, well-lit, multiple angles</p>

          <div className="grid grid-cols-3 gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square">
                <img src={src} className="w-full h-full object-cover rounded-lg border border-mist" alt="" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger text-white flex items-center justify-center"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {photos.length < 5 && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-mist flex flex-col items-center justify-center cursor-pointer hover:border-berkeley-blue transition-colors">
                <Camera size={20} strokeWidth={1.5} className="text-fog" />
                <span className="text-xs text-fog mt-1">{uploading ? 'Uploading…' : 'Add photo'}</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} disabled={uploading} />
              </label>
            )}
          </div>
        </div>

        <LocationInput
          label="Where did you find it? *"
          value={location}
          onChange={setLocation}
          placeholder="e.g. Dwinelle Hall, under a desk in Room 155"
        />

        <div>
          <Label htmlFor="note">Note <span className="text-fog font-normal">(optional)</span></Label>
          <Textarea
            id="note"
            placeholder="Any extra context that might help the owner confirm it's theirs…"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="mt-1"
            rows={3}
          />
        </div>

        <Button type="submit" className="w-full" disabled={submitting || uploading}>
          {submitting ? 'Submitting…' : 'Submit Claim'}
        </Button>
      </form>
    </div>
  )
}
