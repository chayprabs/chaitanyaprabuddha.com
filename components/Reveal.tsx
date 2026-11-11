"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Blocks that fade up as they scroll into view. The matching "hidden" styles
// in globals.css only apply once the inline script in the layout has put
// the "js" class on <html>, so the page is fully visible without JavaScript.
const SELECTOR =
  ".hero-kicker, .hero-title, .section-label, .about-body, .sheet, .card, .signoff, .colophon-row";

export default function Reveal() {
  const pathname = usePathname();

  useEffect(() => {
    (window as Window & { __reveal?: boolean }).__reveal = true;

    const targets = Array.from(
      document.querySelectorAll<HTMLElement>(SELECTOR)
    ).filter((element) => !element.classList.contains("is-in"));

    const show = (element: HTMLElement, delay: number) => {
      element.style.transitionDelay = `${delay}ms`;
      element.classList.add("is-in");
      window.setTimeout(() => {
        element.style.transitionDelay = "";
      }, delay + 800);
    };

    if (!("IntersectionObserver" in window)) {
      targets.forEach((element) => show(element, 0));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        // Blocks that arrive together (the first screen, a fast scroll)
        // come in one after another instead of all at once.
        entries
          .filter((entry) => entry.isIntersecting)
          .forEach((entry, index) => {
            show(entry.target as HTMLElement, Math.min(index, 5) * 80);
            observer.unobserve(entry.target);
          });
      },
      { rootMargin: "0px 0px -7% 0px", threshold: 0.01 }
    );

    targets.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
