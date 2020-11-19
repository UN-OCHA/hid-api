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
    extend: {
      outline: {
        ocha: ['2px solid var(--cd-bright-blue)', '2px'],
      },
    },
  },
  variants: {},
}
