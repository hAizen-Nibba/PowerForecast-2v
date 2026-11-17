# Sentinel Journal - Security Learnings

## 2026-10-21 - Transactional Email HTML and URL Injection Vulnerabilities
**Vulnerability:** Serverless transactional email templates in `api/send_email.py` interpolated unsanitized caller data directly into HTML string formatting without escaping, and placed user-provided invite links directly into `<a href="...">` attributes without protocol scheme validation.
**Learning:** Transactional email engines often accept structured parameters (e.g., inviter names, invite codes, alert thresholds, deep links). Treating these payload values as trusted plain text leaves email templates vulnerable to HTML injection, malicious script execution in webmail clients that permit embedded scripts, and phishing redirects via arbitrary link schemes (`javascript:`, `data:`). Furthermore, unsanitized newlines in subject lines risk email header injection.
**Prevention:** Always HTML-escape string fields interpolated into email templates with `html.escape(..., quote=True)`, sanitize subject lines by replacing CR/LF characters, and strictly enforce protocol whitelists (e.g., only `http` and `https`) for action links before injecting into email anchor tags.

## 2026-08-26 - Insecure Fallback Credentials and Silent Password Reset Failure
**Vulnerability:** `ForgotPasswordPage.tsx` used a hardcoded default security answer (`meralco`) for accounts lacking a configured security question, and swallowed Supabase `updateUser` errors, allowing unauthenticated account recovery bypass.
**Learning:** Hardcoding default answers as fallbacks in authentication flows creates a backdoor for any account without custom recovery metadata. Additionally, catching and ignoring auth update failures resulted in false positive success states without actually updating user credentials.
**Prevention:** Always fail securely when authentication recovery metadata is missing. Never fall back to static universal answers, and ensure authentication API call errors propagate to prevent fake success screens.
