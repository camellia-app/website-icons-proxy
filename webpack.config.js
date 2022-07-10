const path = require('path');

module.exports = {
  entry: path.resolve(__dirname, 'src', 'cloudflare-worker.ts'),
  output: {
    filename: 'cloudflare-worker.js',
    path: path.resolve(__dirname, 'dist'),
  },
  devtool: 'source-map',
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
