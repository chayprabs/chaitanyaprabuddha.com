"use client";

import { useEffect, useRef, useState } from "react";

type RetiredSiteProps = {
  domain: string;
};

// A struck-through domain for a site that is no longer online. Pressing it
// raises a small flag saying so, rather than sending anyone to a dead link.
export default function RetiredSite({ domain }: RetiredSiteProps) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const show = () => {
    window.clearTimeout(timer.current);
    setOpen(true);
    timer.current = window.setTimeout(() => setOpen(false), 2600);
  };

  return (
    <span className="retired" data-open={open ? "true" : undefined}>
      <button
        type="button"
        className="retired-domain"
        aria-describedby={`${domain}-retired`}
        onClick={show}
        onBlur={() => setOpen(false)}
      >
        <s>{domain}</s>
      </button>
      <span id={`${domain}-retired`} role="status" className="retired-flag">
        No longer live
      </span>
    </span>
  );
}
