"""New regression tests for general display descriptions outside the PDF catalogue."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'smarttalk_ai'))
from backend.general_knowledge import answer_general_product_type_question


def test_indoor_and_outdoor_display_descriptions_are_general_not_product_specs():
    indoor = answer_general_product_type_question('Tell me about indoor LED display')
    outdoor = answer_general_product_type_question('Explain outdoor LED display')
    assert indoor and 'Indoor LED Display' in indoor
    assert outdoor and 'Outdoor LED Display' in outdoor
    assert 'not confirmation' in indoor.lower()
    assert 'must be confirmed' in outdoor.lower()


def test_other_display_types_get_general_descriptions():
    answer = answer_general_product_type_question('Describe transparent LED display')
    assert answer and 'Transparent LED Display' in answer
    assert 'general industry information' in answer.lower()


def test_unknown_model_code_is_not_guessed():
    assert answer_general_product_type_question('Tell me about WZZ-999') is None


def test_chat_api_uses_general_description_when_pdf_has_no_matching_product_type():
    from backend.app import ChatRequest, chat

    result = chat(ChatRequest(question='Tell me about OLED display'))
    assert result['response_type'] == 'general_knowledge'
    assert 'OLED Display – General Description' in result['answer']
    assert 'not confirmation' in result['answer'].lower()
