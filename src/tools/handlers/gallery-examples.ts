import { apiRequest } from "../../runtime.js";
import { optionalString } from "../internal.js";

const SHARED_KEYS = ["url", "brand", "brief", "name"] as const;
/** Previews save nothing, so there is no name to give. */
const PREVIEW_KEYS = ["url", "brand", "brief", "website"] as const;

function exampleBody(
  args: Record<string, unknown>,
  keys: readonly string[],
  shared: readonly string[] = SHARED_KEYS
): Record<string, string> {
  const body: Record<string, string> = {};
  for (const key of [...shared, ...keys]) {
    const value = optionalString(args, key);
    if (value !== undefined) body[key] = value;
  }
  return body;
}

/** Pass-through to the /from-example endpoints; the API validates input. */
export async function handleGalleryExampleTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  if (name === "create_template_from_example") {
    const result = await apiRequest(
      "POST",
      "/api/v1/templates/from-example",
      exampleBody(args, ["email"]),
      optionalString(args, "companyId")
    );
    return { handled: true, result };
  }
  if (name === "preview_template_from_example") {
    const result = await apiRequest(
      "POST",
      "/api/v1/templates/from-example/preview",
      exampleBody(args, ["email"], PREVIEW_KEYS),
      optionalString(args, "companyId")
    );
    return { handled: true, result };
  }
  if (name === "preview_sequence_from_example") {
    const result = await apiRequest(
      "POST",
      "/api/v1/sequences/from-example/preview",
      exampleBody(args, ["sequence"], PREVIEW_KEYS),
      optionalString(args, "companyId")
    );
    return { handled: true, result };
  }
  if (name === "create_sequence_from_example") {
    const stepNumbers = args["stepNumbers"];
    const result = await apiRequest(
      "POST",
      "/api/v1/sequences/from-example",
      {
        ...exampleBody(args, ["sequence", "emailStyle"]),
        // Sent as given: the API rejects a malformed choice rather than
        // this tool dropping it into a default clone.
        // Null means unset, as for every other optional field.
        ...(stepNumbers !== undefined && stepNumbers !== null
          ? { stepNumbers }
          : {}),
      },
      optionalString(args, "companyId")
    );
    return { handled: true, result };
  }
  return { handled: false, result: undefined };
}
