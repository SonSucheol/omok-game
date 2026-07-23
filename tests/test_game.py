from src.game.board import Board
from src.game.game_state import GamePhase, GameState
from src.game.player import Stone


def test_horizontal_win():
    board = Board()
    for col in range(5):
        board.place(7, col, Stone.BLACK)
    assert board.check_win(7, 4) is True


def test_cannot_place_on_occupied_cell():
    state = GameState()
    assert state.play(7, 7) is True
    assert state.play(7, 7) is False


def test_turn_alternates():
    state = GameState()
    state.play(0, 0)
    assert state.current_player is Stone.WHITE
    state.play(0, 1)
    assert state.current_player is Stone.BLACK


def test_win_sets_finished_phase():
    state = GameState()
    for col in range(4):
        state.play(7, col)
        state.play(6, col)
    state.play(7, 4)
    assert state.phase is GamePhase.FINISHED
    assert state.winner is Stone.BLACK
