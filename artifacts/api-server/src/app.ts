import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { startBackgroundRefresh } from "./lib/coingecko";
import { corsOptions } from "./config/cors";
import { globalLimiter } from "./middleware/rateLimiter";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors(corsOptions));
app.use(globalLimiter);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api", router);

app.use(notFoundHandler);
app.use(errorHandler);

// Pre-warm CoinGecko cache + start the 30s background refresher so the
// frontend always has data to render, even when upstream is rate-limiting us.
startBackgroundRefresh();
logger.info("CoinGecko background refresher started");

export default app;
