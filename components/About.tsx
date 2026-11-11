import Image from "next/image";

import Section from "@/components/Section";

const socialLinks = [
  { href: "https://github.com/chayprabs", label: "GitHub" },
  { href: "https://x.com/chayprabs", label: "X" },
  { href: "https://linkedin.com/in/chaitanya-prabuddha-bits94", label: "LinkedIn" },
  { href: "mailto:hi@chaitanyaprabuddha.com", label: "Email" }
];

export default function About() {
  return (
    <Section id="about" title="About" sheet={false}>
      <div className="about-body">
        <div>
          <p className="about-text">
            I&apos;m Chaitanya, CS student at BITS Pilani, AI/ML researcher -
            while constantly vibe shipping. At 16, my technical writing hit
            80k+ readers and front-paged Hacker News. That obsession never
            left. Today I&apos;m founding Authos, shipping open source, and
            sitting somewhere at the frontier of what these models can
            actually do.
          </p>

          <p className="about-meta">
            B.E. Computer Science {"·"} BITS Pilani {"·"} Pilani,
            Rajasthan
          </p>

          <div className="about-links">
            {socialLinks.map((link) => {
              const isEmail = link.href.startsWith("mailto:");

              return (
                <a
                  key={link.label}
                  href={link.href}
                  target={isEmail ? undefined : "_blank"}
                  rel={isEmail ? undefined : "noopener noreferrer"}
                  className="btn"
                >
                  {link.label}
                </a>
              );
            })}
          </div>
        </div>

        <figure className="portrait">
          <div className="portrait-frame">
            <Image
              src="/pfp.png"
              alt="Chaitanya Prabuddha"
              width={356}
              height={401}
              priority
            />
          </div>
        </figure>
      </div>
    </Section>
  );
}
