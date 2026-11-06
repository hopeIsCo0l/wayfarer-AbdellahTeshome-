import express from "express";
import { rankingSql } from "./ranking.js";
import { bookSeats, HttpError } from "./bookings.js";
const positiveId = (value) =>
  Number.isSafeInteger(Number(value)) && Number(value) > 0;
export function createApp(db) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "10kb" }));
  app.get("/api/users", (_req, res) =>
    res.json(db.prepare("SELECT id,name FROM users WHERE selectable=1").all()),
  );
  app.use("/api", (req, _res, next) => {
    const id = req.get("X-User-Id");
    if (!positiveId(id))
      return next(new HttpError(400, "Choose a demo traveller."));
    req.user = db
      .prepare("SELECT id,name FROM users WHERE id=? AND selectable=1")
      .get(Number(id));
    next(req.user ? undefined : new HttpError(400, "Choose a demo traveller."));
  });
  const summary = `SELECT p.*, COUNT(r.id) AS review_count, COALESCE(AVG(r.rating),0) AS average_rating, ${rankingSql} AS ranking_score FROM places p LEFT JOIN reviews r ON r.place_id=p.id`;
  app.get("/api/places", (req, res) => {
    const category = req.query.category || "All";
    if (!["All", "History", "Food", "Nature"].includes(category))
      throw new HttpError(400, "Unknown category.");
    if (req.query.sort && req.query.sort !== "top")
      throw new HttpError(400, "Unknown sort order.");
    res.json(
      db
        .prepare(
          `${summary} WHERE (?='All' OR p.category=?) GROUP BY p.id ORDER BY ranking_score DESC, review_count DESC, p.id ASC`,
        )
        .all(category, category),
    );
  });
  app.get("/api/places/:id", (req, res) => {
    if (!positiveId(req.params.id))
      throw new HttpError(404, "Place not found.");
    const place = db
      .prepare(`${summary} WHERE p.id=? GROUP BY p.id`)
      .get(Number(req.params.id));
    if (!place) throw new HttpError(404, "Place not found.");
    const reviews = db
      .prepare(
        "SELECT r.*,u.name FROM reviews r JOIN users u ON u.id=r.user_id WHERE place_id=? ORDER BY r.created_at DESC,r.id DESC LIMIT 12",
      )
      .all(place.id);
    const myReview =
      db
        .prepare("SELECT * FROM reviews WHERE place_id=? AND user_id=?")
        .get(place.id, req.user.id) || null;
    const slots = db
      .prepare(
        `SELECT t.*,t.capacity-COALESCE((SELECT SUM(seats) FROM bookings WHERE slot_id=t.id),0) AS seats_left, COALESCE((SELECT SUM(seats) FROM bookings WHERE slot_id=t.id AND user_id=?),0) AS my_seats FROM tour_slots t WHERE place_id=? AND starts_at>? ORDER BY starts_at`,
      )
      .all(req.user.id, place.id, new Date().toISOString());
    res.json({ ...place, reviews, myReview, slots });
  });
  app.put("/api/places/:id/review", (req, res) => {
    if (
      !positiveId(req.params.id) ||
      !db.prepare("SELECT id FROM places WHERE id=?").get(Number(req.params.id))
    )
      throw new HttpError(404, "Place not found.");
    const { rating, body } = req.body || {};
    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5 ||
      typeof body !== "string" ||
      !body.trim() ||
      body.trim().length > 500
    )
      throw new HttpError(
        400,
        "Choose 1–5 stars and write a review of 1–500 characters.",
      );
    db.prepare(
      "INSERT INTO reviews(place_id,user_id,rating,body) VALUES (?,?,?,?) ON CONFLICT(place_id,user_id) DO UPDATE SET rating=excluded.rating,body=excluded.body,created_at=CURRENT_TIMESTAMP",
    ).run(Number(req.params.id), req.user.id, rating, body.trim());
    res.json({ message: "Your review is saved." });
  });
  app.post("/api/slots/:id/bookings", (req, res) => {
    const { seats } = req.body || {};
    const key = req.get("Idempotency-Key");
    if (
      !positiveId(req.params.id) ||
      !Number.isSafeInteger(seats) ||
      seats < 1 ||
      seats > 1000
    )
      throw new HttpError(
        400,
        "Choose a whole number of seats from 1 to 1000.",
      );
    if (!key || !/^[a-zA-Z0-9_-]{8,100}$/.test(key))
      throw new HttpError(400, "A valid Idempotency-Key is required.");
    const result = bookSeats(db, {
      slotId: Number(req.params.id),
      userId: req.user.id,
      seats,
      key,
    });
    res.status(result.replayed ? 200 : 201).json(result);
  });
  app.use("/api", (_req, _res, next) =>
    next(new HttpError(404, "API route not found.")),
  );
  app.use((err, _req, res, _next) => {
    if (err.code === "SQLITE_BUSY")
      return res
        .status(503)
        .json({ error: "Bookings are busy. Please try again." });
    if (err.message === "slot_capacity_exceeded")
      return res
        .status(409)
        .json({
          error: "These seats were just booked. Please choose another time.",
        });
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res
      .status(status)
      .json({
        error:
          status >= 500
            ? "Something went wrong. Please try again."
            : err.message,
      });
  });
  return app;
}
