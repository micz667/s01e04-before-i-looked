import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const baseConfig = {
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
};

const validLine =
  '{"at":"2026-01-02T01:00:00+01:00","job":"lane/sync","status":"ok","owner":"rook"}';

function appWithRuns(runsDir: string) {
  return createApp({ ...baseConfig, runsDir });
}

function tempRunsDir() {
  return mkdtempSync(join(tmpdir(), 'digest-routes-'));
}

describe('GET /digest/:night', () => {
  it('200: shows the job from one valid JSONL line', async () => {
    const runsDir = tempRunsDir();
    writeFileSync(join(runsDir, '2026-01-02.jsonl'), `${validLine}\n`, 'utf8');

    const res = await appWithRuns(runsDir).request('/digest/2026-01-02');
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html).toContain('lane/sync');
  });

  it('404: night with no file', async () => {
    const runsDir = tempRunsDir();

    const res = await appWithRuns(runsDir).request('/digest/2026-01-03');

    expect(res.status).toBe(404);
  });

  it('200: empty night shows nothing ran', async () => {
    const runsDir = tempRunsDir();
    writeFileSync(join(runsDir, '2026-01-04.jsonl'), '', 'utf8');

    const res = await appWithRuns(runsDir).request('/digest/2026-01-04');
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html).toContain('nothing ran');
  });

  it('200: bad line still shows the good job', async () => {
    const runsDir = tempRunsDir();
    writeFileSync(
      join(runsDir, '2026-01-05.jsonl'),
      `${validLine}\nnot json\n`,
      'utf8',
    );

    const res = await appWithRuns(runsDir).request('/digest/2026-01-05');
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html).toContain('lane/sync');
  });
});

describe('GET /api/digest/:night', () => {
  it('200: returns the job from one valid JSONL line', async () => {
    const runsDir = tempRunsDir();
    writeFileSync(join(runsDir, '2026-01-02.jsonl'), `${validLine}\n`, 'utf8');

    const res = await appWithRuns(runsDir).request('/api/digest/2026-01-02');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.rows[0].job).toBe('lane/sync');
  });

  it('404: night with no file', async () => {
    const runsDir = tempRunsDir();

    const res = await appWithRuns(runsDir).request('/api/digest/2026-01-03');

    expect(res.status).toBe(404);
  });

  it('200: empty night returns no rows', async () => {
    const runsDir = tempRunsDir();
    writeFileSync(join(runsDir, '2026-01-04.jsonl'), '', 'utf8');

    const res = await appWithRuns(runsDir).request('/api/digest/2026-01-04');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.rows).toEqual([]);
  });

  it('200: bad line sets badLines to 1', async () => {
    const runsDir = tempRunsDir();
    writeFileSync(
      join(runsDir, '2026-01-05.jsonl'),
      `${validLine}\nnot json\n`,
      'utf8',
    );

    const res = await appWithRuns(runsDir).request('/api/digest/2026-01-05');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.badLines).toBe(1);
  });
});
