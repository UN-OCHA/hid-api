/**
 * Toggle the visibility of a dropdown.
 */
function toggle(toggler, collapse) {
  var element = toggler.nextElementSibling;
  if (element) {
    var expanded = collapse || toggler.getAttribute('aria-expanded') === 'true';

    // Switch the expanded/collapsed states.
    toggler.setAttribute('aria-expanded', !expanded);
    element.setAttribute('data-cd-hidden', expanded);

    // Switch the labels.
    var labelWrapper = toggler.querySelector('[data-cd-label-switch]');
    if (labelWrapper) {
      var label = labelWrapper.getAttribute('data-cd-label-switch');
      labelWrapper.setAttribute('data-cd-label-switch', labelWrapper.textContent);
      labelWrapper.textContent = label;
    }

    // Change the focus when expanded if a target is specified.
    if (element.hasAttribute('data-cd-focus-target') && !expanded) {
      var target = document.getElementById(element.getAttribute('data-cd-focus-target'));
      if (target) {
        target.focus();
      }
    }
  }
}

/**
 * Collapse all dropdowns.
 */
function collapseAll(exceptions) {
  var elements = document.querySelectorAll('[data-cd-toggler][aria-expanded="true"]');
  exceptions = exceptions || [];

  elements.forEach(function (element) {
    // Elements can be directed to stay open in two ways:
    //  * We can apply an attribute directly in DOM
    //  * We can mark it as an exception when calling this function
    //
    // If neither apply, then close the element.
    if (!element.hasAttribute('data-cd-toggable-keep') && exceptions.indexOf(element) === -1) {
      toggle(element, true);
    }
  });
}


/**
 * Get the togglable parents of the toggler element.
 */
function getToggableParents(element) {
  var elements = [];
  while (element && element !== document) {
    if (element.hasAttribute && element.hasAttribute('data-cd-toggable')) {
      element = element.previousElementSibling;
    }

    // Skip if the there was no previous sibling as that means there is no
    // toggler for the toggable element.
    if (!element) {
      break;
    }

    // Store the toggling button of the togglable parent so that it can
    // be ignored when collapsing the opened toggables.
    if (element.hasAttribute && element.hasAttribute('data-cd-toggler')) {
      elements.push(element);
    }
    element = element.parentNode;
  }
  return elements;
}

/**
 * Handle toggling of toggable elements.
 */
function handleToggle(event) {
  var target = event.currentTarget;
  if (target) {
    collapseAll(getToggableParents(target));
    toggle(target);
  }
  event.preventDefault();
  event.stopPropagation();
}

/**
 * Handle togglable element visibility when pressing escape.
 *
 * Hide a toggable element when escape is pressed and the focus is on it
 * or on its toggler.
 *
 * This is to meet the WCAG 2.1 1.4.13: Content on Hover or Focus
 * criterion.
 *
 * @see https://www.w3.org/WAI/WCAG21/Understanding/content-on-hover-or-focus.html
 */
function handleEscape(event) {
  var key = event.which || event.keyCode;
  // Escape.
  if (key === 27) {
    var target = event.currentTarget;
    // Toggable element, get the toggling button.
    if (!target.hasAttribute('data-cd-toggler')) {
      target = target.previousElementSibling;
    }
    // Focus the button and hide the content.
    if (target && target.hasAttribute('data-cd-toggler')) {
      target.focus();
      toggle(target, true);
    }
  }
}

/**
 * Handle global clicks outside of toggable elements, close them in this case.
 */
function handleClickAway(event) {
  var target = event.target;
  if (target) {
    if (target.nodeName === 'A' && !target.hasAttribute('data-cd-toggler')) {
      collapseAll();
    }
    else {
      // Loop until we find a parent which is a toggable or toggler element
      // or we reach the "context" element.
      while (target && target !== document) {
        if (target.hasAttribute) {
          // Skip if the clicked element belong to a toggler or a toggable
          // element.
          if (target.hasAttribute('data-cd-toggler') || target.hasAttribute('data-cd-toggable')) {
            return;
          }
        }
        target = target.parentNode;
      }
    }
    collapseAll();
  }
}

