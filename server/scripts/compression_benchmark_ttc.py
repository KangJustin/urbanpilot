#!/usr/bin/env python3
"""
3-way token compression benchmark: raw Anthropic vs. our custom compact-schema
encoding vs. the-token-company's with_compression() wrapper.

Run yourself (this script sends your real ANTHROPIC_API_KEY and TTC_API_KEY to
the_token_company's servers via the TTC leg below — that's an external,
unverified third-party SDK, so this is intentionally left for you to run
directly rather than something the agent executes on your behalf):

    export $(grep -v '^#' .env | xargs)
    /tmp/ttc-venv/bin/python3 scripts/compression_benchmark_ttc.py

Mirrors scripts/compression-demo.js (the Node-only version with no third-party
SDK) — same real site, same real Census ACS data, same production response
schema from server/agents/housing.js, just three legs instead of two.
"""
import json
import os
import re
import sys

import requests
from dotenv import load_dotenv

load_dotenv()

from anthropic import Anthropic  # noqa: E402
from thetokencompany.anthropic import with_compression  # noqa: E402

MODEL = "claude-haiku-4-5-20251001"
MAX_TOKENS = 2048

SITE_NAME = "Downtown Berkeley, CA"
LAT, LON = 37.8703, -122.2677
GOAL = "Improve walkability and housing affordability"

SYSTEM = (
    "You are an expert urban housing analyst for urban planning. "
    "You analyze existing housing density, transit-oriented development potential, mixed-use opportunities, "
    "affordability pressures, displacement risk, and housing-climate tradeoffs. "
    "When verified U.S. Census ACS metrics are provided, you MUST cite those exact numbers in summary and findings "
    '(e.g. "Median Gross Rent: $1,719 (ACS 2024 5-Year)"). Do NOT invent or override verified census statistics. '
    "Copy censusData numeric fields exactly from the prompt when censusAvailable is true. "
    "Return ONLY one valid JSON object matching the schema exactly. "
    "No markdown, no code fences, no commentary before or after the JSON."
)

ACS_VARS = {
    "population": "B01003_001E",
    "medianIncome": "B19013_001E",
    "povertyTotal": "B17001_001E",
    "povertyBelow": "B17001_002E",
    "medianRent": "B25064_001E",
    "medianHomeValue": "B25077_001E",
    "housingUnits": "B25001_001E",
    "vacantUnits": "B25002_003E",
    "occupiedUnits": "B25003_001E",
    "renterOccupied": "B25003_003E",
}


# --- Real Census ACS data (ports server/services/censusService.js) ---

def num(v):
    if v in (None, ""):
        return None
    try:
        n = float(v)
    except ValueError:
        return None
    return round(n) if n >= 0 else None


def pct(n, d):
    if n is None or d is None or d == 0:
        return None
    return round((n / d) * 1000) / 10


