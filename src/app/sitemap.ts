import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: 'https://kandydrops-by-ikandy.web.app',
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: 'https://kandydrops-by-ikandy.web.app/drops',
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: 'https://kandydrops-by-ikandy.web.app/terms',
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: 'https://kandydrops-by-ikandy.web.app/privacy',
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
    ];
}
