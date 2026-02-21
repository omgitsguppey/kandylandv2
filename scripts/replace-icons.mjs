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

            // Match import { A, B, C } from "lucide-react";
            const importRegex = /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]lucide-react['"];?/g;

            let match;
            let hasChanges = false;
            let newContent = content;

            while ((match = importRegex.exec(content)) !== null) {
                hasChanges = true;
                const imports = match[1].split(',').map(s => s.trim()).filter(Boolean);

                let newImportStmt = 'import { ';
                let replacements = [];
                for (const imp of imports) {
                    // imp could be "User" or "User as UserIcon"
                    // We just want to map CandyOutlineIcon to whatever they were importing it as, so it works seamlessly.
                    let alias = imp; // e.g. "User"
                    if (imp.includes(' as ')) {
                        alias = imp.split(' as ')[1].trim(); // e.g. "UserIcon"
                    }
                    replacements.push(`CandyOutlineIcon as ${alias}`);
                }

                newImportStmt += replacements.join(', ');
                // If Icon.tsx is in components/ui/Icon, the relative path depends on file location.
                // It's safer to use the '@' alias for next.js
                newImportStmt += ' } from "@/components/ui/Icon";\n';

                newContent = newContent.replace(match[0], newImportStmt);
            }

            if (hasChanges && content !== newContent) {
                fs.writeFileSync(fullPath, newContent);
                console.log(`Replaced icons in ${fullPath}`);
            }
        }
    }
}

walkDir('./src');
