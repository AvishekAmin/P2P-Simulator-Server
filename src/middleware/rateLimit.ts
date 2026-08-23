import rateLimit from "express-rate-limit";
import { sendError } from "../utils/response.js";

export const apiRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, "RATE_LIMITED", "Too many requests, please try again later", 429);
  },
});
