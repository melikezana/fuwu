import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";

// No project env file, DATABASE_URL or remote credentials are read.
export function postgresRuntime() {
  const require = createRequire(import.meta.url);
  let Client;
  try { ({ Client } = require("pg")); }
  catch { ({ Client } = createRequire(path.resolve("artifacts/commerce-test-runtime/package.json"))("pg")); }
  if(process.env.TEST_POSTGRES_BIN) {
    const bin=path.resolve(process.env.TEST_POSTGRES_BIN),ext=process.platform==="win32"?".exe":"";
    return {Client,...Object.fromEntries(["initdb","postgres","pg_ctl"].map(name=>[name,path.join(bin,name+ext)]))};
  }
  if (process.platform === "win32") {
    const embedded = createRequire(path.resolve("artifacts/commerce-test-runtime/package.json"))("@embedded-postgres/windows-x64");
    return { ...embedded, Client };
  }
  const bin = process.env.TEST_POSTGRES_BIN || "/usr/lib/postgresql/17/bin";
  return { Client, ...Object.fromEntries(["initdb", "postgres", "pg_ctl"].map(name => [name, fs.existsSync(path.join(bin, name)) ? path.join(bin, name) : name])) };
}
