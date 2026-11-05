"""Whole / half hog and lamb planning calculator.

Pure functions, no I/O.  All numbers live in PROFILES so the farm can adjust them in one place.

Weight chain:  live weight -> hanging (carcass) weight -> take-home (packaged) weight.
  * hanging  = live x dressing_pct            (what the processor weighs after slaughter)
  * take-home = hanging x takehome_pct        (after trim, bone and moisture loss)
Cut yields are fractions of the take-home weight and each species sums to exactly 1.0.
A half order is exactly half of the animal.  `live_weight` is always the weight of the WHOLE animal.
"""
from typing import Any, Dict, List, Optional

SPREAD = 0.06  # +/- range applied around a single live weight
FREEZER_LBS_PER_CUBIC_FOOT = 25.0

PROFILES: Dict[str, Dict[str, Any]] = {
    "hog": {
        "label": "Hog",
        "default_live_weight": 275.0,
        "dressing_pct": 0.72,
        "takehome_pct": 0.78,
        "hanging_price_per_lb": {"whole": 3.75, "half": 3.95},
        "processing_cost": {"whole": 375.0, "half": 225.0},
        "cuts": {
            # name: (primal, yield share of take-home, retail value per lb)
            "pork_chops": ("Loin", 0.16, 7.50),
            "shoulder_roast": ("Shoulder", 0.15, 6.50),
            "ham": ("Ham", 0.20, 6.25),
            "bacon": ("Belly", 0.12, 9.00),
            "sausage": ("Trim & Sausage", 0.15, 6.00),
            "ribs": ("Rib", 0.08, 7.00),
            "hocks": ("Shank", 0.04, 4.00),
            "bones": ("Bones", 0.06, 2.00),
            "fat": ("Fat", 0.04, 1.50),
        },
    },
    "lamb": {
        "label": "Lamb",
        "default_live_weight": 120.0,
        "dressing_pct": 0.52,
        "takehome_pct": 0.76,
        "hanging_price_per_lb": {"whole": 5.50, "half": 5.75},
        "processing_cost": {"whole": 175.0, "half": 110.0},
        "cuts": {
            "leg_roast": ("Leg", 0.22, 10.00),
            "loin_chops": ("Loin", 0.12, 13.00),
            "shoulder": ("Shoulder", 0.16, 9.00),
            "rack": ("Rack", 0.09, 16.00),
            "shanks": ("Shank", 0.07, 7.00),
            "ground": ("Trim & Ground", 0.18, 8.00),
            "stew_meat": ("Trim & Ground", 0.10, 8.50),
            "bones": ("Bones", 0.06, 2.00),
        },
    },
}

DESCRIPTIONS = {
    "pork_chops": "Center-cut chops for grilling or pan searing.",
    "shoulder_roast": "Great for low-and-slow roasting and pulled pork.",
    "ham": "Fresh or cured ham, as roasts or steaks.",
    "bacon": "Belly cuts, usually cured and smoked as bacon.",
    "sausage": "Ground and seasoned trim for versatile meals.",
    "ribs": "Classic rib cuts for smoking or grilling.",
    "hocks": "Flavorful shank cuts for soups and braises.",
    "leg_roast": "Traditional lamb roast with rich flavor.",
    "loin_chops": "Premium lamb chops, quick to cook.",
    "shoulder": "Budget-friendly roast or braise cut.",
    "rack": "Tender rack for roasting and carving.",
    "shanks": "Slow-cook cut for braises and stews.",
    "ground": "Ground meat for burgers, meatballs and patties.",
    "stew_meat": "Cubed meat for soups and stews.",
    "bones": "Soup bones for stock.",
    "fat": "Fat trim for rendering or sausage blends.",
}

COOKING = {
    "pork_chops": ["grill", "pan_sear", "broil"],
    "shoulder_roast": ["roast", "slow_cook", "smoke"],
    "ham": ["roast", "smoke", "bake"],
    "bacon": ["pan_fry", "oven", "griddle"],
    "sausage": ["grill", "pan_fry", "smoke"],
    "ribs": ["smoke", "grill", "roast"],
    "hocks": ["braise", "stew", "slow_cook"],
    "leg_roast": ["roast", "grill", "smoke"],
    "loin_chops": ["grill", "pan_sear", "broil"],
    "shoulder": ["braise", "roast", "slow_cook"],
    "rack": ["roast", "grill", "broil"],
    "shanks": ["braise", "slow_cook", "stew"],
    "ground": ["grill", "pan_fry", "bake"],
    "stew_meat": ["stew", "braise", "slow_cook"],
    "bones": ["simmer"],
    "fat": ["render"],
}


