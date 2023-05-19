/**!
 * https://github.com/UN-OCHA/common_design/blob/bfc12aadbc80267bd6093abba4389945382d11c6/js/cd-polyfill.js
 */
/* eslint func-names: "off" */

// Remove no-js class from HTML
document.documentElement.classList.remove('no-js');
document.documentElement.classList.add('js');

// Method forEach on Nodelist
// See https://developer.mozilla.org/en-US/docs/Web/API/NodeList/forEach#Polyfill
if (window.NodeList && !NodeList.prototype.forEach) {
  NodeList.prototype.forEach = Array.prototype.forEach;
}

// IE11 Polyfill for .closest
// See https://github.com/jonathantneal/closest
const ElementPrototype = window.Element.prototype;

if (typeof ElementPrototype.matches !== 'function') {
  ElementPrototype.matches = ElementPrototype.msMatchesSelector || ElementPrototype.mozMatchesSelector || ElementPrototype.webkitMatchesSelector || function matches(selector) {
    'use strict';
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
    'use strict';
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