def get_housing_metrics(lat, lon):
    api_key = os.environ["CENSUS_API_KEY"]
    geo_res = requests.get(
        "https://geocoding.geo.census.gov/geocoder/geographies/coordinates",
        params={"x": lon, "y": lat, "benchmark": "Public_AR_Current", "vintage": "Current_Current", "format": "json"},
    ).json()
    geographies = geo_res["result"]["geographies"]
    bg_list = geographies.get("Census Block Groups") or geographies.get("2020 Census Blocks")
    if not bg_list:
        raise RuntimeError("Census Geocoder did not return a block group for these coordinates")
    bg = bg_list[0]
    geography = {
        "state": bg["STATE"], "county": bg["COUNTY"], "tract": bg["TRACT"],
        "blockGroup": bg["BLKGRP"], "geoid": bg["GEOID"], "name": bg.get("NAMELSAD") or bg.get("NAME"),
    }

    acs_res = requests.get(
        "https://api.census.gov/data/2024/acs/acs5",
        params={
            "get": "NAME," + ",".join(ACS_VARS.values()),
            "for": f"block group:{geography['blockGroup']}",
            "in": f"state:{geography['state']}+county:{geography['county']}+tract:{geography['tract']}",
            "key": api_key,
        },
    ).json()
    headers, row = acs_res[0], acs_res[1]
    rec = dict(zip(headers, row))

    poverty_total = num(rec[ACS_VARS["povertyTotal"]])
    poverty_below = num(rec[ACS_VARS["povertyBelow"]])
    vacant = num(rec[ACS_VARS["vacantUnits"]])
    occupied = num(rec[ACS_VARS["occupiedUnits"]])
    renter = num(rec[ACS_VARS["renterOccupied"]])
    housing_units = num(rec[ACS_VARS["housingUnits"]])

    return {
        "population": num(rec[ACS_VARS["population"]]),
        "medianIncome": num(rec[ACS_VARS["medianIncome"]]),
        "medianRent": num(rec[ACS_VARS["medianRent"]]),
        "medianHomeValue": num(rec[ACS_VARS["medianHomeValue"]]),
        "povertyRate": pct(poverty_below, poverty_total),
        "renterPercent": pct(renter, occupied),
        "vacancyRate": pct(vacant, housing_units),
        "housingUnits": housing_units,
        "source": "ACS 2024 5-Year",
        "geography": geography,
    }


# --- Prompt construction: ORIGINAL (mirrors production server/agents/housing.js) ---

def fmt_original(n, prefix=""):
    return "N/A" if n is None else f"{prefix}{n:,}"


def fmt_pct_original(n):
    return "N/A" if n is None else f"{n}%"


def format_census_block_original(c):
    geoid = c["geography"]["geoid"]
    lines = [
        f"Verified U.S. Census Bureau ACS data ({c['source']}) for block group {geoid}:",
        f"- Population: {fmt_original(c['population'])}",
        f"- Median Household Income: {fmt_original(c['medianIncome'], '$')}",
        f"- Median Gross Rent: {fmt_original(c['medianRent'], '$')}",
        f"- Median Home Value: {fmt_original(c['medianHomeValue'], '$')}",
        f"- Poverty Rate: {fmt_pct_original(c['povertyRate'])}",
        f"- Percent Renter Occupied: {fmt_pct_original(c['renterPercent'])}",
        f"- Vacancy Rate: {fmt_pct_original(c['vacancyRate'])}",
        f"- Housing Units: {fmt_original(c['housingUnits'])}",
    ]
    return "\n".join(lines)


def verified_payload(c):
    return {
        "population": c["population"], "medianIncome": c["medianIncome"], "medianRent": c["medianRent"],
        "medianHomeValue": c["medianHomeValue"], "povertyRate": c["povertyRate"],
        "renterPercent": c["renterPercent"], "vacancyRate": c["vacancyRate"], "housingUnits": c["housingUnits"],
        "source": c["source"], "verified": True,
        "geography": c["geography"],
    }


def build_response_schema_original(census_data):
    payload = json.dumps(verified_payload(census_data), indent=2)
    return f"""{{
  "score": 0,
  "summary": "string — 2-3 sentences citing verified ACS metrics when available",
  "findings": [
    "string — include ACS-sourced metrics where relevant",
    "string",
    "string",
    "string"
  ],
  "risks": [
    {{ "id": "hr1", "title": "string", "description": "string", "severity": 3, "category": "housing" }},
    {{ "id": "hr2", "title": "string", "description": "string", "severity": 2, "category": "housing" }}
  ],
  "recommendations": [
    {{
      "id": "hrec1", "title": "string", "description": "string", "cost": "high",
      "timeline": "long_term", "priority": 1,
      "impact": {{ "climate": 0, "accessibility": 0, "housing": 0, "equity": 0 }}
    }},
    {{
      "id": "hrec2", "title": "string", "description": "string", "cost": "low",
      "timeline": "medium_term", "priority": 2,
      "impact": {{ "climate": 0, "accessibility": 0, "housing": 0, "equity": 0 }}
    }}
  ],
  "censusAvailable": true,
  "censusData": {payload}
}}"""


