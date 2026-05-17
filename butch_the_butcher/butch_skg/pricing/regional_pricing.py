"""
Regional Butcher Pricing Engine
Kansas/Missouri market data with dynamic calculation
"""
import json
import logging
from pathlib import Path
from dataclasses import dataclass
from typing import Dict, List, Optional, Literal
from enum import Enum

logger = logging.getLogger(__name__)

class Region(Enum):
    KANSAS = "kansas"
    MISSOURI = "missouri"
    KANSAS_CITY_METRO = "kc_metro"  # Blended average

class AnimalType(Enum):
    PORK = "pork"
    BEEF = "beef"
    LAMB = "lamb"
    GOAT = "goat"

@dataclass
class ProcessingRates:
    cut_wrap_per_lb: float
    slaughter_fee: float
    vacuum_pack_surcharge_flat: Optional[float]
    vacuum_pack_surcharge_per_lb_over: Optional[float]
    
@dataclass
class CuringRates:
    bacon_flat_per_slab: Optional[float]
    bacon_per_lb: Optional[float]
    ham_flat_per_ham: Optional[float]
    ham_per_lb: Optional[float]
    jowl_hock_flat: Optional[float]
    smoking_per_lb: Optional[float]

@dataclass
class PricingProfile:
    region: Region
    animal: AnimalType
    processing: ProcessingRates
    curing: CuringRates
    farm_markup_percent: float
    premium_cut_markup: Dict[str, float]

