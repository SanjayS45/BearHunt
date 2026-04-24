import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BearHunt — UC Berkeley Lost & Found',
    short_name: 'BearHunt',
    description: 'Bounty-based lost and found for UC Berkeley students.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#003262',
    icons: [
      { src: '/logo.png', sizes: '192x192', type: 'image/png' },
      { src: '/logo.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
