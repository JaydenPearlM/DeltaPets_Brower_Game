import type { Request } from "express";

// Compatibility shim.
// Older files import from "../middleware/requireUser".
// Canonical implementation lives in ./auth.
export { requireUser } from "./auth";
export type { AuthedRequest } from "./auth";

export function getUserId(req: Request): string {
  const id = req.user?.id;
  if (!id) throw new Error("Unauthorized: req.user missing");
  return id;
}
