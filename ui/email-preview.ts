/** The opaque sandbox is the security boundary; the inner CSP also blocks
 * scripts, connections, forms, frames and external CSS while allowing email images. */
export function previewDocument(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc
    .querySelectorAll(
      "script,iframe,frame,frameset,object,embed,base,link,meta[http-equiv],form"
    )
    .forEach((node) => node.remove());
  for (const node of doc.querySelectorAll("*")) {
    for (const attr of [...node.attributes]) {
      if (
        attr.name.toLowerCase().startsWith("on") ||
        [
          "href",
          "xlink:href",
          "formaction",
          "action",
          "srcdoc",
          "autofocus",
        ].includes(attr.name.toLowerCase())
      )
        node.removeAttribute(attr.name);
    }
  }
  const policy = doc.createElement("meta");
  policy.httpEquiv = "Content-Security-Policy";
  policy.content =
    "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'";
  const referrer = doc.createElement("meta");
  referrer.name = "referrer";
  referrer.content = "no-referrer";
  doc.head.prepend(policy, referrer);
  return `<!doctype html>${doc.documentElement.outerHTML}`;
}
