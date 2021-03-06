var path = require('path');
var ats = require('awesome-typescript-loader');
var htmlTemplate = require('html-webpack-template');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var HtmlWebpackExternalsPlugin = require('html-webpack-externals-plugin');

module.exports = {
    entry: './src/index.tsx',
    output: {
        filename: 'bundle.js',
        path: path.resolve('./dist'),
    },

    devtool: 'source-map',

    devServer: {
        inline: true,
        port: 3001,
    },

    resolve: {
        extensions: ['.ts', '.tsx', '.js',],
    },

    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'awesome-typescript-loader',
            },
            {
                test: /\.css/,
                use: ExtractTextPlugin.extract('css-loader'),
            },
            {
              test: /\.js$/,
              enforce: 'pre',
              use: 'source-map-loader',
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
    ],
}
