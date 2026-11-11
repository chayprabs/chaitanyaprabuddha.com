import Image from "next/image";

import Section from "@/components/Section";

const socialLinks = [
  { href: "https://github.com/chayprabs", label: "GitHub" },
  { href: "https://x.com/chayp05", label: "X" },
  { href: "https://linkedin.com/in/chayprabs", label: "LinkedIn" },
  { href: "mailto:hi@chaitanyaprabuddha.com", label: "Email" }
];

export default function About() {
  return (
    <Section id="about" title="About" sheet={false}>
      <div className="about-body">
        <p className="about-text">
          I&rsquo;m a CS undergrad who builds products, researches AI/ML, and
          writes about both.
        </p>

        <dl className="about-facts">
          <div>
            <dt>Now</dt>
            <dd>
              Building{" "}
              <a href="#cruxo" className="link">
                Cruxo
              </a>{" "}
              and researching{" "}
              <a href="#research" className="link">
                LLM inference
              </a>
              .
            </dd>
          </div>
          <div>
            <dt>Before</dt>
            <dd>
              Front page of Hacker News at 16, with 80k+ readers. Then ran{" "}
              <a href="#highschool" className="link">
                Monial
              </a>
              , a SaaS with paying customers.
            </dd>
          </div>
          <div>
            <dt>School</dt>
            <dd>
              B.E. Computer Science at{" "}
              <a
                href="https://www.bits-pilani.ac.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="link"
              >
                BITS Pilani
              </a>
              , one of India&rsquo;s top engineering universities.
            </dd>
          </div>
        </dl>

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

        <figure className="portrait">
          <div className="portrait-frame">
            <div className="portrait-photo">
              <Image
                src="/pfp.png"
                alt="Chaitanya Prabuddha"
                width={356}
                height={401}
                sizes="(max-width: 760px) 120px, 170px"
                priority
              />
            </div>
            <figcaption>hi, I&rsquo;m Chaitanya</figcaption>
          </div>
        </figure>
      </div>
    </Section>
  );
}
