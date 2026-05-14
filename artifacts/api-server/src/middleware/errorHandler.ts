import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export function createError(message: string, statusCode: number, code?: string): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} does not exist`,
  });
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500;
  const isDev = process.env["NODE_ENV"] !== "production";

  if (statusCode >= 500) {
    logger.error({ err, req: { method: req.method, url: req.url } }, "Unhandled server error");
  }

  res.status(statusCode).json({
    error: err.code ?? (statusCode >= 500 ? "Internal Server Error" : "Request Error"),
    message: err.message ?? "An unexpected error occurred",
    ...(isDev && statusCode >= 500 ? { stack: err.stack } : {}),
    ...(err.details ? { details: err.details } : {}),
  });
}
