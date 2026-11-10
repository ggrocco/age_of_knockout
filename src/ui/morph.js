// Patches an element's children to match an HTML string, keeping every node whose place and tag stay the same.
// The HUD redraws its top bar, info panel and tile costs many times a second; replacing them with innerHTML swapped
// the button under the player's finger for a copy, and Safari on the iPhone drops a tap whose element went away
// between touching and lifting (the second or third try then landed between redraws).
const template = typeof document === 'undefined' ? null : document.createElement('template');

function syncAttributes(from, to) {
  for (const { name } of [...from.attributes]) if (!to.hasAttribute(name)) from.removeAttribute(name);
  for (const { name, value } of to.attributes) if (from.getAttribute(name) !== value) from.setAttribute(name, value);
}

function morphNode(from, to) {
  if (from.nodeType !== to.nodeType || from.nodeName !== to.nodeName) {
    from.replaceWith(to);
    return;
  }
  if (from.nodeType !== 1) {
    if (from.nodeValue !== to.nodeValue) from.nodeValue = to.nodeValue;
    return;
  }
  syncAttributes(from, to);
  morphChildren(from, to);
}

function morphChildren(from, to) {
  const next = [...to.childNodes];
  for (let i = 0; i < next.length; i++) {
    const old = from.childNodes[i];
    if (old) morphNode(old, next[i]);
    else from.appendChild(next[i]);
  }
  while (from.childNodes.length > next.length) from.lastChild.remove();
}

export function morphHtml(el, html) {
  template.innerHTML = html;
  morphChildren(el, template.content);
}
