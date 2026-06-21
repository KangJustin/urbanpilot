#!/usr/bin/env python3
"""
2-way long-context compression benchmark: raw Anthropic vs. the-token-company's
with_compression() wrapper, on a prose-heavy "ask the AI about this analysis"
context — the kind of natural-language, redundant input general-purpose context
compression is usually pitched for, unlike the earlier tight JSON-schema test.

Real data, not synthetic: fetches a live /api/analyze response from this app's
own local backend (server/agents/coordinator.js), then builds a long context
block from the FULL findings/risks/recommendations/scenario narratives across
all four agents — much longer and more redundant prose than server/agents/ask.js
sends today (that one already trims to just summaries).

Run yourself (same reason as compression_benchmark_ttc.py — this sends your
real ANTHROPIC_API_KEY and TTC_API_KEY through the_token_company's servers,
an external unverified SDK, so this is intentionally left for you to run):

    cd server
    set -a && source .env && set +a
    /tmp/ttc-venv/bin/python3 scripts/compression_benchmark_ttc_longcontext.py
"""
import json
import os
import sys

import requests
from dotenv import load_dotenv

load_dotenv()

from anthropic import Anthropic  # noqa: E402
from thetokencompany.anthropic import with_compression  # noqa: E402

MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 512
LOCAL_API = "http://localhost:3001/api/analyze"

SYSTEM = (
    "You are UrbanPilot AI, an urban planning copilot embedded in a site analysis tool. "
    "Answer the user's question concisely (3-5 sentences), concretely, and grounded ONLY in the "
    "provided analysis data. Cite specific numbers from the data when relevant. If the data doesn't "
    "cover the question, say so briefly rather than inventing specifics. Do not use markdown formatting."
)

QUESTION = "What are the biggest risks across all the agents, and which single recommendation should be prioritized first and why?"


def fetch_real_analysis():
    """Real backend call, not mocked — same site as the earlier housing-agent benchmark."""
    payload = {
        "analysisId": "compression-longcontext-demo",
        "site": {
            "name": "Downtown Berkeley, CA",
            "formattedAddress": "Downtown Berkeley, CA",
            "center": {"latitude": 37.8703, "longitude": -122.2677},
        },
        "goal": {
            "primary": "mixed_use_development",
            "description": "Improve walkability and housing affordability",
            "priorities": [],
        },
        "scenarioYears": [2026, 2040],
    }
    res = requests.post(LOCAL_API, json=payload, timeout=180)
    res.raise_for_status()
    return res.json()


def describe_recs(recs):
    return "\n".join(
        f"  - {r.get('title')} (cost={r.get('cost')}, timeline={r.get('timeline')}, priority={r.get('priority')}): {r.get('description')}"
        for r in (recs or [])
    )


def describe_risks(risks):
    return "\n".join(
        f"  - {r.get('title')} (severity={r.get('severity')}/5): {r.get('description')}"
        for r in (risks or [])
    )


