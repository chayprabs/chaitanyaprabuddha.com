import Link from "next/link";

const navLinks = [
  { href: "/#about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/#projects", label: "Projects" },
  { href: "/#research", label: "Research" },
  { href: "/#achievements", label: "Achievements" }
];

export default function BlogTopNav() {
  return (
    <div
      className="w-full"
      style={{
        borderTop: "1px solid rgba(0,0,0,0.08)",
        borderBottom: "1px solid rgba(0,0,0,0.08)"
      }}
    >
      <div className="container py-3">
        <nav className="flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] font-normal text-[#6b6860] transition-colors duration-200 ease-in-out hover:text-[#1a1a18]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
