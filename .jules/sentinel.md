# Sentinel Journal - Security Learnings

## 2026-09-29 - Unsanitized User Inputs in Email Templates (HTML Injection / Email XSS)
**Vulnerability:** Transactional email templates in `api/send_email.py` interpolated user-controlled input fields directly into HTML email markup without sanitization or HTML escaping.
**Learning:** Generating HTML emails using python f-strings without `html.escape()` allows attackers to perform HTML injection and email client cross-site scripting when sending invitations, budget alerts, or notifications.
**Prevention:** Always sanitize dynamic strings inserted into HTML body content using `html.escape()` while stripping HTML tags from subject headers.

## 2026-08-26 - Insecure Fallback Credentials and Silent Password Reset Failure
**Vulnerability:** `ForgotPasswordPage.tsx` used a hardcoded default security answer (`meralco`) for accounts lacking a configured security question, and swallowed Supabase `updateUser` errors, allowing unauthenticated account recovery bypass.
**Learning:** Hardcoding default answers as fallbacks in authentication flows creates a backdoor for any account without custom recovery metadata. Additionally, catching and ignoring auth update failures resulted in false positive success states without actually updating user credentials.
**Prevention:** Always fail securely when authentication recovery metadata is missing. Never fall back to static universal answers, and ensure authentication API call errors propagate to prevent fake success screens.
