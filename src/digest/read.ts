import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, DigestStatus, NightDigest } from './types.js';

const NIGHT = /^\d{4}-\d{2}-\d{2}$/;

type Parsed = {
  at: string;
  job: string;
  status: DigestStatus;
  owner: string | null;
  error: string | null;
};

function parseLine(raw: string): Parsed | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (value === null || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (typeof row.at !== 'string' || typeof row.job !== 'string') return null;
  if (row.status !== 'ok' && row.status !== 'retry' && row.status !== 'fail') return null;
  if (row.owner !== null && typeof row.owner !== 'string') return null;
  if (row.error !== undefined && typeof row.error !== 'string') return null;
  return {
    at: row.at,
    job: row.job,
    status: row.status,
    owner: row.owner,
    error: typeof row.error === 'string' ? row.error : null,
  };
}

// Latest line wins ties. Times stay as written in the log.
export function readNight(runsDir: string, night: string): NightDigest | null {
  if (!NIGHT.test(night)) return null;
  const path = join(runsDir, `${night}.jsonl`);
  if (!existsSync(path)) return null;

  const text = readFileSync(path, 'utf8');
  const lines = text.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

  const byJob = new Map<string, DigestRow & { lastIndex: number; firstIndex: number }>();
  const counts = { ok: 0, retry: 0, fail: 0 };
  let badLines = 0;

  lines.forEach((raw, index) => {
    const line = parseLine(raw);
    if (!line) {
      badLines += 1;
      return;
    }
    counts[line.status] += 1;
    const prev = byJob.get(line.job);
    if (!prev) {
      byJob.set(line.job, {
        job: line.job,
        owner: line.owner,
        runs: 1,
        retries: line.status === 'retry' ? 1 : 0,
        lastStatus: line.status,
        lastError: line.error,
        firstAt: line.at,
        lastAt: line.at,
        lastIndex: index,
        firstIndex: index,
      });
      return;
    }
    prev.runs += 1;
    if (line.status === 'retry') prev.retries += 1;
    const later = line.at > prev.lastAt || (line.at === prev.lastAt && index > prev.lastIndex);
    const earlier = line.at < prev.firstAt || (line.at === prev.firstAt && index < prev.firstIndex);
    if (later) {
      prev.lastAt = line.at;
      prev.lastStatus = line.status;
      prev.lastError = line.error;
      prev.owner = line.owner;
      prev.lastIndex = index;
    }
    if (earlier) {
      prev.firstAt = line.at;
      prev.firstIndex = index;
    }
  });

  const rows = [...byJob.values()]
    .map(({ lastIndex: _last, firstIndex: _first, ...row }) => row)
    .sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));

  return { rows, badLines, counts };
}
