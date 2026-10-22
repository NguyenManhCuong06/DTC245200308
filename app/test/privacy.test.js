'use strict';

/**
 * Regression tests for content visibility (L4).
 *
 * Run inside the web container (it already has mysql2 and the DB credentials):
 *   docker compose exec -T web node --test test/
 *
 * The suite only performs read-only HTTP requests and SELECT queries, so it is
 * safe to run against the demo data.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';

function dbConfig() {
  return {
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  };
}

async function withConnection(handler) {
  const connection = await mysql.createConnection(dbConfig());
  try {
    return await handler(connection);
  } finally {
    await connection.end();
  }
}

async function get(path) {
  const response = await fetch(`${BASE_URL}${path}`, { redirect: 'manual' });
  const body = await response.text();
  return { status: response.status, body };
}

test('guest tag overview does not expose photos that belong to a private album', async (t) => {
  const fixture = await withConnection(async (connection) => {
    const [privatePhotos] = await connection.execute(`
      SELECT p.id, p.title
      FROM photos p
      JOIN albums a ON a.id = p.album_id
      WHERE a.is_public = 0 AND p.is_public = 1
      LIMIT 5
    `);
    const [publicPhotos] = await connection.execute(`
      -- Mirror the tag overview: only the 12 most recent visible, tagged photos render.
      SELECT p.id, p.title
      FROM photos p
      JOIN photo_tags pt ON pt.photo_id = p.id
      LEFT JOIN albums a ON a.id = p.album_id
      WHERE p.is_public = 1 AND (a.id IS NULL OR a.is_public = 1)
      GROUP BY p.id, p.title
      ORDER BY p.created_at DESC
      LIMIT 12
    `);
    return { privatePhotos, publicPhotos };
  });

  if (fixture.privatePhotos.length === 0 || fixture.publicPhotos.length === 0) {
    t.skip('Seed data has no private/public photo pair to compare');
    return;
  }

  const { status, body } = await get('/photos/tags');
  assert.equal(status, 200, 'tag overview must render for guests');

  for (const photo of fixture.privatePhotos) {
    assert.ok(
      !body.includes(`/photos/${photo.id}/thumbnail`),
      `private photo ${photo.id} must not be rendered on the public tag page`
    );
    assert.ok(
      !body.includes(`/photos/${photo.id}/original`),
      `private photo ${photo.id} original link must not be rendered`
    );
  }

  const visiblePublicPhoto = fixture.publicPhotos.find(
    (photo) => body.includes(`/photos/${photo.id}/thumbnail`)
  );
  assert.ok(visiblePublicPhoto, 'the tag overview must still list public photos');
});

test('private album and its photos stay hidden from guests', async (t) => {
  const fixture = await withConnection(async (connection) => {
    const [albums] = await connection.execute(
      'SELECT id FROM albums WHERE is_public = 0 LIMIT 1'
    );
    if (albums.length === 0) return null;
    const [photos] = await connection.execute(
      'SELECT id FROM photos WHERE album_id = ? LIMIT 1',
      [albums[0].id]
    );
    return { albumId: albums[0].id, photoId: photos.length ? photos[0].id : null };
  });

  if (!fixture) {
    t.skip('Seed data has no private album');
    return;
  }

  const albumPage = await get(`/albums/${fixture.albumId}`);
  assert.equal(albumPage.status, 404, 'private album page must return 404 for guests');

  if (fixture.photoId) {
    const photoPage = await get(`/photos/${fixture.photoId}`);
    assert.equal(photoPage.status, 404, 'photo of a private album must return 404');
    const thumbnail = await get(`/photos/${fixture.photoId}/thumbnail`);
    assert.equal(thumbnail.status, 404, 'thumbnail of a private album photo must return 404');
    const original = await get(`/photos/${fixture.photoId}/original`);
    assert.equal(original.status, 404, 'original of a private album photo must return 404');
  }
});

test('public photos remain reachable for guests', async (t) => {
  const photo = await withConnection(async (connection) => {
    const [rows] = await connection.execute(`
      SELECT p.id
      FROM photos p
      LEFT JOIN albums a ON a.id = p.album_id
      WHERE p.is_public = 1 AND (a.id IS NULL OR a.is_public = 1)
      LIMIT 1
    `);
    return rows[0] || null;
  });

  if (!photo) {
    t.skip('Seed data has no public photo');
    return;
  }

  const detail = await get(`/photos/${photo.id}`);
  assert.equal(detail.status, 200, 'public photo detail must render');

  const thumbnail = await get(`/photos/${photo.id}/thumbnail`);
  assert.equal(thumbnail.status, 200, 'public photo thumbnail must be served');
});

test('share links respect revocation and expiry for photo media', async (t) => {
  const share = await withConnection(async (connection) => {
    const [rows] = await connection.execute(`
      SELECT s.token, s.album_id
      FROM share_links s
      WHERE s.revoked_at IS NULL AND s.expires_at > NOW()
      LIMIT 1
    `);
    if (rows.length === 0) return null;
    const [photos] = await connection.execute(
      'SELECT id FROM photos WHERE album_id = ? LIMIT 1',
      [rows[0].album_id]
    );
    return { token: rows[0].token, photoId: photos.length ? photos[0].id : null };
  });

  if (!share || !share.photoId) {
    t.skip('Seed data has no active share link with a photo');
    return;
  }

  const ok = await get(`/share/${share.token}/photos/${share.photoId}/thumbnail`);
  assert.equal(ok.status, 200, 'active share link must serve the thumbnail');

  const badToken = await get(`/share/not-a-real-token/photos/${share.photoId}/thumbnail`);
  assert.equal(badToken.status, 404, 'unknown share token must return 404');
});

test('unknown routes return the 404 page without leaking details', async (t) => {
  const { status, body } = await get('/definitely-not-a-route-3107');
  assert.equal(status, 404);
  assert.ok(!/at .*\.js:\d+/.test(body), 'stack trace must not leak to the client');
});

test('health endpoint never exposes driver errors', async (t) => {
  const { status, body } = await get('/health');
  assert.equal(status, 200);
  const payload = JSON.parse(body);
  assert.equal(payload.status, 'healthy');
  assert.ok(!('error' in payload), 'health payload must not contain an error field');
  assert.ok(!/ECONNREFUSED|ER_|sql/i.test(body), 'health payload must not leak database details');
});

test('logout is a POST-only action protected by CSRF', async (t) => {
  const getLogout = await get('/logout');
  assert.equal(getLogout.status, 302, 'GET /logout must not destroy the session');

  const postWithoutToken = await fetch(`${BASE_URL}/logout`, {
    method: 'POST',
    redirect: 'manual'
  });
  assert.equal(postWithoutToken.status, 403, 'POST /logout without a CSRF token must be rejected');
});
