import { MetadataRoute } from 'next';
import { SITE_ORIGIN } from '@/lib/site-config';

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: SITE_ORIGIN,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${SITE_ORIGIN}/drops`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: `${SITE_ORIGIN}/terms`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${SITE_ORIGIN}/privacy`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
    ];
}
