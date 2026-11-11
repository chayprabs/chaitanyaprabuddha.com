import RetiredSite from "@/components/RetiredSite";
import Section from "@/components/Section";

export default function BuiltInSchool() {
  return (
    <Section id="highschool" title="Built in high school">
      <article className="entry">
        <div className="entry-head">
          <h3 className="entry-title">Developernoon</h3>
          <span className="leader" aria-hidden="true" />
          <span className="entry-aside">
            <RetiredSite domain="developernoon.com" />
          </span>
        </div>

        <p className="entry-text">
          <i>15,000 monthly readers within four months, on writing alone.</i> A
          developer publication I built and ran. I wrote 100+ articles on web
          development, Python, and open source, and it reached a domain
          authority of 42.
        </p>
      </article>

      <article className="entry">
        <div className="entry-head">
          <h3 className="entry-title">Monial</h3>
          <span className="leader" aria-hidden="true" />
          <span className="entry-aside">
            Mar {"–"} Jun 2022 {"·"}{" "}
            <RetiredSite domain="trymonial.app" />
          </span>
        </div>

        <p className="entry-text">
          <i>My first paying customers: 18 of them, at $450+ a month.</i> A
          testimonial widget for founders. Paste one script tag and customer
          quotes show up on your site. I shut it down when JEE, India&rsquo;s
          engineering entrance exam, needed my full attention.
        </p>
      </article>

      <article className="entry">
        <h3 className="entry-title">Writing</h3>

        <p className="entry-text">
          <i>Front page of Hacker News at 16.</i> 80k+ readers on freeCodeCamp,
          and Author of the Week on both Hashnode and daily.dev.
        </p>
      </article>
    </Section>
  );
}
