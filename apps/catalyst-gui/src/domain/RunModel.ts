import type { MELE, NA, RunRequest } from './types';

export class RunModel {
  text = '';
  cycles = 1;
  jsonl = '';
  na: NA = { I: 1, E: 1, R: 2, K: 2 };
  mele: MELE = { M: 4, E: 3, L: 4, Et: 5 };
  hefestosPath = '';

  toRequest(): RunRequest {
    return {
      text: this.text,
      cycles: this.cycles,
      jsonl: this.jsonl || undefined,
      na: this.na,
      mele: this.mele,
      hefestosPath: this.hefestosPath || undefined
    };
  }
}
