import { buildApp } from "./app.js";
import { env } from "./utils/env.js";

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    app.log.info(`CRM AI Forge API running on port ${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
