# CSS for HID

We're avoiding build tools on this project in favor of directly including CSS on individual pages as it is needed. I wouldn't call it a component-based architecture, but from some angles it might look that way.

Some conventions:

- Files starting with an `_underscore` contain CSS that is sourced from other vendors: normalize, Drupal, or elsewhere.
- Anything with `cd-` prefix is from the OCHA Common Design.
- Other files are the so-called components. The `page.css` is the closest we have to a global stylesheet since all web pages are indeed pages.

You can include a stylesheet on an individual page by using the following markup:

```html
<style><% include ../assets/css/component.css %></style>
```

The API should automatically restart once you save any HTML/CSS/JS file, but if it doesn't then your changes won't show up. Sorry, it's just how the current tools operate.
