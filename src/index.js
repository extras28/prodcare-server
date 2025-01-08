import bodyParser from "body-parser";
import cors from "cors";
import "dotenv/config.js";
import express from "express";
import { database } from "./configs/sequelize.config.js";
import { errorHandlerMiddleware } from "./middlewares/error_handler.middleware.js";
import * as db from "./models/index.js";
import { ERROR_NOT_FOUND } from "./shared/errors/error.js";
import { apiRouter } from "./routes/index.js";
import path from "path";
import { fileURLToPath } from "url";
import { clearExpiredToken } from "./cronjobs/clear-expired-token.cron.js";

// Create a variable for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function start() {
  const PORT = process.env.PORT ?? 3001;

  // connect to database
  try {
    await database.authenticate();
    console.log("Connected to database.");

    // await database.sync({ force: true });
    await database.sync({ alter: true });
    // await database.sync();
    // await database.drop();
    console.log("All models are sync.");
  } catch (error) {
    console.error("Unable to connect to the database:", error.message);
  }

  const app = express().disable("x-powered-by");

  app.use(cors());
  app.use(bodyParser.json({ limit: "128mb" }));
  app.use(bodyParser.urlencoded({ extended: true, limit: "128mb" }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use(
    process.env.PATH_PUBLIC_DIR,
    express.static(process.env.PUBLIC_UPLOAD_DIR),
    (_, res) => {
      res.status(404).send({ result: "failed", reason: ERROR_NOT_FOUND });
    }
  );

  // Router
  app.use("/api/v1", apiRouter);

  // Serve static files from the "prodcare-static" directory
  app.use(express.static(path.join(__dirname, "../prodcare-static"))); // Adjusted path

  // Catch-all route to serve index.html for all other routes
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../prodcare-static", "index.html")); // Adjusted path
  });

  clearExpiredToken();

  // Error handler
  app.use(errorHandlerMiddleware);

  app.listen(PORT, () => {
    console.log(`prodcare server is running on port ${PORT}.`);
  });
}

start();
