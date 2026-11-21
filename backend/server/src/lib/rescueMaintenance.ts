import type { Request, Response, NextFunction } from "express";
import type { Server } from "node:http";

type Log = (event: string, state: { active: number; maintenance: boolean }) => void;
export function createRescueMaintenance(initial: boolean, log: Log) {
  let maintenance = initial;
  let active = 0;
  const waiters = new Set<() => void>();
  const state = () => ({ active, maintenance });
  const report = (event: string) => log(event, state());
  return {
    state,
    begin() { maintenance = true; report("rescue_maintenance"); },
    drained(): Promise<void> {
      if (!active) return Promise.resolve();
      return new Promise(resolve => waiters.add(resolve));
    },
    wrap(handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
      return async (req: Request, res: Response, next: NextFunction) => {
        if (maintenance) {
          res.set("Cache-Control", "no-store");
          res.status(503).json({ success: false, code: "RESCUE_MAINTENANCE", error: "Rescue is temporarily unavailable. Please try again later." });
          return;
        }
        active++;
        report("rescue_started");
        try { await handler(req, res, next); }
        catch (error) { next(error); }
        finally {
          active--;
          report("rescue_finished");
          if (!active) { for (const resolve of waiters) resolve(); waiters.clear(); }
        }
      };
    },
  };
}

export function createRescueShutdown(server: Server, gate: ReturnType<typeof createRescueMaintenance>,
  log: Log, exit: (code: number) => void, timeoutMs = 25000) {
  let stopping = false;
  return () => {
    if (stopping) return;
    stopping = true;
    gate.begin();
    const timeout = setTimeout(() => {
      log("shutdown_incomplete", gate.state());
      exit(1);
    }, timeoutMs);
    const closed = new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    void Promise.all([closed, gate.drained()]).then(() => {
      clearTimeout(timeout);
      log("shutdown_drained", gate.state());
      exit(0);
    }, () => {
      clearTimeout(timeout);
      log("shutdown_failed", gate.state());
      exit(1);
    });
  };
}
