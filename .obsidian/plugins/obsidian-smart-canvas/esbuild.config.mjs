import esbuild from "esbuild";

const isWatch = process.argv.includes("--watch");

const common = {
  entryPoints: ["main.ts"],
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: ["es2018"],
  outfile: "main.js",
  sourcemap: isWatch ? "inline" : false,
  logLevel: "info",
  external: [
    "obsidian",
    "electron",
    "@codemirror/*",
    "codemirror"
  ],
};

const ctx = await esbuild.context(common);
if (isWatch) {
  await ctx.watch();
  console.log("[smart-canvas] watching...");
} else {
  await ctx.rebuild();
  await ctx.dispose();
}


