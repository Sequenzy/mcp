import { OPENAI_JUSTIFICATIONS_PART_1 } from "./part-1.js";
import { OPENAI_JUSTIFICATIONS_PART_2 } from "./part-2.js";
import { OPENAI_JUSTIFICATIONS_PART_3 } from "./part-3.js";
import { OPENAI_JUSTIFICATIONS_PART_4 } from "./part-4.js";
import { OPENAI_JUSTIFICATIONS_PART_5 } from "./part-5.js";
import { OPENAI_JUSTIFICATIONS_PART_6 } from "./part-6.js";
import type { ToolJustification } from "./types.js";

export type { ToolJustification } from "./types.js";

/**
 * Why each OpenAI-surface tool reports its readOnly, destructive and
 * open-world hints, keyed by the name ChatGPT sees. The plugin submission
 * form asks for one justification per hint per tool; build.ts exports these
 * for pasting. `effects` is appended to the tool's description on that
 * surface so the reason is also visible wherever the tool is used.
 */
export const OPENAI_TOOL_JUSTIFICATIONS: Readonly<
  Record<string, ToolJustification>
> = {
  ...OPENAI_JUSTIFICATIONS_PART_1,
  ...OPENAI_JUSTIFICATIONS_PART_2,
  ...OPENAI_JUSTIFICATIONS_PART_3,
  ...OPENAI_JUSTIFICATIONS_PART_4,
  ...OPENAI_JUSTIFICATIONS_PART_5,
  ...OPENAI_JUSTIFICATIONS_PART_6,
};
