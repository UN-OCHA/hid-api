# Alert

## Purpose and Usage

Provides feedback messages for user actions and site-wide notifications.

- title (visually-hidden)
- message
- SVG icon

All elements are optional. Title and message are width-restricted using `cd-max-width`.

Message can contain `<p>` or `<ul>` elements. If there is one message it outputs the markup, but will automatically switch to a `<ul>` if there is an array of messages.

- If the alert is an error message, the wrapping div should have `role="alert"` which implicitly sets `aria-live="assertive"`.
- If the alert is a warning or status message, the wrapping div should have `role="status"` which implicitly sets `aria-live="polite"`.
- In both cases do NOT set the `aria-live` yourself. Let the `role` do the work.


## Caveats

Uses SVG icon as an element in the markup, not a background image. This allows dynamic coloring by way of the modifier classes listed in the next section:

### Variants

```
.cd-alert--error
.cd-alert--warning
.cd-alert--status
```
