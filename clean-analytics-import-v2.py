import sys
import re

with open('src/app/admin/analytics/page.tsx', 'r', encoding='utf8') as f:
    c = f.read()

# Remove the dynamic import block
c = re.sub(
    r'const AdminTruthSurfaces = dynamic\(\s*\(\) => import\("\.\./AdminTruthSurfaces"\)\.then\(\(module\) => \(\{ default:\s*module\.AdminTruthSurfaces \}\)\),\s*\{ ssr: false \},\s*\);\s*',
    '',
    c
)

with open('src/app/admin/analytics/page.tsx', 'w', encoding='utf8') as f:
    f.write(c)
