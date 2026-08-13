import { apiRequest } from "../../runtime.js";
import { optionalString, requiredString } from "../internal.js";

/**
 * Blocks are validated against the shared block schema by the API, so this
 * only rejects the shape mistake the API could not report usefully: a caller
 * passing a single block object where the tool asks for a list.
 */
function requiredBlocks(
  toolName: string,
  args: Record<string, unknown>
): unknown[] {
  const value = args["blocks"];
  if (!Array.isArray(value)) {
    throw new Error(
      `\`blocks\` must be an array of block objects when calling \`${toolName}\`.`
    );
  }

  return value;
}

const EMAIL_COMPONENT_TOOL_NAMES = new Set([
  "list_email_components",
  "get_email_component",
  "get_default_email_component",
  "set_default_email_component",
  "create_email_component",
  "update_email_component",
  "delete_email_component",
]);

/**
 * Thin client over `/api/v1/email-components`. Every rule (name uniqueness,
 * version bumps, the default-footer unsubscribe guarantee) is enforced by the
 * shared service behind that route, so this file only maps arguments onto it.
 */
export async function handleEmailComponentTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  if (!EMAIL_COMPONENT_TOOL_NAMES.has(name)) {
    return { handled: false, result: undefined };
  }

  const companyId = optionalString(args, "companyId");

  if (name === "list_email_components") {
    const query = new URLSearchParams();
    const type = optionalString(args, "type");
    if (type) query.set("type", type);
    if (args["defaultsOnly"] === true) {
      query.set("defaultsOnly", "true");
    }

    const result = await apiRequest(
      "GET",
      `/api/v1/email-components${query.size > 0 ? `?${query}` : ""}`,
      undefined,
      companyId
    );

    return { handled: true, result };
  }

  if (name === "get_email_component") {
    const componentId = requiredString(name, args, "componentId");
    const result = await apiRequest(
      "GET",
      `/api/v1/email-components/${encodeURIComponent(componentId)}`,
      undefined,
      companyId
    );

    return { handled: true, result };
  }

  if (name === "get_default_email_component") {
    const slot = requiredString(name, args, "slot");
    const result = await apiRequest(
      "GET",
      `/api/v1/email-components/defaults/${encodeURIComponent(slot)}`,
      undefined,
      companyId
    );

    return { handled: true, result };
  }

  if (name === "set_default_email_component") {
    const slot = requiredString(name, args, "slot");
    const blocks = requiredBlocks(name, args);
    const body: Record<string, unknown> = { blocks };
    const componentName = optionalString(args, "name");
    const description = optionalString(args, "description");
    if (componentName !== undefined) body["name"] = componentName;
    if (description !== undefined) body["description"] = description;

    const result = await apiRequest(
      "PUT",
      `/api/v1/email-components/defaults/${encodeURIComponent(slot)}`,
      body,
      companyId
    );

    return { handled: true, result };
  }

  if (name === "create_email_component") {
    const body: Record<string, unknown> = {
      name: requiredString(name, args, "name"),
      blocks: requiredBlocks(name, args),
    };
    const description = optionalString(args, "description");
    const componentType = optionalString(args, "componentType");
    if (description !== undefined) body["description"] = description;
    if (componentType !== undefined) body["componentType"] = componentType;

    const result = await apiRequest(
      "POST",
      "/api/v1/email-components",
      body,
      companyId
    );

    return { handled: true, result };
  }

  if (name === "update_email_component") {
    const componentId = requiredString(name, args, "componentId");
    const body: Record<string, unknown> = {};
    const componentName = optionalString(args, "name");
    const description = optionalString(args, "description");
    const componentType = optionalString(args, "componentType");
    if (componentName !== undefined) body["name"] = componentName;
    if (description !== undefined) body["description"] = description;
    if (componentType !== undefined) body["componentType"] = componentType;
    if (args["blocks"] !== undefined) {
      body["blocks"] = requiredBlocks(name, args);
    }

    const result = await apiRequest(
      "PATCH",
      `/api/v1/email-components/${encodeURIComponent(componentId)}`,
      body,
      companyId
    );

    return { handled: true, result };
  }

  const componentId = requiredString(name, args, "componentId");
  const result = await apiRequest(
    "DELETE",
    `/api/v1/email-components/${encodeURIComponent(componentId)}`,
    undefined,
    companyId
  );

  return { handled: true, result };
}
