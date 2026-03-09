# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - navigation [ref=e2]:
    - generic [ref=e3]:
      - link "KandyDrops" [ref=e4] [cursor=pointer]:
        - /url: /
      - button "Sign In" [ref=e6]:
        - img [ref=e7]
        - text: Sign In
  - main [ref=e10]:
    - generic [ref=e12]:
      - img "Candy" [ref=e15]
      - heading "404" [level=1] [ref=e16]
      - heading "Page Not Found" [level=2] [ref=e17]
      - paragraph [ref=e18]: Looks like this drop has melted away. The page you are looking for does not exist.
      - link "Return Home" [ref=e19] [cursor=pointer]:
        - /url: /
        - button "Return Home" [ref=e20]
  - region "Notifications alt+T"
  - generic [ref=e21]:
    - generic [ref=e22]: This website uses cookies to enhance the user experience and track interactions for improvement. By continuing, you verify you are over 18.
    - button "Accept cookies" [ref=e24] [cursor=pointer]: I Understand
  - generic:
    - generic: 1280px x 720px
    - generic:
      - generic: xl (wide)
  - button "Open Next.js Dev Tools" [ref=e30] [cursor=pointer]:
    - generic [ref=e33]:
      - text: Compiling
      - generic [ref=e34]:
        - generic [ref=e35]: .
        - generic [ref=e36]: .
        - generic [ref=e37]: .
  - alert [ref=e38]
```