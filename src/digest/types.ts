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
export type NightDigest = {
  rows: DigestRow[];
  badLines: number;
};

export function readNight(runsDir: string, night: string): NightDigest | null {
  void runsDir;
  void night;
  throw new Error('readNight is not implemented');
}
