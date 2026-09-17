# Sentinel Journal - Security Learnings

## 2026-08-27 - Prompt Injection Vulnerability in Serverless AI Handlers
**Vulnerability:** `api/analyze.py` accepted arbitrary string inputs for the `preset` / `category` parameter up to 50 characters and interpolated them directly into the LLM system prompt (`### 5. PRESET MODE: <preset>`).
**Learning:** Slicing raw user inputs without checking against an allowlist leaves LLM prompt templates vulnerable to prompt injection attacks.
**Prevention:** Always validate user-controlled options in LLM prompt handlers against a strict allowlist of approved presets and categories before interpolating them into system prompts.

## 2026-08-26 - Insecure Fallback Credentials and Silent Password Reset Failure
**Vulnerability:** `ForgotPasswordPage.tsx` used a hardcoded default security answer (`meralco`) for accounts lacking a configured security question, and swallowed Supabase `updateUser` errors, allowing unauthenticated account recovery bypass.
**Learning:** Hardcoding default answers as fallbacks in authentication flows creates a backdoor for any account without custom recovery metadata. Additionally, catching and ignoring auth update failures resulted in false positive success states without actually updating user credentials.
**Prevention:** Always fail securely when authentication recovery metadata is missing. Never fall back to static universal answers, and ensure authentication API call errors propagate to prevent fake success screens.
