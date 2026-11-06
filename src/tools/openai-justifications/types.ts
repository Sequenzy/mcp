export type ToolJustification = {
  /** Why readOnlyHint has its value. */
  readOnly: string;
  /** Why destructiveHint has its value. */
  destructive: string;
  /** Why openWorldHint has its value. */
  openWorld: string;
  /**
   * Appended to the tool's description on the OpenAI surface when the
   * description alone does not show why a hint is set.
   */
  effects?: string;
};
