import os

commerce_path = r"C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\app\admin\analytics\components\AdminAnalyticsCommerceTab.tsx"
with open(commerce_path, 'r', encoding='utf-8') as f:
    comm_content = f.read()

comm_content = comm_content.replace('<>\n<>', '<>')

# wait, at the bottom it shows:
#              </SectionCard>
#            </div>
#          </>
#        
#  );
#}

comm_content = comm_content.replace('          </>\n        \n  );\n}', '  );\n}')

with open(commerce_path, 'w', encoding='utf-8') as f:
    f.write(comm_content)

print("Commerce tab fixed 2")
