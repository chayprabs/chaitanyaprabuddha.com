import ChessBoard from "@/components/ChessBoard";
import Section from "@/components/Section";

const GROOVES = [58, 55.5, 53, 50.5, 47, 44.5, 42, 39.5, 36, 33.5, 31, 28.5];

export default function Now() {
  return (
    <Section id="beyondthecode" title="Beyond the code">
      <p className="aside-intro">When I&rsquo;m not building &mdash;</p>

      <div className="trio">
        <div className="trio-item">
          <div className="trio-object">
            <div className="record" aria-hidden="true">
              <div className="record-disc">
                <svg className="record-vinyl" viewBox="0 0 124 124">
                  <circle cx="62" cy="62" r="61.5" fill="#141311" />
                  <circle cx="62" cy="62" r="60" fill="#1d1b18" />
                  {GROOVES.map((radius) => (
                    <circle
                      key={radius}
                      cx="62"
                      cy="62"
                      r={radius}
                      fill="none"
                      stroke="#34312b"
                      strokeWidth="0.5"
                    />
                  ))}
                  {/* the smooth bands between tracks */}
                  <circle cx="62" cy="62" r="48.7" fill="none" stroke="#0e0d0b" strokeWidth="1.2" />
                  <circle cx="62" cy="62" r="37.7" fill="none" stroke="#0e0d0b" strokeWidth="1.2" />
                  <circle cx="62" cy="62" r="26" fill="#0e0d0b" />
                  {/* paper label */}
                  <circle cx="62" cy="62" r="21" fill="#e9dcc0" />
                  <path d="M41 62a21 21 0 0 1 42 0z" fill="#cc4f2e" />
                  <circle cx="62" cy="62" r="21" fill="none" stroke="#b9a98a" strokeWidth="0.6" />
                  <circle cx="62" cy="62" r="17.5" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="0.4" />
                  <rect x="50" y="49" width="24" height="1.6" rx="0.8" fill="#fff" fillOpacity="0.85" />
                  <rect x="54" y="52.6" width="16" height="1.1" rx="0.5" fill="#fff" fillOpacity="0.6" />
                  <rect x="49" y="69" width="26" height="1" rx="0.5" fill="#6d5f45" />
                  <rect x="52" y="72" width="20" height="1" rx="0.5" fill="#6d5f45" />
                  <rect x="55" y="75" width="14" height="1" rx="0.5" fill="#6d5f45" />
                  <circle cx="62" cy="62" r="2.6" fill="#141311" />
                  <circle cx="62" cy="62" r="2.6" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="0.4" />
                </svg>
              </div>

              <div className="record-sleeve">
                <svg viewBox="0 0 140 140">
                  <rect width="140" height="140" fill="#1f2a44" />
                  {/* setting sun cut by the horizon lines */}
                  <circle cx="70" cy="78" r="38" fill="#e9a23b" />
                  <circle cx="70" cy="78" r="38" fill="url(#sleeve-sun)" />
                  <g fill="#1f2a44">
                    <rect x="20" y="74" width="100" height="2" />
                    <rect x="20" y="82" width="100" height="3.2" />
                    <rect x="20" y="91" width="100" height="4.6" />
                    <rect x="20" y="101" width="100" height="6" />
                    <rect x="20" y="112" width="100" height="8" />
                  </g>
                  <rect x="6" y="6" width="128" height="128" fill="none" stroke="#f1e6cf" strokeOpacity="0.55" strokeWidth="0.7" />
                  <text x="12" y="19" className="sleeve-type">SIDE A</text>
                  <text x="128" y="19" textAnchor="end" className="sleeve-type">33&#8531; RPM</text>
                  <text x="70" y="127" textAnchor="middle" className="sleeve-type sleeve-type-small">
                    BEATLES &#183; DYLAN &#183; PETER CAT RECORDING CO.
                  </text>
                  <defs>
                    <linearGradient id="sleeve-sun" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#f3c65a" />
                      <stop offset="1" stopColor="#cc4f2e" />
                    </linearGradient>
                  </defs>
                </svg>
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
            <ChessBoard />
          </div>
          <h3>Chess</h3>
          <p>
            1600 on chess.com. Good enough to enjoy it, humble enough to lose
            interestingly. Play me sometime.
          </p>
        </div>

        <div className="trio-item">
          <div className="trio-object">
            <div className="book" aria-hidden="true">
              <div className="book-inner">
                <div className="book-back" />
                <div className="book-pages" />
                <div className="book-front">
                  <div className="book-frame">
                    <span className="book-title">Sapiens</span>
                    <span className="book-rule" />
                    <span className="book-subtitle">
                      A Brief History
                      <br />
                      of Humankind
                    </span>
                    <span className="book-author">Yuval Noah Harari</span>
                  </div>
                </div>
              </div>
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
