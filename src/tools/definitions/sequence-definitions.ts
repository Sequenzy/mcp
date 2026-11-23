import type { Tool } from "../../mcp-types.js";

const companyIdProperty = {
  type: "string" as const,
  description: "Company ID. If omitted, uses the currently selected company.",
};

const keyDescription =
  "Your own key for the sequence: 1-128 characters of letters, digits, '_', '-' or '.', starting with a letter or digit.";

export const sequenceDefinitionToolDefinitions: Tool[] = [
  {
    name: "get_sequence_definition",
    description:
      'Opt-in sequences-as-code / GitOps tool: export a whole sequence as one YAML/JSON-ready definition document for version control or CI sync. For normal sequence inspection or editing, use get_sequence instead (it returns node IDs, updatedAt, graphRevision, and editable blocks for update_sequence, update_sequence_node, update_sequence_nodes, and edit_sequence_graph). By default this returns the readable format: trigger on top (e.g. { event: user.signed_up }), then steps in run order, each with a key and one kind: email ({ subject, previewText, html | blocks }), wait ("1d 12h"), branch (if/else: a list of { id, label, if: condition, steps } plus else: steps; paths rejoin at the next step), split (random: { percent, steps }), continueIf (condition), tag, untag, end, or type + config for anything else. Conditions: { tag }, { notTag }, { list }, { segment }, { event }, { field, equals | contains | greaterThan | lessThan }, { clickedLink }, { hasPhone }, { smsSubscribed }, { hasPushDevice }. The end is implicit. Sequences the readable format cannot describe exactly come back in the explicit form (steps plus connections), as does format: raw. Either document pushes back unchanged with push_sequence_definition. Pass key, or sequenceId for a sequence without a key (its steps get readable generated keys). Webhook header values come back as [REDACTED]; managedBy is left out so pushing a pulled document back never re-locks a sequence.',
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        key: {
          type: "string",
          description: `${keyDescription} Use this or sequenceId.`,
        },
        sequenceId: {
          type: "string",
          description:
            "Sequence ID, for a sequence that has no key yet. Use this or key.",
        },
        format: {
          type: "string",
          enum: ["readable", "raw"],
          description:
            "readable (default): nested steps, shorthands, implicit end. raw: every step plus a connections list.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "push_sequence_definition",
    description:
      "Opt-in sequences-as-code / GitOps workflow only, for syncing sequences owned as YAML/JSON files in a git repository or CI pipeline. Do not use this tool for normal marketing sequence creation or editing: use create_sequence (or generate_sequence) to create dashboard-editable sequences, and update_sequence, update_sequence_node, update_sequence_nodes, insert_sequence_step, edit_sequence_emails, or edit_sequence_graph to edit them. Creating a new sequence with push_sequence_definition defaults definition.managedBy to 'code', which locks its steps, emails, and settings as read-only in the Sequenzy dashboard (leaving only on/off, pause, and test sends available). Only use this when the user explicitly wants a sequence managed in code/GitOps; if a pushed definition must remain editable in the dashboard, pass definition.managedBy: 'dashboard'. Syncs a sequence from a definition document keyed by your own step keys, as returned by get_sequence_definition. Steps are matched by key: new keys are added, changed steps are updated in place, and steps missing from the document are removed, with any contacts waiting on them moved to the step that follows (or completed when nothing follows). Connections replace the stored graph, which must keep one trigger, reach an end step and contain no cycles. Settings fields you omit keep their stored values. A push never turns a sequence on or off or pauses it: new sequences start as drafts. Use dryRun true to see the changes (sequence fields, added/changed/removed steps with waiting contact counts, connection changes) without saving. Changing an active sequence needs confirmLiveChange true. A/B test steps keep their stored settings and cannot be created or removed here; inbound webhook triggers keep their event name. The dashboard lock does not cover API/MCP writes: changes made with update_sequence are replaced by the next push. To adopt an existing sequence into sequences-as-code when it has no key, pull it with sequenceId, set key, and push.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        key: { type: "string", description: keyDescription },
        definition: {
          type: "object",
          description:
            "The sequences-as-code definition document, in the readable format (name, trigger, settings?, steps) as get_sequence_definition returns it, or the explicit format (steps with type/config plus connections). Email steps take subject, previewText, name and html or blocks, or template: <email id> to copy a saved template (written fields override it). Every step needs a lasting key. A branch needs else (use [] to continue straight on). For new sequences, managedBy defaults to 'code' (read-only in the dashboard); set managedBy: 'dashboard' to keep the sequence editable in the dashboard, or omit managedBy on updates to preserve the current owner.",
          properties: {
            managedBy: {
              type: "string",
              enum: ["code", "dashboard"],
              description:
                "Ownership mode for this sequence. Defaults to 'code' when creating a new sequence via push_sequence_definition, which locks its steps, emails, and settings as read-only in the dashboard for GitOps workflows. Pass 'dashboard' if the sequence should stay editable in the dashboard. Omit on updates to keep the existing owner (only workspace owners and admins can change managedBy on an existing sequence).",
            },
          },
          additionalProperties: true,
        },
        dryRun: {
          type: "boolean",
          description:
            "Return the changes without saving them. Defaults to false.",
        },
        confirmLiveChange: {
          type: "boolean",
          description:
            "Required to change an active sequence: confirms the change can affect current and future recipients.",
        },
      },
      required: ["key", "definition"],
      additionalProperties: false,
    },
  },
];
