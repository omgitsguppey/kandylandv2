# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - navigation [ref=e2]:
    - generic [ref=e3]:
      - link "KandyDrops" [ref=e4]:
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
      - link "Return Home" [ref=e19]:
        - /url: /
        - button "Return Home" [ref=e20]
  - region "Notifications alt+T"
  - generic:
    - generic: 0px x 0px
    - generic:
      - generic: lg (desktop)
  - button "Open Next.js Dev Tools" [ref=e26] [cursor=pointer]:
    - img [ref=e27]
  - iframe [ref=e32]:
    
```