import asyncio
import os
import shutil
import sys
import tempfile
from datetime import timedelta

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient


os.environ.setdefault("JWT_SECRET", "test-jwt-secret")
sys.path.insert(0, os.path.abspath("backend"))

from butch_core import ButchSKG, MemoryNode, utc_now  # noqa: E402
from butch_routes import router as butch_router  # noqa: E402
from butch_voice import ButchVoiceSystem  # noqa: E402


@pytest.fixture
def temp_vault():
    tmpdir = tempfile.mkdtemp()
    try:
        yield tmpdir
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def make_memory(memory_id, days_old, access_count=0, emotional_valence=0.0, customer_id=None):
    timestamp = utc_now() - timedelta(days=days_old)
    return {
        "id": memory_id,
        "content": f"Memory {memory_id}",
        "memory_type": "conversation",
        "timestamp": timestamp,
        "last_accessed": timestamp,
        "access_count": access_count,
        "emotional_valence": emotional_valence,
        "customer_id": customer_id,
    }


class TestButchPersistence:
    def test_customer_memory_survives_restart(self, temp_vault):
        butch1 = ButchSKG(storage_path=temp_vault)
        customer_id = "test_customer_123"

        asyncio.run(
            butch1.process_interaction(
                customer_id=customer_id,
                message="Hi, I'm John Doe looking for lamb chops",
                context={"name": "John Doe", "email": "john@example.com"},
            )
        )

        butch2 = ButchSKG(storage_path=temp_vault)

        assert customer_id in butch2.customer_profiles
        profile = butch2.customer_profiles[customer_id]
        assert profile.name == "John Doe"
        assert "chops" in profile.preferred_cuts
        assert profile.interaction_count == 1

    def test_order_history_accumulation(self, temp_vault):
        butch = ButchSKG(storage_path=temp_vault)
        customer_id = "loyal_customer_456"

        for index in range(5):
            butch.record_order(
                customer_id,
                {
                    "customer_name": "Loyal Customer",
                    "customer_email": "loyal@example.com",
                    "total": 220.0 + (index * 20),
                    "items": [{"cut": "rib_chops", "qty": 2}],
                },
            )

        profile = butch.customer_profiles[customer_id]
        assert len(profile.order_history) == 5
        assert profile.loyalty_tier == "vip"


class TestSelfPruning:
    def test_low_value_memory_pruning(self, temp_vault):
        butch = ButchSKG(storage_path=temp_vault)

        for index in range(100):
            butch.episodic_memory.append(
                make_memory(
                    memory_id=f"mem_{index}",
                    days_old=index,
                    access_count=10 if index < 50 else 0,
                    emotional_valence=0.8 if index < 80 else 0.0,
                    customer_id=f"customer_{index % 10}",
                )
            )

        initial_count = len(butch.episodic_memory)
        asyncio.run(butch._self_prune())
        final_count = len(butch.episodic_memory)

        assert final_count < initial_count
        assert final_count <= int(initial_count * 0.85)
        assert final_count >= int(initial_count * 0.7)
        assert any(memory.access_count > 5 for memory in butch.episodic_memory)

    def test_important_memories_protected(self, temp_vault):
        butch = ButchSKG(storage_path=temp_vault)
        butch.episodic_memory.append(
            make_memory(
                memory_id="complaint_001",
                days_old=60,
                access_count=1,
                emotional_valence=-0.9,
                customer_id="angry_customer",
            )
        )

        for index in range(50):
            butch.episodic_memory.append(
                make_memory(
                    memory_id=f"neutral_{index}",
                    days_old=30,
                    access_count=0,
                    emotional_valence=0.0,
                )
            )

        asyncio.run(butch._self_prune())
        assert any(memory.id == "complaint_001" for memory in butch.episodic_memory)


class TestACPIntegration:
    def test_acp_adapts_to_sentiment(self, temp_vault):
        butch = ButchSKG(storage_path=temp_vault)
        profile = butch._get_or_create_profile("sentiment_customer", {"name": "Sad Customer"})
        profile.sentiment_history = [-0.8, -0.6, -0.7]

        acp = butch._get_acp_settings(profile)

        assert acp["frequency_response"]["low_boost"] > 1.0
        assert acp["dynamic_range"]["compression"] > 0.3

    def test_acp_adapts_to_familiarity(self, temp_vault):
        butch = ButchSKG(storage_path=temp_vault)

        new_profile = butch._get_or_create_profile("newbie", {"name": "New"})
        new_profile.interaction_count = 1
        new_acp = butch._get_acp_settings(new_profile)

        vip_profile = butch._get_or_create_profile("regular_joe", {"name": "Joe"})
        vip_profile.interaction_count = 50
        vip_acp = butch._get_acp_settings(vip_profile)

        assert vip_acp.get("voice_warmth", 0) > new_acp.get("voice_warmth", 0)


class TestSecurityAndVoiceFallbacks:
    def test_promo_requires_auth(self, temp_vault):
        butch = ButchSKG(storage_path=temp_vault)

        unauthorized = butch.add_promo_code(
            code="HACKER50",
            discount_percent=50,
            applicable_cuts=["all"],
            authorized_by="Random Person",
        )
        assert unauthorized is False

        authorized = butch.add_promo_code(
            code="DOMINIC10",
            discount_percent=10,
            applicable_cuts=["chops"],
            authorized_by="Dominic Hanway",
        )
        assert authorized is True

    def test_kokoro_unavailable_fallback(self):
        voice = ButchVoiceSystem()
        voice.has_kokoro = False

        result = asyncio.run(
            voice.synthesize(
                text="Hello from Butch",
                customer_id="test",
                acp_settings={"voice_speed": 1.0},
            )
        )

        assert result["use_browser_tts"] is True
        assert result["available"] is False
        assert result["backend_used"] is None

    def test_admin_endpoints_require_auth(self):
        app = FastAPI()
        app.include_router(butch_router)
        client = TestClient(app)

        promo_response = client.post(
            "/butch/admin/promo",
            json={
                "code": "HACK",
                "discount_percent": 99,
                "applicable_cuts": ["all"],
                "authorized_by": "Not Dominic",
            },
        )
        assert promo_response.status_code in {401, 403}

        customer_response = client.get("/butch/customer/some_id")
        assert customer_response.status_code in {401, 403}


class TestIntentRecognition:
    def test_pricing_intent_detection(self, temp_vault):
        butch = ButchSKG(storage_path=temp_vault)
        messages = [
            "How much are the chops?",
            "What's the price per pound?",
            "Is this expensive?",
            "Cost for whole lamb?",
        ]

        for message in messages:
            assert butch._classify_intent(message) == "pricing_inquiry"

    def test_entity_extraction(self, temp_vault):
        butch = ButchSKG(storage_path=temp_vault)
        entities = butch._extract_entities("I want rib chops and some ground lamb for burgers")

        assert "chops" in entities["cuts"]
        assert "ground" in entities["cuts"]
