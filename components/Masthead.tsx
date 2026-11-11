import Link from "next/link";

const navLinks = [
  { href: "/", label: "Home", key: "home" },
  { href: "/blog", label: "Blog", key: "blog" },
  { href: "/#projects", label: "Projects", key: "projects" },
  { href: "/#research", label: "Research", key: "research" },
  { href: "/#achievements", label: "Achievements", key: "achievements" }
];

type MastheadProps = {
  current?: "home" | "blog";
};

export default function Masthead({ current }: MastheadProps) {
  return (
    <header className="masthead">
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
                aria-current={link.key === current ? "page" : undefined}
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
