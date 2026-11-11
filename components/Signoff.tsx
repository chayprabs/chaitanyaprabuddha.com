const links = [
  { href: "https://github.com/chayprabs", label: "GitHub" },
  { href: "https://x.com/chayprabs", label: "X" },
  { href: "https://linkedin.com/in/chaitanya-prabuddha-bits94", label: "LinkedIn" }
];

// The end of the page, written like the end of a letter: a closing line,
// a way to reply, and a signature.
export default function Signoff() {
  return (
    <section className="signoff" aria-label="Get in touch">
      <div className="container">
        <div className="signoff-body">
          <div>
            <p className="signoff-lede">That&rsquo;s everything, for now.</p>

            <p className="signoff-text">
              If you&rsquo;re building something interesting, hiring, or just
              want a game of chess, my inbox is open.
            </p>

            <div className="signoff-actions">
              <a
                href="mailto:hi@chaitanyaprabuddha.com"
                className="btn btn-primary"
              >
                hi@chaitanyaprabuddha.com
              </a>

              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <p className="signoff-sign">
            Cheers,
            <br />
            Chaitanya
            <svg viewBox="0 0 160 14" aria-hidden="true">
              <path d="M3 9 C 38 2, 74 12, 104 6 S 148 4, 157 8" pathLength="1" />
            </svg>
          </p>
        </div>
      </div>
    </section>
  );
}