/**
 * Update the toggable elements when the window is resized.
 */
function handleResize(selector) {
  var elements = document.querySelectorAll('[data-cd-toggable]');
  for (var i = 0, l = elements.length; i < l; i++) {
    updateToggable(elements[i]);
  }
}

/**
 * Create a svg icon.
 */
function createIcon(name, component, type) {
  var svgElem = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  var useElem = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  useElem.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#cd-icon--' + name);
  svgElem.setAttribute('width', '16');
  svgElem.setAttribute('height', '16');
  svgElem.setAttribute('aria-hidden', 'true');
  svgElem.setAttribute('focusable', 'false');

  var classes = [
    'cd-icon',
    'cd-icon--' + name
  ];

  if (component && type) {
    classes.push(component + '__' + type);
  }

  // Note: IE 11 doesn't support classList on SVG elements.
  svgElem.setAttribute('class', classes.join(' '));
  svgElem.appendChild(useElem);

  return svgElem;
}

/**
 * Create a button to toggle a dropdown.
 */
function createButton(element) {
  var id = element.getAttribute('id');
  var label = element.getAttribute('data-cd-toggable');
  var logo = element.getAttribute('data-cd-logo');
  var logoOnly = element.hasAttribute('data-cd-logo-only');
  var icon = element.getAttribute('data-cd-icon');
  var component = element.getAttribute('data-cd-component');

  // Create the button.
  var button = document.createElement('button');
  button.setAttribute('type', 'button');

  // ID.
  button.setAttribute('id', id + '-toggler');

  // @todo rename logo/icon to be more inclusive if needed.
  //  Eg. prefix/suffix or pre/post
  // Pre-label SVG icon.
  if (logo) {
    button.appendChild(createIcon(logo, component, 'logo'));
  }

  // Button label.
  var labelWrapper = document.createElement('span');
  labelWrapper.appendChild(document.createTextNode(label));
  button.appendChild(labelWrapper);

  // Only show the logo icon if requested but keep the title visible
  // to assistive technologies.
  if (logo && logoOnly) {
    labelWrapper.classList.add('visually-hidden');
  }

  // Post-label SVG icon.
  if (icon) {
    // @todo This could default to dropdown arrow icon.
    button.appendChild(createIcon(icon, component, 'icon'));
  }

  // BEM for class selectors.
  if (component) {
    button.classList.add(component + '__btn');
    labelWrapper.classList.add(component + '__btn-label');
  }

  // Do not collapse the dropdown when clicking outside.
  if (element.hasAttribute('data-cd-toggable-keep')) {
    button.setAttribute('data-cd-toggable-keep', '');
  }

  // Alternate label for when the button is expanded.
  if (element.hasAttribute('data-cd-toggable-expanded')) {
    labelWrapper.setAttribute('data-cd-label-switch', element.getAttribute('data-cd-toggable-expanded'));
  }

  return button;
}

/**
 * Transform the element into a dropdown menu.
 */
