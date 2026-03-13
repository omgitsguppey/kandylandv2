import { MetadataRoute } from 'next';
import { SITE_ORIGIN } from '@/lib/site-origin';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/dashboard/'],
        },
        sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    };
}
