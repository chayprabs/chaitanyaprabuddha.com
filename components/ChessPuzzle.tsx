"use client";

import { useState } from "react";

type Piece = {
  id: string;
  kind: "K" | "Q" | "R" | "P";
  white: boolean;
  square: string;
};

// A back-rank mate in one: the rook on d1 goes to d8.
const START: Piece[] = [
  { id: "bk", kind: "K", white: false, square: "g8" },
  { id: "bp1", kind: "P", white: false, square: "f7" },
  { id: "bp2", kind: "P", white: false, square: "g7" },
  { id: "bp3", kind: "P", white: false, square: "h7" },
  { id: "bq", kind: "Q", white: false, square: "b2" },
  { id: "wr", kind: "R", white: true, square: "d1" },
  { id: "wk", kind: "K", white: true, square: "g1" },
  { id: "wp1", kind: "P", white: true, square: "f2" },
  { id: "wp2", kind: "P", white: true, square: "g2" },
  { id: "wp3", kind: "P", white: true, square: "h2" }
];

const SOLUTION = { piece: "wr", square: "d8" };

// The trailing U+FE0E keeps phones from swapping these for emoji.
const GLYPHS = { K: "♚︎", Q: "♛︎", R: "♜︎", P: "♟︎" };
const NAMES = { K: "king", Q: "queen", R: "rook", P: "pawn" };
const FILES = "abcdefgh";

const SQUARES = Array.from({ length: 64 }, (_, index) => {
  const file = index % 8;
  const rank = 8 - Math.floor(index / 8);

  return { name: `${FILES[file]}${rank}`, dark: (file + rank) % 2 === 1 };
});

function position(square: string) {
  return {
    left: `${FILES.indexOf(square[0]) * 12.5}%`,
    top: `${(8 - Number(square[1])) * 12.5}%`
  };
}

export default function ChessPuzzle() {
  const [pieces, setPieces] = useState(START);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "wrong" | "solved">("idle");
  const [shake, setShake] = useState(0);

  const pieceOn = (square: string) =>
    pieces.find((piece) => piece.square === square);

  const press = (square: string) => {
    if (status === "solved") {
      return;
    }

    const target = pieceOn(square);

    if (target?.white) {
      setSelected(target.id === selected ? null : target.id);
      setStatus("idle");
      return;
    }

    if (!selected) {
      return;
    }

    if (selected === SOLUTION.piece && square === SOLUTION.square) {
      setPieces((current) =>
        current.map((piece) =>
          piece.id === selected ? { ...piece, square } : piece
        )
      );
      setStatus("solved");
    } else {
      setStatus("wrong");
      setShake((count) => count + 1);
    }

    setSelected(null);
  };

  const reset = () => {
    setPieces(START);
    setSelected(null);
    setStatus("idle");
  };

  const selectedSquare = pieces.find((piece) => piece.id === selected)?.square;

  return (
    <div className="chess">
      <div
        key={shake}
        className="chess-board"
        data-status={status}
        role="group"
        aria-label="Chess puzzle: white to move, mate in one"
      >
        {SQUARES.map((square) => {
          const piece = pieceOn(square.name);

          return (
            <button
              key={square.name}
              type="button"
              className="chess-square"
              data-dark={square.dark ? "true" : undefined}
              data-selected={square.name === selectedSquare ? "true" : undefined}
              data-mated={
                status === "solved" && square.name === "g8" ? "true" : undefined
              }
              aria-label={`${square.name}${
                piece
                  ? `, ${piece.white ? "white" : "black"} ${NAMES[piece.kind]}`
                  : ""
              }`}
              aria-pressed={square.name === selectedSquare}
              onClick={() => press(square.name)}
            />
          );
        })}

        {pieces.map((piece) => (
          <span
            key={piece.id}
            className="chess-piece"
            data-white={piece.white ? "true" : undefined}
            style={position(piece.square)}
            aria-hidden="true"
          >
            {GLYPHS[piece.kind]}
          </span>
        ))}
      </div>

      <p className="chess-status" aria-live="polite">
        {status === "solved" ? (
          <>
            Checkmate.{" "}
            <button type="button" className="chess-reset" onClick={reset}>
              Reset
            </button>
          </>
        ) : status === "wrong" ? (
          "Not mate. Try again."
        ) : (
          "White to move. Mate in one."
        )}
      </p>
    </div>
  );
}
