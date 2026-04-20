import os, glob

for file in glob.glob('src/app/admin/analytics/components/*.tsx'):
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace("import { AdminTruthSurfaces } from '../AdminTruthSurfaces';\n", "")
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
print('Fixed imports in tabs')