def build_original_prompt(census_data):
    return f"""Analyze housing potential and constraints for this site and planning goal.

Site: {SITE_NAME} ({LAT}, {LON})
Planning goal: {GOAL}

{format_census_block_original(census_data)}

Use verified ACS numbers exactly where provided. For zoning context, displacement risk, and recommendations, \
apply planning expertise but clearly distinguish estimates from verified census figures.

When censusAvailable is true, copy censusData numeric values exactly from the schema below — do not modify them.

Return exactly one JSON object matching this schema (replace placeholder strings and score with your analysis):
{build_response_schema_original(census_data)}"""


# --- Prompt construction: OUR CUSTOM COMPRESSION (ports compression-demo.js) ---

def fmt_compact(n, prefix="", suffix=""):
    return "N/A" if n is None else f"{prefix}{n}{suffix}"


def compact_census_block(c):
    geoid = c["geography"]["geoid"]
    return (
        f"ACS bg={geoid}: pop={fmt_compact(c['population'])} income={fmt_compact(c['medianIncome'], '$')} "
        f"rent={fmt_compact(c['medianRent'], '$')} home={fmt_compact(c['medianHomeValue'], '$')} "
        f"poverty={fmt_compact(c['povertyRate'], '', '%')} renter={fmt_compact(c['renterPercent'], '', '%')} "
        f"vacancy={fmt_compact(c['vacancyRate'], '', '%')} units={fmt_compact(c['housingUnits'])} ({c['source']})"
    )


def compact_response_schema(census_data):
    payload = json.dumps(verified_payload(census_data))
    return (
        '{"score":<0-100>,"summary":"<2-3 sentences, cite ACS metrics if available>",'
        '"findings":["<finding>","<finding>","<finding>","<finding>"],'
        '"risks":[{"id":"hr1","title":"<t>","description":"<d>","severity":<1-5>,"category":"housing"},'
        '{"id":"hr2","title":"<t>","description":"<d>","severity":<1-5>,"category":"housing"}],'
        '"recommendations":[{"id":"hrec1","title":"<t>","description":"<d>","cost":"low|medium|high",'
        '"timeline":"short_term|medium_term|long_term","priority":<int>,'
        '"impact":{"climate":<int>,"accessibility":<int>,"housing":<int>,"equity":<int>}},'
        '{"id":"hrec2","title":"<t>","description":"<d>","cost":"low|medium|high",'
        '"timeline":"short_term|medium_term|long_term","priority":<int>,'
        '"impact":{"climate":<int>,"accessibility":<int>,"housing":<int>,"equity":<int>}}],'
        f'"censusAvailable":true,"censusData":{payload}}}'
    )


def build_compressed_prompt(census_data):
    return (
        f"Analyze housing potential/constraints. Site: {SITE_NAME} ({LAT}, {LON}). "
        f"Goal: {GOAL}\n\nVerified data — {compact_census_block(census_data)}\n\n"
        "Cite verified numbers exactly; label non-verified planning analysis as estimates. "
        "If censusAvailable, copy censusData values from the schema unchanged.\n\n"
        f"Return one JSON object, this exact shape, no other text:\n{compact_response_schema(census_data)}"
    )


# --- Output parsing / quality checks ---

def repair_common_json_issues(text):
    repaired = re.sub(r",\s*([}\]])", r"\1", text)  # trailing commas
    repaired = repaired.replace("“", '"').replace("”", '"')
    repaired = repaired.replace("‘", "'").replace("’", "'")
    repaired = re.sub(r"^\s*//.*$", "", repaired, flags=re.MULTILINE)  # line comments
    return repaired.strip()


def close_truncated_json(text):
    body = text.strip()
    if not body.startswith("{"):
        return body
    open_braces, close_braces = body.count("{"), body.count("}")
    open_brackets, close_brackets = body.count("["), body.count("]")
    if open_brackets > close_brackets:
        body += "]" * (open_brackets - close_brackets)
    if open_braces > close_braces:
        body += "}" * (open_braces - close_braces)
    return repair_common_json_issues(body)


