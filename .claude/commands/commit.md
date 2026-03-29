Create a conventional commit for O Financeiro.

## Format
```
<type>(FIN.<MOD>): <short description>
```

## Types
feat, fix, refactor, test, docs, chore, style, perf

## Scopes
FIN.AI, FIN.ACC, FIN.TXN, FIN.BUD, FIN.FAM, FIN.GOL, FIN.DEB, FIN.RPT, FIN.NTF, FIN.INV, FIN.NEW, FIN.EDU, FIN.CFG, infra, docs

For infrastructure/cross-cutting changes, use `infra` or `docs` as scope.

## Rules
- NO `Co-Authored-By` trailers — commits belong to Cussei only
- Extract the module scope from the files changed (e.g., changes in `apps/api/` related to transactions → `FIN.TXN`)
- Keep the description under 72 characters, lowercase, imperative mood
- If changes span multiple modules, use the primary module or `infra`

## Steps
1. Run `git status` and `git diff --staged` to see what's being committed
2. Analyze the changes and determine type + scope
3. Draft commit message
4. Stage relevant files (specific files, not `git add .`)
5. Commit with the formatted message

## Allowed Tools
Bash(git *), Read, Glob, Grep
