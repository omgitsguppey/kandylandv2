# KandyDrops Banned Patterns Registry

The following UI, UX, and code patterns are explicitly **banned** from the KandyDrops repository. If you encounter them, remove them. If you are building a new feature, do not use them.

## 1. Fake or Dead Interactions
* **Fake Tabs:** Tabs that look active but do not switch content or route.
* **Decorative Chips:** Chips or pills that look like tags/filters but cannot be tapped. If it has a border and background, it must do something.
* **Disabled Without Reason:** Buttons disabled without an explicit helper text or tooltip explaining *why* they are disabled.

## 2. Copy & Rhetoric
* **Vague Admin Copy:** "Something went wrong" or "Data looks healthy." (Instead use: "API 500: Auth failure" or "Live Vitals Connected").
* **Duplicate Meaning:** A Title that says "Your Wallet" with a subtext that says "Here is your wallet."
* **Freestyled CTAs:** Using generic "Click Here" instead of context-aware, action-oriented CTAs like "Unlock Experience" or "Refill GumDrops."

## 3. State & Truth Failures
* **Silent Catch Blocks:** `catch (e) { }` resulting in a blank UI with no user feedback.
* **"Healthy" Fallbacks:** Showing a green checkmark or "Healthy" status when the data is actually stale, synthesized, or a fallback. 
* **Unlabeled Stale Cache:** Showing cached data older than the acceptable limit without explicitly tagging it as `[stale]`.

## 4. Architectural Anti-Patterns
* **Monolithic Settings:** Giant, un-grouped scrolling lists of settings. (Use iOS-style grouping instead).
* **Detached Variants:** Creating `SearchBar2` because you didn't want to figure out how to pass a prop to the shared `SearchBar`.
* **UI-Only Changes Ignoring Telemetry:** Changing a primary conversion flow visually but failing to update the associated analytics/telemetry event paths.
