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
            I&rsquo;m a CS student at BITS Pilani. I build products, research
            AI/ML, and write about both. At 16, my technical writing
            front-paged Hacker News and reached 80k+ readers. Since then
            I&rsquo;ve run a SaaS with paying customers, started Authos,
            shipped open source, and begun research on LLM inference.
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
            <figcaption>hi, I&rsquo;m Chaitanya</figcaption>
          </div>
        </figure>
      </div>
    </Section>
  );
}
