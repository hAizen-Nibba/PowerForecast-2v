# Sentinel Journal - Security Learnings

## 2026-08-26 - Insecure Fallback Credentials and Silent Password Reset Failure
**Vulnerability:** `ForgotPasswordPage.tsx` used a hardcoded default security answer (`meralco`) for accounts lacking a configured security question, and swallowed Supabase `updateUser` errors, allowing unauthenticated account recovery bypass.
**Learning:** Hardcoding default answers as fallbacks in authentication flows creates a backdoor for any account without custom recovery metadata. Additionally, catching and ignoring auth update failures resulted in false positive success states without actually updating user credentials.
**Prevention:** Always fail securely when authentication recovery metadata is missing. Never fall back to static universal answers, and ensure authentication API call errors propagate to prevent fake success screens.

## 2026-09-29 - Unrestricted Email Sender Spoofing and Shadowed Standard Library Router
**Vulnerability:** `api/send_email.py` allowed callers to override the `from` sender header with arbitrary email addresses, exposing the service to sender spoofing and email forgery. Additionally, `api/email.py` shadowed Python's standard library `email` module, causing standard library imports to break during test execution.
**Learning:** Serverless email dispatchers must lock `from` sender headers on the server side rather than accepting unverified client payload overrides. File names in serverless route directories must also avoid colliding with standard library package names.
**Prevention:** Always enforce server-controlled `from` addresses in transactional email endpoints and use subdirectory route handlers (e.g. `api/email/index.py`) instead of standard library module names (e.g. `api/email.py`).
