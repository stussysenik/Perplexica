import React from 'react'

const CHESS_PIECES = [
  { "id": "white_king_e1", "color": "white", "type": "king", "symbol": "♔", "position": "e1" },
  { "id": "white_queen_d1", "color": "white", "type": "queen", "symbol": "♕", "position": "d1" },
  { "id": "white_rook_a1", "color": "white", "type": "rook", "symbol": "♖", "position": "a1" },
  { "id": "white_rook_h1", "color": "white", "type": "rook", "symbol": "♖", "position": "h1" },
  { "id": "white_bishop_c1", "color": "white", "type": "bishop", "symbol": "♗", "position": "c1" },
  { "id": "white_bishop_f1", "color": "white", "type": "bishop", "symbol": "♗", "position": "f1" },
  { "id": "white_knight_b1", "color": "white", "type": "knight", "symbol": "♘", "position": "b1" },
  { "id": "white_knight_g1", "color": "white", "type": "knight", "symbol": "♼", "position": "g1" },
  { "id": "white_pawn_a2", "color": "white", "type": "pawn", "symbol": "♙", "position": "a2" },
  { "id": "white_pawn_b2", "color": "white", "type": "pawn", "symbol": "♙", "position": "b2" },
  { "id": "white_pawn_c2", "color": "white", "type": "pawn", "symbol": "♙", "position": "c2" },
  { "id": "white_pawn_d2", "color": "white", "type": "pawn", "symbol": "♙", "position": "d2" },
  { "id": "white_pawn_e2", "color": "white", "type": "pawn", "symbol": "♙", "position": "e2" },
  { "id": "white_pawn_f2", "color": "white", "type": "pawn", "symbol": "♙", "position": "f2" },
  { "id": "white_pawn_g2", "color": "white", "type": "pawn", "symbol": "♙", "position": "g2" },
  { "id": "white_pawn_h2", "color": "white", "type": "pawn", "symbol": "♙", "position": "h2" },
  { "id": "black_king_e8", "color": "black", "type": "king", "symbol": "♚", "position": "e8" },
  { "id": "black_queen_d8", "color": "black", "type": "queen", "symbol": "♛", "position": "d8" },
  { "id": "black_rook_a8", "color": "black", "type": "rook", "symbol": "♜", "position": "a8" },
  { "id": "black_rook_h8", "color": "black", "type": "rook", "symbol": "♜", "position": "h8" },
  { "id": "black_bishop_c8", "color": "black", "type": "bishop", "symbol": "♝", "position": "c8" },
  { "id": "black_bishop_f8", "color": "black", "type": "bishop", "symbol": "♝", "position": "f8" },
  { "id": "black_knight_b8", "color": "black", "type": "knight", "symbol": "♞", "position": "b8" },
  { "id": "black_knight_g8", "color": "black", "type": "knight", "symbol": "♞", "position": "g8" },
  { "id": "black_pawn_a7", "color": "black", "type": "pawn", "symbol": "♟", "position": "a7" },
  { "id": "black_pawn_b7", "color": "black", "type": "pawn", "symbol": "♟", "position": "b7" },
  { "id": "black_pawn_c7", "color": "black", "type": "pawn", "symbol": "♟", "position": "c7" },
  { "id": "black_pawn_d7", "color": "black", "type": "pawn", "symbol": "♟", "position": "d7" },
  { "id": "black_pawn_e7", "color": "black", "type": "pawn", "symbol": "♟", "position": "e7" },
  { "id": "black_pawn_f7", "color": "black", "type": "pawn", "symbol": "♟", "position": "f7" },
  { "id": "black_pawn_g7", "color": "black", "type": "pawn", "symbol": "♟", "position": "g7" },
  { "id": "black_pawn_h7", "color": "black", "type": "pawn", "symbol": "♟", "position": "h7" }
]

const ChessPiece = ({ symbol, color }: { symbol: string, color: string }) => (
  <span className={`text-4xl select-none cursor-default ${color === 'white' ? 'text-slate-100 drop-shadow-sm' : 'text-slate-900'}`}>
    {symbol}
  </span>
)

export const ChessBoard = () => {
  const rows = ['8', '7', '6', '5', '4', '3', '2', '1']
  const cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

  const getPieceAt = (pos: string) => CHESS_PIECES.find(p => p.position === pos)

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-fit mx-auto my-12">
      <h2 className="text-2xl font-bold mb-6 font-display text-slate-800 dark:text-slate-100 tracking-tight">
        A Set of Chess Pieces
      </h2>
      <div className="grid grid-cols-8 border-4 border-slate-800 rounded-sm overflow-hidden shadow-2xl">
        {rows.map((row, rIdx) => (
          cols.map((col, cIdx) => {
            const isDark = (rIdx + cIdx) % 2 === 1
            const pos = `${col}${row}`
            const piece = getPieceAt(pos)

            return (
              <div
                key={pos}
                className={`w-14 h-14 flex items-center justify-center transition-colors duration-200
                  ${isDark ? 'bg-slate-600' : 'bg-slate-300'}
                  hover:bg-indigo-400/40
                `}
                title={pos}
              >
                {piece && <ChessPiece symbol={piece.symbol} color={piece.color} />}
              </div>
            )
          })
        ))}
      </div>
      <div className="mt-6 flex gap-4 text-xs font-medium text-slate-500 uppercase tracking-widest">
        <span>White: ♔ ♕ ♖ ♗ ♘ ♙</span>
        <span className="text-slate-300">|</span>
        <span>Black: ♚ ♛ ♜ ♝ ♞ ♟</span>
      </div>
    </div>
  )
}

export default ChessBoard
