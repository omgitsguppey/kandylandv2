import fs from 'fs';
import path from 'path';

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.next') {
                walkDir(fullPath);
            }
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');

            // Match hover:bg-white/10, group-hover:text-brand-pink, hover:shadow-[...], etc.
            let newContent = content.replace(/\b(hover|group-hover):[a-zA-Z0-9\-\/\[\]\%\.\#]+/g, '');

            // Cleanup multiple spaces inside class names that might have been left
            newContent = newContent.replace(/className="([^"]*)"/g, (match, p1) => {
                return `className="${p1.replace(/\s+/g, ' ').trim()}"`;
            });
            // Handle template literals className={`...`}
            newContent = newContent.replace(/className=\{`([^`]+)`\}/g, (match, p1) => {
                return `className={\`${p1.replace(/\s+/g, ' ').trim()}\`}`;
            });

            if (content !== newContent) {
                fs.writeFileSync(fullPath, newContent);
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

walkDir('./src');
