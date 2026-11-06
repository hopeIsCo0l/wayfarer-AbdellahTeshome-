import { test } from "node:test";
import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../server/db.js";
import { seed } from "../server/seed.js";
test(
  "parallel HTTP bookings across four processes never overbook; retries are idempotent",
  { timeout: 20000 },
  async (t) => {
    const dir = mkdtempSync(join(tmpdir(), "wayfarer-test-"));
    const file = join(dir, "test.sqlite");
    const db = openDatabase(file);
    seed(db);
    const children = [];
    t.after(async () => {
      await Promise.all(
        children.map(async (child) => {
          if (child.exitCode === null) {
            const done = once(child, "exit");
            child.kill();
            await done;
          }
        }),
      );
      db.close();
      rmSync(dir, { recursive: true, force: true });
    });
    const ports = await Promise.all(
      Array.from({ length: 4 }, async () => {
        const child = fork(
          new URL("./http-worker.js", import.meta.url),
          [file],
          { stdio: ["ignore", "ignore", "inherit", "ipc"] },
        );
        children.push(child);
        const [message] = await once(child, "message");
        return message.port;
      }),
    );
    const request = (index, slot, seats, key) =>
      fetch(`http://127.0.0.1:${ports[index % 4]}/api/slots/${slot}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": String((index % 3) + 1),
          "Idempotency-Key": key,
        },
        body: JSON.stringify({ seats }),
      });
    // Slot 2 begins with 9/10 seats filled. Requests run in independent processes/connections.
    const responses = await Promise.all(
      Array.from({ length: 40 }, (_, i) => request(i, 2, 1, `last-seat-${i}`)),
    );
    assert.equal(responses.filter((r) => r.status === 201).length, 1);
    assert.equal(responses.filter((r) => r.status === 409).length, 39);
    const errors = await Promise.all(
      responses.filter((r) => r.status === 409).map((r) => r.json()),
    );
    assert.ok(errors.every((e) => e.error.includes("fully booked")));
    assert.equal(
      db.prepare("SELECT SUM(seats) AS n FROM bookings WHERE slot_id=2").get()
        .n,
      10,
    );
    // Multi-seat reservations: 4 remaining; exactly two requests for 2 seats may succeed.
    const multi = await Promise.all(
      Array.from({ length: 24 }, (_, i) => request(i, 1, 2, `two-seats-${i}`)),
    );
    assert.equal(multi.filter((r) => r.status === 201).length, 2);
    assert.equal(multi.filter((r) => r.status === 409).length, 22);
    assert.equal(
      db.prepare("SELECT SUM(seats) AS n FROM bookings WHERE slot_id=1").get()
        .n,
      10,
    );
    // Same user and key across four processes: one insertion, nineteen successful replays.
    const retries = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        request(i * 3, 4, 2, "same-booking-key"),
      ),
    );
    assert.equal(retries.filter((r) => r.status === 201).length, 1);
    assert.equal(retries.filter((r) => r.status === 200).length, 19);
    const bookings = await Promise.all(retries.map((r) => r.json()));
    assert.equal(new Set(bookings.map((b) => b.booking.id)).size, 1);
    assert.equal(
      db.prepare("SELECT SUM(seats) AS n FROM bookings WHERE slot_id=4").get()
        .n,
      2,
    );
    assert.equal((await request(0, 4, 3, "same-booking-key")).status, 409);
    for (const seats of [0, -1, 1.5, "2"])
      assert.equal((await request(0, 4, seats, "bad-seat-count")).status, 400);
    // Database constraints also stop direct writes or later capacity reductions.
    assert.throws(
      () =>
        db
          .prepare(
            "INSERT INTO bookings(slot_id,user_id,seats,request_key) VALUES (2,1,1,?)",
          )
          .run("direct-overbook"),
      /slot_capacity_exceeded/,
    );
    assert.throws(
      () => db.prepare("UPDATE bookings SET seats=20 WHERE slot_id=4").run(),
      /slot_capacity_exceeded/,
    );
    assert.throws(
      () => db.prepare("UPDATE tour_slots SET capacity=1 WHERE id=4").run(),
      /slot_capacity_exceeded/,
    );
    const overbooked = db
      .prepare(
        "SELECT t.id FROM tour_slots t JOIN bookings b ON b.slot_id=t.id GROUP BY t.id HAVING SUM(b.seats)>t.capacity",
      )
      .all();
    assert.deepEqual(overbooked, []);
  },
);
