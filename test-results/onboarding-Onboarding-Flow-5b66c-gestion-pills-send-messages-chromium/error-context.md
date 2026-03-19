# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - link "J jamie@work" [ref=e5] [cursor=pointer]:
      - /url: /
      - generic [ref=e6]: J
      - generic [ref=e7]: jamie@work
    - generic [ref=e8]:
      - heading "Hire your AI SDR" [level=1] [ref=e9]
      - paragraph [ref=e10]: Create an account to get started
      - generic [ref=e11]:
        - generic [ref=e12]:
          - generic [ref=e13]: Email
          - textbox "you@startup.com" [ref=e14]
        - generic [ref=e15]:
          - generic [ref=e16]: Password
          - textbox "At least 6 characters" [ref=e17]
        - button "Create Account" [ref=e18] [cursor=pointer]
    - paragraph [ref=e19]:
      - text: Already have an account?
      - link "Sign in" [ref=e20] [cursor=pointer]:
        - /url: /login
  - button "Open Next.js Dev Tools" [ref=e26] [cursor=pointer]:
    - img [ref=e27]
  - alert [ref=e30]
```