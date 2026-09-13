# Sentinel Journal - Security Learnings

## 2026-09-13 - LLM Prompt Injection via Unsanitized Preset Mode Input
**Vulnerability:** `api/analyze.py` directly interpolated untrusted user-supplied `preset` and `category` parameters into system prompt templates for Gemini AI analysis.
**Learning:** Accepting arbitrary string parameters for prompt formatting without strict whitelist verification allows attackers to perform prompt injection against LLM endpoints.
**Prevention:** Validate user inputs used in LLM prompt templates against an explicit allowlist of known categories/presets, safely defaulting to a trusted preset if the input is unexpected or untrusted.

## 2026-08-26 - Insecure Fallback Credentials and Silent Password Reset Failure
**Vulnerability:** `ForgotPasswordPage.tsx` used a hardcoded default security answer (`meralco`) for accounts lacking a configured security question, and swallowed Supabase `updateUser` errors, allowing unauthenticated account recovery bypass.
**Learning:** Hardcoding default answers as fallbacks in authentication flows creates a backdoor for any account without custom recovery metadata. Additionally, catching and ignoring auth update failures resulted in false positive success states without actually updating user credentials.
**Prevention:** Always fail securely when authentication recovery metadata is missing. Never fall back to static universal answers, and ensure authentication API call errors propagate to prevent fake success screens.
