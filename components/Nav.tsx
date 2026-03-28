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
    <nav className="fixed inset-x-0 top-0 z-50 border-b-[0.5px] border-b-[var(--color-border)] bg-[#F1F0EE] py-5">
      <div className="container flex items-center justify-between gap-6">
        <a
          href="#top"
          className="shrink-0 font-jost text-[14px] font-semibold text-[#1a1a18] transition-colors duration-200 ease-in-out"
        >
          Chaitanya Prabuddha
        </a>

        <div className="hidden min-w-0 flex-1 flex-nowrap items-center justify-end gap-7 overflow-hidden whitespace-nowrap md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-jost whitespace-nowrap text-[14px] font-light text-[#6b6860] transition-colors duration-200 ease-in-out hover:text-[#1a1a18]"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
