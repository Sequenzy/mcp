import { apiRequest } from "../../runtime.js";
import { requiredString } from "../internal.js";

export async function handleAiAndFeedbackTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  let result: unknown;

  switch (name) {
    case "generate_email": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "POST",
        "/api/v1/generate/email",
        args,
        companyId
      );
      break;
    }

    case "generate_subject_lines": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "POST",
        "/api/v1/generate/subjects",
        args,
        companyId
      );
      break;
    }

    case "generate_sms": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "POST",
        "/api/v1/generate/sms",
        args,
        companyId
      );
      break;
    }

    case "get_sms_settings": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "GET",
        "/api/v1/sms/settings",
        undefined,
        companyId
      );
      break;
    }

    case "get_sms_usage": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "GET",
        "/api/v1/sms/usage",
        undefined,
        companyId
      );
      break;
    }

    case "update_sms_number_label": {
      const companyId = args.companyId as string | undefined;
      const numberId = requiredString(
        "update_sms_number_label",
        args,
        "numberId"
      );
      if (args.label !== undefined && typeof args.label !== "string") {
        throw new Error(
          "update_sms_number_label `label` must be a string; pass an empty string to clear it."
        );
      }
      if (
        args.brandPrefix !== undefined &&
        typeof args.brandPrefix !== "string"
      ) {
        throw new Error(
          "update_sms_number_label `brandPrefix` must be a string; pass an empty string to clear it."
        );
      }
      if (args.label === undefined && args.brandPrefix === undefined) {
        throw new Error(
          "update_sms_number_label requires `label` and/or `brandPrefix`."
        );
      }
      result = await apiRequest(
        "PATCH",
        `/api/v1/sms/numbers/${encodeURIComponent(numberId)}`,
        {
          ...(typeof args.label === "string"
            ? { label: args.label.trim() || null }
            : {}),
          ...(typeof args.brandPrefix === "string"
            ? { brandPrefix: args.brandPrefix.trim() || null }
            : {}),
        },
        companyId
      );
      break;
    }

    case "release_sms_number": {
      const companyId = args.companyId as string | undefined;
      const numberId = requiredString("release_sms_number", args, "numberId");
      result = await apiRequest(
        "DELETE",
        `/api/v1/sms/numbers/${encodeURIComponent(numberId)}`,
        undefined,
        companyId
      );
      break;
    }

    case "send_test_sms": {
      const companyId = args.companyId as string | undefined;
      const body: Record<string, unknown> = {
        to: requiredString("send_test_sms", args, "to"),
      };
      for (const key of ["text", "imageUrls", "blocks", "fromNumberId"]) {
        if (args[key] !== undefined) {
          body[key] = args[key];
        }
      }
      result = await apiRequest("POST", "/api/v1/sms/test", body, companyId);
      break;
    }

    case "submit_feedback": {
      const companyId = args.companyId as string | undefined;
      const body: Record<string, unknown> = {
        message: requiredString("submit_feedback", args, "message"),
        source: "mcp",
      };
      for (const key of [
        "category",
        "context",
        "userIntent",
        "toolCalls",
        "expected",
        "actual",
        "resourceIds",
      ]) {
        if (args[key] !== undefined) {
          body[key] = args[key];
        }
      }
      result = await apiRequest("POST", "/api/v1/feedback", body, companyId);
      break;
    }

    default:
      return { handled: false, result: undefined };
  }

  return { handled: true, result };
}
