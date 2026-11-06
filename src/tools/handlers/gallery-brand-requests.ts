import { apiRequest } from "../../runtime.js";
import { optionalString, requiredString } from "../internal.js";

/** Pass-through to /gallery/brand-requests; the API validates input. */
export async function handleGalleryBrandRequestTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  const companyId = optionalString(args, "companyId");
  if (name === "list_gallery_brand_requests") {
    return {
      handled: true,
      result: await apiRequest(
        "GET",
        "/api/v1/gallery/brand-requests",
        undefined,
        companyId
      ),
    };
  }
  if (name === "request_gallery_brand") {
    const note = optionalString(args, "note");
    return {
      handled: true,
      result: await apiRequest(
        "POST",
        "/api/v1/gallery/brand-requests",
        {
          website: requiredString(name, args, "website"),
          ...(note !== undefined ? { note } : {}),
        },
        companyId
      ),
    };
  }
  if (name === "remove_gallery_brand_request") {
    return {
      handled: true,
      result: await apiRequest(
        "DELETE",
        `/api/v1/gallery/brand-requests/${encodeURIComponent(requiredString(name, args, "id"))}`,
        undefined,
        companyId
      ),
    };
  }
  return { handled: false, result: undefined };
}
