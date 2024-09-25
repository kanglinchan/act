const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
    entry: '/index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
    },
    mode: "development",
    module: {
        rules: [
            {
                test: /\.jsx$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                },
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: '/index.html', // 指定模板文件
            filename: 'index.html', // 输出的 HTML 文件名
            inject: 'body', // 将生成的 JS 和 CSS 文件注入到 body 中
            minify: {
                collapseWhitespace: true, // 压缩空白字符
                removeComments: true, // 移除注释
                removeRedundantAttributes: true, // 移除冗余属性
                useShortDoctype: true, // 使用短的文档类型声明
            },
        }),
    ],
    resolve: {
        extensions: ['.js', '.jsx'],
    }
};