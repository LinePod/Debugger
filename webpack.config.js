var path = require('path');
var ats = require('awesome-typescript-loader');
var htmlTemplate = require('html-webpack-template');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var HtmlWebpackExternalsPlugin = require('html-webpack-externals-plugin');
var CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: './src/index.tsx',
    output: {
        filename: 'bundle.js',
        path: path.resolve('./dist'),
    },

    devtool: 'source-map',

    devServer: {
        inline: true,
        port: 3000,
    },

    resolve: {
        extensions: ['', '.ts', '.tsx', '.js',],
    },

    module: {
        loaders: [
            {
                test: /\.tsx?$/,
                loader: 'awesome-typescript-loader',
            },
            {
                test: /\.css/,
                loader: ExtractTextPlugin.extract('css-loader'),
            },
        ],

        preLoaders: [
            {
                test: /\.js$/,
                loader: 'source-map-loader',
            },
        ],
    },

    externals: {
        react: 'React',
        'react-dom': 'ReactDOM',
    },

    plugins: [
        new ats.CheckerPlugin(),
        new ExtractTextPlugin('styles.css'),
        new HtmlWebpackPlugin({
            inject: false,
            template: htmlTemplate,
            minify: {
                // Remove tons of empty lines from template
                collapseWhitespace: true,
                preserveLineBreaks: true,
            },
            appMountId: 'react-root',
            title: 'Linespace debugger',
        }),
        new HtmlWebpackExternalsPlugin(
            [
                {
                    name: 'react',
                    'var': 'React',
                    path: 'react/dist/react.js',
                },
                {
                    name: 'react-dom',
                    'var': 'ReactDOM',
                    path: 'react-dom/dist/react-dom.js',
                },
            ],
            {
                basedir: path.join(__dirname, 'node_modules'),
            }
        ),
        new CopyWebpackPlugin([
            { from: 'bridge.py' }
        ]),
    ],
}
