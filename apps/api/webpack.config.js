// Inline @salonin/* workspace packages so the bundle has no TypeScript
// runtime dependency. All other node_modules stay external.
const nodeExternals = require('webpack-node-externals')

module.exports = function (options) {
  return {
    ...options,
    externals: [
      nodeExternals({
        allowlist: [/^@salonin\//],
      }),
    ],
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
          exclude: /node_modules/,
        },
      ],
    },
  }
}
