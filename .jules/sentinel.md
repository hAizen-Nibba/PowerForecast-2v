# Sentinel Journal - Security Learnings

## 2026-08-26 - Insecure Fallback Credentials and Silent Password Reset Failure
**Vulnerability:** `ForgotPasswordPage.tsx` used a hardcoded default security answer (`meralco`) for accounts lacking a configured security question, and swallowed Supabase `updateUser` errors, allowing unauthenticated account recovery bypass.
**Learning:** Hardcoding default answers as fallbacks in authentication flows creates a backdoor for any account without custom recovery metadata. Additionally, catching and ignoring auth update failures resulted in false positive success states without actually updating user credentials.
**Prevention:** Always fail securely when authentication recovery metadata is missing. Never fall back to static universal answers, and ensure authentication API call errors propagate to prevent fake success screens.

## 2026-08-27 - HTML Injection and Malicious URL Schemes in Dynamic Email Templates
**Vulnerability:** `api/send_email.py` rendered dynamic transactional emails using formatted strings without escaping user inputs or validating URL schemes, permitting HTML/script injection and phishing links in dispatched emails.
**Learning:** Incorporating raw user data into HTML email templates allows attackers to inject arbitrary HTML markup, phishing tags, and `javascript:` URIs into delivered emails.
**Prevention:** Always sanitize dynamic email parameters using `html.escape()` and enforce strict URL scheme allowlists (`http`, `https`) before inserting parameters into HTML email templates or attributes.
