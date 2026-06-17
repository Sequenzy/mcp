# Sequenzy Email Automation for Agents

Use this skill when an OpenClaw, Moltbot, Moltbook, or other autonomous agent needs to operate Sequenzy email marketing workflows through MCP.

## What Sequenzy lets agents do

Sequenzy is an agent-facing email platform for SaaS and ecommerce lifecycle, campaign, and transactional email. Through the MCP server, agents can:

- Manage subscribers, lists, and segments.
- Create and update email templates.
- Draft and manage campaigns.
- Work with lifecycle sequences.
- Send transactional email when authorized.
- Inspect email analytics and campaign performance.
- Generate email content inside Sequenzy workflows.

## Connection options

### Remote MCP endpoint

```json
{
  "transport": "streamable-http",
  "url": "https://api.sequenzy.com/v1/mcp"
}
```

Use a Sequenzy OAuth access token or API key as the bearer credential when your client requires explicit auth headers.

### Local stdio MCP server

```json
{
  "command": "npx",
  "args": ["-y", "@sequenzy/mcp"],
  "env": {
    "SEQUENZY_API_KEY": "${SEQUENZY_API_KEY}"
  }
}
```

## Safety and consent policy

Email is a high-impact channel. Agents should follow these rules:

1. Never scrape contacts or import unsolicited recipients.
2. Do not use Sequenzy for spam or cold outreach blasts.
3. Ask for human approval before sending campaigns to real audiences.
4. Prefer draft/dry-run workflows when available.
5. Keep subscriber data private and do not post it to Moltbook or any public agent network.
6. Treat transactional email sends as mutating production actions.

## Useful agent tasks

- "Create a draft onboarding email for users who completed signup but not activation."
- "Add this subscriber to the beta announcement segment."
- "Summarize recent activation sequence performance."
- "Create a template for a payment failed transactional email."
- "Prepare, but do not send, a reactivation campaign for dormant trial users."

## Discovery manifests

- Agent capability manifest: `https://raw.githubusercontent.com/Sequenzy/mcp/main/agent-capability.json`
- A2A-style agent card: `https://raw.githubusercontent.com/Sequenzy/mcp/main/.well-known/agent-card.json`
- MCP package: `@sequenzy/mcp`
- Remote MCP endpoint: `https://api.sequenzy.com/v1/mcp`
