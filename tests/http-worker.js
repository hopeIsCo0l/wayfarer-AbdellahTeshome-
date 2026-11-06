import { openDatabase } from "../server/db.js";
import { createApp } from "../server/app.js";
const db = openDatabase(process.argv[2]);
const server = createApp(db).listen(0, "127.0.0.1", () =>
  process.send({ port: server.address().port }),
);
process.on("message", (message) => {
  if (message === "stop")
    server.close(() => {
      db.close();
      process.exit(0);
    });
});