def build_long_context(data):
    """Deliberately the FULL prose, not ask.js's trimmed summaries-only version —
    this is the long, redundant natural-language context type general-purpose
    compression is supposed to shine on."""
    agents = data.get("agents", {})
    site = data.get("site", {})
    cc = data.get("currentConditions", {})
    scenarios = data.get("scenarios", {})

    sections = [f"Site: {site.get('name')}\n",
                f"Current conditions: Climate {cc.get('climateScore')}, Accessibility {cc.get('accessibilityScore')}, "
                f"Housing {cc.get('housingScore')}, Overall {cc.get('overallScore')}\n"]

    for key, label in [("climate", "Climate"), ("accessibility", "Accessibility"), ("housing", "Housing")]:
        a = agents.get(key, {})
        sections.append(
            f"=== {label} Agent (score {a.get('score')}) ===\n"
            f"Summary: {a.get('summary')}\n"
            f"Findings:\n" + "\n".join(f"  - {f}" for f in (a.get("findings") or [])) + "\n"
            f"Risks:\n{describe_risks(a.get('risks'))}\n"
            f"Recommendations:\n{describe_recs(a.get('recommendations'))}\n"
        )

    ud = agents.get("urban_design", {})
    strategy = ud.get("strategy", {})
    sections.append(
        "=== Urban Design Synthesis ===\n"
        f"Summary: {ud.get('summary')}\n"
        f"Immediate actions: {'; '.join(strategy.get('immediate') or [])}\n"
        f"Medium-term actions: {'; '.join(strategy.get('medium_term') or [])}\n"
        f"Long-term actions: {'; '.join(strategy.get('long_term') or [])}\n"
        "Tradeoffs:\n" + "\n".join(
            f"  - {t.get('issue')}: {t.get('resolution')}" for t in (ud.get("tradeoffs") or [])
        )
    )

    for year in ("2026", "2040"):
        s = scenarios.get(year, {})
        sections.append(
            f"=== Scenario {year}: {s.get('title')} ===\n"
            f"{s.get('description')}\n"
            "Projected changes:\n" + "\n".join(f"  - {c}" for c in (s.get("projectedChanges") or []))
        )

    return "\n\n".join(sections)


def run_leg(label, client, context, question):
    prompt = f"{context}\n\nQuestion: {question}"
    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=[{"type": "text", "text": SYSTEM}],
        messages=[{"role": "user", "content": prompt}],
    )
    return {
        "label": label,
        "prompt_chars": len(prompt),
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
        "answer": response.content[0].text,
    }


def grounding_anchors(data):
    """A few hard, checkable facts pulled from the real data — if the compressed-context
    answer still contains these, compression didn't destroy grounding."""
    anchors = []
    cc = data.get("currentConditions", {})
    for k in ("climateScore", "accessibilityScore", "housingScore"):
        v = cc.get(k)
        if v is not None:
            anchors.append(str(v))
    census = data.get("agents", {}).get("housing", {}).get("censusData")
    if census and census.get("medianRent"):
        anchors.append(f"{census['medianRent']:,}")
    return anchors


def main():
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    ttc_key = os.environ.get("TTC_API_KEY")
    if not anthropic_key or not ttc_key:
        print("Missing ANTHROPIC_API_KEY or TTC_API_KEY in environment.")
        sys.exit(1)

    print("=== Long-Context Compression Benchmark: 'Ask UrbanPilot AI' prompt ===")
    print("Fetching a real /api/analyze response from the local backend...\n")
    data = fetch_real_analysis()

    context = build_long_context(data)
    print(f"Built long context: {len(context)} chars\n")

    raw_client = Anthropic(api_key=anthropic_key)
    ttc_client = with_compression(Anthropic(api_key=anthropic_key), compression_api_key=ttc_key)

    print("--- Leg 1: full long context, raw Anthropic ---")
    leg_raw = run_leg("raw", raw_client, context, QUESTION)

    print("--- Leg 2: full long context, the-token-company with_compression() ---")
    leg_ttc = run_leg("ttc-compressed", ttc_client, context, QUESTION)

    anchors = grounding_anchors(data)

    print("\n=== Results ===")
    base = leg_raw["input_tokens"]
    for leg in (leg_raw, leg_ttc):
        reduction = (1 - leg["input_tokens"] / base) * 100
        grounded = [a for a in anchors if a in leg["answer"]]
        print(
            f"{leg['label']:>14}:  prompt_chars={leg['prompt_chars']:<6} "
            f"input_tokens={leg['input_tokens']:<6} ({reduction:+.1f}% vs raw)  "
            f"output_tokens={leg['output_tokens']:<6}  "
            f"anchors_cited={len(grounded)}/{len(anchors)} {grounded}"
        )

    print()
    for leg in (leg_raw, leg_ttc):
        print(f"--- {leg['label']} answer ---")
        print(leg["answer"])
        print()


if __name__ == "__main__":
    main()
