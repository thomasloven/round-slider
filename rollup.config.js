import resolve from "rollup-plugin-node-resolve";
import minify from "rollup-plugin-babel-minify";

export default {
  input: "./src/main.js",
  output: {
    file: "./round-slider.js",
    format: "cjs",
    compact: true
  },
  plugins: [resolve(), minify({ comments: false })]
};
