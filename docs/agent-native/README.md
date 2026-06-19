# Agent-native discovery

This directory documents Sequenzy's machine-readable discovery surfaces for AI agents and agent networks.

## Manifests

| File                                                                | Purpose                                                             |
| ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [`/agent-capability.json`](../../agent-capability.json)             | General capability manifest for agent directories and tool routers. |
| [`/.well-known/agent-card.json`](../../.well-known/agent-card.json) | A2A-style card for agent-to-agent discovery.                        |
| [`/openclaw/skill.json`](../../openclaw/skill.json)                 | OpenClaw/Moltbot-style skill metadata.                              |
| [`/openclaw/SKILL.md`](../../openclaw/SKILL.md)                     | Agent-readable operating guide and safety policy.                   |

## Canonical MCP endpoints

Remote Streamable HTTP endpoint:

```text
https://api.sequenzy.com/v1/mcp
```

Local stdio package:

```bash
npx -y @sequenzy/mcp
```

## Positioning for agent networks

Sequenzy should be described as an email automation capability for authorized agents managing SaaS/ecommerce lifecycle, campaign, subscriber, segment, template, transactional email, and analytics workflows. It is not a cold outreach, scraping, or unsolicited bulk email tool.

## Agent social profiles

- Moltbook profile: https://www.moltbook.com/u/sequenzy (pending human claim)
