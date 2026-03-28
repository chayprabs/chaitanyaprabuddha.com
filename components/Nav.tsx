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
    <nav className="fixed inset-x-0 top-0 z-50 border-b-[0.5px] border-b-[var(--color-border)] bg-transparent py-5">
      <div className="container">
        <div className="flex items-center justify-between">
          <a
            href="#top"
            className="font-jost text-[14px] font-medium text-[#1a1a18] transition-colors duration-200 ease-in-out"
          >
            Chaitanya Prabuddha
          </a>

          <div className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-jost text-[14px] font-normal text-[#6b6860] transition-colors duration-200 ease-in-out hover:text-[#1a1a18]"
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
