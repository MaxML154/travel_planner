#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fail a plan.json that teleports across the city between consecutive stops."""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

MAIN_TYPES = {
    "attraction",
    "poi",
    "dining",
    "meal",
    "hotel",
    "transit",
    "parking",
}
SKIP_TYPES = {"dining-alt"}


def haversine_km(a, b) -> float:
    lat1, lng1 = math.radians(a[0]), math.radians(a[1])
    lat2, lng2 = math.radians(b[0]), math.radians(b[1])
    dlat, dlng = lat2 - lat1, lng2 - lng1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    return 6371.0 * 2 * math.asin(math.sqrt(h))


def main_slots(day: dict) -> list:
    out = []
    for s in day.get("slots") or day.get("timeline") or []:
        t = (s.get("type") or "").lower()
        if t in SKIP_TYPES:
            continue
        if t not in MAIN_TYPES and t:
            # unknown types still participate if they have coords
            pass
        lat, lng = s.get("lat"), s.get("lng")
        if lat is None or lng is None:
            continue
        out.append(s)
    return out


def validate(data: dict) -> list[str]:
    errors: list[str] = []
    days = data.get("days")
    if isinstance(days, int) or not days:
        days = data.get("itinerary") or []
    if not isinstance(days, list) or not days:
        errors.append("FAIL no days[]/itinerary")
        return errors

    for di, day in enumerate(days, 1):
        slots = main_slots(day)
        labeled = []
        for s in day.get("slots") or day.get("timeline") or []:
            t = (s.get("type") or "").lower()
            if t in SKIP_TYPES:
                continue
            if s.get("lat") is None or s.get("lng") is None:
                if t in {"attraction", "poi", "dining", "meal", "hotel"}:
                    errors.append(
                        f"FAIL Day{di} '{s.get('name')}' type={t} missing lat/lng"
                    )
            else:
                labeled.append(s)

        for i in range(1, len(labeled)):
            prev, cur = labeled[i - 1], labeled[i]
            dist = haversine_km(
                (float(prev["lat"]), float(prev["lng"])),
                (float(cur["lat"]), float(cur["lng"])),
            )
            prev_t = (prev.get("type") or "").lower()
            cur_t = (cur.get("type") or "").lower()
            pair = f"Day{di} {prev.get('name')} -> {cur.get('name')} ({dist:.1f}km)"

            walk_pair = {prev_t, cur_t} <= {
                "attraction",
                "poi",
                "dining",
                "meal",
                "hotel",
            } or cur_t in {"dining", "meal", "attraction", "poi"}
            if dist > 12 and prev_t not in {"transit", "parking"}:
                errors.append(f"FAIL {pair}: >12km without a transit/parking slot before this hop")
            elif (
                dist > 1.0
                and prev_t not in {"transit", "parking"}
                and walk_pair
                and cur_t in {"dining", "meal", "attraction", "poi"}
            ):
                errors.append(
                    f"FAIL {pair}: attraction/dining hop >1.0km (must be walkable; pick a nearer shop or insert transit)"
                )
            elif dist > 0.8 and prev_t not in {"transit", "parking"} and cur_t in {
                "dining",
                "meal",
                "attraction",
                "poi",
            }:
                errors.append(f"WARN {pair}: >0.8km walk; confirm it is still comfortable on foot")

            duration = (cur.get("duration") or cur.get("review") or "")
            if cur_t in {"transit", "parking"} and dist > 12 and not str(duration).strip():
                errors.append(
                    f"WARN {pair}: transit/parking hop >12km should include duration (e.g. 约40分钟)"
                )

        alts = [
            s
            for s in (day.get("slots") or day.get("timeline") or [])
            if (s.get("type") or "").lower() == "dining-alt"
            and s.get("lat") is not None
            and s.get("lng") is not None
        ]
        anchors = [
            s
            for s in labeled
            if (s.get("type") or "").lower() in {"attraction", "poi", "dining", "meal"}
        ]
        for alt in alts:
            if not anchors:
                errors.append(
                    f"FAIL Day{di} dining-alt '{alt.get('name')}' has no attraction/dining anchor"
                )
                continue
            dmin = min(
                haversine_km(
                    (float(a["lat"]), float(a["lng"])),
                    (float(alt["lat"]), float(alt["lng"])),
                )
                for a in anchors
            )
            if dmin > 1.0:
                errors.append(
                    f"FAIL Day{di} dining-alt '{alt.get('name')}' is {dmin:.1f}km from nearest attraction/dining (max 1.0km)"
                )

    costs = data.get("costs") or {}
    if costs:
        parts = [
            float(costs.get(k) or 0)
            for k in ("dining", "tickets", "transport", "lodging")
        ]
        total = float(costs.get("total") or 0)
        if abs(sum(parts) - total) > 2:
            errors.append(f"FAIL costs: dining+tickets+transport+lodging != total ({sum(parts)} vs {total})")
        if costs.get("budget") is not None and costs.get("surplus") is not None:
            try:
                expected = float(costs["budget"]) - total
                if abs(expected - float(costs["surplus"])) > 2:
                    errors.append(
                        f"FAIL costs: budget-total != surplus ({expected} vs {costs['surplus']})"
                    )
            except (TypeError, ValueError):
                errors.append("FAIL costs: budget/surplus not numeric")

    return errors


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: python validate_plan.py plan.json")
        sys.exit(2)
    path = Path(sys.argv[1])
    errs = validate(load(path))
    fails = [e for e in errs if e.startswith("FAIL") or not e.startswith("WARN")]
    warns = [e for e in errs if e.startswith("WARN")]
    for e in errs:
        print(e)
    if not errs:
        print("OK")
    sys.exit(1 if any(e.startswith("FAIL") for e in errs) else 0)
