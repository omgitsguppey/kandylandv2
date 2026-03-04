const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.cwd(), 'src');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function (file) {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(srcDir);
let changedFiles = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    content = content.replace(/brand-pink/g, 'brand-purple');
    content = content.replace(/brand-cyan/g, 'brand-purple');
    content = content.replace(/brand-yellow/g, 'brand-purple');
    content = content.replace(/brand-green/g, 'brand-purple');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        changedFiles++;
        console.log(`Updated ${path.basename(file)}`);
    }
});

console.log(`Completed. Updated ${changedFiles} files.`);
