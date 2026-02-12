import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://propflow.io'

    // Static pages
    const staticPages = [
        '',
        '/features',
        '/solutions',
        '/pricing',
        '/login',
        '/signup',
        '/terms',
        '/privacy',
    ]

    const staticEntries = staticPages.map(page => ({
        url: `${baseUrl}${page}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: page === '' ? 1 : 0.8,
    }))

    return staticEntries
}
