import { readdirSync } from 'node:fs';
import type { RigConfig } from './config.js';
import { readNight } from './digest/types.js';
import { lastBeat, type Beat } from './heartbeat.js';

export type StatusNight = {
  night: string;
  counts: { ok: number; retry: number; fail: number };
};

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: StatusNight[];
};

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

function nightsWithCounts(runsDir: string): StatusNight[] {
  const nights: StatusNight[] = [];
  for (const night of nightsOnDisk(runsDir)) {
    const digest = readNight(runsDir, night);
    if (digest === null) continue;
    nights.push({ night, counts: digest.counts });
  }
  return nights;
}

export function readStatus(config: RigConfig): Status {
  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    nights: nightsWithCounts(config.runsDir),
  };
}
