"""
Butch the Butcher - SKG Core Brain
Super-Knowledge Graph for meat optimization and customer guidance
"""
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
import hashlib
import os
from butch_skg.pricing.regional_pricing import RegionalPricingEngine, Region as PricingRegion, AnimalType as PricingAnimalType

logger = logging.getLogger(__name__)

@dataclass
class CutRecommendation:
    cut_name: str
    weight_lbs: float
    estimated_count: int  # Approximate pieces
    cooking_methods: List[str]
    preservation: str  # fresh/frozen/smoked/cured
    optimal_use: str
    popularity_score: float  # 0.0 to 1.0
    alternative_cuts: List[str]
    reasoning: str

@dataclass
class LivestockConfig:
    animal_type: str  # hog, beef, lamb, etc.
    portion_size: str  # half, whole, quarter
    total_weight_live: float
    hanging_weight_estimate: float
    yield_percentage: float
    available_cuts: Dict[str, dict]

@dataclass
class CustomerPreference:
    customer_id: Optional[str]
    priority_cuts: List[str]  # Must-have items
    avoid_cuts: List[str]
    cooking_style: str  # grill, slow-cook, quick, diverse
    family_size: int
    freezer_space: str  # limited, moderate, abundant
    experience_level: str  # novice, intermediate, expert

