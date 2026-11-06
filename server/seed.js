import { pathToFileURL } from "node:url";
import { openDatabase, migrate } from "./db.js";
export function seed(db) {
  migrate(db);
  if (db.prepare("SELECT COUNT(*) AS n FROM places").get().n) return false;
  db.transaction(() => {
    const user = db.prepare(
      "INSERT INTO users (id,name,selectable) VALUES (?,?,?)",
    );
    ["Sara", "Abel", "Liya"].forEach((name, i) => user.run(i + 1, name, 1));
    for (let i = 0; i < 540; i++) user.run(i + 4, `Traveller ${i + 1}`, 0);
    const rows = [
      [
        "National Museum",
        "History",
        "Meet Lucy, wander through centuries of Ethiopian art, and discover the stories that shaped a nation. A quiet, fascinating place to begin your Addis adventure.",
        "08:30–17:30",
        "Arat Kilo",
        312,
        4.7,
      ],
      [
        "Holy Trinity Cathedral",
        "History",
        "Explore ornate architecture, stained glass, and a deeply rooted chapter of the city’s history.",
        "08:00–17:00",
        "Arat Kilo",
        188,
        4.6,
      ],
      [
        "Entoto Park",
        "Nature",
        "Trade city streets for eucalyptus trails, sweeping views, and a little fresh mountain air.",
        "08:00–18:00",
        "Entoto",
        96,
        4.5,
      ],
      [
        "Corner Coffee House",
        "Food",
        "Slow down over freshly roasted beans and a traditional coffee ceremony.",
        "07:00–20:00",
        "Bole",
        540,
        4.4,
      ],
      [
        "Brand-new café",
        "Food",
        "A tiny new neighborhood café with warm pastries and a sunny terrace. Come form your own first impression.",
        "07:30–19:00",
        "Kazanchis",
        1,
        5,
      ],
      [
        "Ethnological Museum",
        "History",
        "Step into Ethiopia’s everyday traditions, craft, and culture in a leafy university setting.",
        "09:00–17:00",
        "Sidist Kilo",
        75,
        4.5,
      ],
      [
        "Unity Park",
        "Nature",
        "Gardens, architecture, and open paths make for an easy afternoon of discovery.",
        "09:00–17:00",
        "Arat Kilo",
        62,
        4.3,
      ],
      [
        "Merkato Food Walk",
        "Food",
        "Follow the aromas of spices and fresh injera through a bustling market neighborhood.",
        "09:00–18:00",
        "Merkato",
        42,
        4.6,
      ],
      [
        "Mount Yeka Trail",
        "Nature",
        "A gentle escape above the city, with shady paths and wide-open views.",
        "06:00–18:00",
        "Yeka",
        2,
        5,
      ],
      [
        "Red Terror Memorial",
        "History",
        "A thoughtful, sobering stop that invites reflection on Ethiopia’s recent history.",
        "08:30–18:00",
        "Meskel Square",
        110,
        4.4,
      ],
    ];
    const place = db.prepare("INSERT INTO places VALUES (?,?,?,?,?,?)");
    const review = db.prepare(
      "INSERT INTO reviews(place_id,user_id,rating,body) VALUES (?,?,?,?)",
    );
    rows.forEach(([name, cat, desc, hours, area, count, avg], i) => {
      place.run(i + 1, name, cat, desc, hours, area);
      const fiveCount = Math.round(count * (avg - 4));
      for (let n = 0; n < count; n++)
        review.run(
          i + 1,
          n + 4,
          n < fiveCount ? 5 : 4,
          n % 2
            ? "A memorable stop. Leave yourself time to look around."
            : "Go early, take your time, and enjoy the details.",
        );
    });
    const slot = db.prepare("INSERT INTO tour_slots VALUES (?,?,?,?)");
    // Next Saturday; ISO UTC timestamps display consistently in Africa/Addis_Ababa.
    const day = new Date();
    day.setUTCDate(day.getUTCDate() + ((6 - day.getUTCDay() + 7) % 7 || 7));
    const date = day.toISOString().slice(0, 10);
    [6, 8, 11].forEach((hour, i) =>
      slot.run(
        i + 1,
        1,
        `${date}T${String(hour).padStart(2, "0")}:00:00.000Z`,
        10,
      ),
    );
    slot.run(4, 3, `${date}T06:00:00.000Z`, 12);
    slot.run(5, 8, `${date}T07:00:00.000Z`, 8);
    const booking = db.prepare(
      "INSERT INTO bookings(slot_id,user_id,seats,request_key) VALUES (?,?,?,?)",
    );
    [6, 9, 10].forEach((seats, i) => booking.run(i + 1, 4, seats, `seed-${i}`));
  }).immediate();
  return true;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const db = openDatabase();
  console.log(
    seed(db)
      ? "Seeded 10 places, 3 demo users, historical reviews, and tours."
      : "Already seeded; existing data preserved.",
  );
  db.close();
}
