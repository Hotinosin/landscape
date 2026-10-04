# Branch archive manifest · 2026-10-04

The following local/fork tips are preserved as local annotated tags. They must be pushed and their peeled remote commit IDs verified before any old branch is removed. This manifest records the migration baseline; tag push and cleanup are pending explicit remote authorization after automatic approval review rejected the upload. No origin branch is deleted or pushed.

| Original ref | Commit | Prepared local archive tag |
| --- | --- | --- |
| `refs/heads/codex/extensions-on-dev` | `38f5c8ead79409cc86bdd0ecb9ff1b89c5fbaac8` | `archive/local-codex-extensions-on-dev-2026-10-04` |
| `refs/heads/codex/webui-heroui-phase1` | `ccf31734be48c335eac2fa78e6eb8dbed1640d2d` | `archive/local-codex-webui-heroui-phase1-2026-10-04` |
| `refs/heads/dev` | `0e899438d4b92d0ed176086fa82bff833b33080a` | `archive/local-dev-2026-10-04` |
| `refs/heads/feature/extensions` | `40d8f6fc4724747807918b75c55fb9e68cc1d726` | `archive/local-feature-extensions-2026-10-04` |
| `refs/heads/feature/extensions-legacy` | `3f58c4df90dbc425fe148f1327d1fa02844c1864` | `archive/local-feature-extensions-legacy-2026-10-04` |
| `refs/heads/feature/extensions-webui` | `9a3b7c9bcacbbf427a76b980dfe5415de4d6e264` | `archive/local-feature-extensions-webui-2026-10-04` |
| `refs/heads/main` | `80bc43eef7143ad029283fe2a8d510718c22af12` | `archive/local-main-2026-10-04` |
| `refs/heads/main-webui` | `b42488a6880c650e6b63441e98fc7461d139a778` | `archive/local-main-webui-2026-10-04` |
| `refs/remotes/fork/feature/extensions` | `309689eb2533ed03ce5b287312e17bc559d1097d` | `archive/fork-feature-extensions-2026-10-04` |
| `refs/remotes/fork/feature/extensions-legacy` | `3f58c4df90dbc425fe148f1327d1fa02844c1864` | `archive/fork-feature-extensions-legacy-2026-10-04` |
| `refs/remotes/fork/lkit-repository` | `95a689161ff3979d3a6cd59c353d7ef2762b171d` | `archive/fork-lkit-repository-2026-10-04` |
| `refs/remotes/fork/main` | `80bc43eef7143ad029283fe2a8d510718c22af12` | `archive/fork-main-2026-10-04` |
| `refs/remotes/fork/main-webui` | `5a80ed463aed7b4c3c6d549519da541952d5c0a6` | `archive/fork-main-webui-2026-10-04` |

Different local and remote histories have separate tags. The lkit tag preserves its complete release repository tree and history. The five previously created `archive/feat-*-2026-10-04` tags remain available.

After remote verification, detach the clean backend/WebUI worktrees rather than removing their ignored build artifacts. Prune only the two records for missing temporary worktrees. Restore an archive with `git switch -c <name> <archive-tag>`.

Local `main` was fast-forwarded to `origin/main@5dbc4c3096ccd4a5f664734c23c976ffc52fef2b`; its previous tip is preserved by `archive/local-main-2026-10-04`. Other old branch refs are retained until remote tag verification. Local push defaults now point to fork, and custom tracks fork/custom (pending its first remote push).