def extract_json_candidates(text):
    candidates = []
    trimmed = text.strip()
    if trimmed:
        candidates.append(trimmed)
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, re.IGNORECASE)
    if fenced:
        candidates.append(fenced.group(1).strip())
    first_brace, last_brace = text.find("{"), text.rfind("}")
    if first_brace != -1 and last_brace > first_brace:
        candidates.append(text[first_brace:last_brace + 1])
    # de-dupe, preserve order
    seen = set()
    out = []
    for c in candidates:
        if c and c not in seen:
            seen.add(c)
            out.append(c)
    return out


def parse_json_loose(text):
    """Ports server/services/housingAgentParser.js's multi-strategy repair chain —
    direct parse, then trailing-comma/smart-quote repair, then closing dangling
    braces/brackets left by a max_tokens truncation."""
    for candidate in extract_json_candidates(text):
        for variant in (candidate, repair_common_json_issues(candidate), close_truncated_json(candidate)):
            try:
                return json.loads(variant)
            except json.JSONDecodeError:
                continue
    return None


def cites_verified_numbers(parsed, census_data):
    if not parsed:
        return False
    haystack = f"{parsed.get('summary', '')} {' '.join(parsed.get('findings', []))}"
    needles = [census_data[k] for k in ("medianIncome", "medianRent", "housingUnits") if census_data.get(k) is not None]
    return all(f"{n:,}" in haystack for n in needles)


def run_leg(label, client, prompt):
    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=[{"type": "text", "text": SYSTEM}],
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.content[0].text
    parsed = parse_json_loose(text)
    return {
        "label": label,
        "prompt_chars": len(prompt),
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
        "stop_reason": response.stop_reason,
        "parsed": parsed,
    }


def report(legs, census_data):
    print("\n=== Results ===")
    base = legs[0]["input_tokens"]
    for leg in legs:
        reduction = (1 - leg["input_tokens"] / base) * 100
        print(
            f"{leg['label']:>12}:  prompt_chars={leg['prompt_chars']:<6} "
            f"input_tokens={leg['input_tokens']:<6} ({reduction:+.1f}% vs original)  "
            f"output_tokens={leg['output_tokens']:<6}  stop={leg['stop_reason']:<12}  "
            f"valid_json={bool(leg['parsed'])}  "
            f"cites_verified={cites_verified_numbers(leg['parsed'], census_data)}"
        )
    print()
    for leg in legs:
        print(f"--- {leg['label']} summary ---")
        print((leg["parsed"] or {}).get("summary", "(parse failed)"))
        print()


def main():
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    ttc_key = os.environ.get("TTC_API_KEY")
    if not anthropic_key or not ttc_key:
        print("Missing ANTHROPIC_API_KEY or TTC_API_KEY in environment. Export your .env first:")
        print("  export $(grep -v '^#' .env | xargs)")
        sys.exit(1)

    print("=== 3-way Token Compression Benchmark: Housing Agent prompt ===")
    print(f"Site: {SITE_NAME}\n")

    census_data = get_housing_metrics(LAT, LON)
    original_prompt = build_original_prompt(census_data)
    compressed_prompt = build_compressed_prompt(census_data)

    raw_client = Anthropic(api_key=anthropic_key)
    ttc_client = with_compression(Anthropic(api_key=anthropic_key), compression_api_key=ttc_key)

    print("--- Leg 1: original prompt, raw Anthropic ---")
    leg_original = run_leg("original", raw_client, original_prompt)

    print("--- Leg 2: our custom compressed prompt, raw Anthropic ---")
    leg_custom = run_leg("custom-compressed", raw_client, compressed_prompt)

    print("--- Leg 3: original prompt, the-token-company with_compression() ---")
    leg_ttc = run_leg("ttc-compressed", ttc_client, original_prompt)

    report([leg_original, leg_custom, leg_ttc], census_data)


if __name__ == "__main__":
    main()