function setToggable(element, toggler) {
  var toggler = element.previousElementSibling;

  // Skip if the toggler is not a button or has already been processed.
  if (toggler) {
    // Togglers should be buttons to avoid mis-processing elements
    // appearing before the toggable element. There is still a risk of
    // mis-processing if, for whatever reason, there is a button which is
    // not the toggler before the toggable element.
    if (toggler.nodeName !== 'BUTTON') {
      // For some dropdown elements, we want to replace a fallback element
      // (like a link) with the toggler button.
      if (!element.hasAttribute('data-cd-replace')) {
        return;
      }
    }
    // We assume that if a button has the "data-cd-toggler" attribute then
    // it has been processed by the "setToggable" function. That means
    // this attribute should not be used directly in the markup otherwise
    // the toggable element will not be processed by this script and event
    // handlers will not be attached.
    else if (toggler.hasAttribute('data-cd-toggler')) {
      return;
    }
  }
  // Create a button to toggle the element.
  if (!toggler || element.hasAttribute('data-cd-replace')) {
    toggler = createButton(element);
  }

  // Flag to indicate that the toggable element is initially expanded.
  var expand = element.hasAttribute('data-cd-toggable-expand') || false;

  // Set the toggling attributes of the toggler.
  toggler.setAttribute('data-cd-toggler', '');
  toggler.setAttribute('aria-expanded', expand !== false);
  toggler.setAttribute('aria-haspopup', true);

  // For better conformance with the aria specs though it doesn't do
  // much in most screen reader right now (2020/01), we had the
  // `aria-controls` attribute.
  //
  // @todo generate an id for the toggable element if it has none?
  if (element.hasAttribute('id')) {
    toggler.setAttribute('aria-controls', element.getAttribute('id'));
  }

  // Add toggling function.
  toggler.addEventListener('click', handleToggle);

  // Collapse when pressing scape.
  toggler.addEventListener('keydown', handleEscape);
  element.addEventListener('keydown', handleEscape);

  // Mark the element as toggable so that it can be handled properly
  // by the global click handler.
  if (!element.hasAttribute('data-cd-toggable')) {
    element.setAttribute('data-cd-toggable', '');
  }

  // Hide the element.
  element.setAttribute('data-cd-hidden', expand === false);

  // Remove the button fallback element if any.
  if (element.hasAttribute('data-cd-replace')) {
    var fallback = document.getElementById(element.getAttribute('data-cd-replace'));
    if (fallback) {
      fallback.parentNode.removeChild(fallback);
    }
    element.removeAttribute('data-cd-replace');
  }

  // Add the toggler before the toggable element if not already.
  if (element.previousElementSibling !== toggler) {
    element.parentNode.insertBefore(toggler, element);
  }
}

/**
 * Remove the element's toggler.
 */
function unsetToggable(element) {
  var toggler = element.previousElementSibling;
  if (toggler && toggler.hasAttribute('data-cd-toggler')) {
    // Remove event handler to avoid leaking.
    toggler.addEventListener('click', handleToggle);
    toggler.addEventListener('keydown', handleEscape);
    element.addEventListener('keydown', handleEscape);

    // Delete toggling button.
    toggler.parentNode.removeChild(toggler);

    // Reset attributes on the toggable element.
    element.removeEventListener('keydown', handleEscape);
    element.removeAttribute('data-cd-hidden');
  }
}

/**
 * Update a toggable element, setting or removing the toggling button and
 * attributes depending on the `dropdown` css property. When set to false
 * we remove the toggler and reset the toggable attributes so that the HTML
 * markup reflects the current behavior of the element.
 */
function updateToggable(element) {
  if (window.getComputedStyle(element, null).getPropertyValue('--dropdown') === 'false') {
    unsetToggable(element);
  }
  else {
    setToggable(element);
  }
  // Mark the element as processed. This is notably used to remove the
  // initial hidden state that is used to prevent flash of content.
  if (!element.hasAttribute('data-cd-processed')) {
    element.setAttribute('data-cd-processed', true);
  }
}

/**
 * Initialize the toggable menus, adding a toggle button and event
 * handling.
 */
function initializeToggables() {
  // Collapse dropdowns when clicking outside of the toggable target.
  document.addEventListener('click', handleClickAway);

  // Loop through the toggable elements and set/unset the toggling button
  // depending on the screen size.
  window.addEventListener('resize', handleResize);

  // Initial setup.
  handleResize();
}

/**
 * Main logic.
 */
if (document.documentElement.classList.contains('js')) {

  // Collapse popups when clicking outside of the toggable target.
  document.addEventListener('click', handleClickAway);

  document.addEventListener('click', handleEscape);
  window.addEventListener('click', handleResize);
  document.addEventListener('click', handleToggle);

  // Initialize toggable dropdown.
  initializeToggables();

}
