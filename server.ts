import "dotenv/config";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./server/app.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** Serves the Vite build: hashed assets cached for a year, index.html always revalidated. */
function serveStaticBuild(app: express.Express): void {
  const distDir = path.resolve(__dirname, "dist");
  const indexPath = path.join(distDir, "index.html");

  app.use(
    "/assets",
    express.static(path.join(distDir, "assets"), { maxAge: ONE_YEAR_MS, immutable: true })
  );
  app.use(express.static(distDir, { maxAge: "1d", index: false }));

  app.get("*", (_req, res) => {
    if (!fs.existsSync(indexPath)) {
      res.status(404).send("Build output not found.");
      return;
    }
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(indexPath);
  });
}

async function startServer(): Promise<void> {
  const app = createApp();

  if (process.env.NODE_ENV === "production") {
    serveStaticBuild(app);
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CivicResolve server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err: unknown) => {
  console.error("Failed to start CivicResolve server:", err);
  process.exit(1);
});
