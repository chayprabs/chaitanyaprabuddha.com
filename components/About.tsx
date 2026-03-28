const socialLinks = [
  {
    href: "https://github.com/chayprabs",
    label: "GitHub",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-[18px] w-[18px]">
        <path
          d="M12 2C6.477 2 2 6.589 2 12.248c0 4.527 2.865 8.366 6.839 9.722.5.094.682-.223.682-.496 0-.245-.009-.893-.014-1.753-2.782.617-3.369-1.37-3.369-1.37-.455-1.184-1.11-1.499-1.11-1.499-.908-.637.069-.624.069-.624 1.004.072 1.532 1.054 1.532 1.054.892 1.563 2.341 1.112 2.91.851.091-.664.35-1.112.636-1.368-2.221-.26-4.556-1.137-4.556-5.061 0-1.118.389-2.034 1.029-2.751-.103-.261-.446-1.311.098-2.734 0 0 .84-.276 2.75 1.051A9.322 9.322 0 0 1 12 6.816c.85.004 1.705.118 2.503.347 1.909-1.327 2.748-1.051 2.748-1.051.545 1.423.202 2.473.1 2.734.64.717 1.028 1.633 1.028 2.751 0 3.934-2.339 4.798-4.567 5.053.359.318.679.947.679 1.909 0 1.378-.012 2.489-.012 2.828 0 .275.18.595.688.494C19.138 20.61 22 16.773 22 12.248 22 6.589 17.523 2 12 2Z"
          fill="currentColor"
        />
      </svg>
    )
  },
  {
    href: "https://x.com/chayprabs",
    label: "X",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-[18px] w-[18px]">
        <path
          d="M18.901 2H21.98l-6.727 7.687L23 22h-6.063l-4.75-7.436L5.68 22H2.6l7.195-8.223L2.4 2h6.218l4.293 6.867L18.9 2Zm-1.064 18.146h1.706L7.68 3.758H5.85l11.987 16.388Z"
          fill="currentColor"
        />
      </svg>
    )
  },
  {
    href: "https://linkedin.com/in/chaitanyaprabuddha",
    label: "LinkedIn",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-[18px] w-[18px]">
        <path
          d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3A1.97 1.97 0 0 0 3.28 5c0 1.09.88 1.98 1.97 1.98S7.22 6.1 7.22 5A1.97 1.97 0 0 0 5.25 3ZM20.44 12.72c0-3.36-1.79-4.92-4.17-4.92-1.92 0-2.78 1.08-3.26 1.84V8.5H9.63c.04.76 0 11.5 0 11.5h3.38v-6.42c0-.34.02-.68.13-.92.27-.68.88-1.39 1.9-1.39 1.33 0 1.86 1.05 1.86 2.59V20h3.38v-7.28Z"
          fill="currentColor"
        />
      </svg>
    )
  },
  {
    href: "mailto:your@email.com",
    label: "Email",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-[18px] w-[18px]">
        <path
          d="M3 6.75A1.75 1.75 0 0 1 4.75 5h14.5A1.75 1.75 0 0 1 21 6.75v10.5A1.75 1.75 0 0 1 19.25 19H4.75A1.75 1.75 0 0 1 3 17.25V6.75Zm1.83-.25L12 11.73l7.17-5.23H4.83Zm14.67 1.85-6.98 5.09a.9.9 0 0 1-1.04 0L4.5 8.35v8.9c0 .14.11.25.25.25h14.5a.25.25 0 0 0 .25-.25v-8.9Z"
          fill="currentColor"
        />
      </svg>
    )
  }
];

export default function About() {
  return (
    <section
      id="about"
      className="w-full border-t-[0.5px] border-t-[rgba(0,0,0,0.07)] px-5 py-[72px] md:px-10"
    >
      <div className="container">
        <p className="mb-8 text-[11px] uppercase tracking-[0.12em] text-[#a09d95] [font-family:var(--font-satoshi)]">
          ABOUT
        </p>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1fr)_180px] md:items-center md:gap-12">
          <div className="order-last md:order-first">
            <p className="text-[15px] leading-[1.7] text-[#3d3b36] [font-family:var(--font-satoshi)]">
              I&apos;m Chaitanya, CS student at BITS Pilani, AI/ML researcher
              &mdash; while constantly vibe shipping. At 16, my technical writing
              hit 80k+ readers and front-paged Hacker News. That obsession never
              left. Today I&apos;m founding Authos, shipping open source, and
              sitting somewhere at the frontier of what these models can actually
              do.
            </p>

            <p className="mt-4 text-[13px] leading-[1.7] text-[#a09d95] [font-family:var(--font-satoshi)]">
              B.E. Computer Science &middot; BITS Pilani &middot; Pilani,
              Rajasthan
            </p>

            <div className="mt-4 flex items-center gap-5 text-[#6b6960]">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.label}
                  className="transition-colors duration-200 ease-in-out hover:text-[#1a1a18]"
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </div>

          <div className="order-first flex justify-center md:order-last md:justify-end">
            <div className="group relative h-[120px] w-[120px] md:h-[180px] md:w-[180px]">
              <div className="pointer-events-none absolute -left-6 top-5 hidden rounded-[20px] bg-[#EDE8DF] px-[10px] py-1 text-[11px] text-[#7a6b4e] opacity-0 transition-all duration-300 ease-in-out group-hover:-translate-y-1 group-hover:opacity-100 md:block [font-family:var(--font-satoshi)]">
                late night builder
              </div>
              <div className="pointer-events-none absolute -right-7 top-1 hidden rounded-[20px] bg-[#EDE8DF] px-[10px] py-1 text-[11px] text-[#7a6b4e] opacity-0 transition-all duration-300 ease-in-out delay-75 group-hover:-translate-y-1 group-hover:opacity-100 md:block [font-family:var(--font-satoshi)]">
                chess player
              </div>
              <div className="pointer-events-none absolute -right-10 bottom-5 hidden rounded-[20px] bg-[#EDE8DF] px-[10px] py-1 text-[11px] text-[#7a6b4e] opacity-0 transition-all duration-300 ease-in-out delay-150 group-hover:-translate-y-1 group-hover:opacity-100 md:block [font-family:var(--font-satoshi)]">
                music obsessed
              </div>

              <div className="h-[120px] w-[120px] rounded-full bg-[#E8E4DC] transition-transform duration-300 ease-in-out group-hover:-translate-y-[6px] md:h-[180px] md:w-[180px]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
