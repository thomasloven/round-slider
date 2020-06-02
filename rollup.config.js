import resolve from "@rollup/plugin-node-resolve";
import { terser } from "rollup-plugin-terser";

export default {
  input: "./src/main.js",
  output: [
    {
      file: "./round-slider.js",
      format: "cjs",
      compact: true
    },
    {
      file: "./round-slider.iife.js",
      format: "iife",
      compact: true
    }
  ],
  plugins: [resolve(), terser()]
};
