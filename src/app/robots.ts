import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/tickets/'],
        disallow: ['/api/', '/dashboard/', '/messages/', '/settings/', '/admin/', '/tickets/new'],
      },
    ],
    sitemap: 'https://bearhunt.online/sitemap.xml',
  }
}
