---
name: astrojs
description: Build, configure, document, or deploy Astro sites, especially on Cloudflare, and connect the Astro Docs MCP server when requested.
---

# AstroJS

This repository currently contains a static HTML, CSS, and JavaScript site. Use this skill for tasks that introduce or change Astro; do not migrate the site to Astro unless requested.

## Documentation workflow

1. Start with the [Astro getting started guide](https://docs.astro.build/en/getting-started/) and the current topic-specific Astro docs.
2. For Cloudflare deployment, follow [Astro's Cloudflare deployment guide](https://docs.astro.build/en/guides/deploy/cloudflare/). It covers deploying Astro to Cloudflare Workers with Wrangler; check the current recommendation and adapter requirements before changing configuration.
3. For AI-assisted Astro work, consult [Astro's docs MCP guide](https://docs.astro.build/en/guides/build-with-ai/#astro-docs-mcp-server). Its remote server endpoint is `https://mcp.docs.astro.build/mcp` and uses Streamable HTTP.
4. Keep deployment and MCP configuration separate: only configure the Astro MCP server when the task asks for it or the user approves the environment change.

## Key references

- [Astro getting started](https://docs.astro.build/en/getting-started/)
- [Deploy Astro to Cloudflare](https://docs.astro.build/en/guides/deploy/cloudflare/)
- [Astro Docs MCP server](https://docs.astro.build/en/guides/build-with-ai/#astro-docs-mcp-server)
