import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/dashboard/'],
        },
        sitemap: 'https://kandydrops-by-ikandy.web.app/sitemap.xml',
    };
}
