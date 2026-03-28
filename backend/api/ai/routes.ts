import type { Express, Request, Response } from "express";

import { ClockchainOperatorAI, OperatorAiError } from "./controlPlane";
import type { ClockchainDomain } from "./types";

function handleError(res: Response, error: unknown) {
  if (error instanceof OperatorAiError) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  const message = error instanceof Error ? error.message : "Unexpected operator AI error";
  return res.status(500).json({ error: message });
}

export function registerClockchainOperatorRoutes(app: Express, controlPlane: ClockchainOperatorAI) {
  app.get("/ai/cases", (_req: Request, res: Response) => {
    try {
      return res.json({ cases: controlPlane.listCases() });
    } catch (error) {
      return handleError(res, error);
    }
  });

  app.post("/ai/cases", (req: Request, res: Response) => {
    try {
      return res.status(201).json(controlPlane.createCase(req.body));
    } catch (error) {
      return handleError(res, error);
    }
  });

  app.get("/ai/cases/:id", (req: Request, res: Response) => {
    try {
      return res.json(controlPlane.getCase(req.params.id));
    } catch (error) {
      return handleError(res, error);
    }
  });

  app.post("/ai/cases/:id/plan", (req: Request, res: Response) => {
    try {
      return res.json(controlPlane.generatePlan(req.params.id));
    } catch (error) {
      return handleError(res, error);
    }
  });

  app.post("/ai/cases/:id/approve", (req: Request, res: Response) => {
    try {
      return res.json(controlPlane.approveCase(req.params.id, req.body));
    } catch (error) {
      return handleError(res, error);
    }
  });

  app.post("/ai/cases/:id/execute", async (req: Request, res: Response) => {
    try {
      return res.json(await controlPlane.executeCase(req.params.id, req.body));
    } catch (error) {
      return handleError(res, error);
    }
  });

  app.get("/ai/cases/:id/report", (req: Request, res: Response) => {
    try {
      return res.json(controlPlane.buildReport(req.params.id));
    } catch (error) {
      return handleError(res, error);
    }
  });

  app.get("/ai/traces/:traceId", (req: Request, res: Response) => {
    try {
      return res.json(controlPlane.getTrace(req.params.traceId));
    } catch (error) {
      return handleError(res, error);
    }
  });

  app.get("/ai/release/readiness", (req: Request, res: Response) => {
    try {
      const domain = typeof req.query.domain === "string" ? (req.query.domain as ClockchainDomain) : undefined;
      return res.json(controlPlane.getReleaseReadiness(domain));
    } catch (error) {
      return handleError(res, error);
    }
  });
}
