/**
 * Tools the open view offers to the host's model ("app tools" in MCP Apps).
 * They change only what this view shows: which step or sequence is open, the
 * preview width, and reloading saved data after the assistant edited it.
 * Writes stay on the server's own tools, with their usual permissions.
 *
 * Hosts save a user's "Always allow" choice against each definition, so keep
 * names, titles, descriptions and schemas constant; put changing values in
 * results. Each description's first line must stand alone (hosts may list
 * only the first 200 characters). Failures the assistant can fix come back as
 * normal results that start with "Not done:", because hosts may replace an
 * error result's text with a generic message.
 */
import type { ToolResult, ViewToolDefinition } from "./bridge";

export type ViewMode = "home" | "sequence" | "email" | "other";

export interface ViewController {
  mode(): ViewMode;
  /** Plain description of what the user has open, safe to show verbatim. */
  state(): Record<string, unknown>;
  openStep(nodeId: string, variantId?: string): Promise<string>;
  showOverview(tab: "flow" | "emails"): string;
  setWidth(width: "desktop" | "mobile"): string;
  reload(): Promise<string>;
  openSequence(sequenceId: string): Promise<string>;
  openCampaignEmail(campaignId: string): Promise<string>;
}

const readOnly = { readOnlyHint: true, destructiveHint: false };
const idProperty = (description: string) => ({
  type: "string",
  minLength: 1,
  description,
});

const DEFINITIONS = {
  get_view_state: {
    name: "get_view_state",
    title: "See what is open",
    description:
      "Describe what the user has open in this Sequenzy view: company, sequence or campaign, email step, A/B variant and preview width. Call it before acting on 'this email' or 'this step'.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: readOnly,
  },
  open_sequence_step: {
    name: "open_sequence_step",
    title: "Open a sequence email",
    description:
      "Open one email step of the sequence shown in this view and render its saved email. Use nodeId values from get_view_state or get_sequence; variantId picks an A/B variant.",
    inputSchema: {
      type: "object",
      properties: {
        nodeId: idProperty("Email step node ID in the open sequence."),
        variantId: idProperty(
          "Optional A/B variant ID of that step. Omit for its first variant."
        ),
      },
      required: ["nodeId"],
      additionalProperties: false,
    },
    annotations: readOnly,
  },
  show_sequence_overview: {
    name: "show_sequence_overview",
    title: "Show the sequence overview",
    description:
      "Return this view to the open sequence's overview, as the flow diagram or the list of its emails.",
    inputSchema: {
      type: "object",
      properties: {
        tab: {
          type: "string",
          enum: ["flow", "emails"],
          description: "flow (default) shows the diagram; emails lists them.",
        },
      },
      additionalProperties: false,
    },
    annotations: readOnly,
  },
  set_preview_width: {
    name: "set_preview_width",
    title: "Change the preview width",
    description:
      "Show the email open in this view at desktop (640px) or mobile (375px) width.",
    inputSchema: {
      type: "object",
      properties: {
        width: { type: "string", enum: ["desktop", "mobile"] },
      },
      required: ["width"],
      additionalProperties: false,
    },
    annotations: readOnly,
  },
  reload_view: {
    name: "reload_view",
    title: "Reload from saved data",
    description:
      "Reload this view from saved Sequenzy data so the user sees your latest edits. Call it after changing the sequence, email or campaign that the view shows.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: readOnly,
  },
  open_sequence: {
    name: "open_sequence",
    title: "Open a sequence",
    description:
      "Open one of the company's sequences in this view as a flow diagram. Use a sequenceId from get_view_state or list_sequences.",
    inputSchema: {
      type: "object",
      properties: { sequenceId: idProperty("Sequence ID to open.") },
      required: ["sequenceId"],
      additionalProperties: false,
    },
    annotations: readOnly,
  },
  open_campaign_email: {
    name: "open_campaign_email",
    title: "Open a campaign email",
    description:
      "Render one of the company's campaign emails in this view. Use a campaignId from get_view_state or list_campaigns.",
    inputSchema: {
      type: "object",
      properties: { campaignId: idProperty("Campaign ID to render.") },
      required: ["campaignId"],
      additionalProperties: false,
    },
    annotations: readOnly,
  },
} satisfies Record<string, ViewToolDefinition>;

