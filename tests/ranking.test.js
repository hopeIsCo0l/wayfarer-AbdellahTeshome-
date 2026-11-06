import { test } from "node:test";
import assert from "node:assert/strict";
import { rankingScore, PRIOR_MEAN } from "../server/ranking.js";
import { openDatabase } from "../server/db.js";
import { seed } from "../server/seed.js";
import { createApp } from "../server/app.js";
test("review volume prevents one perfect review outranking an established strong place", () => {
  assert.ok(rankingScore(4.7, 312) > rankingScore(5, 1));
  assert.ok(rankingScore(4.7, 312) > rankingScore(5, 2));
  assert.equal(rankingScore(0, 0), PRIOR_MEAN);
  assert.ok(rankingScore(4.7, 312) > rankingScore(4.7, 2));
  assert.ok(Math.abs(rankingScore(4.7, 100000) - 4.7) < 0.001);
});
test("backend filters and ranks with the same formula; reviews upsert per user", async (t) => {
  const db = openDatabase(":memory:");
  seed(db);
  const server = createApp(db).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  t.after(async () => {
    await new Promise((r) => server.close(r));
    db.close();
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const headers = { "X-User-Id": "1", "Content-Type": "application/json" };
  const places = await (await fetch(`${base}/places`, { headers })).json();
  assert.ok(
    places.findIndex((p) => p.id === 1) < places.findIndex((p) => p.id === 5),
  );
  for (const p of places)
    assert.ok(
      Math.abs(
        p.ranking_score - rankingScore(p.average_rating, p.review_count),
      ) < 1e-10,
    );
  const filtered = await (
    await fetch(`${base}/places?category=Food`, { headers })
  ).json();
  assert.equal(filtered.length, 3);
  assert.ok(filtered.every((p) => p.category === "Food"));
  for (const rating of [3, 5]) {
    const response = await fetch(`${base}/places/5/review`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ rating, body: "My experience" }),
    });
    assert.equal(response.status, 200);
  }
  assert.equal(
    db
      .prepare(
        "SELECT COUNT(*) AS n FROM reviews WHERE place_id=5 AND user_id=1",
      )
      .get().n,
    1,
  );
  assert.equal(
    db
      .prepare("SELECT rating FROM reviews WHERE place_id=5 AND user_id=1")
      .get().rating,
    5,
  );
  assert.equal(
    (
      await fetch(`${base}/places/5/review`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ rating: 6, body: "Invalid" }),
      })
    ).status,
    400,
  );
  assert.equal(
    (await fetch(`${base}/places`, { headers: { "X-User-Id": "4" } })).status,
    400,
  );
  assert.equal(seed(db), false);
});
