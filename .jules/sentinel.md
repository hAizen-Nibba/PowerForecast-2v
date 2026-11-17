# Sentinel Journal - Security Learnings

## 2026-08-26 - Insecure Fallback Credentials and Silent Password Reset Failure
**Vulnerability:** `ForgotPasswordPage.tsx` used a hardcoded default security answer (`meralco`) for accounts lacking a configured security question, and swallowed Supabase `updateUser` errors, allowing unauthenticated account recovery bypass.
**Learning:** Hardcoding default answers as fallbacks in authentication flows creates a backdoor for any account without custom recovery metadata. Additionally, catching and ignoring auth update failures resulted in false positive success states without actually updating user credentials.
**Prevention:** Always fail securely when authentication recovery metadata is missing. Never fall back to static universal answers, and ensure authentication API call errors propagate to prevent fake success screens.

## 2026-10-28 - Unauthenticated Email Sender Header Spoofing
**Vulnerability:** `api/send_email.py` accepted a caller-specified `from` field in the POST JSON payload (`payload.get('from')`), allowing unauthenticated API clients to send spoofed email headers using arbitrary sender addresses.
**Learning:** Accepting sender envelope parameter inputs from untrusted API requests creates email spoofing risks and allows external callers to abuse email dispatchers. Additionally, creating a local Python wrapper named `api/email.py` shadowed the standard Python `email` package when `PYTHONPATH=.`, causing import errors in standard library modules like `urllib.request`.
**Prevention:** Always enforce server-side configured sender addresses (`get_sender_email()`) in email endpoints, and avoid naming serverless endpoint files after Python standard library modules.
