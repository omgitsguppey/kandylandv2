# Chat Shell Stability

## Scope contract

- Chat shell stability changes must not mutate shared iOS/browser sizing behavior.
- Android PWA standalone mode may apply isolated overrides when chat viewport physics diverge.
- Shared chat constants remain canonical unless an override is explicitly Android PWA scoped.

## Android PWA stabilization lane

- Detection: Android user agent + standalone display mode.
- Chat shell applies Android PWA-specific viewport/bottom-nav variables.
- Transcript/composer/list controls stay above mobile bottom navigation.
- Android browser branch must not receive Android PWA class/marker/padding behavior.
