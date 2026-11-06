import { apiRequest } from "../../runtime.js";
import { optionalString, requiredString } from "../internal.js";

/** Pass-through to /gallery/watchlist; the API validates input. */
export async function handleGalleryWatchlistTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  const companyId = optionalString(args, "companyId");
  if (name === "list_watched_brands") {
    return {
      handled: true,
      result: await apiRequest(
        "GET",
        "/api/v1/gallery/watchlist",
        undefined,
        companyId
      ),
    };
  }
  if (name === "watch_brand") {
    const note = optionalString(args, "note");
    return {
      handled: true,
      result: await apiRequest(
        "POST",
        "/api/v1/gallery/watchlist",
        {
          website: requiredString(name, args, "website"),
          ...(note !== undefined ? { note } : {}),
        },
        companyId
      ),
    };
  }
  if (name === "unwatch_brand") {
    return {
      handled: true,
      result: await apiRequest(
        "DELETE",
        `/api/v1/gallery/watchlist/${encodeURIComponent(requiredString(name, args, "id"))}`,
        undefined,
        companyId
      ),
    };
  }
  if (name === "list_watched_brand_emails") {
    const params = new URLSearchParams();
    for (const key of ["domain", "since", "cursor"] as const) {
      const value = optionalString(args, key);
      if (value !== undefined) params.set(key, value);
    }
    const limit = args["limit"];
    if (typeof limit === "number" || typeof limit === "string") {
      params.set("limit", String(limit));
    }
    const query = params.toString();
    return {
      handled: true,
      result: await apiRequest(
        "GET",
        `/api/v1/gallery/watchlist/emails${query ? `?${query}` : ""}`,
        undefined,
        companyId
      ),
    };
  }
  return { handled: false, result: undefined };
}
