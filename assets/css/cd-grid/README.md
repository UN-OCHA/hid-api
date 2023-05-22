# Grid

## Purpose and Usage
Basic grid layout with CSS grid and CSS flexbox layout based on @supports
queries.

Default grid is 4 columns.

The grid items are not width-restricted so with a 2 column grid, the items will
span 50% of the available width.

@TODO Consider replacing `cd-grid--grow` with a class added to lone grid
elements with css to make it use the full width:
```
      .cd-grid .cd-grid-item--grow {
        flex: 1 0 100%;
        grid-column: -1/1;
        max-width: 100%;
        max-width: unset;
      }
```
This would allow a header and footer span the full width inside a grid layout.

@TODO This might be dropped in favour of more robust grid system.

## Caveats
The selectors must be added to the parent div.

### Using with Drupal Views Grid format
The Views UI allows configuration for the number of columns, and alignment
(horizontal or vertical). The `cd-grid` component is used **only when the
Horizontal alignment is selected** and the checkbox for **Automatic width
is unchecked**. The **maximum number of columns is 4**. See the template
override in the base theme for `views-view-grid`.

When the 'Automatic width' option is enabled, the width of the columns are set
inline as part of the Drupal Views module. This means the Views Grid layout is
not responsive. See https://www.drupal.org/project/drupal/issues/3151553

### Variants

```
.cd-grid--2-col
.cd-grid--3-col
.cd-grid--4-col
// Background colour on grid items.
.cd-grid--background
// Last item to span full width.
.cd-grid--grow
```
