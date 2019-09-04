import babel from "rollup-plugin-babel";
import resolve from "rollup-plugin-node-resolve";
import minify from "rollup-plugin-babel-minify";

export default [
  {
    input: "./src/main.js",
    output: {
      file: "./round-slider.js",
      format: "es",
      compact: true
    },
    plugins: [
      babel({
        exclude: "node_modules/**"
      }),
      resolve(),
      minify({comments: false}),
    ]
  },
  {
    input: "./src/main.js",
    output: {
      file: "./round-slider.es.js",
      format: "es",
      compact: true
    },
    plugins: [
      babel({
        exclude: "node_modules/**",
        externalHelpers: true,
      })
    ],
    "external": [
      "lit-element"
    ]
  }
];
