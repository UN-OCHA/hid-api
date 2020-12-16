// forEach method on Nodelist
// https://developer.mozilla.org/en-US/docs/Web/API/NodeList/forEach#Polyfill
if (window.NodeList && !NodeList.prototype.forEach) {
  NodeList.prototype.forEach = Array.prototype.forEach;
}

// IE11 Polyfill for .closest
// https://github.com/jonathantneal/closest
const ElementPrototype = window.Element.prototype;

if (typeof ElementPrototype.matches !== 'function') {
  ElementPrototype.matches = ElementPrototype.msMatchesSelector || ElementPrototype.mozMatchesSelector || ElementPrototype.webkitMatchesSelector || function matches(selector) {
    let element = this;
    const elements = (element.document || element.ownerDocument).querySelectorAll(selector);
    let index = 0;

    while (elements[index] && elements[index] !== element) {
      ++index;
    }

    return Boolean(elements[index]);
  };
}

if (typeof ElementPrototype.closest !== 'function') {
  ElementPrototype.closest = function closest(selector) {
    let element = this;

    while (element && element.nodeType === 1) {
      if (element.matches(selector)) {
        return element;
      }

      element = element.parentNode;
    }

    return null;
  };
}
