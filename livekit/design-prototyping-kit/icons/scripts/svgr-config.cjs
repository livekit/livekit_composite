module.exports = {
  typescript: true,
  outDir: './icons/react',
  template: require('./react-icon-template.cjs'),
  index: true,
  indexTemplate: require('./react-icon-index-template.cjs'),
  ref: true,
  dimensions: true,
  svgo: false,
  replaceAttrValues: {
    black: 'currentcolor',
    white: 'currentcolor',
  },
  svgProps: {
    role: 'presentation',
  },
  prettier: false,
};
