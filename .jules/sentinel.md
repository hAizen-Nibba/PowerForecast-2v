# Sentinel Journal - Security Learnings

## 2026-09-10 - Plaintext Security Answers Stored in Local Storage
**Vulnerability:** Registration and settings updates wrote security questions and plaintext security answers into `localStorage` (`powerforecast_sec_dir`), exposing sensitive recovery data to local client-side access and XSS risks.
**Learning:** Storing authentication recovery metadata in client storage for offline or rapid lookup convenience undermines account security by exposing sensitive security answers.
**Prevention:** Never write sensitive authentication recovery metadata or credentials to persistent client-side storage like `localStorage`.

## 2026-08-26 - Insecure Fallback Credentials and Silent Password Reset Failure
**Vulnerability:** `ForgotPasswordPage.tsx` used a hardcoded default security answer (`meralco`) for accounts lacking a configured security question, and swallowed Supabase `updateUser` errors, allowing unauthenticated account recovery bypass.
**Learning:** Hardcoding default answers as fallbacks in authentication flows creates a backdoor for any account without custom recovery metadata. Additionally, catching and ignoring auth update failures resulted in false positive success states without actually updating user credentials.
**Prevention:** Always fail securely when authentication recovery metadata is missing. Never fall back to static universal answers, and ensure authentication API call errors propagate to prevent fake success screens.
