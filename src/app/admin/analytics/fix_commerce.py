import os

commerce_path = r"C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\app\admin\analytics\components\AdminAnalyticsCommerceTab.tsx"
with open(commerce_path, 'r', encoding='utf-8') as f:
    comm_content = f.read()

# remove anything after `) : null}` from commerce content
idx = comm_content.rfind(') : null}')
if idx != -1:
    comm_content = comm_content[:idx] + "\n  );\n}"

with open(commerce_path, 'w', encoding='utf-8') as f:
    f.write(comm_content)

print("Commerce tab fixed")
