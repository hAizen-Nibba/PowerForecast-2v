# Sentinel Journal - Security Learnings

## 2026-08-26 - Insecure Fallback Credentials and Silent Password Reset Failure
**Vulnerability:** `ForgotPasswordPage.tsx` used a hardcoded default security answer (`meralco`) for accounts lacking a configured security question, and swallowed Supabase `updateUser` errors, allowing unauthenticated account recovery bypass.
**Learning:** Hardcoding default answers as fallbacks in authentication flows creates a backdoor for any account without custom recovery metadata. Additionally, catching and ignoring auth update failures resulted in false positive success states without actually updating user credentials.
**Prevention:** Always fail securely when authentication recovery metadata is missing. Never fall back to static universal answers, and ensure authentication API call errors propagate to prevent fake success screens.

## 2026-09-29 - Serverless Endpoint Shadowing and Open Sender Spoofing
**Vulnerability:** `api/email.py` shadowed Python's standard library `email` module causing import crashes, while `api/send_email.py` lacked recipient validation, payload size limits, sender enforcement, and exposed internal error details to callers.
**Learning:** Naming serverless files after standard library modules (like `email.py`) breaks standard library imports when `PYTHONPATH` includes the directory. Additionally, unauthenticated email dispatchers must strictly enforce payload limits, recipient format checks, server-controlled sender headers, and sanitized error responses.
**Prevention:** Use `vercel.json` rewrites for endpoint aliases instead of standard library named Python files, validate all email recipients, enforce fixed sender headers, and mask exception details in API error responses.
