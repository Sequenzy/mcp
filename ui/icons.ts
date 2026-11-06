const paths: Record<string, string> = {
  mail: "M4 5h16v14H4z M4 6l8 6 8-6",
  clock: "M12 8v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  bolt: "M13 2L4 14h7l-1 8 10-13h-7z",
  branch:
    "M6 3v12a4 4 0 0 0 4 4h8 M6 7h8a4 4 0 0 0 4-4 M3 3h6 M15 3h6 M15 19h6",
  action: "M12 3v18 M3 12h18",
  desktop: "M3 4h18v13H3z M8 21h8 M12 17v4",
  mobile: "M7 2h10v20H7z M11 18h2",
  back: "M15 5l-7 7 7 7",
  next: "M9 5l7 7-7 7",
  refresh:
    "M20 7v5h-5 M4 17v-5h5 M5 8a8 8 0 0 1 13-3l2 3 M19 16A8 8 0 0 1 6 19l-2-3",
  minus: "M5 12h14",
  plus: "M5 12h14 M12 5v14",
  fit: "M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5",
};
export function icon(name: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [name, value] of Object.entries({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "1.6",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
  }))
    svg.setAttribute(name, value);
  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute("d", paths[name] ?? paths["action"]);
  svg.append(path);
  return svg;
}
