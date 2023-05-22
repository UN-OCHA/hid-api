# Button

## Purpose and Usage
Button or anchor elements for forms and card components.

## Caveats
Buttons or anchors with SVG elements require a span `.cd-button__text` wrapping the text for best icon alignment.

We use a HSL system and CSS custom properties so extra care is needed for IE11 support.

### Variants

```
.cd-button // default

/* For buttons on a dark background */
.cd-button--light

/* For an outline style */
.cd-button--outline

/* For export style */
@TODO review
.cd-button--export

/* For a destructive action */
.cd-button--danger

/* Utility classes */
.cd-button--small
.cd-button--bold
.cd-button--uppercase
.cd-button--wide
.cd-button--icon

/* For disabled buttons */
.cd-button[disabled]

```
