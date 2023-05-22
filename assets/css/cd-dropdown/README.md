# Dropdown
A vanilla javascript replacement for Bootstrap’s dropdown plugin (used in
ocha_basic Drupal 7, jquery-dependent).

There are two elements: the button (referred to in code as “toggler”) and the
dropdown (referred to as “element”).
The dropdown element needs to be included in the markup and requires the
attribute of data-cd-toggable.
We use javascript to create and remove the toggle button as needed and the
attribute data-cd-hidden to apply the display rules.

@TODO refine this based on
https://docs.google.com/document/d/1GpTtCWNQvGiPDfZmhFvaKGvU9hbOG0HedFTYgo3nvd4/edit#heading=h.w6466tbgvgf1

## Purpose and Usage

**Minimum requirements**

The following attributes should be added to the dropdown element’s markup:
- `data-cd-toggable` - the value is used for the Button label
- `id` - this is also used to set the aria-controls attribute on the toggler
- `aria-labelledby` - component-toggle (eg. cd-filters-toggle)
- `data-cd-component` - the component name, for BEM selectors (eg. cd-filters)

**Optional**
- `data-cd-logo` and/or `data-cd-icon` if either are required for the button
- `data-cd-logo-only` adds a class visually-hidden to the button label
- `data-cd-label-switch` for different labels depending on open/closed state
- `data-cd-focus-target` for adding focus to a specific element when dropdown
is toggled (this works well with the Search component. Add the ID of the search
input field and it will have focus when the dropdown is expanded)
- `data-cd-replace=”ID”` will replace the element with the given ID with a
toggler. The element (ex:  a link) serves as a fallback element for progressive
enhancement when the cd-dropdown script cannot run.


## Caveats
Implementation for Drupal required using Drupal behaviours so we use the file
in `common_design/js` for the base theme.
The JS in this component folder is for testing outside of Drupal.

The dropdown element must be wrapped in a parent element.

### Variants

```
none

```
