# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]: Welcome Back
      - generic [ref=e6]: Sign in to your SignalCast account
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: Email Address
        - textbox "Email Address" [ref=e11]
      - generic [ref=e12]:
        - generic [ref=e13]: Password
        - textbox "Password" [ref=e14]
      - button "Sign In" [ref=e15] [cursor=pointer]
      - generic [ref=e16]:
        - link "Forgot your password?" [ref=e18] [cursor=pointer]:
          - /url: /reset-password
        - generic [ref=e19]:
          - text: Don't have an account?
          - link "Create one" [ref=e20] [cursor=pointer]:
            - /url: /signup
  - button "🐛 Debug" [ref=e22] [cursor=pointer]
  - alert [ref=e23]
```