"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const navLinks = [
  { href: "/", label: "Home", key: "home" },
  { href: "/blog", label: "Blog", key: "blog" },
  { href: "/#projects", label: "Projects", key: "projects" },
  { href: "/#research", label: "Research", key: "research" },
  { href: "/#achievements", label: "Achievements", key: "achievements" }
];

const spySections = ["projects", "research", "achievements"];

type MastheadProps = {
  current?: "home" | "blog";
};

export default function Masthead({ current }: MastheadProps) {
  const [active, setActive] = useState<string | undefined>(current);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      setStuck(window.scrollY > 8);

      if (current !== "home") {
        return;
      }

      let next = "home";

      for (const id of spySections) {
        const section = document.getElementById(id);

        // A section owns the tab from its top until the next spied section;
        // past the last one (Before BITS onward) the tab returns to Home.
        if (section && section.getBoundingClientRect().top <= 140) {
          next = id;
        }
      }

      const last = document.getElementById(spySections[spySections.length - 1]);

      if (last && last.getBoundingClientRect().bottom <= 140) {
        next = "home";
      }

      setActive(next);
    };

    const onScroll = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);

      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [current]);

  return (
    <header className="masthead" data-stuck={stuck ? "true" : undefined}>
      <div className="container">
        <div className="masthead-row">
          <Link href="/" className="masthead-name">
            Chaitanya Prabuddha
          </Link>

          <nav className="masthead-nav" aria-label="Primary">
            {navLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                aria-current={
                  link.key !== active
                    ? undefined
                    : link.key === current
                      ? "page"
                      : "location"
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
