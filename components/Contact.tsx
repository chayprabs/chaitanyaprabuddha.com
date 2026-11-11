"use client";

import { useState } from "react";

const contactLinks = [
  { href: "https://github.com/chayprabs", label: "GitHub" },
  { href: "https://x.com/chayprabs", label: "X" },
  { href: "https://linkedin.com/in/chaitanya-prabuddha-bits94", label: "LinkedIn" },
  { href: "mailto:hi@chaitanyaprabuddha.com", label: "Email" }
];

export default function Contact() {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const isExpanded = isHovered || isPinnedOpen;

  return (
    <section
      id="contact"
      aria-label="Contact"
      className="contact-tab"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setIsPinnedOpen(false);
        }
      }}
    >
      {isExpanded ? (
        <div id="contact-links" className="contact-links">
          <span className="label">Reach out</span>
          {contactLinks.map((link) => {
            const isEmail = link.href.startsWith("mailto:");

            return (
              <a
                key={link.label}
                href={link.href}
                target={isEmail ? undefined : "_blank"}
                rel={isEmail ? undefined : "noopener noreferrer"}
                className="contact-link"
                onClick={() => setIsPinnedOpen(false)}
              >
                {link.label}
              </a>
            );
          })}
          <button
            type="button"
            aria-label="Close contact links"
            onClick={() => {
              setIsPinnedOpen(false);
              setIsHovered(false);
            }}
            className="cursor-pointer border-0 bg-transparent p-0 text-[18px] leading-none text-white/70 hover:text-white md:hidden"
          >
            {"×"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          aria-expanded={false}
          onClick={() => setIsPinnedOpen(true)}
          className="contact-toggle"
        >
          <span className="contact-dot" aria-hidden="true" />
          say hello
        </button>
      )}
    </section>
  );
}
