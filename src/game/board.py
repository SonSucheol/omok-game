from __future__ import annotations

from dataclasses import dataclass

from .player import Stone

BOARD_SIZE = 15
WIN_LENGTH = 5

DIRECTIONS = (
    (1, 0),
    (0, 1),
    (1, 1),
    (1, -1),
)


@dataclass(frozen=True)
class Move:
    row: int
    col: int
    stone: Stone


class Board:
    def __init__(self, size: int = BOARD_SIZE) -> None:
        self.size = size
        self._grid: list[list[Stone]] = [
            [Stone.EMPTY for _ in range(size)] for _ in range(size)
        ]
        self._history: list[Move] = []

    @property
    def history(self) -> list[Move]:
        return list(self._history)

    def in_bounds(self, row: int, col: int) -> bool:
        return 0 <= row < self.size and 0 <= col < self.size

    def get(self, row: int, col: int) -> Stone:
        return self._grid[row][col]

    def is_empty(self, row: int, col: int) -> bool:
        return self.in_bounds(row, col) and self._grid[row][col] is Stone.EMPTY

    def place(self, row: int, col: int, stone: Stone) -> bool:
        if stone is Stone.EMPTY or not self.is_empty(row, col):
            return False
        self._grid[row][col] = stone
        self._history.append(Move(row=row, col=col, stone=stone))
        return True

    def undo(self) -> Move | None:
        if not self._history:
            return None
        move = self._history.pop()
        self._grid[move.row][move.col] = Stone.EMPTY
        return move

    def reset(self) -> None:
        self._grid = [
            [Stone.EMPTY for _ in range(self.size)] for _ in range(self.size)
        ]
        self._history.clear()

    def count_line(self, row: int, col: int, stone: Stone, dr: int, dc: int) -> int:
        count = 0
        r, c = row, col
        while self.in_bounds(r, c) and self._grid[r][c] is stone:
            count += 1
            r += dr
            c += dc
        return count

    def check_win(self, row: int, col: int) -> bool:
        stone = self._grid[row][col]
        if stone is Stone.EMPTY:
            return False

        for dr, dc in DIRECTIONS:
            line = (
                self.count_line(row, col, stone, dr, dc)
                + self.count_line(row, col, stone, -dr, -dc)
                - 1
            )
            if line >= WIN_LENGTH:
                return True
        return False

    def winning_line(self, row: int, col: int) -> list[tuple[int, int]] | None:
        stone = self._grid[row][col]
        if stone is Stone.EMPTY:
            return None

        for dr, dc in DIRECTIONS:
            cells: list[tuple[int, int]] = [(row, col)]
            r, c = row + dr, col + dc
            while self.in_bounds(r, c) and self._grid[r][c] is stone:
                cells.append((r, c))
                r += dr
                c += dc
            r, c = row - dr, col - dc
            while self.in_bounds(r, c) and self._grid[r][c] is stone:
                cells.insert(0, (r, c))
                r -= dr
                c -= dc
            if len(cells) >= WIN_LENGTH:
                return cells
        return None
