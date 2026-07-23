from enum import IntEnum


class Stone(IntEnum):
    EMPTY = 0
    BLACK = 1
    WHITE = 2

    @property
    def opponent(self) -> "Stone":
        if self is Stone.BLACK:
            return Stone.WHITE
        if self is Stone.WHITE:
            return Stone.BLACK
        raise ValueError("Empty cell has no opponent")

    @property
    def label(self) -> str:
        if self is Stone.BLACK:
            return "흑"
        if self is Stone.WHITE:
            return "백"
        return ""
