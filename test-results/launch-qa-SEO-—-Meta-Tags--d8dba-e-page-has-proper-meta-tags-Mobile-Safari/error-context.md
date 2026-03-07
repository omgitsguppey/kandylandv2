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
  - main [ref=e10]
  - navigation [ref=e14]:
    - link "Home" [ref=e15]:
      - /url: /
      - img [ref=e16]
      - generic [ref=e19]: Home
    - link "Drops" [ref=e20]:
      - /url: /drops
      - img [ref=e21]
      - generic [ref=e25]: Drops
    - link "Experiences" [ref=e26]:
      - /url: /experiences
      - img [ref=e27]
      - generic [ref=e30]: Experiences
    - button "Wallet" [ref=e31]:
      - img [ref=e32]
      - generic [ref=e35]: Wallet
  - region "Notifications alt+T"
  - generic:
    - generic: 0px x 0px
    - generic: xs (mobile)
  - button "Open Next.js Dev Tools" [ref=e41] [cursor=pointer]:
    - img [ref=e42]
  - iframe [ref=e47]:
    
```