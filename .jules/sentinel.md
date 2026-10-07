# Sentinel Journal - Security Learnings

## 2026-09-29 - Unauthenticated Sender Spoofing and Email HTML Injection in Serverless Email Dispatcher
**Vulnerability:** `api/send_email.py` allowed unauthenticated client payloads to specify arbitrary `from` email parameters and injected unescaped user data directly into HTML email templates.
**Learning:** Serverless endpoints wrapping third-party email APIs (like Resend) must enforce server-controlled sender identities and sanitize all user parameters with `html.escape()`. Allowing client-provided `from` parameters allows email spoofing, while unescaped template values enable HTML/email injection attacks.
**Prevention:** Always hardcode or validate sender addresses against server-configured environment variables, escape dynamic HTML inputs, and sanitize email headers against CRLF injection (`\r`, `\n`).

## 2026-08-26 - Insecure Fallback Credentials and Silent Password Reset Failure
**Vulnerability:** `ForgotPasswordPage.tsx` used a hardcoded default security answer (`meralco`) for accounts lacking a configured security question, and swallowed Supabase `updateUser` errors, allowing unauthenticated account recovery bypass.
**Learning:** Hardcoding default answers as fallbacks in authentication flows creates a backdoor for any account without custom recovery metadata. Additionally, catching and ignoring auth update failures resulted in false positive success states without actually updating user credentials.
**Prevention:** Always fail securely when authentication recovery metadata is missing. Never fall back to static universal answers, and ensure authentication API call errors propagate to prevent fake success screens.
