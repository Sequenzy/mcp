import { apiRequest } from "../../runtime.js";
import { requiredString } from "../internal.js";
import { optionalIntegerInRange } from "../subscriber-helpers.js";
import { withVariationsWidget } from "../variations-widget.js";

const TOOLS = new Set([
  "list_sequence_email_variations",
  "generate_sequence_email_variations",
  "use_sequence_email_variation",
  "discard_sequence_email_variation",
]);

function oneOf(
  name: string,
  args: Record<string, unknown>,
  key: string,
  values: string[]
) {
  if (args[key] !== undefined && !values.includes(args[key] as string)) {
    throw new Error(
      `\`${key}\` must be one of ${values.join(", ")} when calling \`${name}\`.`
    );
  }
}

export async function handleSequenceEmailVariationTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  if (!TOOLS.has(name)) return { handled: false, result: undefined };

  const companyId = args.companyId as string | undefined;
  const sequenceId = encodeURIComponent(
    requiredString(name, args, "sequenceId")
  );
  const emailId = encodeURIComponent(requiredString(name, args, "emailId"));
  const base = `/api/v1/sequences/${sequenceId}/emails/${emailId}/variations`;
  const widget = {
    target: "sequence" as const,
    sequenceId: args.sequenceId as string,
    emailId: args.emailId as string,
  };
  const variationPath = () =>
    `${base}/${encodeURIComponent(requiredString(name, args, "variationId"))}`;

  switch (name) {
    case "list_sequence_email_variations":
      return {
        handled: true,
        result: withVariationsWidget(
          await apiRequest("GET", base, undefined, companyId),
          widget,
          args
        ),
      };
    case "generate_sequence_email_variations": {
      const prompt = requiredString(name, args, "prompt");
      const count = optionalIntegerInRange(name, args, "count", 1, 4);
      oneOf(name, args, "style", ["close", "fresh", "bold"]);
      return {
        handled: true,
        result: withVariationsWidget(
          await apiRequest(
            "POST",
            `${base}/generate`,
            {
              prompt,
              ...(count !== undefined ? { count } : {}),
              ...(args.style !== undefined ? { style: args.style } : {}),
            },
            companyId
          ),
          widget,
          args,
          true
        ),
      };
    }
    case "use_sequence_email_variation": {
      oneOf(name, args, "scope", ["email", "all"]);
      if (args.dryRun !== undefined && typeof args.dryRun !== "boolean") {
        throw new Error(
          `\`dryRun\` must be a boolean when calling \`${name}\`.`
        );
      }
      return {
        handled: true,
        result: await apiRequest(
          "POST",
          `${variationPath()}/use`,
          {
            ...(args.scope !== undefined ? { scope: args.scope } : {}),
            ...(args.dryRun !== undefined ? { dryRun: args.dryRun } : {}),
          },
          companyId
        ),
      };
    }
    default:
      return {
        handled: true,
        result: await apiRequest(
          "DELETE",
          variationPath(),
          undefined,
          companyId
        ),
      };
  }
}
