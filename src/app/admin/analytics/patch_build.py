import re

# FIX HOOK IMPORTS
hook_path = r"C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\app\admin\analytics\hooks\useAdminAnalyticsState.tsx"
with open(hook_path, 'r', encoding='utf-8') as f:
    hook_content = f.read()

# Fix internal imports
hook_content = hook_content.replace('from "./AnalyticsHelpers"', 'from "../AnalyticsHelpers"')
hook_content = hook_content.replace('from "./page"', 'from "../page"')
hook_content = hook_content.replace('from "../AdminTruthSurfaces"', 'from "../../AdminTruthSurfaces"')

with open(hook_path, 'w', encoding='utf-8') as f:
    f.write(hook_content)


# FIX COMMERCE TAB FRAGMENTS
commerce_path = r"C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\app\admin\analytics\components\AdminAnalyticsCommerceTab.tsx"
with open(commerce_path, 'r', encoding='utf-8') as f:
    comm_content = f.read()

# Looking at the end of the file:
#               </SectionCard>
#             </div>
#   );
# }

# We need to close the fragment!
# Let's just find `            </div>\n  );\n}` and replace with `            </div>\n    </>\n  );\n}`
comm_content = comm_content.replace('            </div>\n  );\n}', '            </div>\n    </>\n  );\n}')

with open(commerce_path, 'w', encoding='utf-8') as f:
    f.write(comm_content)

print("Patching complete!")
