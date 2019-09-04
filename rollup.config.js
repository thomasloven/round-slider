import resolve from "rollup-plugin-node-resolve";
import minify from "rollup-plugin-babel-minify";

export default {
  input: "./src/main.js",
  output: {
    file: "./round-slider.js",
    format: "es",
    compact: true
  },
  plugins: [resolve(), minify({ comments: false })]
};
