const esbuild = require("esbuild");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

const esbuildProblemMatcherPlugin = {
    name: "esbuild-problem-matcher",
    setup(build) {
        build.onStart(() => {
            console.log("[watch] build started");
        });
        build.onEnd((result) => {
            if (result.errors.length > 0) {
                result.errors.forEach(({ text, location }) => {
                    console.error(`✘ [ERROR] ${text}`);
                    console.error(
                        `    ${location.file}:${location.line}:${location.column}:`,
                    );
                });
            }
            console.log("[watch] build finished");
        });
    },
};

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
    entryPoints: ["src/extension.ts"],
    bundle: true,
    format: "cjs",
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: "node",
    outfile: "dist/extension.js",
    external: ["vscode"],
    logLevel: "info",
    plugins: [esbuildProblemMatcherPlugin],
};

async function build() {
    try {
        if (watch) {
            const ctx = await esbuild.context(buildOptions);
            await ctx.watch();
            console.log("Watching...");
        } else {
            await esbuild.build(buildOptions);
        }
    } catch (err) {
        console.error("Build failed:", err);
        process.exit(1);
    }
}

build();