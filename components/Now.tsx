import ChessPuzzle from "@/components/ChessPuzzle";
import Section from "@/components/Section";

export default function Now() {
  return (
    <Section id="beyondthecode" title="Beyond the code">
      <p className="aside-intro">When I&rsquo;m not building &mdash;</p>

      <div className="trio">
        <div className="trio-item">
          <div className="trio-object">
            <div className="record" aria-hidden="true">
              <div className="record-disc">
                <div className="record-grooves" />
              </div>
              <div className="record-sleeve">
                <span>2am</span>
                <small>side A</small>
              </div>
            </div>
          </div>
          <h3>Music</h3>
          <p>
            Beatles to Bob Dylan to Peter Cat Recording Co. at 2am. Rock, pop,
            anything with a soul in it.
          </p>
        </div>

        <div className="trio-item">
          <div className="trio-object">
            <ChessPuzzle />
          </div>
          <h3>Chess</h3>
          <p>
            1600 on chess.com. Good enough to enjoy it, humble enough to lose
            interestingly. Solve the board, then play me sometime.
          </p>
        </div>

        <div className="trio-item">
          <div className="trio-object">
            <div className="book" aria-hidden="true">
              <div className="book-pages" />
              <div className="book-cover">
                <span>Sapiens</span>
                <small>currently reading</small>
              </div>
              <div className="book-ribbon" />
            </div>
          </div>
          <h3>Books</h3>
          <p>
            Currently Sapiens. Usually biographies, and anything that reframes
            how I see things.
          </p>
        </div>
      </div>
    </Section>
  );
}
