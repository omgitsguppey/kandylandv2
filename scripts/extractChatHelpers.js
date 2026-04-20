const fs = require('fs');

const clientPath = 'src/components/Chat/ChatExperience.tsx';
const helpersPath = 'src/components/Chat/ChatExperienceHelpers.tsx';

let code = fs.readFileSync(clientPath, 'utf8');
const lines = code.split('\n');
const exportIndex = lines.findIndex(l => l.startsWith('export function ChatExperience'));

// Take line [0] to exportIndex
let topLines = lines.slice(0, exportIndex);
let remainingLines = lines.slice(exportIndex);

// Identify imports
const imports = [];
const helpers = [];

for (const line of topLines) {
    if (line.startsWith('import ') || line.startsWith('//')) {
        imports.push(line);
    } else {
        helpers.push(line);
    }
}

// Convert helpers to export
const exportedHelpers = helpers.map(line => {
    if (line.startsWith('function ') || line.startsWith('const ') || line.startsWith('type ') || line.startsWith('interface ')) {
        if (!line.startsWith('export ')) {
             return 'export ' + line;
        }
    }
    return line;
});

// For ChatExperienceHelpers.tsx
const helperContent = imports.join('\n') + '\n\n' + exportedHelpers.join('\n');
fs.writeFileSync(helpersPath, helperContent);

// Add import to ChatExperience.tsx
const helperFunctionsToImport = exportedHelpers
    .filter(l => l.startsWith('export function') || l.startsWith('export const') || l.startsWith('export type') || l.startsWith('export interface'))
    .map(l => l.split(' ')[2].split('(')[0].split('=')[0].split(':')[0].trim());

const importLine = `import {\n    ${helperFunctionsToImport.join(',\n    ')}\n} from "./ChatExperienceHelpers";\n`;

const finalClient = imports.join('\n') + '\n\n' + importLine + '\n' + remainingLines.join('\n');
fs.writeFileSync(clientPath, finalClient);
console.log('Split ChatExperience helpers.');
