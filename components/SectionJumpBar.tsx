import Link from "next/link";

type SectionJumpLink = {
  href: string;
  label: string;
};

type SectionJumpBarProps = {
  links: SectionJumpLink[];
  className?: string;
  hideBottomBorder?: boolean;
};

export default function SectionJumpBar({
  links,
  className = "",
  hideBottomBorder = false
}: SectionJumpBarProps) {
  return (
    <div
      className={`mb-0 mt-16 w-full bg-transparent py-3 ${className}`.trim()}
      style={{
        borderTop: "1px solid rgba(0,0,0,0.1)",
        borderBottom: hideBottomBorder ? "none" : "1px solid rgba(0,0,0,0.1)"
      }}
    >
      <div className="no-scrollbar w-full overflow-x-auto">
        <div
          className="grid min-w-[520px] items-center md:w-full md:min-w-[640px]"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))`
          }}
        >
          {links.map((item, index) => (
            <div
              key={item.href}
              className="relative text-center"
            >
              <Link
                href={item.href}
                className="block px-[2px] text-[11px] font-normal tracking-[0.02em] text-[#9a9890] transition-colors duration-150 ease-in-out hover:text-[#1a1a18] md:px-0 md:text-[13px] md:tracking-[0.05em]"
                style={{
                  fontFamily: "var(--font-inter)",
                  whiteSpace: "nowrap"
                }}
              >
                {item.label}
              </Link>

              {index < links.length - 1 ? (
                <span
                  className="pointer-events-none absolute right-0 top-1/2 translate-x-[40%] -translate-y-1/2 text-[10px] leading-none text-[rgba(0,0,0,0.2)] md:translate-x-1/2 md:text-[12px]"
                >
                  {"\u00B7"}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
