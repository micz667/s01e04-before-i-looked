import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/types.js';

describe('readNight', () => {
  it('reads 2026-10-28 as 5 jobs and 1 bad line', () => {
    const night = readNight('runs', '2026-10-28');
    expect(night).not.toBeNull();
    expect(night!.badLines).toBe(1);
    expect(night!.counts).toEqual({ ok: 10, retry: 4, fail: 1 });
    expect(night!.rows.map((row) => row.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('keeps a null owner and counts retries on that night', () => {
    const rows = readNight('runs', '2026-10-28')!.rows;
    const render = rows.find((row) => row.job === 'digest/render');
    const refresh = rows.find((row) => row.job === 'fixtures/refresh');
    const backup = rows.find((row) => row.job === 'notes/backup');
    expect(render).toMatchObject({ owner: null, runs: 1, retries: 0, lastStatus: 'ok', lastError: null });
    expect(refresh).toMatchObject({
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: null,
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    expect(backup).toMatchObject({
      runs: 1,
      retries: 0,
      lastStatus: 'fail',
      lastError: 'quota exceeded',
      owner: 'lane-07',
    });
  });

  it('returns null when the night file is absent', () => {
    expect(readNight('runs', '1999-01-01')).toBeNull();
  });

  it('renders an empty file as no rows', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-night-'));
    writeFileSync(join(dir, '2026-01-01.jsonl'), '');
    expect(readNight(dir, '2026-01-01')).toEqual({
      rows: [],
      badLines: 0,
      counts: { ok: 0, retry: 0, fail: 0 },
    });
  });

  it('counts a bad line and still returns the good rows', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-night-'));
    writeFileSync(
      join(dir, '2026-01-02.jsonl'),
      [
        '{"at":"2026-01-02T01:00:00+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
        'not json',
        '',
      ].join('\n'),
    );
    expect(readNight(dir, '2026-01-02')).toEqual({
      badLines: 1,
      counts: { ok: 1, retry: 0, fail: 0 },
      rows: [
        {
          job: 'lane/sync',
          owner: 'rook',
          runs: 1,
          retries: 0,
          lastStatus: 'ok',
          lastError: null,
          firstAt: '2026-01-02T01:00:00+01:00',
          lastAt: '2026-01-02T01:00:00+01:00',
        },
      ],
    });
  });
});
