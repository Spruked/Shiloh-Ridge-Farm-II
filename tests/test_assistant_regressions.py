import asyncio
import csv
import os
import subprocess
import sys
from pathlib import Path

os.environ.setdefault("JWT_SECRET", "test-jwt-secret")
sys.path.insert(0, os.path.abspath("backend"))

import butcher_compat_routes  # noqa: E402
import worker_chat_routes  # noqa: E402


FORBIDDEN_TERMS = [
    "cali",
    "substrate",
    "swarm",
    "mesh",
    "admin assistant",
    "private records",
    "system prompt",
]


def _run(coro):
    return asyncio.run(coro)


def _assert_no_forbidden_terms(text: str):
    lower = (text or "").lower()
    for term in FORBIDDEN_TERMS:
        assert term not in lower, f"Forbidden term leaked into response: {term}"


def _csv_row_count(csv_path: str) -> int:
    with open(csv_path, "r", encoding="utf-8") as handle:
        return len(list(csv.DictReader(handle)))


class _FakeCursor:
    def __init__(self, rows):
        self._rows = rows

    async def to_list(self, _limit):
        return self._rows


class _FakeProductCollection:
    def __init__(self):
        self.last_filter = None
        self.last_projection = None

    def find(self, filter_doc, projection_doc):
        self.last_filter = filter_doc
        self.last_projection = projection_doc
        category = filter_doc.get("category")
        if category == "hog":
            return _FakeCursor(
                [
                    {
                        "name": "Whole Hog Package",
                        "price_per_unit": 6.75,
                        "unit": "lb",
                        "estimated_lead_time": "2-3 weeks",
                    }
                ]
            )
        if category == "sheep":
            return _FakeCursor(
                [
                    {
                        "name": "Whole Lamb Package",
                        "price_per_unit": 9.25,
                        "unit": "lb",
                        "estimated_lead_time": "2 weeks",
                    }
                ]
            )
        return _FakeCursor([])


class _FakeDB:
    def __init__(self):
        self.products = _FakeProductCollection()


def test_shep_db_first_behavior_skips_csv(monkeypatch):
    calls = []

    async def fake_db_resolve(text: str):
        calls.append(("db", text))
        return "DB says yes: rams are currently listed."

    class SentinelAssistant:
        def ask(self, *args, **kwargs):
            raise AssertionError("CSV assistant should not be called when DB resolves.")

    monkeypatch.setattr(worker_chat_routes, "_db_resolve", fake_db_resolve)
    monkeypatch.setattr(worker_chat_routes, "_assistant", lambda: SentinelAssistant())

    request = worker_chat_routes.WorkerMessageRequest(
        message="do you have rams for sale",
        page_context="/livestock",
    )
    response = _run(worker_chat_routes.worker_message(request))

    assert response["status"] == "db_resolved"
    assert "DB says yes" in response["response"]
    assert calls == [("db", "do you have rams for sale")]


def test_shep_csv_fallback_location(monkeypatch):
    async def fake_db_resolve(_text: str):
        return None

    worker_chat_routes._ASSISTANT = None
    monkeypatch.setattr(worker_chat_routes, "_db_resolve", fake_db_resolve)

    request = worker_chat_routes.WorkerMessageRequest(
        message="where are you located",
        page_context="/about",
    )
    response = _run(worker_chat_routes.worker_message(request))

    assert response["status"] == "known"
    assert "20705 Quebec Road" in response["response"]
    assert "Maitland, Missouri 64466" in response["response"]


def test_shep_csv_fallback_katahdin(monkeypatch):
    async def fake_db_resolve(_text: str):
        return None

    worker_chat_routes._ASSISTANT = None
    monkeypatch.setattr(worker_chat_routes, "_db_resolve", fake_db_resolve)

    request = worker_chat_routes.WorkerMessageRequest(
        message="what are katahdin sheep",
        page_context="/katahdin",
    )
    response = _run(worker_chat_routes.worker_message(request))

    assert response["status"] == "known"
    assert "Katahdin sheep are a low-maintenance hair breed" in response["response"]


