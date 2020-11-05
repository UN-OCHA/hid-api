module.exports = {
  future: {
    // removeDeprecatedGapUtilities: true,
    // purgeLayersByDefault: true,
  },
  purge: {
    enable: true, // To test locally.
    layers: ['components', 'utilities'],
    content: ['./templates/**/*.html', './templates/**/*.ejs'],
    options: {
      keyframes: true,
    },
  },
  theme: {
    extend: {},
  },
  variants: {},
}
