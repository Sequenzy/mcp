import type { Tool } from "../../mcp-types.js";

// Fresh objects per tool: profile transforms must never share schema nodes.
const companyIdProperty = () => ({
  type: "string" as const,
  description:
    "Company ID. If not provided, uses the currently selected company.",
});

const domainProperty = () => ({
  type: "string" as const,
  description:
    "Receiving domain name, e.g. support.acme.com, or its receiving domain ID.",
});

export const receivingDomainToolDefinitions: Tool[] = [
  // ============================================================================
  // Receiving domains (inbox mail and replies)
  // ============================================================================
  {
    name: "list_receiving_domains",
    description:
      "List receiving domains: domains and subdomains whose mail reaches the inbox (every address on them). A workspace has one; once verified, replies to emails from all its sending domains come back to reply addresses on it, like the tracking domain. Workspaces that set up several before keep them; replies then prefer the sender's own domain or one on the same root, else the oldest verified one. status verified: mail arrives and new reply addresses use it. pending: publish its records (a new name is reserved 7 days); until then replies use Sequenzy's shared address. failed: something broke; mail that still arrives is accepted, but new reply addresses use Sequenzy's address until fixed.",
    inputSchema: {
      type: "object",
      properties: { companyId: companyIdProperty() },
    },
  },
  {
    name: "add_receiving_domain",
    description:
      "Add the workspace's receiving domain: a domain or subdomain whose mail should reach the inbox. Once verified, replies to emails from all sending domains use reply addresses on it. Then the user publishes the returned MX record (and TXT record when listed) and you call verify_receiving_domain; the first verification turns Inbox on. A workspace has one receiving domain: a second returns 409 limit_reached before any DNS check (remove the current one first, after confirming with the user). A domain that already receives email elsewhere (its MX points at Google Workspace, Microsoft 365, Cloudflare Email Routing...) returns 409 domain_has_mailbox: suggest a subdomain such as support.acme.com and confirm with the user. 503 dns_check_failed means the MX lookup got no answer; retry in a minute. created is false when the workspace already has the name (returned unchanged, no check). The first receiving domain also sets replyTrackingDomainMode custom. Owner or admin only.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty(),
        domain: {
          type: "string",
          description:
            "Domain or subdomain to receive on, e.g. support.acme.com.",
        },
      },
      required: ["domain"],
    },
  },
  {
    name: "get_receiving_domain",
    description:
      "Get one receiving domain: status, DNS records to publish, error, and claimExpiresAt.",
    inputSchema: {
      type: "object",
      properties: { companyId: companyIdProperty(), domain: domainProperty() },
      required: ["domain"],
    },
  },
  {
    name: "verify_receiving_domain",
    description:
      "Check a receiving domain's DNS now instead of waiting for the automatic check. For a domain added with add_receiving_domain, the first successful verification turns Inbox on (replyTracking.inboundEmailEnabled); domains from an older reply setup or created by update_inbox_address leave it unchanged. Owner or admin only.",
    inputSchema: {
      type: "object",
      properties: { companyId: companyIdProperty(), domain: domainProperty() },
      required: ["domain"],
    },
  },
  {
    name: "remove_receiving_domain",
    description:
      "Destructive: remove a receiving domain. All mail to it stops, including replies to emails already sent with reply addresses on it, and a branded inbox address on it is cleared. Confirm with the user first. Owner or admin only.",
    inputSchema: {
      type: "object",
      properties: { companyId: companyIdProperty(), domain: domainProperty() },
      required: ["domain"],
    },
  },
];
