type CatalystApi = Window['catalyst'];

export class OperatorAiService {
  private readonly api?: CatalystApi;

  public constructor(api?: CatalystApi) {
    this.api = api;
  }

  public async listCases(): Promise<OperatorCaseRecord[]> {
    if (!this.api?.aiCasesList) {
      throw new Error('Electron AI bridge unavailable');
    }
    const response = await this.api.aiCasesList();
    return response.cases;
  }

  public async createCase(input: Record<string, unknown>): Promise<OperatorCaseRecord> {
    if (!this.api?.aiCaseCreate) {
      throw new Error('Electron AI bridge unavailable');
    }
    return this.api.aiCaseCreate(input);
  }

  public async planCase(caseId: string): Promise<OperatorCaseRecord> {
    if (!this.api?.aiCasePlan) {
      throw new Error('Electron AI bridge unavailable');
    }
    return this.api.aiCasePlan(caseId);
  }

  public async approveCase(caseId: string, input: Record<string, unknown>): Promise<OperatorCaseRecord> {
    if (!this.api?.aiCaseApprove) {
      throw new Error('Electron AI bridge unavailable');
    }
    return this.api.aiCaseApprove(caseId, input);
  }

  public async executeCase(
    caseId: string,
    input: { mode?: OperatorExecutionMode; requestedBy?: string }
  ): Promise<{ case: OperatorCaseRecord; receipt: Record<string, unknown>; report: OperatorCaseRecord['report'] }> {
    if (!this.api?.aiCaseExecute) {
      throw new Error('Electron AI bridge unavailable');
    }
    return this.api.aiCaseExecute(caseId, input);
  }

  public async getReport(caseId: string): Promise<OperatorCaseRecord['report']> {
    if (!this.api?.aiCaseReport) {
      throw new Error('Electron AI bridge unavailable');
    }
    return this.api.aiCaseReport(caseId);
  }

  public async getReleaseReadiness(domain?: OperatorDomain): Promise<ReleaseReadiness> {
    if (!this.api?.aiReleaseReadiness) {
      throw new Error('Electron AI bridge unavailable');
    }
    return this.api.aiReleaseReadiness(domain);
  }
}
