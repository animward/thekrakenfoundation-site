(function () {
  "use strict";

  // Default OFF. Enable by adding ?wireframe=1
  const params = new URLSearchParams(window.location.search);
  const wireframeParam = (params.get("wireframe") || "").toLowerCase();
  const enabled = wireframeParam === "1" || wireframeParam === "true" || wireframeParam === "on";

  if (!enabled) return;

  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "CANVAS"]);

  function isWhitespaceOnly(text) {
    return !text || !text.trim();
  }

  function placeholderForElement(el) {
    const tag = el.tagName;
    if (!tag) return null;

    if (tag === "H1") return "Main Page Title";
    if (tag === "H2") return "Section Heading";
    if (tag === "H3") return "Subsection Title";
    if (tag === "H4") return "Minor Heading";
    if (tag === "H5") return "Detail Heading";
    if (tag === "H6") return "Fine Detail";

    if (tag === "P") return "Paragraph text content describing the topic.";
    if (tag === "LI") return "List item description.";
    if (tag === "SPAN") return "Inline text span.";

    if (tag === "A") {
      // Keep navigation usable: never replace link text inside any <nav>.
      if (el.closest("nav")) return null;
      if (el.classList.contains("btn") || el.classList.contains("button")) return "Call to Action";
      return "Link Text";
    }

    if (tag === "BUTTON") return "Button Label";

    // For everything else: only replace if it has a single direct text node.
    return null;
  }

  function replaceInElement(el) {
    if (!el || SKIP_TAGS.has(el.tagName)) return;

    const tag = el.tagName;

    // Inputs: placeholder/value
    if (tag === "INPUT" || tag === "TEXTAREA") {
      if (el.placeholder) el.placeholder = "Enter your input here";
      return;
    }

    // Replace only direct text nodes so we don't clobber nested markup.
    const placeholder = placeholderForElement(el);
    if (!placeholder) return;

    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType !== Node.TEXT_NODE) continue;
      if (isWhitespaceOnly(node.textContent)) continue;
      node.textContent = placeholder;
    }
  }

  function walk(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        if (!node || !node.tagName) return NodeFilter.FILTER_SKIP;
        if (SKIP_TAGS.has(node.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const elements = [];
    while (walker.nextNode()) elements.push(walker.currentNode);

    for (const el of elements) replaceInElement(el);
  }

  // Title
  document.title = "EGEX - Page Title";

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => walk(document.body), { once: true });
  } else {
    walk(document.body);
  }
})();
