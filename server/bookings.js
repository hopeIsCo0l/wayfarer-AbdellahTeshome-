export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function bookSeats(db, { slotId, userId, seats, key }) {
  return db
    .transaction(() => {
      const existing = db
        .prepare("SELECT * FROM bookings WHERE user_id=? AND request_key=?")
        .get(userId, key);
      if (existing) {
        if (existing.slot_id !== slotId || existing.seats !== seats)
          throw new HttpError(
            409,
            "This booking key was already used for a different request.",
          );
        return { booking: existing, replayed: true };
      }
      const slot = db
        .prepare(
          "SELECT *, capacity-COALESCE((SELECT SUM(seats) FROM bookings WHERE slot_id=tour_slots.id),0) AS seats_left FROM tour_slots WHERE id=?",
        )
        .get(slotId);
      if (!slot) throw new HttpError(404, "Tour not found.");
      if (Date.parse(slot.starts_at) <= Date.now())
        throw new HttpError(409, "This tour has already started.");
      if (slot.seats_left < seats)
        throw new HttpError(
          409,
          slot.seats_left === 0
            ? "This tour is fully booked. Please choose another time."
            : `Only ${slot.seats_left} seat${slot.seats_left === 1 ? "" : "s"} left. Please choose fewer seats.`,
        );
      const result = db
        .prepare(
          "INSERT INTO bookings(slot_id,user_id,seats,request_key) VALUES (?,?,?,?)",
        )
        .run(slotId, userId, seats, key);
      return {
        booking: db
          .prepare("SELECT * FROM bookings WHERE id=?")
          .get(result.lastInsertRowid),
        replayed: false,
      };
    })
    .immediate();
}
