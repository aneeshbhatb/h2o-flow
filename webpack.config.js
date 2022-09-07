const webpack = require("webpack");
const path = require("path");
const nib = require("nib");

const HtmlWebpackPlugin = require("html-webpack-plugin");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const packageJson = require("./package.json");

const config = {
  context: path.resolve(__dirname, "src"),
  entry: "./index.js",
  devServer: {
    contentBase: "./build",
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules)|(vendor)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [["minify", { builtIns: false, mangle: false }]],
          },
        },
      },
      {
        test: /\.js$/,
        loader: "ify-loader",
      },
      {
        test: /\.pug$/,
        use: [
          {
            loader: "pug-loader",
            options: { pretty: true },
          },
        ],
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: "../",
            },
          },
          "css-loader",
        ],
      },
      {
        test: /\.styl$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: "../",
            },
          },
          "css-loader",
          {
            loader: "stylus-loader",
            options: {
              use: [nib()],
            },
          },
        ],
      },
      {
        test: /\.(png|svg|jpg|gif|ico)$/,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "[name].[ext]",
              outputPath: "img/",
            },
          },
        ],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "[name].[ext]",
              outputPath: "fonts/",
            },
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: [".coffee", ".js"],
  },
  output: {
    filename: "js/flow.js",
    path: path.resolve(__dirname, "build"),
  },
  plugins: [
    new HtmlWebpackPlugin({
      favicon: "./favicon.ico",
      template: "./index.pug",
    }),
    new MiniCssExtractPlugin({
      filename: "css/flow.css",
    }),
    new webpack.ProvidePlugin({
      $: "jquery",
      jQuery: "jquery",
    }),
    new webpack.LoaderOptionsPlugin({
      debug: true,
    }),
    new webpack.DefinePlugin({
      FLOW_VERSION: JSON.stringify(packageJson.version),
    }),
  ],
};

module.exports = config;
