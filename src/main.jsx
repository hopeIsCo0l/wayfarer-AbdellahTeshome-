import React from "react";
import { useWayfarer } from "./useWayfarer.js";
import { PlacesList } from "./PlacesList.jsx";
import { PlaceDetail } from "./PlaceDetail.jsx";
import { createRoot } from "react-dom/client";
import "./style.css";
function App() {
  const state = useWayfarer();
  const { users, user, setUser, busy, setNotice } = state;
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Wayfarer home">
          <span className="brand-icon">↗</span>wayfarer
          <span className="brand-dot">.</span>
        </a>
        <span className="tagline">A little closer to somewhere new.</span>
        <label className="user-switch">
          <span className="avatar">
            {users.find((u) => u.id === user)?.name[0] || "S"}
          </span>
          <span>
            Exploring as{" "}
            <select
              aria-label="Acting as"
              disabled={busy}
              value={user}
              onChange={(e) => {
                setUser(Number(e.target.value));
                setNotice("");
              }}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </span>
        </label>
      </header>
      <main>
        <section className="intro">
          <div>
            <p className="eyebrow">ETHIOPIA · 9.03° N, 38.75° E</p>
            <h1>Find your Addis.</h1>
            <p>Old stories, fresh coffee, and a city worth getting to know.</p>
          </div>
          <div className="city-stamp">
            <span>✳</span>
            <div>
              Go a little deeper.<small>Explore with local perspective</small>
            </div>
          </div>
        </section>
        <div className="workspace">
          <PlacesList state={state} />
          <PlaceDetail state={state} />
        </div>
        <footer>
          <span className="brand">wayfarer.</span>
          <span>More perspective. Better adventures.</span>
          <span>Made for curious people.</span>
        </footer>
      </main>
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
