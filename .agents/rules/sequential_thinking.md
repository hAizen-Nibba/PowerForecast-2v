# Mandatory Sequential Thinking Protocol

Always invoke the `sequential-thinking` tool (`sequentialthinking`) during any of the following operations:

1. **Bug Checking & Debugging**:
   - Diagnosing error root causes, reproducing steps, analyzing stack traces, and validating proposed fixes.
2. **Implementation Planning & Plan Approvals**:
   - Formulating new implementation plans, breaking down complex tasks, evaluating design tradeoffs, and reviewing approval states.
3. **Security Audits & Vulnerability Assessments**:
   - Reviewing authentication/authorization flows, inspecting RLS policies, evaluating attack vectors, validating secrets handling, and penetration checking.
4. **System Improvements & Refactoring**:
   - Architecture updates, performance optimizations, state management enhancements, and non-trivial code modifications.

## Workflow Requirements
- Begin by planning the sequence of thoughts (`thoughtNumber`, `totalThoughts`).
- Adaptively branch, revise, or extend thoughts (`isRevision`, `revisesThought`, `branchFromThought`, `needsMoreThoughts`) as analysis evolves.
- Conclude the thinking chain with `nextThoughtNeeded: false` once a verified, robust solution is reached before modifying code or presenting final conclusions.
