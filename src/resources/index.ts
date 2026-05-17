import type { Resource } from "@modelcontextprotocol/sdk/types.js";

import { buildSequenzyAppUrls } from "../app-urls.js";
import { formatMcpError } from "../error-output.js";
import { apiRequest, getSelectedCompanyId } from "../index.js";

// Resource definitions
export const resources: Resource[] = [
  {
    uri: "sequenzy://dashboard",
    name: "Dashboard Overview",
    description: "Live overview stats for the last 7 days",
    mimeType: "application/json",
  },
  {
    uri: "sequenzy://company",
    name: "Current Company",
    description:
      "The currently selected company, including localization settings",
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
    description: "All available email templates with localization status",
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
  {
    uri: "sequenzy://app-routes",
    name: "Dashboard URL Routes",
    description:
      "Route templates and settings tabs for building Sequenzy dashboard links",
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
        data = await apiRequest("GET", "/api/v1/metrics?period=7d");
        break;

      case "sequenzy://company": {
        const account = await apiRequest<{
          currentCompanyId: string | null;
        }>("GET", "/api/v1/account");
        const companyId = getSelectedCompanyId() ?? account.currentCompanyId;

        if (!companyId) {
          throw new Error(
            "No company available. Create or select a company first."
          );
        }

        data = await apiRequest("GET", `/api/v1/companies/${companyId}`);
        break;
      }

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

      case "sequenzy://app-routes":
        data = buildSequenzyAppUrls();
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
          text: formatMcpError(error),
        },
      ],
    };
  }
}
