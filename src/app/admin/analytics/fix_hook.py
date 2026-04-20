import os

hook_path = r"C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\app\admin\analytics\hooks\useAdminAnalyticsState.tsx"

with open(hook_path, 'r', encoding='utf-8') as f:
    hook_content = f.read()

# The incorrect insertion was:
incorrect_snippet = """,
    dailyTaskPipelineModel, taskCompletionSpeedBuckets, taskLeaderboardItems, activeNotificationFunnelPieData, notificationActionItems, maxNotificationActionValue, hasNotificationReminderReasons, notificationReminderReasons
  };"""

# Replace all back to original `  };` EXCEPT the very last one!
occurrences = hook_content.count(incorrect_snippet)

if occurrences > 0:
    # replace all with `  };`
    hook_content = hook_content.replace(incorrect_snippet, '  };')
    # but the VERY LAST ONE was correct! We need to add it at the very end.
    # The end of the file is:
    # 
    #   return {
    #     ...
    #   };
    # }
    
    # We can just change the last `  };` before `\n}` back to the new exports.
    idx = hook_content.rfind('  };')
    if idx != -1:
        hook_content = hook_content[:idx] + incorrect_snippet + hook_content[idx+4:]

    with open(hook_path, 'w', encoding='utf-8') as f:
        f.write(hook_content)

    print(f"Fixed {occurrences} incorrect insertions!")
else:
    print("No incorrect insertions found.")