export type ViewToolName = keyof typeof DEFINITIONS;

const TOOLS_BY_MODE: Record<ViewMode, ViewToolName[]> = {
  home: [
    "get_view_state",
    "open_sequence",
    "open_campaign_email",
    "reload_view",
  ],
  sequence: [
    "get_view_state",
    "open_sequence_step",
    "show_sequence_overview",
    "set_preview_width",
    "reload_view",
  ],
  email: ["get_view_state", "set_preview_width", "reload_view"],
  other: [],
};

export function viewToolsFor(mode: ViewMode): ViewToolDefinition[] {
  return TOOLS_BY_MODE[mode].map((name) => DEFINITIONS[name]);
}

function textResult(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}

function stringArgument(
  args: Record<string, unknown>,
  key: string,
  required: true
): string;
function stringArgument(
  args: Record<string, unknown>,
  key: string,
  required: false
): string | undefined;
function stringArgument(
  args: Record<string, unknown>,
  key: string,
  required: boolean
) {
  const value = args[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value === undefined && !required) return undefined;
  throw new Error(`Pass ${key} as a non-empty string.`);
}

/** Claude gives a view tool 45 seconds; answer before that. */
export const VIEW_TOOL_DEADLINE_MS = 40_000;

/**
 * Runs a view tool, answering by the host's deadline even when rendering is
 * slower; the view keeps loading and get_view_state reports the outcome.
 */
export async function callViewTool(
  controller: ViewController,
  name: string,
  args: Record<string, unknown>,
  deadlineMs = VIEW_TOOL_DEADLINE_MS
): Promise<ToolResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<ToolResult>((resolve) => {
    timer = setTimeout(
      () =>
        resolve(
          textResult(
            "Still loading in the view. Call get_view_state in a moment to see what it shows."
          )
        ),
      deadlineMs
    );
  });
  try {
    return await Promise.race([runViewTool(controller, name, args), late]);
  } finally {
    clearTimeout(timer);
  }
}

async function runViewTool(
  controller: ViewController,
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const allowed = TOOLS_BY_MODE[controller.mode()] as string[];
  if (!allowed.includes(name))
    return textResult(
      `Not done: ${name} is not available in what this view shows now. Call get_view_state to see what is open.`
    );
  try {
    switch (name as ViewToolName) {
      case "get_view_state":
        return textResult(JSON.stringify(controller.state()));
      case "open_sequence_step":
        return textResult(
          await controller.openStep(
            stringArgument(args, "nodeId", true),
            stringArgument(args, "variantId", false)
          )
        );
      case "show_sequence_overview": {
        const tab = args["tab"] ?? "flow";
        if (tab !== "flow" && tab !== "emails")
          throw new Error("Pass tab as flow or emails.");
        return textResult(controller.showOverview(tab));
      }
      case "set_preview_width": {
        const width = args["width"];
        if (width !== "desktop" && width !== "mobile")
          throw new Error("Pass width as desktop or mobile.");
        return textResult(controller.setWidth(width));
      }
      case "reload_view":
        return textResult(await controller.reload());
      case "open_sequence":
        return textResult(
          await controller.openSequence(
            stringArgument(args, "sequenceId", true)
          )
        );
      case "open_campaign_email":
        return textResult(
          await controller.openCampaignEmail(
            stringArgument(args, "campaignId", true)
          )
        );
    }
  } catch (error) {
    return textResult(
      `Not done: ${error instanceof Error ? error.message : "the view could not do that."}`
    );
  }
  return textResult(`Not done: unknown view tool ${name}.`);
}
