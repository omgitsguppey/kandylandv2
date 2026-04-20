import re

page_path = r"C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\app\admin\analytics\page.tsx"
hook_path = r"C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\app\admin\analytics\hooks\useAdminAnalyticsState.tsx"

with open(page_path, 'r', encoding='utf-8') as f:
    page_content = f.read()

# First replace <main> in page
start_main = page_content.find('<main className="space-y-4 md:space-y-5">')
end_main = page_content.find('</main>', start_main)

new_main = """<main className="space-y-4 md:space-y-5">
        {state.activeTab === "operations" ? <AdminAnalyticsOperationsTab {...state} /> : null}
        {state.activeTab === "audience" ? <AdminAnalyticsAudienceTab {...state} /> : null}
        {state.activeTab === "commerce" ? <AdminAnalyticsCommerceTab {...state} /> : null}

        <AdminTaskAndNotificationModules
          renderSectionRangeControl={state.renderSectionRangeControl}
          dailyTaskPipelineItems={state.dailyTaskPipelineModel.items}
          dailyTaskPipelineHasData={state.dailyTaskPipelineModel.hasData}
          taskCompletionSpeedBuckets={state.taskCompletionSpeedBuckets}
          taskLeaderboardItems={state.taskLeaderboardItems}
          activeNotificationFunnelPieData={state.activeNotificationFunnelPieData}
          notificationActionItems={state.notificationActionItems}
          maxNotificationActionValue={state.maxNotificationActionValue}
          hasNotificationReminderReasons={state.hasNotificationReminderReasons}
          notificationReminderReasons={state.notificationReminderReasons}
          formatDuration={state.formatDuration}
          formatPercent={state.formatPercent}
        />

        <AdminTruthSurfaces health={state.analyticsSectionHealth} />
"""

with open(page_path, 'w', encoding='utf-8') as f:
    f.write(page_content[:start_main] + new_main + page_content[end_main:])


# Now export the missing variables in useAdminAnalyticsState.tsx
with open(hook_path, 'r', encoding='utf-8') as f:
    hook_content = f.read()

# Add them to the return statement
new_exports = """,
    dailyTaskPipelineModel, taskCompletionSpeedBuckets, taskLeaderboardItems, activeNotificationFunnelPieData, notificationActionItems, maxNotificationActionValue, hasNotificationReminderReasons, notificationReminderReasons
  };"""

hook_content = hook_content.replace('  };', new_exports)

with open(hook_path, 'w', encoding='utf-8') as f:
    f.write(hook_content)

print("Page and Hook patched!")
