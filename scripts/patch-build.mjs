import {
  readFileSync,
  writeFileSync,
  rmSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join } from "node:path";

const __dirname = import.meta.dirname;
const root = join(__dirname, "..");

// 1. Harden the polka guard in build/index.js (idempotent, query-string safe).
//    Replaces the whole `polka(...).use(...)...use(handler)` line regardless of
//    whether it was already patched, so re-running never double-inserts.
const buildIndex = join(root, "build", "index.js");
let code = readFileSync(buildIndex, "utf-8");

const guarded = `const server = polka({ server: httpServer }).use("*", (req, res, next) => {
  if (req.url.split("?")[0].endsWith(".map")) {
    res.end("");
    return;
  }
  next();
}).use(handler);`;

code = code.replace(
  /const server = polka\(\{ server: httpServer \}\)\.use[\s\S]*?\.use\(handler\);/u,
  guarded
);

writeFileSync(buildIndex, code);

// 2. Remove client source maps from the build. Server-side maps are kept so that
//    `NODE_OPTIONS=--enable-source-maps` (see Dockerfile) can still produce mapped
//    stack traces. Client maps are never needed over HTTP and must not be served.
/** @param {string} dir Directory to remove map files from */
const removeMapFiles = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      removeMapFiles(full);
    } else if (entry.endsWith(".map")) {
      rmSync(full);
    }
  }
};

removeMapFiles(join(root, "build", "client"));
