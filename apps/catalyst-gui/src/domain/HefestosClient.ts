import type { RunRequest, RunResponse } from './types';

export class HefestosClient {
  async run(req: RunRequest): Promise<RunResponse> {
    if (!window.catalyst?.hefestosRun) {
      throw new Error('IPC no disponible: window.catalyst.hefestosRun');
    }
    return window.catalyst.hefestosRun(req);
  }
}
