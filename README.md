# Sequenzy MCP Server

MCP server for [Sequenzy](https://sequenzy.com) - AI-powered email marketing automation.

## Features

- **Subscriber Management** - Add, update, search, and segment subscribers
- **Email Sequences** - Create AI-generated email automations
- **Campaigns** - Draft and manage email campaigns
- **Templates** - Create and use email templates
- **Analytics** - Get email stats and subscriber activity
- **AI Generation** - Generate emails, sequences, and subject lines

## Installation

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "sequenzy": {
      "command": "npx",
      "args": ["-y", "@sequenzy/mcp"],
      "env": {
        "SEQUENZY_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Other MCP Clients

```bash
npx @sequenzy/mcp
```

Set the `SEQUENZY_API_KEY` environment variable with your API key from [sequenzy.com/settings/api-keys](https://sequenzy.com/settings/api-keys).

## Available Tools

### Account & Setup
- `get_account` - Get account info and companies
- `select_company` - Switch between companies
- `create_company` - Create a new company/brand
- `create_api_key` - Generate API keys

### Subscribers
- `add_subscriber` - Add a new subscriber
- `update_subscriber` - Update subscriber attributes/tags
- `remove_subscriber` - Unsubscribe or delete
- `get_subscriber` - Get subscriber details
- `search_subscribers` - Search by tags, segments, or query

### Lists & Segments
- `list_tags` - List all tags
- `list_lists` - List subscriber lists
- `create_list` - Create a new list
- `list_segments` - List segments
- `create_segment` - Create a segment with filters

### Templates
- `list_templates` - List all templates
- `get_template` - Get template details
- `create_template` - Create a new template
- `update_template` - Update a template
- `delete_template` - Delete a template

### Campaigns
- `list_campaigns` - List all campaigns
- `get_campaign` - Get campaign details
- `create_campaign` - Create a draft campaign
- `update_campaign` - Update a campaign
- `send_test_email` - Send a test email

### Sequences (Automations)
- `list_sequences` - List all sequences
- `get_sequence` - Get sequence details
- `create_sequence` - Create an AI-generated sequence
- `update_sequence` - Update a sequence
- `enable_sequence` - Activate a sequence
- `disable_sequence` - Pause a sequence
- `delete_sequence` - Delete a sequence

### Transactional Email
- `send_email` - Send a one-off transactional email

### Analytics
- `get_stats` - Get overview statistics
- `get_campaign_stats` - Get campaign stats
- `get_sequence_stats` - Get sequence stats
- `get_subscriber_activity` - Get subscriber activity timeline

### AI Generation
- `generate_email` - Generate email from a prompt
- `generate_sequence` - Generate a multi-email sequence
- `generate_subject_lines` - Generate A/B subject line variants

## Example Usage

```
You: Add a subscriber with email john@example.com and tag them as "vip"

Claude: [Uses add_subscriber tool]
Successfully added john@example.com with the "vip" tag.

You: Create a welcome sequence for new trial users

Claude: [Uses create_sequence tool]
Created "Trial Welcome" sequence with 5 AI-generated emails...
```

## Get Your API Key

1. Sign up at [sequenzy.com](https://sequenzy.com)
2. Go to Settings → API Keys
3. Create a new key and add it to your MCP config

## License

MIT
