# Agent Instructions

## Git Push

Remote repo: `https://github.com/omgitsguppey/kandylandv2.git`

### Setup (run once per session if no remote exists)

```bash
# Use token auth for non-interactive environments
git remote add origin https://${GITHUB_TOKEN}@github.com/omgitsguppey/kandylandv2.git
```

If origin already exists but needs auth:

```bash
git remote set-url origin https://${GITHUB_TOKEN}@github.com/omgitsguppey/kandylandv2.git
```

### Push

This repo's default branch is `main`. If your local branch is `work` (as in Codex sandboxes), push with:

```bash
git push origin work:main
```

Do **not** use `git push origin main` unless you are on the `main` branch locally.
