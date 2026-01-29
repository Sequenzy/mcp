import type { Resource } from "@modelcontextprotocol/sdk/types.js";

import { apiRequest } from "../index.js";

// Resource definitions
export const resources: Resource[] = [
  {
    uri: "sequenzy://dashboard",
    name: "Dashboard Overview",
    description: "Live overview stats for the last 7 days",
    mimeType: "application/json",
  },
  {
    uri: "sequenzy://campaigns/recent",
    name: "Recent Campaigns",
    description: "Last 10 campaigns with status and basic stats",
    mimeType: "application/json",
  },
  {
    uri: "sequenzy://subscribers/recent",
    name: "Recent Subscribers",
    description: "Most recently added subscribers",
    mimeType: "application/json",
  },
  {
    uri: "sequenzy://subscribers/engaged",
    name: "Engaged Subscribers",
    description: "Most active/engaged subscribers",
    mimeType: "application/json",
  },
  {
    uri: "sequenzy://sequences",
    name: "Sequences",
    description: "All email sequences with status",
    mimeType: "application/json",
  },
  {
    uri: "sequenzy://templates",
    name: "Templates",
    description: "All available email templates",
    mimeType: "application/json",
  },
  {
    uri: "sequenzy://segments",
    name: "Segments",
    description: "All defined segments with subscriber counts",
    mimeType: "application/json",
  },
  {
    uri: "sequenzy://tags",
    name: "Tags",
    description: "All tags with usage counts",
    mimeType: "application/json",
  },
  {
    uri: "sequenzy://health",
    name: "Deliverability Health",
    description: "Email deliverability metrics and health status",
    mimeType: "application/json",
  },
];

// Resource read handler
export async function handleResourceRead(uri: string): Promise<{
  contents: Array<{ uri: string; mimeType: string; text: string }>;
}> {
  try {
    let data: unknown;

    switch (uri) {
      case "sequenzy://dashboard":
        data = await apiRequest("GET", "/api/v1/stats?period=7d");
        break;

      case "sequenzy://campaigns/recent":
        data = await apiRequest("GET", "/api/v1/campaigns?limit=10");
        break;

      case "sequenzy://subscribers/recent":
        data = await apiRequest(
          "GET",
          "/api/v1/subscribers?sort=createdAt&limit=20"
        );
        break;

      case "sequenzy://subscribers/engaged":
        data = await apiRequest(
          "GET",
          "/api/v1/subscribers?sort=engagement&limit=20"
        );
        break;

      case "sequenzy://sequences":
        data = await apiRequest("GET", "/api/v1/sequences");
        break;

      case "sequenzy://templates":
        data = await apiRequest("GET", "/api/v1/templates");
        break;

      case "sequenzy://segments":
        data = await apiRequest("GET", "/api/v1/segments");
        break;

      case "sequenzy://tags":
        data = await apiRequest("GET", "/api/v1/tags");
        break;

      case "sequenzy://health":
        data = await apiRequest("GET", "/api/v1/health/deliverability");
        break;

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      contents: [
        {
          uri,
          mimeType: "text/plain",
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
    };
  }
}
