// One aggregated row per job. Times keep the offset from the log.
export type DigestStatus = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: DigestStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

// `null` means the night file is absent. An empty file is `{ rows: [], badLines: 0 }`.
// `counts` is parsed lines, not jobs: a later ok does not erase an earlier retry.
export type NightDigest = {
  rows: DigestRow[];
  badLines: number;
  counts: { ok: number; retry: number; fail: number };
};

export { readNight } from './read.js';
