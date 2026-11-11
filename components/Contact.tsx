"use client";

import { useEffect, useRef, useState } from "react";

const contactLinks = [
  { href: "https://github.com/chayprabs", label: "GitHub" },
  { href: "https://x.com/chayp05", label: "X" },
  { href: "https://linkedin.com/in/chayprabs", label: "LinkedIn" },
  { href: "mailto:hi@chaitanyaprabuddha.com", label: "Email" }
];

// Floating pill that widens to reveal the contact links. Hovering opens it
// with a mouse; a tap or click pins it open until the next tap, an outside
// press, or Escape.
export default function Contact() {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const isOpen = isHovered || isPinnedOpen;

  useEffect(() => {
    if (!isPinnedOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsPinnedOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);

    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isPinnedOpen]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  return (
    <section
      ref={rootRef}
      id="contact"
      aria-label="Contact"
      className="contact-tab"
      data-open={isOpen ? "true" : undefined}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") {
          window.clearTimeout(closeTimer.current);
          setIsHovered(true);
        }
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") {
          // A short grace period so brushing past the edge does not snap shut.
          closeTimer.current = window.setTimeout(() => setIsHovered(false), 180);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setIsPinnedOpen(false);
          setIsHovered(false);
        }
      }}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="contact-links"
        onClick={() => setIsPinnedOpen((open) => !open)}
        className="contact-toggle"
      >
        <span className="contact-dot" aria-hidden="true" />
        <span className="contact-toggle-text">
          <span>
            <span className="contact-toggle-label">say hello</span>
          </span>
        </span>
      </button>

      <div className="contact-reveal">
        <div id="contact-links" className="contact-links" inert={!isOpen}>
          {contactLinks.map((link, index) => {
            const isEmail = link.href.startsWith("mailto:");

            return (
              <a
                key={link.label}
                href={link.href}
                target={isEmail ? undefined : "_blank"}
                rel={isEmail ? undefined : "noopener noreferrer"}
                className="contact-link"
                style={{ "--i": index } as React.CSSProperties}
                onClick={() => setIsPinnedOpen(false)}
              >
                {link.label}
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
