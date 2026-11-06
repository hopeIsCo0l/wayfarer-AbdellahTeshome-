# Design decisions

## Honest ranking

Use a Bayesian weighted mean: `score = (n × average + 20 × 3.5) / (n + 20)`, where `n` is the review count. Twenty prior reviews at 3.5 stars stop tiny perfect samples dominating established places. The museum (312 reviews averaging about 4.7) scores about 4.63; a new café with one 5-star review scores 3.57. At large counts the score converges to the observed average. Display the real average and count; only ordering uses the adjusted score. SQL does filtering, aggregation and sorting; stable ties use count then ID. A test checks SQL results against the exported JavaScript formula.

The prior is an explicit product choice, not a guarantee of quality or a statistical confidence bound. It can undervalue excellent newcomers and does not detect fake reviews. A fixed prior avoids unrelated reviews changing every place’s score. With more time, evaluate priors against real traveller choices and provide a separate discovery view for newcomers.

## No overbooking

A booking uses SQLite `BEGIN IMMEDIATE` through better-sqlite3’s immediate transaction. The write lock is acquired before reading remaining capacity. The availability check and insertion commit together; other writers wait and then see the committed count. WAL allows readers alongside the writer; a five-second busy timeout produces a retryable HTTP 503 if contention persists. Capacity conflicts produce a helpful HTTP 409. No in-memory lock is relied on.

Database triggers additionally reject inserts/updates that exceed capacity and reject capacity reductions below existing bookings. Foreign keys and integer/positive checks enforce basic integrity. The concurrency test sends 40 simultaneous HTTP requests to four independent server processes with four connections to the same nearly full database: exactly one gets the last seat. A second round verifies multi-seat reservations. Direct writes and capacity reductions are also tested.

This suits a small local app. SQLite serializes all writes, so throughput is limited; keep the database on one machine’s local disk. For a larger deployment, use PostgreSQL with row-level locks on tour slots and the same transactional recheck. The transaction semantics follow [SQLite’s documentation](https://www.sqlite.org/lang_transaction.html), with [capacity triggers](https://www.sqlite.org/lang_createtrigger.html) as a second guard.

## Scope and assumptions

Three selectable demo users send `X-User-Id`; 540 non-selectable historical reviewers allow realistic counts while keeping one review per user per place. They are fictional seed records. No authentication is implemented, as requested. Ratings and reviews are upserted under a database unique constraint. Text is required and limited to 500 characters. Tour times are stored as UTC ISO strings and displayed in Africa/Addis_Ababa. Seed tours fall on the next Saturday, and expired slots disappear.

The chosen bonus is duplicate-request safety: a unique `(user_id, request_key)` makes retries return the original booking. Reusing a key for a different quantity or slot returns 409. The client preserves the key on a failed response and suppresses rapid double clicks. Keys remain in memory only; automatic recovery after a browser reload is not implemented. A later intentional booking may add seats; cancellation and payments are out of scope. The layout also has basic narrow-screen wrapping, without an additional mobile feature scope.
