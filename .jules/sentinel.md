# Sentinel Journal - Security Learnings

## 2026-09-28 - Prompt Injection via Unsanitized Preset Parameter in Serverless Gemini API
**Vulnerability:** `api/analyze.py` directly concatenated `raw_category` and `raw_preset` user input into the Google Gemini LLM prompt template without allowlist validation or sanitization, opening prompt injection attack vectors.
**Learning:** String truncation (e.g. `[:50]`) is insufficient to prevent prompt injection when parameters are interpolated into system prompts.
**Prevention:** Always validate prompt parameters against a strict allowlist of allowed presets/categories before interpolating them into LLM prompts.

## 2026-08-26 - Insecure Fallback Credentials and Silent Password Reset Failure
**Vulnerability:** `ForgotPasswordPage.tsx` used a hardcoded default security answer (`meralco`) for accounts lacking a configured security question, and swallowed Supabase `updateUser` errors, allowing unauthenticated account recovery bypass.
**Learning:** Hardcoding default answers as fallbacks in authentication flows creates a backdoor for any account without custom recovery metadata. Additionally, catching and ignoring auth update failures resulted in false positive success states without actually updating user credentials.
**Prevention:** Always fail securely when authentication recovery metadata is missing. Never fall back to static universal answers, and ensure authentication API call errors propagate to prevent fake success screens.
