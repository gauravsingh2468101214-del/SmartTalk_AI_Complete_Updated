"""Regression checks for the isolated general LCD explainer."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'smarttalk_ai'))
from backend.general_knowledge import answer_general_display_question


def test_lcd_explanation_is_available_for_general_question():
    answer = answer_general_display_question('What is LCD?')
    assert answer and 'Liquid Crystal Display' in answer
    assert 'General Explanation' in answer
    assert 'not a specification' in answer


def test_unrelated_questions_are_not_intercepted():
    assert answer_general_display_question('Tell me about WM1.5') is None
    assert answer_general_display_question('What is pixel pitch?') is None
