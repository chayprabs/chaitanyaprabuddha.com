"use client";

import { useState } from "react";

const contactLinks = [
  {
    href: "https://github.com/chayprabs",
    label: "GitHub",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-[18px] w-[18px]">
        <path
          d="M12 2C6.477 2 2 6.589 2 12.248c0 4.527 2.865 8.366 6.839 9.722.5.094.682-.223.682-.496 0-.245-.009-.893-.014-1.753-2.782.617-3.369-1.37-3.369-1.37-.455-1.184-1.11-1.499-1.11-1.499-.908-.637.069-.624.069-.624 1.004.072 1.532 1.054 1.532 1.054.892 1.563 2.341 1.112 2.91.851.091-.664.35-1.112.636-1.368-2.221-.26-4.556-1.137-4.556-5.061 0-1.118.389-2.034 1.029-2.751-.103-.261-.446-1.311.098-2.734 0 0 .84-.276 2.75 1.051A9.322 9.322 0 0 1 12 6.816c.85.004 1.705.118 2.503.347 1.909-1.327 2.748-1.051 2.748-1.051.545 1.423.202 2.473.1 2.734.64.717 1.028 1.633 1.028 2.751 0 3.934-2.339 4.798-4.567 5.053.359.318.679.947.679 1.909 0 1.378-.012 2.489-.012 2.828 0 .275.18.595.688.494C19.138 20.61 22 16.773 22 12.248 22 6.589 17.523 2 12 2Z"
          fill="currentColor"
        />
      </svg>
    )
  },
  {
    href: "https://x.com/chayprabs",
    label: "X",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-[18px] w-[18px]">
        <path
          d="M18.901 2H21.98l-6.727 7.687L23 22h-6.063l-4.75-7.436L5.68 22H2.6l7.195-8.223L2.4 2h6.218l4.293 6.867L18.9 2Zm-1.064 18.146h1.706L7.68 3.758H5.85l11.987 16.388Z"
          fill="currentColor"
        />
      </svg>
    )
  },
  {
    href: "https://linkedin.com/in/chaitanyaprabuddha",
    label: "LinkedIn",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-[18px] w-[18px]">
        <path
          d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3A1.97 1.97 0 0 0 3.28 5c0 1.09.88 1.98 1.97 1.98S7.22 6.1 7.22 5A1.97 1.97 0 0 0 5.25 3ZM20.44 12.72c0-3.36-1.79-4.92-4.17-4.92-1.92 0-2.78 1.08-3.26 1.84V8.5H9.63c.04.76 0 11.5 0 11.5h3.38v-6.42c0-.34.02-.68.13-.92.27-.68.88-1.39 1.9-1.39 1.33 0 1.86 1.05 1.86 2.59V20h3.38v-7.28Z"
          fill="currentColor"
        />
      </svg>
    )
  },
  {
    href: "mailto:your@email.com",
    label: "Email",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-[18px] w-[18px]">
        <path
          d="M3 6.75A1.75 1.75 0 0 1 4.75 5h14.5A1.75 1.75 0 0 1 21 6.75v10.5A1.75 1.75 0 0 1 19.25 19H4.75A1.75 1.75 0 0 1 3 17.25V6.75Zm1.83-.25L12 11.73l7.17-5.23H4.83Zm14.67 1.85-6.98 5.09a.9.9 0 0 1-1.04 0L4.5 8.35v8.9c0 .14.11.25.25.25h14.5a.25.25 0 0 0 .25-.25v-8.9Z"
          fill="currentColor"
        />
      </svg>
    )
  }
];

export default function Contact() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section
      id="contact"
      className={`fixed bottom-6 left-1/2 z-[100] flex max-w-[calc(100vw-24px)] -translate-x-1/2 overflow-hidden rounded-[24px] border-[0.5px] border-[rgba(0,0,0,0.12)] bg-[rgba(250,250,248,0.95)] transition-all duration-300 ease-in-out ${
        isExpanded ? "px-4 py-4 sm:px-6" : "px-5 py-2.5"
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {isExpanded ? (
        <div className="flex items-start gap-3 sm:gap-5">
          {contactLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.label}
              className="flex min-w-[48px] flex-col items-center"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border-[0.5px] border-[rgba(0,0,0,0.1)] bg-[#f4f2ee] text-[#1a1a18]">
                {link.icon}
              </span>
              <span className="font-lato mt-1.5 text-[10px] text-[#6b6860] sm:text-[11px]">
                {link.label}
              </span>
            </a>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <span className="h-[5px] w-[5px] rounded-full bg-[#9a9890]" />
          <span className="h-[5px] w-[5px] rounded-full bg-[#9a9890]" />
          <span className="h-[5px] w-[5px] rounded-full bg-[#9a9890]" />
        </div>
      )}
    </section>
  );
}
