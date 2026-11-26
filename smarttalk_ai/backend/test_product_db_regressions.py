from backend import product_db as P


def test_p3_0_is_not_in_indoor_smd_small_pitch_series():
    r = P.answer("Show me the complete specifications of P3.0 Indoor SMD Small Pitch Series")

    assert r is not None
    assert r["response_type"] == "product_not_found_in_series"
    assert "P3.0" in r["answer"]
    assert "not listed" in r["answer"].lower()
    assert r["images"] == []


def test_comparison_does_not_return_only_p2_5():
    r = P.answer(
        "Compare P2.5 Indoor SMD Small Pitch Series with "
        "P3.0 Indoor SMD Small Pitch Series. Which is better for indoor use?"
    )

    assert r is not None
    assert r["response_type"] == "product_not_found_in_series"
    assert "P2.5" in r["answer"]
    assert "P3.0" in r["answer"]
    assert r["images"] == []


def test_wb_p3_0_remains_a_valid_separate_product():
    r = P.answer("Show me WB-P3.0 specifications")

    assert r is not None
    assert r["response_type"] == "product"
    assert "poster_wb:WB-P3.0" in r["matched"]
    assert r["images"]
