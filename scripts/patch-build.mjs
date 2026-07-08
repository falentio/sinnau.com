import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const __dirname = import.meta.dirname;
const buildIndex = join(__dirname, "..", "build", "index.js");

let code = readFileSync(buildIndex, "utf-8");

code = code.replace(
  `const server = polka({ server: httpServer }).use`,
  `const server = polka({ server: httpServer }).use("*", (req, res, next) => { if (req.url.endsWith(".map")) { res.end(""); } next(); }).use`
);

writeFileSync(buildIndex, code);
