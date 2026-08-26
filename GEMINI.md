# Project Rules & Guidelines: PowerForecast Refine

## 📌 Versioning Rules & Standard Operating Procedures

### 1. Versioning Scheme & Suffixes
- **Base Format**: Semantic Versioning (`MAJOR.MINOR.PATCH`) with a `v` suffix (e.g., `2.6.0v`, `2.6.1v`).
- **Revision Suffixes (`a`, `b`, `c`)**: Attach lowercase letter suffixes to patch numbers for rapid iterative hotfixes or UI adjustments before incrementing the patch number (e.g., `2.6.1v` -> `2.6.1bv` -> `2.6.1cv`).

### 2. Commit & Tagging Conventions
- **Commit Format**: All release/versioned commits must start with `<version>v - <Description>`:
  `2.6.1cv - Align landing page copy with actual system capabilities...`
- **Git Tags**: Create git tags matching the exact version identifier (e.g., `git tag 2.6.1cv`).

### 3. Application Code Synchronization
- **Central Constant**: Maintain the version constant in [src/lib/supabaseClient.ts](file:///c:/Users/AJUmali/Documents/PowerForecast-2v/src/lib/supabaseClient.ts):
  ```typescript
  export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '2.6.1cv';
  ```
- **Environment Variable**: Support build-time overrides via `VITE_APP_VERSION`.
- **UI Components**: Ensure `APP_VERSION` is imported and displayed across:
  - [VersionBadge.tsx](file:///c:/Users/AJUmali/Documents/PowerForecast-2v/src/components/common/VersionBadge.tsx)
  - [Sidebar.tsx](file:///c:/Users/AJUmali/Documents/PowerForecast-2v/src/components/layout/Sidebar.tsx)
  - [LandingPage.tsx](file:///c:/Users/AJUmali/Documents/PowerForecast-2v/src/pages/LandingPage.tsx)
- **package.json**: Keep the `version` field in [package.json](file:///c:/Users/AJUmali/Documents/PowerForecast-2v/package.json) updated with the base SemVer string (e.g., `"2.6.0"`).

---

## 🧠 Reasoning & Analysis Standard: Sequential Thinking
For all:
1. **Bug checking & debugging**
2. **Making and approving implementation plans**
3. **Security checking & vulnerability audits**
4. **System improvements and architectural refactoring**

Always utilize the **`sequential-thinking`** tool (`sequentialthinking`) to dynamically break down problems, analyze edge cases, hypothesize, verify, and course-correct before committing changes or finalizing decisions.

