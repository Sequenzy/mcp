import { apiRequest } from "../../runtime.js";
import {
  buildLandingPageUpdateBody,
  buildLandingPageDomainSettingsBody,
} from "../internal.js";

export async function handleLandingPageTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  let result: unknown;

  switch (name) {
    case "list_landing_pages": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "GET",
        "/api/v1/landing-pages",
        undefined,
        companyId
      );
      break;
    }

    case "get_landing_page": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "GET",
        `/api/v1/landing-pages/${args.landingPageId}`,
        undefined,
        companyId
      );
      break;
    }

    case "create_landing_page": {
      const companyId = args.companyId as string | undefined;
      const allowedKeys = new Set([
        "companyId",
        "name",
        "slug",
        "template",
        "content",
      ]);
      const unsupportedKeys = Object.keys(args).filter(
        (key) => !allowedKeys.has(key)
      );

      if (unsupportedKeys.length > 0) {
        throw new Error(
          `\`create_landing_page\` accepts only \`name\`, \`slug\`, \`template\`, and \`content\` fields. Unsupported field${unsupportedKeys.length === 1 ? "" : "s"}: ${unsupportedKeys.map((key) => `\`${key}\``).join(", ")}.`
        );
      }

      result = await apiRequest(
        "POST",
        "/api/v1/landing-pages",
        {
          ...(args.name !== undefined && { name: args.name }),
          ...(args.slug !== undefined && { slug: args.slug }),
          ...(args.template !== undefined && { template: args.template }),
          ...(args.content !== undefined && { content: args.content }),
        },
        companyId
      );
      break;
    }

    case "update_landing_page": {
      const companyId = args.companyId as string | undefined;
      const body = buildLandingPageUpdateBody("update_landing_page", args, {
        requireUpdate: true,
      });
      result = await apiRequest(
        "PUT",
        `/api/v1/landing-pages/${args.landingPageId}`,
        body,
        companyId
      );
      break;
    }

    case "publish_landing_page": {
      const companyId = args.companyId as string | undefined;
      const body = buildLandingPageUpdateBody("publish_landing_page", args, {
        requireUpdate: false,
      });
      result = await apiRequest(
        "POST",
        `/api/v1/landing-pages/${args.landingPageId}/publish`,
        body,
        companyId
      );
      break;
    }

    case "unpublish_landing_page": {
      const companyId = args.companyId as string | undefined;
      const body = buildLandingPageUpdateBody("unpublish_landing_page", args, {
        requireUpdate: false,
      });
      result = await apiRequest(
        "POST",
        `/api/v1/landing-pages/${args.landingPageId}/unpublish`,
        body,
        companyId
      );
      break;
    }

    case "duplicate_landing_page": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "POST",
        `/api/v1/landing-pages/${args.landingPageId}/duplicate`,
        {
          ...(args.name !== undefined && { name: args.name }),
          ...(args.slug !== undefined && { slug: args.slug }),
        },
        companyId
      );
      break;
    }

    case "delete_landing_page": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "DELETE",
        `/api/v1/landing-pages/${args.landingPageId}`,
        undefined,
        companyId
      );
      break;
    }

    case "connect_landing_page_domain": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "POST",
        "/api/v1/landing-pages/domain",
        { domain: args.domain },
        companyId
      );
      break;
    }

    case "update_landing_page_domain_settings": {
      const companyId = args.companyId as string | undefined;
      const body = buildLandingPageDomainSettingsBody(args);
      result = await apiRequest(
        "PUT",
        "/api/v1/landing-pages/domain",
        body,
        companyId
      );
      break;
    }

    // Sequences
    default:
      return { handled: false, result: undefined };
  }

  return { handled: true, result };
}
