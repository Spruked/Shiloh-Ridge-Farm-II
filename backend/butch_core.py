import csv
import hashlib
import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def parse_dt(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return utc_now()
    return utc_now()


@dataclass
class CustomerProfile:
    id: str
    name: str
    email: str
    phone: str
    address: str
    preferred_cuts: List[str] = field(default_factory=list)
    order_history: List[Dict[str, Any]] = field(default_factory=list)
    last_visit: datetime = field(default_factory=utc_now)
    interaction_count: int = 0
    voice_preference: Dict[str, Any] = field(default_factory=dict)
    sentiment_history: List[float] = field(default_factory=list)
    loyalty_tier: str = "new"


@dataclass
class MemoryNode:
    id: str
    content: str
    memory_type: str
    timestamp: datetime
    access_count: int
    last_accessed: datetime
    emotional_valence: float
    customer_id: Optional[str] = None
    confidence: float = 1.0


class ButchSKG:
    """
    Preserved self-pruning, self-improving butcher assistant SKG.
    """

    def __init__(self, storage_path: str = "./butch_vault"):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)

        self.episodic_memory: List[MemoryNode] = []
        self.semantic_memory: Dict[str, Any] = {}
        self.customer_profiles: Dict[str, CustomerProfile] = {}
        self.procedural_memory: Dict[str, Any] = {}

        self.owner_config = {
            "name": "Dominic Hanway",
            "farm_name": "Shiloh Ridge Farm",
            "authorized_discounts": [],
            "current_promos": {}
        }

        self.pruning_threshold = 0.1
        self.consolidation_interval = 24
        self.last_pruning = utc_now()
        self.acp_profiles = {}
        self.knowledge_base: List[Dict[str, Any]] = []

        self._load_knowledge_base()
        self._load_state()

    def _load_knowledge_base(self):
        """Load butch_product_knowledge.csv so every row's triggers are checked first."""
        csv_path = Path(__file__).parent.parent / "assets" / "butch_product_knowledge.csv"
        if not csv_path.exists():
            return
        with open(csv_path, "r", encoding="utf-8") as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                triggers = [t.strip().lower() for t in row.get("triggers", "").split("|") if t.strip()]
                suggestions = [s.strip() for s in row.get("suggestions", "").split("|") if s.strip()]
                self.knowledge_base.append({
                    "key": row.get("key", ""),
                    "triggers": triggers,
                    "response": row.get("response", ""),
                    "suggestions": suggestions,
                })

    def _lookup_knowledge_base(self, message: str) -> Optional[Dict[str, Any]]:
        """Return the first KB entry whose trigger phrase appears in message, else None."""
        msg_lower = (message or "").lower()
        for entry in self.knowledge_base:
            if any(trigger in msg_lower for trigger in entry["triggers"]):
                return entry
        return None

    def _coerce_memory_node(self, memory: Any) -> MemoryNode:
        if isinstance(memory, MemoryNode):
            return memory

        if isinstance(memory, dict):
            return MemoryNode(
                id=memory.get("id", hashlib.md5(str(memory).encode()).hexdigest()),
                content=memory.get("content", ""),
                memory_type=memory.get("memory_type", "conversation"),
                timestamp=parse_dt(memory.get("timestamp")),
                access_count=int(memory.get("access_count", 0)),
                last_accessed=parse_dt(memory.get("last_accessed") or memory.get("timestamp")),
                emotional_valence=float(memory.get("emotional_valence", 0.0)),
                customer_id=memory.get("customer_id"),
                confidence=float(memory.get("confidence", 1.0)),
            )

        raise TypeError("Unsupported memory format")

    def _serialize_customer(self, profile: CustomerProfile) -> Dict[str, Any]:
        data = asdict(profile)
        data["last_visit"] = profile.last_visit.isoformat()
        return data

    def _serialize_memory(self, memory: MemoryNode) -> Dict[str, Any]:
        data = asdict(memory)
        data["timestamp"] = memory.timestamp.isoformat()
        data["last_accessed"] = memory.last_accessed.isoformat()
        return data

    def _load_state(self):
        memory_file = self.storage_path / "butch_memory.jsonl"
        if memory_file.exists():
            with open(memory_file, "r", encoding="utf-8") as handle:
                for line in handle:
                    try:
                        data = json.loads(line)
                        data["timestamp"] = parse_dt(data.get("timestamp"))
                        data["last_accessed"] = parse_dt(data.get("last_accessed"))
                        self.episodic_memory.append(MemoryNode(**data))
                    except Exception:
                        continue

        customer_file = self.storage_path / "customers.json"
        if customer_file.exists():
            with open(customer_file, "r", encoding="utf-8") as handle:
                data = json.load(handle)
                for customer_id, profile in data.items():
                    profile["last_visit"] = parse_dt(profile.get("last_visit"))
                    self.customer_profiles[customer_id] = CustomerProfile(**profile)

        config_file = self.storage_path / "owner_config.json"
        if config_file.exists():
            with open(config_file, "r", encoding="utf-8") as handle:
                self.owner_config = json.load(handle)

        stats_file = self.storage_path / "butch_stats.json"
        if stats_file.exists():
            try:
                with open(stats_file, "r", encoding="utf-8") as handle:
                    data = json.load(handle)
                    self.last_pruning = parse_dt(data.get("last_pruning"))
            except Exception:
                self.last_pruning = utc_now()

    def _save_state(self):
        memory_file = self.storage_path / "butch_memory.jsonl"
        with open(memory_file, "w", encoding="utf-8") as handle:
            for memory in self.episodic_memory:
                handle.write(json.dumps(self._serialize_memory(self._coerce_memory_node(memory))) + "\n")

        customer_file = self.storage_path / "customers.json"
        with open(customer_file, "w", encoding="utf-8") as handle:
            serializable = {
                customer_id: self._serialize_customer(profile)
                for customer_id, profile in self.customer_profiles.items()
            }
            json.dump(serializable, handle, indent=2)

        with open(self.storage_path / "owner_config.json", "w", encoding="utf-8") as handle:
            json.dump(self.owner_config, handle, indent=2)

        with open(self.storage_path / "butch_stats.json", "w", encoding="utf-8") as handle:
            json.dump({"last_pruning": self.last_pruning.isoformat()}, handle, indent=2)

    async def process_interaction(self, customer_id: str, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        profile = self._get_or_create_profile(customer_id, context)
        intent = self._classify_intent(message)
        entities = self._extract_entities(message)
        self._update_profile_from_interaction(profile, message, entities)
        kb_match = self._lookup_knowledge_base(message)
        if kb_match:
            response_text = kb_match["response"]
            kb_suggestions = kb_match["suggestions"]
        else:
            response_text = self._generate_response(intent, entities, profile, context, message)
            kb_suggestions = None
        valence = self._calculate_sentiment(message)

        memory_node = MemoryNode(
            id=hashlib.md5(f"{customer_id}{utc_now().isoformat()}".encode()).hexdigest(),
            content=f"Customer: {message} | Butch: {response_text}",
            memory_type="conversation",
            timestamp=utc_now(),
            access_count=1,
            last_accessed=utc_now(),
            emotional_valence=valence,
            customer_id=customer_id
        )
        self.episodic_memory.append(memory_node)

        acp_settings = self._get_acp_settings(profile)

        if utc_now() - self.last_pruning > timedelta(hours=self.consolidation_interval):
            await self._self_prune()

        self._save_state()

        return {
            "text": response_text,
            "customer_name": profile.name,
            "loyalty_tier": profile.loyalty_tier,
            "acp_settings": acp_settings,
            "aacp_settings": acp_settings,
            "voice_profile": "butch_friendly",
            "suggested_cuts": kb_suggestions if kb_suggestions is not None else self._suggest_cuts(profile),
            "available_discounts": self._get_available_discounts(profile)
        }

    def _get_or_create_profile(self, customer_id: str, context: Dict[str, Any]) -> CustomerProfile:
        if customer_id in self.customer_profiles:
            profile = self.customer_profiles[customer_id]
            profile.last_visit = utc_now()
            profile.interaction_count += 1
            if context.get("name"):
                profile.name = context["name"]
            if context.get("email"):
                profile.email = context["email"]
            if context.get("phone"):
                profile.phone = context["phone"]
            if context.get("address"):
                profile.address = context["address"]
            return profile

        profile = CustomerProfile(
            id=customer_id,
            name=context.get("name", "Friend"),
            email=context.get("email", ""),
            phone=context.get("phone", ""),
            address=context.get("address", ""),
            interaction_count=1,
            voice_preference={"speed": 1.0, "pitch": 1.0, "warmth": 0.8}
        )
        self.customer_profiles[customer_id] = profile
        return profile

    def _classify_intent(self, message: str) -> str:
        msg_lower = (message or "").lower()
        if any(word in msg_lower for word in ["price", "cost", "how much", "expensive", "per pound", "/lb", "lb?", "pricing", "charge", "rate", "dollar"]):
            return "pricing_inquiry"

        order_status_phrases = [
            "order status",
            "status of my order",
            "where is my order",
            "is my order ready",
            "when is pickup",
            "ready for pickup",
            "pickup time",
        ]
        if any(phrase in msg_lower for phrase in order_status_phrases):
            return "order_status"

        mentions_order = any(word in msg_lower for word in ["order", "pickup", "processing", "invoice"])
        status_words = ["status", "ready", "delayed", "eta", "arrive", "scheduled", "confirm", "when"]
        if mentions_order and any(word in msg_lower for word in status_words):
            return "order_status"

        if any(word in msg_lower for word in ["cook", "recipe", "how to", "grill", "roast", "bake", "braise", "slow cook", "smoke", "bbq", "temperature", "prepare", "prep"]):
            return "cooking_advice"

        if any(word in msg_lower for word in [
            "recommend", "suggest", "what cut", "best for", "freezer", "whole", "half",
            "how many pounds", "tell me more", "tell me about", "more about", "what is",
            "what are", "explain", "describe", "chop", "ground", "rack", "loin", "shoulder",
            "roast", "rib", "shank", "stew", "sausage", "bacon", "ham", "lamb", "hog", "pork",
            "yield", "take home", "pounds", "lbs", "estimate", "calculator", "planning"
        ]):
            return "recommendation"

        if any(word in msg_lower for word in ["dominic", "owner", "farm", "shiloh", "maitland", "missouri", "raised", "pasture", "operation"]):
            return "farm_info"
        return "general_chat"

    def _extract_entities(self, message: str) -> Dict[str, Any]:
        entities = {"cuts": [], "quantities": [], "preferences": []}
        cuts_map = {
            "chops": ["chops", "rib chop", "loin chop"],
            "ground": ["ground", "burger", "meatball"],
            "stew": ["stew", "stew meat", "braise"],
            "whole": ["whole", "whole lamb", "whole hog"],
            "half": ["half", "half lamb", "half hog"],
            "rack": ["rack", "ribs"],
            "leg": ["leg", "leg of lamb"]
        }
        msg_lower = (message or "").lower()
        for cut_type, keywords in cuts_map.items():
            if any(keyword in msg_lower for keyword in keywords):
                entities["cuts"].append(cut_type)
        return entities

    def _generate_response(
        self,
        intent: str,
        entities: Dict[str, Any],
        profile: CustomerProfile,
        context: Dict[str, Any],
        message: str
    ) -> str:
        name = profile.name if profile.name != "Friend" else "there"
        greeting = f"Hey {name}!" if profile.interaction_count > 1 else "Well hey there, welcome to Shiloh Ridge!"
        msg_lower = (message or "").lower()

        if intent == "pricing_inquiry":
            cuts = entities.get("cuts", [])
            if cuts:
                return (
                    f"{greeting} You're looking at our {cuts[0]}? Dominic's got those at "
                    f"${self._get_price(cuts[0])}/lb today. If you're buying quantity, I can help you plan it."
                )
            return (
                f"{greeting} Our Katahdin lamb is running ${self._get_price('chops')}/lb for chops and "
                f"${self._get_price('ground')}/lb for ground. Whole and half lambs are usually the best value."
            )

        if intent == "recommendation":
            if any(keyword in msg_lower for keyword in ["grill", "smoker", "bbq"]):
                return (
                    f"{greeting} For grilling, you can't beat the rib chops. Dominic cuts them thick and they do great over direct heat."
                )
            if "freezer" in msg_lower or "whole" in msg_lower or "half" in msg_lower:
                return (
                    f"{greeting} If freezer planning is the goal, a half order is usually the sweet spot for most families. "
                    "Tell me your freezer size and how many people you feed, and I can map cuts and pounds for you."
                )
            if entities.get("cuts"):
                primary_cut = entities["cuts"][0]
                return (
                    f"{greeting} If you're leaning toward {primary_cut}, I can help you balance that with a few complementary cuts "
                    "so you don't end up with a freezer full of only one thing."
                )
            if profile.preferred_cuts:
                return (
                    f"{greeting} Based on your previous visits, I know you like {profile.preferred_cuts[0]}. "
                    "You might also enjoy a shoulder roast for slow cooking."
                )
            return (
                f"{greeting} If you're just getting started, I'd recommend the chops first. "
                "They show off the flavor of our pasture-raised Katahdin lamb really well."
            )

        if intent == "order_status":
            if profile.order_history:
                last_order = profile.order_history[-1]
                pickup = last_order.get("pickup_date", "once Dominic confirms processing")
                return (
                    f"{greeting} I found your most recent order. It should be ready {pickup}. "
                    "If you want, I can help you plan the next one too."
                )
            return (
                f"{greeting} I do not see an active order on file yet. "
                "If you want to place one, I can help you choose cuts or quantity first."
            )

        if intent == "cooking_advice":
            return (
                f"{greeting} Dominic would tell you not to overcook our lamb. "
                "Medium rare to medium is usually the sweet spot, and a simple marinade goes a long way."
            )

        if intent == "farm_info":
            return (
                f"{greeting} Dominic Hanway runs Shiloh Ridge Farm and raises pasture-based livestock with a real hands-on approach. "
                "That is a big part of why the meat quality stays consistent."
            )

        if profile.interaction_count > 3:
            last_cut = profile.preferred_cuts[-1] if profile.preferred_cuts else "our lamb"
            return (
                f"{greeting} Good to see you again. Last time you were asking about {last_cut}. "
                "How can I help you this round?"
            )

        return (
            f"{greeting} I'm Butch. I help Dominic with the meat side of things. "
            "Tell me whether you're looking for chops, ground, a whole order, pricing, or cooking advice."
        )

    def _get_price(self, cut_type: str) -> float:
        base_prices = {
            "chops": 12.00,
            "ground": 9.00,
            "stew": 8.00,
            "whole": 8.50,
            "half": 8.50,
            "rack": 14.00,
            "leg": 11.00
        }
        if cut_type in self.owner_config["current_promos"]:
            return self.owner_config["current_promos"][cut_type]
        return base_prices.get(cut_type, 10.00)

    def _suggest_cuts(self, profile: CustomerProfile) -> List[str]:
        suggestions: List[str] = []
        if not profile.preferred_cuts:
            suggestions = ["rib_chops", "ground_lamb", "stew_meat"]
        else:
            if "chops" in profile.preferred_cuts:
                suggestions.extend(["loin_chops", "rack_of_lamb"])
            if "ground" in profile.preferred_cuts:
                suggestions.extend(["stew_meat", "shoulder_roast"])
        return suggestions[:3]

    def _get_available_discounts(self, profile: CustomerProfile) -> List[Dict[str, Any]]:
        discounts: List[Dict[str, Any]] = []
        for promo in self.owner_config["authorized_discounts"]:
            if self._qualifies_for_promo(profile, promo):
                discounts.append(promo)

        if profile.interaction_count > 5:
            discounts.append({
                "code": "BUTCHFRIEND",
                "description": "Return customer appreciation",
                "discount_percent": 5
            })

        total_spent = sum(order.get("total", 0) for order in profile.order_history)
        if total_spent > 500:
            discounts.append({
                "code": "VIPLAMB",
                "description": "High-volume customer discount",
                "discount_percent": 10
            })
        return discounts

    def _qualifies_for_promo(self, profile: CustomerProfile, promo: Dict[str, Any]) -> bool:
        return True

    def _get_acp_settings(self, profile: CustomerProfile) -> Dict[str, Any]:
        base_settings = {
            "frequency_response": {
                "low_boost": 1.0,
                "mid_presence": 1.2,
                "high_clarity": 1.1
            },
            "dynamic_range": {
                "compression": 0.3,
                "expansion": 0.1
            },
            "temporal_adaptation": {
                "attack_ms": 10,
                "release_ms": 50
            },
            "voice_speed": profile.voice_preference.get("speed", 1.0)
        }

        if profile.sentiment_history:
            avg_sentiment = float(np.mean(profile.sentiment_history[-10:]))
            if avg_sentiment < 0.45:
                base_settings["frequency_response"]["low_boost"] = 1.2
                base_settings["dynamic_range"]["compression"] = 0.5
            elif avg_sentiment > 0.65:
                base_settings["frequency_response"]["high_clarity"] = 1.3

        base_settings["voice_warmth"] = 0.9 if profile.interaction_count > 10 else 0.6
        return base_settings

    def _get_aacp_settings(self, profile: CustomerProfile) -> Dict[str, Any]:
        """Backward-compatible alias for the old typo."""
        return self._get_acp_settings(profile)

    async def _self_prune(self):
        scored_memories = []
        now = utc_now()
        normalized_memories = [self._coerce_memory_node(memory) for memory in self.episodic_memory]
        for memory in normalized_memories:
            age_days = max((now - memory.timestamp).days, 0)
            recency_score = np.exp(-age_days / 30)
            access_score = np.log1p(memory.access_count) / 5
            emotional_score = abs(memory.emotional_valence)
            relevance = (recency_score * 0.4) + (access_score * 0.3) + (emotional_score * 0.3)
            scored_memories.append((memory, relevance))

        scored_memories.sort(key=lambda item: item[1], reverse=True)
        keep_count = max(1, int(len(scored_memories) * 0.8)) if scored_memories else 0
        self.episodic_memory = [memory for memory, _ in scored_memories[:keep_count]]
        await self._consolidate_memories()
        self.last_pruning = utc_now()

    async def _consolidate_memories(self):
        customer_patterns: Dict[str, List[MemoryNode]] = {}
        for memory in [self._coerce_memory_node(item) for item in self.episodic_memory]:
            if memory.customer_id and memory.memory_type == "conversation":
                customer_patterns.setdefault(memory.customer_id, []).append(memory)

        for customer_id, memories in customer_patterns.items():
            if len(memories) > 5:
                profile = self.customer_profiles.get(customer_id)
                if not profile:
                    continue
                months = [memory.timestamp.month for memory in memories]
                if len(set(months)) > 6:
                    profile.loyalty_tier = "vip"
                elif len(set(months)) > 2:
                    profile.loyalty_tier = "regular"

    def _update_profile_from_interaction(self, profile: CustomerProfile, message: str, entities: Dict[str, Any]):
        for cut in entities.get("cuts", []):
            if cut not in profile.preferred_cuts:
                profile.preferred_cuts.append(cut)

        sentiment = self._calculate_sentiment(message)
        profile.sentiment_history.append(sentiment)
        if len(profile.sentiment_history) > 50:
            profile.sentiment_history = profile.sentiment_history[-50:]

    def _calculate_sentiment(self, text: str) -> float:
        positive = ["great", "love", "perfect", "thanks", "good", "excellent", "delicious", "best"]
        negative = ["bad", "terrible", "hate", "awful", "problem", "issue", "wrong", "disappointed"]
        text_lower = (text or "").lower()
        pos_count = sum(1 for word in positive if word in text_lower)
        neg_count = sum(1 for word in negative if word in text_lower)
        if pos_count + neg_count == 0:
            return 0.5
        raw = (pos_count - neg_count) / (pos_count + neg_count)
        return (raw + 1) / 2

    def add_promo_code(
        self,
        code: str,
        discount_percent: float,
        applicable_cuts: List[str],
        authorized_by: str
    ) -> bool:
        if authorized_by != "Dominic Hanway":
            return False

        promo = {
            "code": code,
            "discount_percent": discount_percent,
            "cuts": applicable_cuts,
            "active": True,
            "created": utc_now().isoformat()
        }
        self.owner_config["authorized_discounts"].append(promo)
        self._save_state()
        return True

    def update_pricing(self, cut_type: str, new_price: float, authorized_by: str) -> bool:
        if authorized_by != "Dominic Hanway":
            return False
        self.owner_config["current_promos"][cut_type] = new_price
        self._save_state()
        return True

    def record_order(self, customer_id: str, order_details: Dict[str, Any]):
        context = {
            "name": order_details.get("customer_name") or order_details.get("name", "Friend"),
            "email": order_details.get("customer_email") or order_details.get("email", ""),
            "phone": order_details.get("customer_phone") or order_details.get("phone", ""),
            "address": order_details.get("customer_address") or order_details.get("address", "")
        }
        profile = self._get_or_create_profile(customer_id, context)
        order_record = dict(order_details)
        order_record["date"] = order_record.get("date", utc_now().isoformat())
        profile.order_history.append(order_record)
        total_spent = sum(order.get("total", 0) for order in profile.order_history)
        if total_spent > 1000:
            profile.loyalty_tier = "vip"
        elif total_spent > 300:
            profile.loyalty_tier = "regular"
        self._save_state()


butch_skg = ButchSKG()
