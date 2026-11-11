// The final position of Morphy's "Opera Game" (Paris, 1858), after
// 17. Rd8#. Drawn as a still board, with the last move tinted.
const POSITION: Record<string, string> = {
  b8: "bN", d8: "wR", e8: "bK", f8: "bB", h8: "bR",
  a7: "bP", f7: "bP", g7: "bP", h7: "bP",
  e6: "bQ",
  e5: "bP", g5: "wB",
  e4: "wP",
  a2: "wP", b2: "wP", c2: "wP", f2: "wP", g2: "wP", h2: "wP",
  c1: "wK"
};

const LAST_MOVE = ["d1", "d8"];
const FILES = "abcdefgh";

const NAMES: Record<string, string> = {
  K: "king",
  Q: "queen",
  R: "rook",
  B: "bishop",
  N: "knight",
  P: "pawn"
};

const SQUARES = Array.from({ length: 64 }, (_, index) => {
  const file = index % 8;
  const rank = 8 - Math.floor(index / 8);

  return {
    name: `${FILES[file]}${rank}`,
    file: FILES[file],
    rank,
    dark: (file + rank) % 2 === 1
  };
});

const description = `Chess board showing the final position of Morphy's Opera Game: ${Object.entries(
  POSITION
)
  .map(
    ([square, piece]) =>
      `${piece[0] === "w" ? "white" : "black"} ${NAMES[piece[1]]} on ${square}`
  )
  .join(", ")}.`;

export default function ChessBoard() {
  return (
    <div className="chess" role="img" aria-label={description}>
      <svg className="chess-defs" aria-hidden="true">
        <defs>
          <symbol id="piece-P" viewBox="0 0 40 40">
            <path d="M20 5.5a5 5 0 0 1 3.4 8.7c2 1.2 3 3 3 4.8h-2.8c.5 4.5 4.4 6.5 4.9 11H11.5c.5-4.5 4.4-6.5 4.9-11h-2.8c0-1.8 1-3.6 3-4.8A5 5 0 0 1 20 5.5z" />
            <rect x="9.5" y="30" width="21" height="4.5" rx="1.5" />
          </symbol>
          <symbol id="piece-R" viewBox="0 0 40 40">
            <path d="M10.5 6.5h4.5v3h3v-3h4v3h3v-3h4.5v7.5l-3.5 3v9l3.5 4H10.5l3.5-4v-9l-3.5-3z" />
            <path className="piece-line" d="M10.5 14h19M14 17h12M14 26h12" />
            <rect x="8.5" y="30" width="23" height="4.5" rx="1.5" />
          </symbol>
          <symbol id="piece-B" viewBox="0 0 40 40">
            <circle cx="20" cy="5.8" r="2.2" />
            <path d="M20 7.5c6 4.5 8 10 4.5 15h-9C12 17.5 14 12 20 7.5z" />
            <path className="piece-line" d="M20 11.5v6M17 14.5h6" />
            <path d="M15 22.5h10v2.5H15zM16 25c0 3-3.5 4-4.5 5h17c-1-1-4.5-2-4.5-5z" />
            <rect x="9.5" y="30" width="21" height="4.5" rx="1.5" />
          </symbol>
          <symbol id="piece-N" viewBox="0 0 40 40">
            <path d="M12 30c0-6 4.5-8 5.5-12-3 .8-5 3.2-7.5 2.2-1.8-.8-1.5-2.8-.5-4L15 9.5l.8-4.5 3.7 3.5c6.5.5 10.5 5.5 10.5 13.5 0 3.5-1 5.5-1 8z" />
            <circle className="piece-eye" cx="15.8" cy="13.2" r="1" />
            <path className="piece-line" d="M20.5 9.5c4 2 6 6 6 11" />
            <rect x="9.5" y="30" width="21" height="4.5" rx="1.5" />
          </symbol>
          <symbol id="piece-Q" viewBox="0 0 40 40">
            <circle cx="8.5" cy="10" r="2" />
            <circle cx="15" cy="7" r="2" />
            <circle cx="25" cy="7" r="2" />
            <circle cx="31.5" cy="10" r="2" />
            <circle cx="20" cy="6" r="2" />
            <path d="M8.8 11.5l4.2 13h14l4.2-13-5.2 7.5-1-10-5 9.5-5-9.5-1 10z" />
            <path d="M13 24.5h14l2 5.5H11z" />
            <path className="piece-line" d="M13 24.5h14" />
            <rect x="9" y="30" width="22" height="4.5" rx="1.5" />
          </symbol>
          <symbol id="piece-K" viewBox="0 0 40 40">
            <path d="M18.8 2.5h2.4v2.3h2.3v2.4h-2.3V10h-2.4V7.2h-2.3V4.8h2.3z" />
            <path d="M20 10.5c2.5-2.5 9-2 10 3 .8 4-1.5 7.5-3 11H13c-1.5-3.5-3.8-7-3-11 1-5 7.5-5.5 10-3z" />
            <path className="piece-line" d="M20 10.5v14" />
            <path d="M13 24.5h14l2 5.5H11z" />
            <path className="piece-line" d="M13 24.5h14" />
            <rect x="9" y="30" width="22" height="4.5" rx="1.5" />
          </symbol>
        </defs>
      </svg>

      <div className="chess-board">
        {SQUARES.map((square) => {
          const piece = POSITION[square.name];

          return (
            <div
              key={square.name}
              className="chess-square"
              data-dark={square.dark ? "true" : undefined}
              data-last={LAST_MOVE.includes(square.name) ? "true" : undefined}
            >
              {square.file === "a" ? (
                <span className="chess-rank">{square.rank}</span>
              ) : null}
              {square.rank === 1 ? (
                <span className="chess-file">{square.file}</span>
              ) : null}
              {piece ? (
                <svg
                  className="chess-piece"
                  data-white={piece[0] === "w" ? "true" : undefined}
                  viewBox="0 0 40 40"
                >
                  <use href={`#piece-${piece[1]}`} />
                </svg>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
