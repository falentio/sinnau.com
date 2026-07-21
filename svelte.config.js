import adapter from "@sveltejs/adapter-node";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  compilerOptions: {
    // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
    runes: ({ filename }) =>
      filename.split(/[/\\]/u).includes("node_modules") ? undefined : true,
  },
  kit: {
    adapter: adapter({
      precompress: false,
    }),
    csp: {
      directives: {
        "base-uri": ["self"],
        "connect-src": ["self", "ws:"],
        "default-src": ["self"],
        "font-src": ["self"],
        "form-action": ["self"],
        "frame-ancestors": ["none"],
        "img-src": ["self", "data:", "https:"],
        "object-src": ["none"],
        "script-src": ["self"],
        "style-src": ["self", "unsafe-inline"],
      },
      mode: "auto",
    },
  },
};

export default config;
