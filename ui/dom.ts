export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text = ""
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}
export function requiredElement<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing preview element: ${id}`);
  return node as T;
}
export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}
export function resultData(result: {
  isError?: boolean;
  structuredContent?: unknown;
  content?: Array<{ type: string; text?: string }>;
}): Record<string, unknown> {
  if (result.isError)
    throw new Error(
      result.content?.find((item) => item.type === "text")?.text ??
        "The preview could not be loaded."
    );
  if (result.structuredContent) return record(result.structuredContent);
  const content = result.content?.find((item) => item.type === "text")?.text;
  if (!content) throw new Error("The server returned no preview.");
  return record(JSON.parse(content));
}
