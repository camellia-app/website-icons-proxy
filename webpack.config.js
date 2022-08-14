const path = require('path');
const SourceMapDevToolPlugin = require('webpack').SourceMapDevToolPlugin;

module.exports = {
  entry: path.resolve(__dirname, 'src', 'worker.ts'),
  target: 'webworker',
  output: {
    filename: 'worker.js',
    path: path.resolve(__dirname, 'dist'),
  },
  devtool: false,
  plugins: [
    new SourceMapDevToolPlugin({
      sourceRoot: '/',
    }),
  ],
  mode: 'production',
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        options: {
          transpileOnly: true,
        },
      },
    ],
  },
};
