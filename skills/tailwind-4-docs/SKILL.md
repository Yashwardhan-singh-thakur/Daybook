---
name: tailwind-4-docs
description: Use current Tailwind CSS v4 documentation and migration guidance for Tailwind implementation, configuration, refactors, and reviews.
---

# Tailwind CSS v4 Documentation

Use this skill only for work that uses Tailwind CSS v4. This repository currently uses plain CSS.

## Workflow

1. Inspect the installed Tailwind version before giving version-specific advice.
2. Consult the [official Tailwind CSS documentation](https://tailwindcss.com/docs) for current utilities, variants, directives, configuration, and migration guidance.
3. For implementation, refactor, or review work, check the upstream [Tailwind-Agent-Skills](https://github.com/Lombiq/Tailwind-Agent-Skills/tree/dev/skills/tailwind-4-docs) skill and its engineering guidance.
4. Do not assume Tailwind v3 configuration or directives apply to v4; verify breaking changes against the official upgrade guide.

## Optional upstream skill installation

The upstream skill provides a local documentation snapshot. To install it in an agent environment, use:

```sh
npx skills add Lombiq/Tailwind-Agent-Skills --skill tailwind-4-docs
```

Initializing its local Tailwind docs snapshot requires Python, Git, and internet access, and requires accepting Tailwind's documentation source license. Follow the upstream skill's instructions before using that snapshot.
