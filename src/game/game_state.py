from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum, auto

from .board import Board, Move
from .player import Stone


class GamePhase(Enum):
    PLAYING = auto()
    FINISHED = auto()


@dataclass
class GameState:
    board: Board = field(default_factory=Board)
    current_player: Stone = Stone.BLACK
    phase: GamePhase = GamePhase.PLAYING
    winner: Stone | None = None
    winning_cells: list[tuple[int, int]] = field(default_factory=list)
    last_move: Move | None = None

    def reset(self) -> None:
        self.board.reset()
        self.current_player = Stone.BLACK
        self.phase = GamePhase.PLAYING
        self.winner = None
        self.winning_cells = []
        self.last_move = None

    def can_play(self) -> bool:
        return self.phase is GamePhase.PLAYING

    def play(self, row: int, col: int) -> bool:
        if not self.can_play():
            return False
        if not self.board.place(row, col, self.current_player):
            return False

        move = self.board.history[-1]
        self.last_move = move

        if self.board.check_win(row, col):
            self.phase = GamePhase.FINISHED
            self.winner = self.current_player
            self.winning_cells = self.board.winning_line(row, col) or []
            return True

        self.current_player = self.current_player.opponent
        return True

    def undo(self) -> bool:
        if not self.board.history or self.phase is GamePhase.FINISHED:
            return False

        undone = self.board.undo()
        if undone is None:
            return False

        self.current_player = undone.stone
        self.last_move = self.board.history[-1] if self.board.history else None
        return True

    def is_draw(self) -> bool:
        if self.phase is not GamePhase.PLAYING:
            return False
        return all(
            self.board.get(r, c) is not Stone.EMPTY
            for r in range(self.board.size)
            for c in range(self.board.size)
        )