class RegionalPricingEngine:
    """
    Live pricing engine with Kansas/Missouri market data
    Calculates true cost to customer including all fees
    """
    
    # BASE MARKET DATA (from research)
    MARKET_DATA = {
        Region.KANSAS: {
            "processing_per_lb": 1.225,  # Midpoint of $1.20-1.25
            "slaughter": {
                AnimalType.BEEF: 210.0,   # Midpoint $190-230
                AnimalType.PORK: 100.0,   # Midpoint $90-110
                AnimalType.LAMB: 100.0,
            },
            "curing": {
                "bacon_flat": 20.0,
                "ham_flat": 40.0,
                "jowl_hock_flat": 7.50,
                "smoking_per_lb": None,  # Kansas uses flat fees
            },
            "vacuum_flat": None,
            "vacuum_per_lb_over": None,
        },
        Region.MISSOURI: {
            "processing_per_lb": 0.725,  # Midpoint of $0.70-0.75
            "slaughter": {
                AnimalType.BEEF: 100.0,
                AnimalType.PORK: 70.0,    # Midpoint $65-75
                AnimalType.LAMB: 70.0,
            },
            "curing": {
                "bacon_flat": None,
                "ham_flat": None,
                "jowl_hock_flat": None,
                "smoking_per_lb": 0.80,   # Per-pound smoking
            },
            "vacuum_flat": 25.0,
            "vacuum_per_lb_over": 0.14,
        },
        Region.KANSAS_CITY_METRO: {
            # Blended average for KC metro farms
            "processing_per_lb": 0.98,   # Weighted toward Kansas quality, Missouri price
            "slaughter": {
                AnimalType.BEEF: 155.0,
                AnimalType.PORK: 85.0,
                AnimalType.LAMB: 85.0,
            },
            "curing": {
                "bacon_flat": 20.0,       # Kansas style preferred
                "ham_flat": 40.0,
                "jowl_hock_flat": 7.50,
                "smoking_per_lb": None,
            },
            "vacuum_flat": 12.50,
            "vacuum_per_lb_over": 0.07,
        }
    }
    
    # FARM MARKUP STRATEGY (premium small farm positioning)
    FARM_MARKUP = {
        "base": 0.22,  # 22% farm margin
        "premium_cuts": {
            "bacon": 0.35,      # High demand, labor intensive
            "pork_chops": 0.28, # Popular, quick turnover
            "tenderloin": 0.40, # Limited supply, high value
            "ribs": 0.30,       # BBQ premium
        },
        "volume_discount": {
            "half_hog": 0.02,   # 2% discount for half
            "whole_hog": 0.05,  # 5% discount for whole
        }
    }
    
    def __init__(self, region: Region = Region.KANSAS_CITY_METRO):
        self.region = region
        self.data = self.MARKET_DATA[region]
        
    def calculate_cut_cost(
        self,
        animal: AnimalType,
        cut_name: str,
        weight_lbs: float,
        is_cured: bool = False,
        is_smoked: bool = False,
        slab_count: int = 1,  # For bacon
        ham_count: int = 1,   # For ham
        portion_size: str = "half"  # half, whole, quarter
    ) -> Dict:
        """
        Calculate true cost for a specific cut including all processing fees
        """
        # Base processing
        processing_cost = weight_lbs * self.data["processing_per_lb"]
        
        # Slaughter fee (amortized across all cuts in portion)
        slaughter_amortized = self._amortize_slaughter(animal, portion_size, weight_lbs)
        
        # Curing/smoking costs
        curing_cost = 0.0
        if is_cured or is_smoked:
            curing_cost = self._calculate_curing(cut_name, weight_lbs, slab_count, ham_count)
        
        # Vacuum packing (if applicable)
        vacuum_cost = self._calculate_vacuum(weight_lbs)
        
        # Subtotal before farm markup
        subtotal = processing_cost + slaughter_amortized + curing_cost + vacuum_cost
        
        # Farm markup (base + premium if applicable)
        markup_rate = self.FARM_MARKUP["base"]
        if cut_name in self.FARM_MARKUP["premium_cuts"]:
            markup_rate = self.FARM_MARKUP["premium_cuts"][cut_name]
        
        # Volume discount
        if portion_size in self.FARM_MARKUP["volume_discount"]:
            markup_rate -= self.FARM_MARKUP["volume_discount"][portion_size]
            markup_rate = max(0.10, markup_rate)  # Floor at 10%
        
        farm_markup = subtotal * markup_rate
        total_cost = subtotal + farm_markup
        
        return {
            "cut_name": cut_name,
            "weight_lbs": weight_lbs,
            "line_items": {
                "processing": round(processing_cost, 2),
                "slaughter_share": round(slaughter_amortized, 2),
                "curing_smoking": round(curing_cost, 2),
                "vacuum_pack": round(vacuum_cost, 2),
                "subtotal": round(subtotal, 2),
                "farm_markup": round(farm_markup, 2),
            },
            "markup_rate": round(markup_rate * 100, 1),
            "total_price": round(total_cost, 2),
            "price_per_lb": round(total_cost / weight_lbs, 2) if weight_lbs > 0 else 0
        }
    
    def calculate_order_total(
        self,
        animal: AnimalType,
        cuts: List[Dict],  # List of {name, weight, cured, smoked, ...}
        portion_size: str = "half"
    ) -> Dict:
        """
        Calculate complete order total with breakdown
        """
        cut_costs = []
        total_weight = 0.0
        total_price = 0.0
        
        for cut in cuts:
            cost = self.calculate_cut_cost(
                animal=animal,
                cut_name=cut["name"],
                weight_lbs=cut["weight"],
                is_cured=cut.get("cured", False),
                is_smoked=cut.get("smoked", False),
                slab_count=cut.get("slab_count", 1),
                ham_count=cut.get("ham_count", 1),
                portion_size=portion_size
            )
            cut_costs.append(cost)
            total_weight += cut["weight"]
            total_price += cost["total_price"]
        
        # Calculate effective per-lb across whole order
        effective_per_lb = total_price / total_weight if total_weight > 0 else 0
        
        return {
            "region": self.region.value,
            "animal": animal.value,
            "portion_size": portion_size,
            "total_weight_lbs": round(total_weight, 2),
            "total_price": round(total_price, 2),
            "effective_per_lb": round(effective_per_lb, 2),
            "cut_breakdown": cut_costs,
            "savings_vs_retail": self._calculate_retail_savings(animal, total_weight, total_price)
        }
    
    def _amortize_slaughter(self, animal: AnimalType, portion: str, cut_weight: float) -> float:
        """Amortize slaughter fee across cuts based on portion size"""
        slaughter_fee = self.data["slaughter"].get(animal, 100.0)
        
        # Typical hanging weights
        hanging_weights = {
            "whole": 220.0,   # Whole hog
            "half": 110.0,    # Half hog
            "quarter": 55.0,  # Quarter beef
        }
        
        total_hanging = hanging_weights.get(portion, 110.0)
        share_of_hanging = cut_weight / total_hanging
        return slaughter_fee * share_of_hanging
    
    def _calculate_curing(
        self,
        cut_name: str,
        weight: float,
        slab_count: int,
        ham_count: int
    ) -> float:
        """Calculate curing/smoking costs based on region and cut"""
        curing = self.data["curing"]
        
        if cut_name == "bacon":
            if curing["bacon_flat"]:
                return curing["bacon_flat"] * slab_count
            elif curing["smoking_per_lb"]:
                return curing["smoking_per_lb"] * weight
        
        elif cut_name == "ham":
            if curing["ham_flat"]:
                return curing["ham_flat"] * ham_count
            elif curing["smoking_per_lb"]:
                return curing["smoking_per_lb"] * weight
        
        elif cut_name in ["hocks", "jowls"]:
            if curing["jowl_hock_flat"]:
                return curing["jowl_hock_flat"]
            elif curing["smoking_per_lb"]:
                return curing["smoking_per_lb"] * weight
        
        # Generic smoking
        if curing["smoking_per_lb"]:
            return curing["smoking_per_lb"] * weight
        
        return 0.0
    
    def _calculate_vacuum(self, weight: float) -> float:
        """Calculate vacuum packing surcharge if applicable"""
        flat = self.data.get("vacuum_flat")
        per_lb = self.data.get("vacuum_per_lb_over")
        threshold = 200.0  # lbs
        
        cost = 0.0
        if flat:
            cost += flat
        if per_lb and weight > threshold:
            cost += per_lb * (weight - threshold)
        
        return cost
    
    def _calculate_retail_savings(self, animal: AnimalType, weight: float, farm_price: float) -> Dict:
        """Compare to typical retail pricing"""
        # Average retail prices (USDA/BBB data)
        retail_per_lb = {
            AnimalType.PORK: 4.50,
            AnimalType.BEEF: 6.80,
            AnimalType.LAMB: 8.50,
        }
        
        retail_total = weight * retail_per_lb.get(animal, 5.00)
        savings = retail_total - farm_price
        savings_percent = (savings / retail_total * 100) if retail_total > 0 else 0
        
        return {
            "retail_estimate": round(retail_total, 2),
            "your_savings": round(savings, 2),
            "savings_percent": round(savings_percent, 1)
        }
    
    def get_pricing_summary(self) -> str:
        """Get human-readable pricing summary for Butch to use"""
        lines = [
            f"Pricing based on {self.region.value.replace('_', ' ').title()} market rates:",
            f"• Processing: ${self.data['processing_per_lb']:.2f}/lb",
            f"• Farm markup: {self.FARM_MARKUP['base']*100:.0f}% base",
        ]
        
        if self.region == Region.KANSAS:
            lines.extend([
                "• Curing: $20/bacon slab, $40/ham",
                "• (Kansas-style flat fees)"
            ])
        elif self.region == Region.MISSOURI:
            lines.extend([
                "• Smoking: $0.80/lb",
                "• (Missouri per-pound rates)"
            ])
        
        return "\n".join(lines)