def title(key: str) -> str:
    return key.replace("_", " ").title()


def _validate() -> None:
    for name, profile in PROFILES.items():
        total = sum(share for _, share, _ in profile["cuts"].values())
        assert abs(total - 1.0) < 1e-9, f"{name} cut yields sum to {total}, expected 1.0"


_validate()


def _r(value: float, digits: int = 1) -> float:
    return round(value + 0.0, digits)


def estimate(meat_type: str, order_type: str, live_weight: Optional[float] = None) -> Dict[str, Any]:
    """Return the planning estimate.  Raises ValueError for unknown inputs."""
    profile = PROFILES.get(meat_type)
    if profile is None or order_type not in ("whole", "half"):
        raise ValueError("unknown meat type or order size")

    share = 1.0 if order_type == "whole" else 0.5
    if live_weight and live_weight > 0:
        animal_low = animal_high = float(live_weight)
        spread = SPREAD
        basis = "entered"
    else:
        animal_low = animal_high = profile["default_live_weight"]
        spread = 0.10
        basis = "typical"
    animal_low *= 1 - spread
    animal_high *= 1 + spread
    animal_mid = (animal_low + animal_high) / 2

    live = [animal_low * share, animal_high * share]
    hanging = [v * profile["dressing_pct"] for v in live]
    take_home = [v * profile["takehome_pct"] for v in hanging]

    price = profile["hanging_price_per_lb"][order_type]
    processing = profile["processing_cost"][order_type]
    total = [h * price + processing for h in hanging]

    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for cut, (primal, pct, per_lb) in profile["cuts"].items():
        low, high = take_home[0] * pct, take_home[1] * pct
        grouped.setdefault(primal, []).append(
            {
                "name": title(cut),
                "description": DESCRIPTIONS.get(cut, ""),
                "cooking_methods": COOKING.get(cut, []),
                "share_pct": _r(pct * 100, 1),
                "estimated_lbs": [_r(low), _r(high)],
                "price_per_lb": _r(per_lb, 2),
                "estimated_total": [_r(low * per_lb, 2), _r(high * per_lb, 2)],
            }
        )

    primals = []
    for name in sorted(grouped):
        cuts = grouped[name]
        primals.append(
            {
                "name": name,
                "estimated_lbs": [_r(sum(c["estimated_lbs"][0] for c in cuts)), _r(sum(c["estimated_lbs"][1] for c in cuts))],
                "retail_cuts": cuts,
            }
        )

    return {
        "meat_type": meat_type,
        "order_type": order_type,
        "weight_basis": basis,
        "animal_live_weight": _r(animal_mid),
        "live_weight": _r((live[0] + live[1]) / 2),
        "hanging_weight": [_r(v) for v in hanging],
        "finished_weight": [_r(v) for v in take_home],
        "dressing_pct": _r(profile["dressing_pct"] * 100, 0),
        "takehome_pct": _r(profile["takehome_pct"] * 100, 0),
        "overall_yield_pct": _r(profile["dressing_pct"] * profile["takehome_pct"] * 100, 0),
        "hanging_price_per_lb": price,
        "processing_cost": processing,
        "total_estimated_cost": [_r(v, 2) for v in total],
        "cost_per_finished_lb": [_r(total[1] / take_home[1], 2), _r(total[0] / take_home[0], 2)],
        "freezer_cubic_feet": [
            _r(take_home[0] / FREEZER_LBS_PER_CUBIC_FOOT, 1),
            _r(take_home[1] / FREEZER_LBS_PER_CUBIC_FOOT, 1),
        ],
        "primal_cuts": primals,
        "processing_notes": [
            "Estimates are planning ranges; real yields vary by animal, trim, bone-in vs boneless and processor.",
            "Cost = hanging weight x farm price per pound + processing fee. Retail values per cut are for comparison only.",
            "Contact the farm to confirm final pricing, pickup date and your custom cut sheet.",
        ],
    }


def cut_guide(meat_type: str) -> List[Dict[str, Any]]:
    """Cut list for a whole animal of typical size (used by the Cut Guide tab)."""
    result = estimate(meat_type, "whole")
    guide = []
    for primal in result["primal_cuts"]:
        for cut in primal["retail_cuts"]:
            guide.append(
                {
                    "primal": primal["name"],
                    "name": cut["name"],
                    "description": cut["description"],
                    "price_per_lb": cut["price_per_lb"],
                    "estimated_lbs": cut["estimated_lbs"],
                }
            )
    return guide
