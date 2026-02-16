# Agent Instructions

## Git Push

Remote repo: `https://github.com/omgitsguppey/kandylandv2.git`

If no remote is configured, add it first:

```bash
git remote add origin https://github.com/omgitsguppey/kandylandv2.git
```

This repo's default branch is `main`. If your local branch is `work` (as in Codex sandboxes), push with:

```bash
git push origin work:main
```

Do **not** use `git push origin main` unless you are on the `main` branch locally.
