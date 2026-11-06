import { apiRequest } from "../../runtime.js";
import { requiredString } from "../internal.js";

function receivingDomainPath(toolName: string, args: Record<string, unknown>) {
  const domain = requiredString(toolName, args, "domain");
  return `/api/v1/receiving-domains/${encodeURIComponent(domain)}`;
}

/** Receiving domains: domains and subdomains whose mail reaches the inbox. */
export async function handleReceivingDomainTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  const companyId = args.companyId as string | undefined;

  switch (name) {
    case "list_receiving_domains":
      return {
        handled: true,
        result: await apiRequest(
          "GET",
          "/api/v1/receiving-domains",
          undefined,
          companyId
        ),
      };

    case "add_receiving_domain":
      return {
        handled: true,
        result: await apiRequest(
          "POST",
          "/api/v1/receiving-domains",
          { domain: requiredString(name, args, "domain") },
          companyId
        ),
      };

    case "get_receiving_domain":
      return {
        handled: true,
        result: await apiRequest(
          "GET",
          receivingDomainPath(name, args),
          undefined,
          companyId
        ),
      };

    case "verify_receiving_domain":
      return {
        handled: true,
        result: await apiRequest(
          "POST",
          `${receivingDomainPath(name, args)}/verify`,
          undefined,
          companyId
        ),
      };

    case "remove_receiving_domain":
      return {
        handled: true,
        result: await apiRequest(
          "DELETE",
          receivingDomainPath(name, args),
          undefined,
          companyId
        ),
      };

    default:
      return { handled: false, result: undefined };
  }
}
