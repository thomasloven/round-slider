import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { terser } from "rollup-plugin-terser";

export default {
  input: "./src/round-slider.ts",
  output: [
    {
      file: "./round-slider.cjs",
      format: "cjs",
      compact: true,
    },
    {
      file: "./round-slider.bundle.js",
      format: "es",
      compact: true,
    },
    {
      file: "./round-slider.iife.js",
      format: "iife",
      name: "RoundSlider",
      compact: true,
    },
  ],
  plugins: [resolve(), typescript(), terser()],
};