def test_butch_db_first_behavior_skips_csv(monkeypatch):
    calls = []

    async def fake_db_resolve_product(text: str):
        calls.append(("db", text))
        return "DB product listing resolved."

    class SentinelKnowledge:
        def match(self, *_args, **_kwargs):
            raise AssertionError("CSV knowledge should not be called when DB resolves.")

    monkeypatch.setattr(butcher_compat_routes, "_db_resolve_product", fake_db_resolve_product)
    monkeypatch.setattr(butcher_compat_routes, "_knowledge", lambda: SentinelKnowledge())

    queries = [
        "how much does a whole hog cost",
        "what lamb products do you sell",
    ]
    for query in queries:
        request = butcher_compat_routes.ButchChatRequest(message=query, page_context="/products")
        response = _run(butcher_compat_routes.butcher_chat(request))
        assert response["status"] == "db_resolved"
        assert "DB product listing resolved." in response["response"]

    assert calls == [("db", queries[0]), ("db", queries[1])]


def test_butch_real_db_resolver_handles_required_queries():
    fake_db = _FakeDB()
    butcher_compat_routes._db = fake_db

    hog_answer = _run(butcher_compat_routes._db_resolve_product("how much does a whole hog cost"))
    assert hog_answer and "Current hog products" in hog_answer

    lamb_answer = _run(butcher_compat_routes._db_resolve_product("what lamb products do you sell"))
    assert lamb_answer and "Current lamb products" in lamb_answer


def test_butch_csv_fallback_behavior(monkeypatch):
    async def fake_db_resolve_product(_text: str):
        return None

    butcher_compat_routes._KNOWLEDGE = None
    monkeypatch.setattr(butcher_compat_routes, "_db_resolve_product", fake_db_resolve_product)
    engine = butcher_compat_routes._knowledge()

    queries = [
        "how much freezer space for a half hog",
        "what is hanging weight",
        "what cuts come from a lamb",
    ]

    for query in queries:
        expected = engine.match(query)
        assert expected, f"Expected CSV match for query: {query}"

        request = butcher_compat_routes.ButchChatRequest(message=query, page_context="/products")
        response = _run(butcher_compat_routes.butcher_chat(request))

        assert response["status"] == "skg_matched"
        assert response["response"] == expected


def test_boundary_behavior_and_forbidden_terms(monkeypatch):
    # Butch boundary: livestock query must redirect to Shep/Livestock path.
    butch_request = butcher_compat_routes.ButchChatRequest(
        message="do you have rams for sale",
        page_context="/products",
    )
    butch_response = _run(butcher_compat_routes.butcher_chat(butch_request))
    assert butch_response["status"] == "livestock_redirect"
    assert "Shep" in butch_response["response"]
    assert "Livestock page" in butch_response["response"]

    # Shep boundary: butcher-cut question should route to Butch/Products guidance.
    async def fake_db_resolve(_text: str):
        return None

    worker_chat_routes._ASSISTANT = None
    monkeypatch.setattr(worker_chat_routes, "_db_resolve", fake_db_resolve)
    shep_request = worker_chat_routes.WorkerMessageRequest(
        message="what cuts come from a lamb",
        page_context="/products",
    )
    shep_response = _run(worker_chat_routes.worker_message(shep_request))
    assert shep_response["status"] == "known"
    assert "Butch" in shep_response["response"]
    assert "Products page" in shep_response["response"]

    _assert_no_forbidden_terms(butch_response["response"])
    _assert_no_forbidden_terms(shep_response["response"])


def test_knowledge_csv_row_counts_and_validators():
    shep_csv = "assets/shep_farm_knowledge.csv"
    butch_csv = "assets/butch_product_knowledge.csv"

    assert _csv_row_count(shep_csv) >= 100
    assert _csv_row_count(butch_csv) >= 100

    shep_validation = subprocess.run(
        [sys.executable, "assets/validate_shep_knowledge.py"],
        capture_output=True,
        text=True,
        check=False,
    )
    assert shep_validation.returncode == 0, shep_validation.stdout + shep_validation.stderr

    butch_validation = subprocess.run(
        [sys.executable, "assets/validate_butch_knowledge.py"],
        capture_output=True,
        text=True,
        check=False,
    )
    assert butch_validation.returncode == 0, butch_validation.stdout + butch_validation.stderr
