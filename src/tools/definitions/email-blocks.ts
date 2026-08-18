import type { Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * Block authoring is the one place where the tool schemas cannot describe the
 * payload: `blocks` is a 37-member discriminated union, and inlining it into
 * every tool that accepts blocks would cost more context than it saves. This
 * tool is the escape hatch - one call, on demand, for the type you are about
 * to write, instead of a permanent tax on every session.
 */
export const emailBlockToolDefinitions: Tool[] = [
  {
    name: "get_email_block_schema",
    description:
      'Field reference for Sequenzy email blocks: which fields each block type requires, which are optional, the allowed values of every enum field, and the shape of nested item arrays. Call this before authoring blocks for a type you have not written before, or after a block write is rejected. The `blocks` parameter on create_campaign, create_sequence, create_template, and update_sequence_node accepts any of these types, but is declared as a plain object array because the union is too large to inline. Without a blockType this lists every type with its required and optional fields; with one it returns that type\'s full reference plus a minimal valid example and authoring notes. Note that lists are their own block type rather than a text variant: a numbered list is {"type":"list","variant":"numbered","items":[{"content":"First"}]}, and a visual numbered walkthrough is {"type":"steps","variant":"numbered","items":[{"title":"Step one","description":"What happens"},{"title":"Step two","description":"What happens next"}]}. A `text` block only accepts variants paragraph, lead, and html, and never accepts `items`.',
    inputSchema: {
      type: "object",
      properties: {
        blockType: {
          type: "string",
          description:
            'A single block type to describe, for example "list", "steps", "text", or "hero". Omit to list every block type.',
        },
        creatableOnly: {
          type: "boolean",
          description:
            "Only list block types an author should hand-create, hiding structural types that the editor manages. Ignored when blockType is set.",
        },
      },
      required: [],
    },
  },
];
