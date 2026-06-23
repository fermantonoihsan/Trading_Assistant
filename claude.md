# Project Instruction

Project: Scalping Brief Generator.

Build as browser-only React app.

MVP constraints:
- Do not use Redux.
- Do not use React Router.
- Do not use Vite, webpack, or backend/API.
- Use React state with useReducer.
- Use localStorage for persistence.
- Use pure functions for calculations.
- UI language: Bahasa Indonesia.
- Keep implementation simple and modular inside scalping-brief.jsx.
- Do not rewrite unrelated code.
- Only edit files explicitly requested in the prompt.

Source documents:
- requirement.md
- design.md
- implementation.md

Development rule:
Before coding, read only the relevant section of the documents for the requested sprint.
After coding, summarize changed sections and manual test steps.

## Local Skills Usage

Local skills folder:
C:\Users\IHSAN\Claude\Projects\Trading\claude-skills

Use skills selectively. Do not scan or apply all skills.

Recommended skills for this project:

### cs-karpathy-reviewer
Use after each sprint to review modified code sections.
Purpose:
- Surgical changes
- Simplicity
- No unrelated refactor
- Goal-driven implementation

Use when:
- A sprint is completed
- Before continuing to the next sprint

### focused-fix
Use only for debugging a specific broken feature.
Purpose:
- Scope the issue
- Trace affected functions
- Diagnose before fixing
- Apply minimal fix
- Verify behavior

Use when:
- Browser console shows actual runtime error
- A specific feature behaves incorrectly
- A reducer/calculation/UI module regresses

### cs-frontend-engineer
Use only for specific frontend design questions.
Do not use it to reconsider the whole architecture.

### cs-senior-engineer
Use only for cross-module regression diagnosis.

Avoid:
- cs-fullstack-engineer
- cs-engineering-lead
- backend/devops skills
- security scan commands
- git PR commands
- repo CI review commands

Project architecture overrides skill suggestions:
- Browser-only React CDN + Babel CDN
- useReducer
- localStorage
- No Redux
- No React Router
- No Vite/webpack/PostCSS
- No backend/API