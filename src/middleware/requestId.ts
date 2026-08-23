import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const REQUEST_ID_HEADER = "x-request-id";

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header(REQUEST_ID_HEADER);
  req.requestId = incoming && incoming.length > 0 ? incoming : `req_${randomUUID()}`;
  res.setHeader(REQUEST_ID_HEADER, req.requestId);
  next();
}
