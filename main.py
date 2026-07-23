"""Omok (Gomoku) game - Stage 1: local 2-player play."""

from __future__ import annotations

import sys

import pygame

from src.game.game_state import GameState
from src.ui import constants as C
from src.ui.renderer import OmokRenderer


def main() -> None:
    pygame.init()
    pygame.display.set_caption("오목 - omok-game")
    screen = pygame.display.set_mode((C.WINDOW_WIDTH, C.WINDOW_HEIGHT))
    clock = pygame.time.Clock()

    state = GameState()
    renderer = OmokRenderer(screen)

    running = True
    while running:
        mouse_pos = pygame.mouse.get_pos()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_r:
                    state.reset()
                elif event.key == pygame.K_z and (event.mod & pygame.KMOD_CTRL):
                    state.undo()
                elif event.key == pygame.K_ESCAPE:
                    running = False
            elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                if renderer.restart_button.contains(mouse_pos):
                    state.reset()
                elif renderer.undo_button.contains(mouse_pos):
                    state.undo()
                elif state.can_play():
                    cell = renderer.pixel_to_board(mouse_pos)
                    if cell is not None:
                        state.play(*cell)

        renderer.draw(state, mouse_pos)
        pygame.display.flip()
        clock.tick(60)

    pygame.quit()
    sys.exit(0)


if __name__ == "__main__":
    main()
