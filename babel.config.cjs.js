module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: { node: '12' }, // Adjust as needed
        modules: 'commonjs',
      },
    ],
  ],
};