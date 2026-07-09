type CatalystApi = Window["catalyst"];

export class UiCopilotService {
  private readonly api?: CatalystApi;

  public constructor(api?: CatalystApi) {
    this.api = api;
  }

  public async listCases(): Promise<UiCopilotCase[]> {
    if (!this.api?.uiCasesList) {
      throw new Error("Electron UI copilot bridge unavailable");
    }
    const response = await this.api.uiCasesList();
    return response.cases;
  }

  public async createCase(input: Record<string, unknown>): Promise<UiCopilotCase> {
    if (!this.api?.uiCaseCreate) {
      throw new Error("Electron UI copilot bridge unavailable");
    }
    return this.api.uiCaseCreate(input);
  }

  public async planCase(caseId: string): Promise<UiCopilotCase> {
    if (!this.api?.uiCasePlan) {
      throw new Error("Electron UI copilot bridge unavailable");
    }
    return this.api.uiCasePlan(caseId);
  }

  public async getReport(caseId: string): Promise<UiReviewReport> {
    if (!this.api?.uiCaseReport) {
      throw new Error("Electron UI copilot bridge unavailable");
    }
    return this.api.uiCaseReport(caseId);
  }
}
