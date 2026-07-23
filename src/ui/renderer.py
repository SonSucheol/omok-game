from __future__ import annotations

from dataclasses import dataclass

import pygame

from src.game.game_state import GamePhase, GameState
from src.game.player import Stone
from src.ui import constants as C


@dataclass
class Button:
    rect: pygame.Rect
    label: str
    enabled: bool = True

    def draw(self, surface: pygame.Surface, font: pygame.font.Font, hovered: bool) -> None:
        color = C.COLOR_BUTTON_HOVER if hovered and self.enabled else C.COLOR_BUTTON
        if not self.enabled:
            color = (90, 96, 108)
        pygame.draw.rect(surface, color, self.rect, border_radius=10)
        text = font.render(self.label, True, C.COLOR_TEXT)
        text_rect = text.get_rect(center=self.rect.center)
        surface.blit(text, text_rect)

    def contains(self, pos: tuple[int, int]) -> bool:
        return self.enabled and self.rect.collidepoint(pos)


class OmokRenderer:
    def __init__(self, screen: pygame.Surface) -> None:
        self.screen = screen
        self.title_font = self._load_font(34, bold=True)
        self.body_font = self._load_font(22)
        self.small_font = self._load_font(18)
        self.cell_size = self._compute_cell_size()
        self.board_rect = self._compute_board_rect()
        self.restart_button = Button(
            rect=pygame.Rect(
                C.WINDOW_WIDTH // 2 - 90,
                C.WINDOW_HEIGHT - C.FOOTER_HEIGHT + 14,
                180,
                44,
            ),
            label="새 게임",
        )
        self.undo_button = Button(
            rect=pygame.Rect(24, C.WINDOW_HEIGHT - C.FOOTER_HEIGHT + 14, 120, 44),
            label="무르기",
        )

    @staticmethod
    def _load_font(size: int, bold: bool = False) -> pygame.font.Font:
        for name in (C.FONT_NAME, "gulim", "dotum", "arial"):
            path = pygame.font.match_font(name, bold=bold)
            if path:
                return pygame.font.Font(path, size)
        return pygame.font.SysFont(None, size, bold=bold)

    def _compute_cell_size(self) -> int:
        usable = min(C.WINDOW_WIDTH, C.WINDOW_HEIGHT - C.HEADER_HEIGHT - C.FOOTER_HEIGHT)
        usable -= C.MARGIN * 2
        return usable // (C.BOARD_SIZE - 1)

    def _compute_board_rect(self) -> pygame.Rect:
        board_px = self.cell_size * (C.BOARD_SIZE - 1)
        x = (C.WINDOW_WIDTH - board_px) // 2
        y = C.HEADER_HEIGHT + (C.WINDOW_HEIGHT - C.HEADER_HEIGHT - C.FOOTER_HEIGHT - board_px) // 2
        return pygame.Rect(x, y, board_px, board_px)

    def board_to_pixel(self, row: int, col: int) -> tuple[int, int]:
        x = self.board_rect.left + col * self.cell_size
        y = self.board_rect.top + row * self.cell_size
        return x, y

    def pixel_to_board(self, pos: tuple[int, int]) -> tuple[int, int] | None:
        if not self.board_rect.collidepoint(pos):
            return None
        col = round((pos[0] - self.board_rect.left) / self.cell_size)
        row = round((pos[1] - self.board_rect.top) / self.cell_size)
        if 0 <= row < C.BOARD_SIZE and 0 <= col < C.BOARD_SIZE:
            return row, col
        return None

    def draw(self, state: GameState, mouse_pos: tuple[int, int]) -> None:
        self.screen.fill(C.COLOR_BG)
        self._draw_header(state)
        self._draw_board(state)
        self._draw_footer(state, mouse_pos)

    def _draw_header(self, state: GameState) -> None:
        header = pygame.Rect(0, 0, C.WINDOW_WIDTH, C.HEADER_HEIGHT)
        pygame.draw.rect(self.screen, C.COLOR_PANEL, header)

        title = self.title_font.render("오목", True, C.COLOR_TEXT)
        self.screen.blit(title, (28, 18))

        subtitle = self.small_font.render("1단계 · 로컬 2인 대전", True, C.COLOR_TEXT_DIM)
        self.screen.blit(subtitle, (28, 54))

        status = self._status_text(state)
        status_surface = self.body_font.render(status, True, C.COLOR_TEXT)
        status_rect = status_surface.get_rect(topright=(C.WINDOW_WIDTH - 28, 30))
        self.screen.blit(status_surface, status_rect)

    def _status_text(self, state: GameState) -> str:
        if state.phase is GamePhase.FINISHED and state.winner:
            return f"{state.winner.label} 승리!"
        if state.is_draw():
            return "무승부"
        return f"{state.current_player.label} 차례"

    def _draw_board(self, state: GameState) -> None:
        padding = self.cell_size // 2
        outer = self.board_rect.inflate(padding * 2, padding * 2)
        pygame.draw.rect(self.screen, C.COLOR_BOARD_DARK, outer, border_radius=12)
        pygame.draw.rect(self.screen, C.COLOR_BOARD, outer.inflate(-6, -6), border_radius=10)

        for i in range(C.BOARD_SIZE):
            start = self.board_to_pixel(i, 0)
            end = self.board_to_pixel(i, C.BOARD_SIZE - 1)
            pygame.draw.line(self.screen, C.COLOR_LINE, start, end, 1)
            start = self.board_to_pixel(0, i)
            end = self.board_to_pixel(C.BOARD_SIZE - 1, i)
            pygame.draw.line(self.screen, C.COLOR_LINE, start, end, 1)

        for row, col in C.STAR_POINTS:
            x, y = self.board_to_pixel(row, col)
            pygame.draw.circle(self.screen, C.COLOR_STAR, (x, y), 5)

        winning = set(state.winning_cells)
        for row in range(C.BOARD_SIZE):
            for col in range(C.BOARD_SIZE):
                stone = state.board.get(row, col)
                if stone is Stone.EMPTY:
                    continue
                highlight = (row, col) in winning
                last = (
                    state.last_move is not None
                    and state.last_move.row == row
                    and state.last_move.col == col
                )
                self._draw_stone(row, col, stone, highlight=highlight, last_move=last)

    def _draw_stone(
        self,
        row: int,
        col: int,
        stone: Stone,
        *,
        highlight: bool,
        last_move: bool,
    ) -> None:
        x, y = self.board_to_pixel(row, col)
        radius = max(10, int(self.cell_size * 0.42))
        if highlight:
            pygame.draw.circle(self.screen, C.COLOR_WIN, (x, y), radius + 4, 3)
        if last_move and not highlight:
            pygame.draw.circle(self.screen, C.COLOR_LAST_MOVE, (x, y), radius + 3, 2)

        if stone is Stone.BLACK:
            pygame.draw.circle(self.screen, C.COLOR_BLACK, (x, y), radius)
            pygame.draw.circle(self.screen, (70, 70, 78), (x - radius // 3, y - radius // 3), radius // 4)
        else:
            pygame.draw.circle(self.screen, C.COLOR_WHITE_EDGE, (x, y), radius + 1)
            pygame.draw.circle(self.screen, C.COLOR_WHITE, (x, y), radius)
            pygame.draw.circle(self.screen, (220, 220, 228), (x - radius // 3, y - radius // 3), radius // 5)

    def _draw_footer(self, state: GameState, mouse_pos: tuple[int, int]) -> None:
        footer = pygame.Rect(0, C.WINDOW_HEIGHT - C.FOOTER_HEIGHT, C.WINDOW_WIDTH, C.FOOTER_HEIGHT)
        pygame.draw.rect(self.screen, C.COLOR_PANEL, footer)

        self.undo_button.enabled = state.can_play() and bool(state.board.history)
        self.restart_button.draw(
            self.screen,
            self.body_font,
            self.restart_button.contains(mouse_pos),
        )
        self.undo_button.draw(
            self.screen,
            self.body_font,
            self.undo_button.contains(mouse_pos),
        )

        hint = "돌을 놓으려면 바둑판을 클릭하세요"
        if state.phase is GamePhase.FINISHED:
            hint = "새 게임 버튼으로 다시 시작할 수 있습니다"
        hint_surface = self.small_font.render(hint, True, C.COLOR_TEXT_DIM)
        hint_rect = hint_surface.get_rect(midright=(C.WINDOW_WIDTH - 24, C.WINDOW_HEIGHT - 36))
        self.screen.blit(hint_surface, hint_rect)
