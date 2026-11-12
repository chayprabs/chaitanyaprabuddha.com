"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const navLinks = [
  { href: "/", label: "Home", key: "home" },
  { href: "/blog", label: "Blog", key: "blog" },
  { href: "/#projects", label: "Projects", key: "projects" },
  { href: "/#research", label: "Research", key: "research" },
  { href: "/#achievements", label: "Achievements", key: "achievements" }
];

const spySections = ["projects", "research", "achievements"];

export default function Masthead() {
  const pathname = usePathname();
  const current =
    pathname === "/" ? "home" : pathname.startsWith("/blog") ? "blog" : undefined;
  const [active, setActive] = useState<string | undefined>(current);
  const [stuck, setStuck] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const [pill, setPill] = useState<{ x: number; width: number } | null>(null);
  const [pillMoves, setPillMoves] = useState(false);

  // Slide one raised tab between the links instead of switching each
  // link's background on and off.
  useLayoutEffect(() => {
    const nav = navRef.current;

    if (!nav) {
      return;
    }

    const measure = () => {
      const link = nav.querySelector<HTMLElement>("a[aria-current]");

      setPill(link ? { x: link.offsetLeft, width: link.offsetWidth } : null);
    };

    measure();
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);

    return () => window.removeEventListener("resize", measure);
  }, [active]);

  useEffect(() => {
    // Turn the slide on only after the tab has been placed once.
    const frame = window.requestAnimationFrame(() => setPillMoves(true));

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      setStuck(window.scrollY > 8);

      if (current !== "home") {
        setActive(current);
        return;
      }

      let next = "home";

      for (const id of spySections) {
        const section = document.getElementById(id);

        // A section owns the tab from its top until the next spied section;
        // past the last one (the high school section onward) the tab returns to Home.
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

          <nav
            ref={navRef}
            className="masthead-nav"
            aria-label="Primary"
            data-pill={pill ? "true" : undefined}
          >
            {pill ? (
              <span
                className="masthead-nav-pill"
                aria-hidden="true"
                data-moves={pillMoves ? "true" : undefined}
                style={{
                  width: pill.width,
                  transform: `translateX(${pill.x}px)`
                }}
              />
            ) : null}
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
