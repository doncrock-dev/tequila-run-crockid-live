import { getCache } from '@vercel/functions';

const cache = getCache();
const KEY = 'tequila-run:leaderboard:v3';
const TTL = 60 * 60 * 24 * 30;

const DEPTS = new Set(['retail', 'buying', 'marketing', 'logistics', 'design']);
const MODES = new Set(['endless', 'story']);

function cleanText(value, max = 48) {
  return String(value ?? '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function emptyData() {
  return {
    board: {
      retail: [],
      buying: [],
      marketing: [],
      logistics: [],
      design: [],
    },
    weekly: { week: '', total: 0, depts: {} },
    updatedAt: Date.now(),
  };
}

function validWeek(value) {
  return /^\d{4}-W\d{2}$/.test(String(value || ''));
}

function normalize(value) {
  const data = value && typeof value === 'object' ? value : emptyData();
  const fallback = emptyData();

  data.board = data.board && typeof data.board === 'object' ? data.board : fallback.board;
  for (const dept of DEPTS) {
    if (!Array.isArray(data.board[dept])) data.board[dept] = [];
  }

  data.weekly = data.weekly && typeof data.weekly === 'object'
    ? data.weekly
    : { week: '', total: 0, depts: {} };
  data.weekly.depts = data.weekly.depts && typeof data.weekly.depts === 'object'
    ? data.weekly.depts
    : {};

  return data;
}

function publicData(value) {
  const data = normalize(value);
  const board = {};

  for (const dept of DEPTS) {
    board[dept] = data.board[dept].slice(0, 10).map((entry) => ({
      name: entry.name,
      score: entry.score,
      mode: entry.mode,
      title: entry.title,
      ts: entry.ts,
    }));
  }

  return { board, weekly: data.weekly, updatedAt: data.updatedAt };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    try {
      const data = normalize(await cache.get(KEY));
      return res.status(200).json(publicData(data));
    } catch (error) {
      console.error('leaderboard_get_error', error);
      return res.status(500).json({ error: 'leaderboard_unavailable' });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const dept = DEPTS.has(body.dept) ? body.dept : null;
    const mode = MODES.has(body.mode) ? body.mode : 'endless';
    const score = Math.floor(Number(body.score));
    const relay = Math.max(0, Math.min(500000, Math.floor(Number(body.relay) || 0)));
    const name = cleanText(body.name, 32);
    const title = cleanText(body.title, 60);
    const week = validWeek(body.week) ? body.week : '';

    if (!dept || !name || !Number.isFinite(score) || score < 1 || score > 500000) {
      return res.status(400).json({ error: 'invalid_score' });
    }

    const data = normalize(await cache.get(KEY));
    const entry = { name, score, mode, title, ts: Date.now() };
    const entries = data.board[dept] || [];

    const existing = entries.findIndex(
      (item) => String(item.name).toLowerCase() === name.toLowerCase(),
    );

    if (existing >= 0) {
      if (score > Number(entries[existing].score || 0)) entries[existing] = entry;
    } else {
      entries.push(entry);
    }

    entries.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
    data.board[dept] = entries.slice(0, 50);

    if (week) {
      if (data.weekly.week !== week) data.weekly = { week, total: 0, depts: {} };

      const contribution = Math.max(0, score + relay);
      const capped = Math.min(contribution, 100000);
      data.weekly.total = Number(data.weekly.total || 0) + capped;
      data.weekly.depts[dept] = Number(data.weekly.depts[dept] || 0) + capped;
    }

    data.updatedAt = Date.now();
    await cache.set(KEY, data, {
      ttl: TTL,
      tags: ['tequila-run-leaderboard'],
    });

    return res.status(200).json(publicData(data));
  } catch (error) {
    console.error('leaderboard_post_error', error);
    return res.status(500).json({ error: 'leaderboard_unavailable' });
  }
}
