import type { Express, Request, Response } from "express";

import { ClockchainUiCopilot, UiCopilotError } from "./uiCopilot";

function handleUiError(res: Response, error: unknown) {
  if (error instanceof UiCopilotError) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  const message = error instanceof Error ? error.message : "Unexpected UI copilot error";
  return res.status(500).json({ error: message });
}

export function registerClockchainUiCopilotRoutes(app: Express, uiCopilot: ClockchainUiCopilot) {
  app.get("/ai/ui/cases", (_req: Request, res: Response) => {
    try {
      return res.json({ cases: uiCopilot.listCases() });
    } catch (error) {
      return handleUiError(res, error);
    }
  });

  app.post("/ai/ui/cases", (req: Request, res: Response) => {
    try {
      return res.status(201).json(uiCopilot.createCase(req.body));
    } catch (error) {
      return handleUiError(res, error);
    }
  });

  app.get("/ai/ui/cases/:id", (req: Request, res: Response) => {
    try {
      return res.json(uiCopilot.getCase(req.params.id));
    } catch (error) {
      return handleUiError(res, error);
    }
  });

  app.post("/ai/ui/cases/:id/plan", (req: Request, res: Response) => {
    try {
      return res.json(uiCopilot.generatePlan(req.params.id));
    } catch (error) {
      return handleUiError(res, error);
    }
  });

  app.get("/ai/ui/cases/:id/report", (req: Request, res: Response) => {
    try {
      return res.json(uiCopilot.buildReport(req.params.id));
    } catch (error) {
      return handleUiError(res, error);
    }
  });
}
