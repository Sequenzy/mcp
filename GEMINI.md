# Sequenzy MCP

Use the Sequenzy MCP server for the user’s requested email-marketing workflows. Authenticate with the user’s own Sequenzy account through OAuth. Discover current tools and schemas from the server; do not infer support from static examples.

Tools may change subscribers, campaigns and automations or send real email. Follow the user’s authorization and inspect the intended company, recipient scope and content before a send. Never claim a send or mutation succeeded without a successful tool result.

Documentation: https://docs.sequenzy.com/concepts/mcp
Website: https://www.sequenzy.com

## Install

`gemini extensions install https://github.com/Sequenzy/mcp`

Restart Gemini CLI after installation. If the MCP connection needs authentication, use `/mcp auth sequenzy` and complete the Sequenzy OAuth flow. This extension uses the hosted server, so it does not require building the local npm server or storing an API key in the manifest.
