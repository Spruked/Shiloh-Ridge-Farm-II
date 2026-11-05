import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import meat_calculator as mc
from butcher_compat_routes import router



def make_client():
    app = FastAPI()
    app.include_router(router, prefix="/api")
    return TestClient(app)


@pytest.mark.parametrize("meat", ["hog", "lamb"])
def test_cut_yields_sum_to_one(meat):
    assert sum(s for _, s, _ in mc.PROFILES[meat]["cuts"].values()) == pytest.approx(1.0)


@pytest.mark.parametrize("meat", ["hog", "lamb"])
def test_cuts_add_up_to_finished_weight(meat):
    e = mc.estimate(meat, "whole", 250)
    low = sum(p["estimated_lbs"][0] for p in e["primal_cuts"])
    high = sum(p["estimated_lbs"][1] for p in e["primal_cuts"])
    assert low == pytest.approx(e["finished_weight"][0], abs=0.6)
    assert high == pytest.approx(e["finished_weight"][1], abs=0.6)


def test_half_is_half_of_whole():
    whole = mc.estimate("hog", "whole", 280)
    half = mc.estimate("hog", "half", 280)
    assert half["hanging_weight"][1] == pytest.approx(whole["hanging_weight"][1] / 2, abs=0.2)
    assert half["finished_weight"][0] == pytest.approx(whole["finished_weight"][0] / 2, abs=0.2)


def test_weight_chain_is_ordered():
    e = mc.estimate("lamb", "whole", 120)
    assert e["finished_weight"][1] < e["hanging_weight"][1] < e["live_weight"]


def test_cost_formula_and_ordering():
    e = mc.estimate("hog", "whole", 275)
    low = e["hanging_weight"][0] * 3.75 + 375
    assert e["total_estimated_cost"][0] == pytest.approx(low, abs=0.5)
    assert e["total_estimated_cost"][0] < e["total_estimated_cost"][1]


def test_default_weight_used_when_blank():
    e = mc.estimate("lamb", "whole", None)
    assert e["weight_basis"] == "typical" and e["animal_live_weight"] == 120


def test_api_validation():
    c = make_client()
    ok = c.post("/api/butcher/calculate", json={"meat_type": "Hog", "order_type": "Half", "live_weight": 260})
    assert ok.status_code == 200 and ok.json()["estimate"]["order_type"] == "half"
    assert c.post("/api/butcher/calculate", json={"meat_type": "goat", "order_type": "whole"}).status_code == 400
    assert c.post("/api/butcher/calculate", json={"meat_type": "hog", "order_type": "third"}).status_code == 400
    assert c.post("/api/butcher/calculate", json={"meat_type": "hog", "order_type": "whole", "live_weight": -5}).status_code == 400
    assert c.post("/api/butcher/calculate", json={"meat_type": "hog", "order_type": "whole", "live_weight": 99999}).status_code == 400
    guide = c.get("/api/butcher/cuts/lamb").json()["cuts"]
    assert guide and {"primal", "name", "estimated_lbs", "price_per_lb"} <= set(guide[0])
