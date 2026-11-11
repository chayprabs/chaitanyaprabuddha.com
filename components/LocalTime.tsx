"use client";

import { useEffect, useState } from "react";

const formatter = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata"
});

// Shows the current time in Pilani. Renders nothing until mounted so the
// server HTML and the first client render match.
export default function LocalTime() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setTime(formatter.format(new Date()));

    tick();
    const timer = window.setInterval(tick, 20_000);

    return () => window.clearInterval(timer);
  }, []);

  if (!time) {
    return null;
  }

  return (
    <>
      {" · "}
      <time>{time}</time> here
    </>
  );
}
