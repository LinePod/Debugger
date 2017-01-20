var path = require('path');
var ats = require('awesome-typescript-loader');

module.exports = {
    entry: './src/index.tsx',
    output: {
        filename: 'bundle.js',
        path: path.resolve('./dist'),
    },

    devtool: 'source-map',

    resolve: {
        extensions: ['', '.ts', '.tsx', '.js',],
    },

    module: {
        loaders: [
            { test: /\.tsx?$/, loader: 'awesome-typescript-loader' },
        ],

        preLoaders: [
            { test: /\.js$/, loader: 'source-map-loader' },
        ],
    },

    externals: {
        react: 'React',
        'react-dom': 'ReactDOM',
    },

    plugins: [
        new ats.CheckerPlugin(),
    ],
}
