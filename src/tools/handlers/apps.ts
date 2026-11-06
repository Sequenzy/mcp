import { apiRequest } from "../../runtime.js";
import { requiredString } from "../internal.js";

export async function handleAppTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  if (
    ![
      "preview_sequence",
      "open_image_upload",
      "monitor_subscriber_import",
    ].includes(name)
  )
    return { handled: false, result: undefined };
  const companyId = requiredString(name, args, "companyId");
  if (name === "open_image_upload")
    return { handled: true, result: { mode: "upload", companyId } };
  if (name === "monitor_subscriber_import") {
    const importId = requiredString(name, args, "importId");
    const result = await apiRequest<Record<string, unknown>>(
      "GET",
      `/api/v1/subscribers/imports/${encodeURIComponent(importId)}`,
      undefined,
      companyId
    );
    return {
      handled: true,
      result: { ...result, mode: "import", companyId, importId },
    };
  }
  const sequenceId = requiredString(name, args, "sequenceId");
  const result = await apiRequest<Record<string, unknown>>(
    "GET",
    `/api/v1/sequences/${encodeURIComponent(sequenceId)}`,
    undefined,
    companyId
  );
  return {
    handled: true,
    result: { ...result, mode: "sequence", companyId, sequenceId },
  };
}
