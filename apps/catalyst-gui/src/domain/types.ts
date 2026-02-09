export type NA = { I: number; E: number; R: number; K: number };
export type MELE = { M: number; E: number; L: number; Et: number };

export type RunRequest = {
  text: string;
  cycles: number;
  jsonl?: string;
  na: NA;
  mele: MELE;
  hefestosPath?: string;
};

export type RunResponse = {
  ok: boolean;
  output: string;
};
