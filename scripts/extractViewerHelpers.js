const fs = require('fs');
const path = require('path');

const clientPath = 'src/app/dashboard/viewer/ViewerClient.tsx';
const helpersPath = 'src/app/dashboard/viewer/ViewerHelpers.ts';

const code = fs.readFileSync(clientPath, 'utf8');
const lines = code.split('\n');

const exportIndex = lines.findIndex(l => l.startsWith('export function ViewerClient'));

const imports = [];
let helperLines = [];
let remainingLines = [];

// Rough extraction
let inHelpers = false;
for (let i = 0; i < exportIndex; i++) {
    const line = lines[i];
    if (line.startsWith('type ContentKind') || line.startsWith('interface ResolvedContent')) {
        inHelpers = true;
    }
    
    if (inHelpers) {
        helperLines.push(line);
    } else {
        remainingLines.push(line);
    }
}

// Add the rest of the lines
remainingLines.push(...lines.slice(exportIndex));

// Add exports to the helper functions so they can be imported
helperLines = helperLines.map(line => {
    if (line.startsWith('type ContentKind') ||
        line.startsWith('interface ResolvedContent') ||
        line.startsWith('interface ThumbnailItem') ||
        line.startsWith('interface CachedAssetRecord') ||
        line.startsWith('const MIME_TYPE_WITHOUT_PARAMETERS') ||
        line.startsWith('const GENERIC_BINARY_MIME_TYPES') ||
        line.startsWith('function ') ||
        line.startsWith('async function ') ||
        line.startsWith('const WATCH_CHECKPOINT_SECONDS')) {
        
        // Export everything except maybe the generic ones, actually export all top level
        if (line.startsWith('const') || line.startsWith('function') || line.startsWith('async function') || line.startsWith('type') || line.startsWith('interface')) {
             if (!line.startsWith('export ')) {
                 return 'export ' + line;
             }
        }
    }
    return line;
});

// Import authFetch in helpers since fetchSecureContent uses it
const helperFileContent = `import { Drop } from "@/types/db";
import { authFetch } from "@/lib/authFetch";

` + helperLines.join('\n');

fs.writeFileSync(helpersPath, helperFileContent);

// Add import of helpers to remainingLines
const importLine = `import {
    ContentKind,
    ResolvedContent,
    ThumbnailItem,
    CachedAssetRecord,
    normalizeMimeType,
    resolveContentKind,
    isMediaContent,
    resolveContent,
    createVideoThumbnail,
    revokeObjectUrl,
    fetchSecureContent,
    fetchAssetRecord,
    clearCachedAssets,
    getThumbnailFallback,
    buildThumbnailItemsWithUpdate,
    buildThumbnailFetchOrder,
    sumNumbers,
    roundSeconds,
    buildWatchTelemetryMetrics,
    buildThumbnailFromRecord,
    formatUnwrappedLabel,
    sanitizeDropTags,
    isEditableTarget
} from "./ViewerHelpers";`;

remainingLines.splice(26, 0, importLine);

fs.writeFileSync(clientPath, remainingLines.join('\n'));
console.log('Split helpers securely');
