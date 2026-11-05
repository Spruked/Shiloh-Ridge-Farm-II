"""Live market data for the site ticker and the meat calculator.

Sources (no API keys needed):
  * hogs / cattle - CME lean hog (HE) and live cattle (LE) front-month futures, $/cwt, via Yahoo Finance.
  * lamb          - USDA AMS Estimated National Lamb Carcass Cutout (LM_XL502), net carcass value $/cwt, daily.
Nothing here invents a price: if a source cannot be read, the last good value is served (marked stale)
or the item is reported as unavailable.
"""
import io
import logging
import re
import time
from typing import Any, Dict, Optional

import requests

logger = logging.getLogger(__name__)

YAHOO = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1y"
LAMB_PDF = "https://www.ams.usda.gov/mnreports/ams_2649.pdf"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; ShilohRidgeFarm/1.0)"}

FUTURES_TTL = 120          # seconds
LAMB_TTL = 6 * 3600
STALE_AFTER = 36 * 3600    # beyond this, last-good data is dropped

# The farm's lamb price list corresponds to this cutout level ($/cwt, net carcass value, 2026-11-05).
LAMB_REFERENCE_CWT = 683.09
# Calculator prices follow the market but never move more than this from the farm's base prices.
MULTIPLIER_MIN, MULTIPLIER_MAX = 0.80, 1.30

_cache: Dict[str, Dict[str, Any]] = {}


def _fresh(key: str, ttl: int) -> Optional[Dict[str, Any]]:
    hit = _cache.get(key)
    if hit and time.time() - hit["fetched"] < ttl:
        data = hit["data"]
        if data.get("unit") == "cwt" and "average_1y" in data:
            data["open"] = time.time() - data["as_of"] < 20 * 60
        return data
    return None


def _store(key: str, data: Dict[str, Any]) -> Dict[str, Any]:
    _cache[key] = {"fetched": time.time(), "data": data}
    return data


def _last_good(key: str) -> Optional[Dict[str, Any]]:
    hit = _cache.get(key)
    if hit and time.time() - hit["fetched"] < STALE_AFTER:
        return {**hit["data"], "stale": True}
    return None


def _futures(key: str, symbol: str, label: str) -> Optional[Dict[str, Any]]:
    cached = _fresh(key, FUTURES_TTL)
    if cached:
        return cached
    try:
        r = requests.get(YAHOO.format(symbol=symbol), headers=HEADERS, timeout=10)
        r.raise_for_status()
        result = r.json()["chart"]["result"][0]
        meta = result["meta"]
        price = float(meta["regularMarketPrice"])
        closes = [c for c in result["indicators"]["quote"][0].get("close", []) if c]
        if meta.get("fulldayChange") is not None:
            previous = price - float(meta["fulldayChange"])
        elif len(closes) >= 2:
            previous = float(closes[-2] if abs(closes[-1] - price) < 1e-6 else closes[-1])
        else:
            previous = price
        avg = sum(closes) / len(closes) if closes else price
        return _store(
            key,
            {
                "price": round(price, 2),
                "change": round(price - previous, 2),
                "unit": "cwt",
                "average_1y": round(avg, 2),
                "source": f"CME {label} futures",
                "as_of": int(meta.get("regularMarketTime") or time.time()),
                "stale": False,
                "open": time.time() - int(meta.get("regularMarketTime") or 0) < 20 * 60,
            },
        )
    except Exception as exc:  # network, parse, or schema change
        logger.warning("market data %s failed: %s", symbol, exc)
        return _last_good(key)


def _lamb() -> Optional[Dict[str, Any]]:
    cached = _fresh("lamb", LAMB_TTL)
    if cached:
        return cached
    try:
        from pypdf import PdfReader

        r = requests.get(LAMB_PDF, headers=HEADERS, timeout=20)
        r.raise_for_status()
        text = PdfReader(io.BytesIO(r.content)).pages[0].extract_text()
        net = re.search(r"NET CARCASS VALUE\s+([\d,]+\.\d+)\s+(-?[\d,]+\.\d+)", text)
        date = re.search(r"([A-Z][a-z]+ \d{1,2}, \d{4})", text)
        if not net:
            raise ValueError("net carcass value not found")
        return _store(
            "lamb",
            {
                "price": float(net.group(1).replace(",", "")),
                "change": float(net.group(2).replace(",", "")),
                "unit": "cwt",
                "source": "USDA lamb carcass cutout",
                "report_date": date.group(1) if date else None,
                "open": False,  # published once per business day; holds its last value over weekends
                "as_of": int(time.time()),
                "stale": False,
            },
        )
    except Exception as exc:
        logger.warning("lamb cutout failed: %s", exc)
        return _last_good("lamb")


def snapshot() -> Dict[str, Optional[Dict[str, Any]]]:
    return {
        "sheep": _lamb(),
        "hog": _futures("hog", "HE=F", "lean hog"),
        "cattle": _futures("cattle", "LE=F", "live cattle"),
    }


def multiplier(meat_type: str) -> Dict[str, Any]:
    """Factor applied to the farm's base calculator prices, from current market vs. its reference level."""
    snap = _lamb() if meat_type == "lamb" else _futures("hog", "HE=F", "lean hog")
    if not snap:
        return {"factor": 1.0, "live": False, "note": "Live market data unavailable - using base farm prices."}
    reference = LAMB_REFERENCE_CWT if meat_type == "lamb" else snap["average_1y"]
    raw = snap["price"] / reference if reference else 1.0
    factor = max(MULTIPLIER_MIN, min(MULTIPLIER_MAX, raw))
    return {
        "factor": round(factor, 3),
        "raw_factor": round(raw, 3),
        "live": not snap.get("stale", False),
        "market_price": snap["price"],
        "reference": round(reference, 2),
        "source": snap["source"],
        "as_of": snap.get("as_of"),
        "capped": factor != raw,
    }
