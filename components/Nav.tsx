const navLinks = [
  { href: "#about", label: "about" },
  { href: "#authos", label: "authos" },
  { href: "#projects", label: "projects" },
  { href: "#research", label: "research" },
  { href: "#now", label: "now" },
  { href: "#contact", label: "contact" }
];

export default function Nav() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b-[0.5px] border-b-[rgba(0,0,0,0.08)] bg-[var(--color-cream)] px-5 py-[18px] md:px-10">
      <div className="container">
        <div className="flex items-center justify-between">
          <a
            href="#top"
            className="text-[14px] font-medium text-[#1a1a18] transition-colors duration-200 ease-in-out [font-family:var(--font-satoshi)]"
          >
            Chaitanya Prabuddha
          </a>

          <div className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[13px] text-[#6b6960] transition-colors duration-200 ease-in-out hover:text-[#1a1a18] [font-family:var(--font-satoshi)]"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