class ButchBrain:
    """
    SKG-powered butchery optimization engine
    Learns from every interaction to improve recommendations
    """
    
    def __init__(self, data_dir: Path = None, region: PricingRegion = PricingRegion.KANSAS_CITY_METRO):
        self.data_dir = data_dir or Path(__file__).parent.parent.parent / "data"
        self.vault_dir = self.data_dir / "vault"
        self.vault_dir.mkdir(parents=True, exist_ok=True)
        
        # Load knowledge bases
        self.livestock_db = self._load_livestock_data()
        self.cut_rules = self._load_cut_rules()
        
        # Runtime memory (learned patterns)
        self.cut_relationships = {}  # Cut A -> often paired with Cut B
        self.customer_patterns = {}  # Customer type -> preferred cuts
        self.optimization_cache = {}
        
        # Load learned knowledge
        self._load_learned_knowledge()
        # Initialize pricing engine
        self.pricing = RegionalPricingEngine(region)
        
    def _load_livestock_data(self) -> Dict:
        """Load animal cut databases"""
        livestock = {}
        livestock_dir = self.data_dir / "livestock"
        
        for file in livestock_dir.glob("*.json"):
            with open(file) as f:
                data = json.load(f)
                livestock[data['animal_type']] = data
        return livestock
    
    def _load_cut_rules(self) -> Dict:
        """Load butchering rules and constraints"""
        rules_file = self.data_dir / "rules" / "cut_rules.json"
        if rules_file.exists():
            with open(rules_file) as f:
                return json.load(f)
        return {}
    
    def _load_learned_knowledge(self):
        """Load previously learned patterns from vault"""
        memory_file = self.vault_dir / "butch_memory.jsonl"
        if memory_file.exists():
            with open(memory_file) as f:
                for line in f:
                    if line.strip():
                        entry = json.loads(line)
                        self._integrate_memory(entry)
    
    def _integrate_memory(self, entry: dict):
        """Integrate learned observation into graph with safe data extraction"""
        # CRITICAL FIX: Data is nested under "data" key, not at root
        raw_data = entry.get("data", {})
        
        # Handle legacy entries that might not have "data" wrapper
        if isinstance(raw_data, dict) and raw_data:
            data = raw_data
        else:
            # Fallback for malformed entries
            logger.warning(f"Malformed memory entry: {entry.get('hash', 'unknown')}")
            return

        if entry.get('type') == 'cut_combination':
            cuts = data.get('cuts', [])
            if cuts and len(cuts) >= 2:
                combo = tuple(sorted(cuts))
                self.cut_relationships[combo] = self.cut_relationships.get(combo, 0) + 1
                logger.debug(f"Learned combination: {combo}")

        elif entry.get('type') == 'customer_pattern':
            profile = data.get('customer_profile')
            if profile:
                self.customer_patterns[profile] = data.get('preferred_cuts', [])
                logger.debug(f"Learned pattern for: {profile}")

        elif entry.get('type') == 'order_processed':
            # Extract implicit combinations from accepted orders
            cuts = data.get('recommended_cuts', [])
            if len(cuts) >= 2:
                # Record all pairwise combinations from this order
                for i, cut_a in enumerate(cuts):
                    for cut_b in cuts[i+1:]:
                        combo = tuple(sorted([cut_a, cut_b]))
                        self.cut_relationships[combo] = self.cut_relationships.get(combo, 0) + 0.5  # Lower weight for implicit

        elif entry.get('type') == 'feedback':
            # Learn from explicit acceptance/rejection
            accepted = data.get('accepted', [])
            rejected = data.get('rejected', [])
            
            # Boost accepted combinations
            if len(accepted) >= 2:
                combo = tuple(sorted(accepted))
                self.cut_relationships[combo] = self.cut_relationships.get(combo, 0) + 2.0  # Higher weight for explicit feedback
                
            # Mark rejected cuts for this customer profile
            if rejected:
                # Store negative preference (would need additional data structure for full implementation)
                pass
    
    def _record_observation(self, observation_type: str, data: dict):
        """Immutable append-only record with durability guarantees"""
        # Validate data before recording
        if not isinstance(data, dict):
            logger.error(f"Invalid data type for {observation_type}: {type(data)}")
            return

        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "type": observation_type,
            "data": data,  # NESTED structure - critical for _integrate_memory
            "hash": hashlib.sha256(
                json.dumps(data, sort_keys=True, default=str).encode()
            ).hexdigest()[:16]
        }

        # APPEND-ONLY JSONL with durability
        memory_file = self.vault_dir / "butch_memory.jsonl"

        try:
            # Open in append mode, create if doesn't exist
            with open(memory_file, "a", encoding='utf-8') as f:
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
                f.flush()           # Flush Python buffer to OS
                os.fsync(f.fileno())  # Force OS to write to disk

            logger.debug(f"Appended {observation_type} observation to vault")

        except Exception as e:
            logger.error(f"Failed to record observation: {e}")
            raise

        # Update runtime knowledge immediately
        self._integrate_memory(entry)
    
    def process_order(
        self,
        livestock_config: LivestockConfig,
        customer_prefs: CustomerPreference
    ) -> Tuple[List[CutRecommendation], str, List[str], Dict]:  # Added pricing dict
        """
        Main SKG reasoning: Generate optimal cut recommendations
        
        Returns:
            - List of CutRecommendation objects
            - Butch's explanation/narrative
            - Alternative suggestions
        """
        logger.info(f"Processing {livestock_config.portion_size} {livestock_config.animal_type}")
        
        # Step 1: Calculate available meat budget
        available_meat = livestock_config.hanging_weight_estimate * livestock_config.yield_percentage
        
        # Step 2: Apply customer constraints
        must_have = set(customer_prefs.priority_cuts)
        avoid = set(customer_prefs.avoid_cuts)
        
        # Step 3: Build optimization graph
        cut_graph = self._build_cut_graph(livestock_config, customer_prefs)
        
        # Step 4: Solve for optimal allocation
        recommendations = self._optimize_cuts(
            cut_graph=cut_graph,
            meat_budget=available_meat,
            must_have=must_have,
            avoid=avoid,
            cooking_style=customer_prefs.cooking_style,
            freezer_space=customer_prefs.freezer_space
        )
        
        # Step 5: Generate Butch's narrative
        narrative = self._generate_narrative(
            livestock_config, customer_prefs, recommendations
        )
        
        # Step 6: Generate alternatives
        alternatives = self._suggest_alternatives(recommendations, cut_graph)
        
        # Step 7: Record for learning
        self._record_observation("order_processed", {
            "animal": livestock_config.animal_type,
            "portion": livestock_config.portion_size,
            "customer_profile": self._profile_customer(customer_prefs),
            "recommended_cuts": [r.cut_name for r in recommendations],
            "total_weight": sum(r.weight_lbs for r in recommendations)
        })

        # Calculate pricing for recommendations (map animal string to PricingAnimalType)
        try:
            pricing_animal = PricingAnimalType(livestock_config.animal_type)
        except Exception:
            # fallback: try uppercase mapping
            pricing_animal = PricingAnimalType(livestock_config.animal_type.lower())

        pricing_breakdown = self.pricing.calculate_order_total(
            animal=pricing_animal,
            cuts=[{
                "name": r.cut_name,
                "weight": r.weight_lbs,
                "cured": r.preservation in ["cured_smoked", "smoked", "cured"],
                "smoked": r.preservation in ["cured_smoked", "smoked"],
            } for r in recommendations],
            portion_size=livestock_config.portion_size
        )

        # Include pricing in narrative
        narrative += (
            f"\n\nYour cuts total ${pricing_breakdown['subtotal_cuts']:.2f}, "
            f"plus ${pricing_breakdown['order_level_fees']['slaughter_fee']:.2f} for slaughter. "
            f"Grand total: ${pricing_breakdown['total_price']:.2f} "
            f"for {pricing_breakdown['total_weight_lbs']:.1f} lbs "
            f"(${pricing_breakdown['effective_per_lb']:.2f}/lb average)."
        )

        if pricing_breakdown['savings_vs_retail']['savings_percent'] > 15:
            narrative += (
                f" You're saving about {pricing_breakdown['savings_vs_retail']['savings_percent']:.0f}% "
                f"compared to grocery store prices."
            )

        return recommendations, narrative, alternatives, pricing_breakdown
    
    def _build_cut_graph(
        self,
        config: LivestockConfig,
        prefs: CustomerPreference
    ) -> Dict:
        """
        Build weighted graph of possible cuts
        Nodes: Cuts
        Edges: Compatibility (cooking method, preservation, meal planning)
        """
        animal_data = self.livestock_db.get(config.animal_type, {})
        cuts = animal_data.get('cuts', {})
        
        graph = {}
        for cut_name, cut_data in cuts.items():
            # Calculate base score
            score = 100.0
            
            # Adjust for cooking style match
            if prefs.cooking_style in cut_data.get('best_methods', []):
                score += 20
            
            # Adjust for popularity (learned)
            popularity = self._get_cut_popularity(cut_name)
            score += popularity * 10
            
            # Penalize if requires skill beyond customer level
            difficulty = cut_data.get('difficulty', 'intermediate')
            if prefs.experience_level == 'novice' and difficulty == 'expert':
                score -= 30
            
            graph[cut_name] = {
                'data': cut_data,
                'score': score,
                'weight_range': cut_data.get('weight_range', [0, 10]),
                'typical_yield_pct': cut_data.get('yield_pct', 0.15),
                'alternatives': cut_data.get('alternative_cuts', [])
            }
        
        return graph
    
    def _optimize_cuts(
        self,
        cut_graph: Dict,
        meat_budget: float,
        must_have: set,
        avoid: set,
        cooking_style: str,
        freezer_space: str
    ) -> List[CutRecommendation]:
        """
        Constraint satisfaction optimization
        Maximize customer satisfaction given meat budget
        """
        recommendations = []
        remaining_budget = meat_budget
        
        # First, allocate must-have cuts
        for cut_name in must_have:
            if cut_name in cut_graph and cut_name not in avoid:
                cut_info = cut_graph[cut_name]
                weight = min(
                    cut_info['weight_range'][1],
                    remaining_budget * cut_info['typical_yield_pct']
                )
                
                rec = self._create_recommendation(cut_name, cut_info, weight, priority=True)
                recommendations.append(rec)
                remaining_budget -= weight
        
        # Then fill with high-scoring complementary cuts
        sorted_cuts = sorted(
            [(name, info) for name, info in cut_graph.items() if name not in must_have and name not in avoid],
            key=lambda x: x[1]['score'],
            reverse=True
        )
        
        for cut_name, cut_info in sorted_cuts:
            if remaining_budget <= 0:
                break
            
            # Check if compatible with existing selections
            if not self._is_compatible(cut_name, recommendations, cooking_style):
                continue
            
            weight = min(
                cut_info['weight_range'][1],
                remaining_budget * cut_info['typical_yield_pct']
            )
            
            # Adjust for freezer space
            if freezer_space == 'limited' and weight > 5:
                weight = 5  # Smaller packages
            
            rec = self._create_recommendation(cut_name, cut_info, weight, priority=False)
            recommendations.append(rec)
            remaining_budget -= weight
        
        return recommendations
    
    def _create_recommendation(
        self,
        cut_name: str,
        cut_info: dict,
        weight: float,
        priority: bool
    ) -> CutRecommendation:
        """Create recommendation object from cut data"""
        data = cut_info['data']
        
        # Estimate piece count
        avg_piece_weight = data.get('avg_piece_lbs', 0.5)
        piece_count = int(weight / avg_piece_weight) if avg_piece_weight > 0 else 1
        
        return CutRecommendation(
            cut_name=cut_name,
            weight_lbs=round(weight, 2),
            estimated_count=piece_count,
            cooking_methods=data.get('best_methods', ['various']),
            preservation=data.get('default_preservation', 'frozen'),
            optimal_use=data.get('optimal_use', 'versatile'),
            popularity_score=cut_info['score'] / 100,
            alternative_cuts=data.get('alternative_cuts', [])[:3],
            reasoning=data.get('butch_wisdom', f"Great {cut_name} for your needs")
        )
    
    def _is_compatible(
        self,
        new_cut: str,
        existing: List[CutRecommendation],
        cooking_style: str
    ) -> bool:
        """Check if cut fits with existing selection"""
        # Diverse cooking methods is good
        existing_methods = set()
        for rec in existing:
            existing_methods.update(rec.cooking_methods)
        
        new_data = self.cut_rules.get('cuts', {}).get(new_cut, {})
        new_methods = set(new_data.get('best_methods', []))
        
        # If customer wants diverse cooking, prefer different methods
        if cooking_style == 'diverse':
            overlap = existing_methods & new_methods
            return len(overlap) < len(new_methods)  # Some variety
        
        return True
    
    def _generate_narrative(
        self,
        config: LivestockConfig,
        prefs: CustomerPreference,
        recommendations: List[CutRecommendation]
    ) -> str:
        """Generate Butch's personalized explanation"""
        total_weight = sum(r.weight_lbs for r in recommendations)
        priority_cuts = [r for r in recommendations if r.popularity_score > 0.8]
        
        parts = []
        
        # Opening
        parts.append(f"Alright, here's what I'm thinking for your {config.portion_size} {config.animal_type}...")
        
        # Priority cuts explanation
        if priority_cuts:
            cut_names = [r.cut_name for r in priority_cuts[:3]]
            parts.append(f"I set aside plenty of {' and '.join(cut_names)} like you wanted.")
        
        # Cooking guidance
        methods = set()
        for rec in recommendations:
            methods.update(rec.cooking_methods)
        
        if prefs.cooking_style == 'grill':
            parts.append("Perfect for grilling season - you've got chops and steaks that'll sear up beautiful.")
        elif prefs.cooking_style == 'slow-cook':
            parts.append("Lots of braising cuts here. Low and slow is the way to go.")
        
        # Practical advice
        parts.append(f"Total package weight is about {total_weight:.1f} pounds. ")
        
        if prefs.freezer_space == 'limited':
            parts.append("I kept the packages smaller since you're tight on freezer space.")
        
        # Closing
        parts.append("This breakdown gives you variety while respecting the animal. Sound good, or want to swap anything?")
        
        return " ".join(parts)
    
    def _suggest_alternatives(
        self,
        current: List[CutRecommendation],
        cut_graph: Dict
    ) -> List[str]:
        """Suggest alternative cuts based on common swaps"""
        alternatives = []
        
        for rec in current:
            for alt in rec.alternative_cuts[:2]:
                if alt in cut_graph:
                    alt_data = cut_graph[alt]
                    alt_rec = self._create_recommendation(alt, alt_data, rec.weight_lbs, False)
                    alternatives.append(
                        f"Instead of {rec.weight_lbs}lbs {rec.cut_name}, "
                        f"you could do {alt_rec.weight_lbs}lbs {alt} "
                        f"({alt_rec.optimal_use})"
                    )
        
        return alternatives[:4]  # Top 4 alternatives
    
    def _get_cut_popularity(self, cut_name: str) -> float:
        """
        Calculate true cut popularity across all learned combinations.

        Popularity = (weighted appearances of cut) / (total weighted cut appearances)
        Bounded 0-1, comparable across cuts, stable as vault grows.
        """
        if not self.cut_relationships:
            return 0.0

        cut_mentions = 0.0
        total_mentions = 0.0

        for combo, weight in self.cut_relationships.items():
            # Each combo contributes weight * n_cuts to total mentions
            combo_size = len(combo)
            total_mentions += weight * combo_size

            # This cut gets full weight if in combo
            if cut_name in combo:
                cut_mentions += weight

        if total_mentions <= 0:
            return 0.0

        # Bound to [0, 1] for safety
        popularity = cut_mentions / total_mentions
        return max(0.0, min(1.0, popularity))
    
    def _profile_customer(self, prefs: CustomerPreference) -> str:
        """Create profile signature for learning"""
        return f"{prefs.cooking_style}_{prefs.experience_level}_{prefs.freezer_space}"
    
    def learn_from_feedback(
        self,
        order_id: str,
        accepted_cuts: List[str],
        rejected_suggestions: List[str],
        customer_notes: str
    ):
        """Learn from customer choices to improve future recommendations"""
        self._record_observation("feedback", {
            "order_id": order_id,
            "accepted": accepted_cuts,
            "rejected": rejected_suggestions,
            "notes": customer_notes
        })
        
        # Update relationships
        if len(accepted_cuts) > 1:
            self._record_observation("cut_combination", {
                "cuts": accepted_cuts,
                "context": customer_notes
            })
        
        logger.info(f"Learned from order {order_id}: accepted {len(accepted_cuts)} cuts")
    
    def get_cut_details(self, cut_name: str) -> Optional[dict]:
        """Get detailed information about a specific cut"""
        for animal, data in self.livestock_db.items():
            if cut_name in data.get('cuts', {}):
                return {
                    "animal": animal,
                    **data['cuts'][cut_name]
                }
        return None
