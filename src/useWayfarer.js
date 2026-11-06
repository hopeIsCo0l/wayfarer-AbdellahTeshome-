import { useEffect, useRef, useState } from "react";
import { dateFormat, timeFormat } from "./dates.js";
const initialId = () =>
  Number(location.pathname.match(/^\/places\/(\d+)$/)?.[1]) || 1;
export function useWayfarer() {
  const [users, setUsers] = useState([]),
    [user, setUser] = useState(1),
    [category, setCategory] = useState("All"),
    [places, setPlaces] = useState([]),
    [selected, setSelected] = useState(initialId),
    [detail, setDetail] = useState(null),
    [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(true),
    [listLoading, setListLoading] = useState(true),
    [listError, setListError] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [rating, setRating] = useState(0),
    [body, setBody] = useState(""),
    [busy, setBusy] = useState(false),
    [seatCounts, setSeatCounts] = useState({});
  const bookingKeys = useRef({}),
    mutating = useRef(false),
    lastBookingAt = useRef(0);
  async function api(path, options = {}) {
    const response = await fetch(`/api${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": String(user),
        ...options.headers,
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Please try again.");
    return data;
  }
  useEffect(() => {
    fetch("/api/users")
      .then((r) => {
        if (!r.ok) throw Error("Could not load travellers.");
        return r.json();
      })
      .then(setUsers)
      .catch((e) => setError(e.message));
    const listener = () => setSelected(initialId());
    addEventListener("popstate", listener);
    return () => removeEventListener("popstate", listener);
  }, []);
  useEffect(() => {
    let current = true;
    setListLoading(true);
    setListError("");
    api(`/places?category=${category}&sort=top`)
      .then((data) => {
        if (current) setPlaces(data);
      })
      .catch((e) => {
        if (current) setListError(e.message);
      })
      .finally(() => {
        if (current) setListLoading(false);
      });
    return () => {
      current = false;
    };
  }, [category, user, revision]);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setDetail(null);
    setError("");
    api(`/places/${selected}`)
      .then((data) => {
        if (current) {
          setDetail(data);
          setRating(data.myReview?.rating || 0);
          setBody(data.myReview?.body || "");
        }
      })
      .catch((e) => {
        if (current) setError(e.message);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [selected, user, revision]);
  function select(id) {
    setSelected(id);
    history.pushState({}, "", `/places/${id}`);
    setNotice("");
  }
  async function review(event) {
    event.preventDefault();
    if (mutating.current) return;
    mutating.current = true;
    setBusy(true);
    setError("");
    try {
      await api(`/places/${selected}/review`, {
        method: "PUT",
        body: JSON.stringify({ rating, body }),
      });
      setNotice("Your review is saved. Thanks for sharing your experience.");
      setRevision((v) => v + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      mutating.current = false;
    }
  }
  async function book(slot) {
    if (mutating.current || Date.now() - lastBookingAt.current < 700) return;
    lastBookingAt.current = Date.now();
    mutating.current = true;
    setBusy(true);
    setError("");
    const seats = Math.min(Number(seatCounts[slot.id] || 1), slot.seats_left),
      token = `${user}-${slot.id}-${seats}`;
    bookingKeys.current[token] ||= crypto.randomUUID();
    try {
      await api(`/slots/${slot.id}/bookings`, {
        method: "POST",
        headers: { "Idempotency-Key": bookingKeys.current[token] },
        body: JSON.stringify({ seats }),
      });
      delete bookingKeys.current[token];
      setNotice(
        `You’re booked! ${seats} seat${seats === 1 ? "" : "s"} at ${timeFormat.format(new Date(slot.starts_at))}, ${dateFormat.format(new Date(slot.starts_at))}.`,
      );
      setRevision((v) => v + 1);
    } catch (e) {
      setError(
        e.message,
      ); /* Retain the key so an uncertain network result can be safely retried. */
    } finally {
      setBusy(false);
      mutating.current = false;
    }
  }

  return {
    users,
    user,
    setUser,
    category,
    setCategory,
    places,
    selected,
    detail,
    loading,
    listLoading,
    listError,
    error,
    notice,
    setNotice,
    rating,
    setRating,
    body,
    setBody,
    busy,
    seatCounts,
    setSeatCounts,
    select,
    review,
    book,
    setRevision,
  };
}
