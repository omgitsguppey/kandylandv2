import { MetadataRoute } from 'next';
import { SITE_ORIGIN } from '@/lib/site-origin';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin', '/admin/', '/dashboard', '/dashboard/', '/api', '/api/', '/banned'],
        },
        sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    };
}
