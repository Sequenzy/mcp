import { afterEach, beforeEach, expect, it } from "bun:test";
import { Window } from "happy-dom";

import { element, requiredElement } from "./dom";
import { previewDocument } from "./email-preview";

const originalDocument = Object.getOwnPropertyDescriptor(
  globalThis,
  "document"
);
const originalParser = Object.getOwnPropertyDescriptor(globalThis, "DOMParser");
let window: Window;
beforeEach(() => {
  window = new Window();
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: window.document,
  });
  Object.defineProperty(globalThis, "DOMParser", {
    configurable: true,
    value: window.DOMParser,
  });
});
afterEach(async () => {
  if (originalDocument)
    Object.defineProperty(globalThis, "document", originalDocument);
  else Reflect.deleteProperty(globalThis, "document");
  if (originalParser)
    Object.defineProperty(globalThis, "DOMParser", originalParser);
  else Reflect.deleteProperty(globalThis, "DOMParser");
  await window.happyDOM.close();
});

it("puts user strings into text rather than executable markup", () => {
  const span = element("span", "note", '<img src=x onerror="alert(1)">');
  expect(span.className).toBe("note");
  expect(span.querySelector("img")).toBeNull();
  expect(span.textContent).toContain("<img");
  expect(element("p").textContent).toBe("");
  span.id = "target";
  document.body.append(span);
  expect(requiredElement("target")).toBe(span);
  expect(() => requiredElement("missing")).toThrow("Missing preview element");
});

it("keeps email styling/content while removing active content and enforcing its own policy", () => {
  const result = previewDocument(
    '<html><head><style>p{color:coral}</style><base href="https://bad.example"><link rel="stylesheet" href="https://bad.example/a.css"><meta http-equiv="refresh" content="0;url=https://bad.example"></head><body onload="bad()"><script>bad()</script><iframe srcdoc="bad"></iframe><object>bad</object><embed src="bad"><form action="bad"><input></form><p id="copy" style="font-weight:600">Saved copy</p><a href="https://example.com" onclick="bad()">Link</a><img src="https://images.sequenzy.com/image.png" alt="Product"><svg><a xlink:href="bad">SVG link</a></svg></body></html>'
  );
  const doc = new window.DOMParser().parseFromString(result, "text/html");
  expect(
    doc.querySelectorAll("script,iframe,object,embed,form,base,link")
  ).toHaveLength(0);
  expect(doc.querySelector("body")?.getAttribute("onload")).toBeNull();
  expect(doc.querySelector("a")?.getAttribute("href")).toBeNull();
  expect(doc.querySelector("p")?.textContent).toBe("Saved copy");
  expect(doc.querySelector("style")?.textContent).toBe("p{color:coral}");
  expect(doc.querySelector("img")?.getAttribute("src")).toBe(
    "https://images.sequenzy.com/image.png"
  );
  expect(
    doc.querySelector("meta[http-equiv]")?.getAttribute("content")
  ).toContain("script-src 'none'");
  expect(
    doc.querySelector("meta[name=referrer]")?.getAttribute("content")
  ).toBe("no-referrer");
});
