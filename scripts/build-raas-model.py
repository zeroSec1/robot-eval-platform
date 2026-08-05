#!/usr/bin/env python3
"""Build src/data/raas-model.json: the rent-vs-buy break-even model.

Every number in the RaaS post comes from this script. The model is
deliberately simple and fully stated, because the honest finding is that
the answer is dominated by which end of the published price ranges you
land on, not by model sophistication.

Cumulative cost of owning n robots after t months:
    buy(t)  = n*P + I + n*P*m*(t/12)
Cumulative cost of renting the same fleet:
    rent(t) = n*R*t

where P = unit purchase price, I = one-time integration cost,
m = annual maintenance as a fraction of capex, R = monthly rent per robot.

Setting them equal gives the break-even month:
    t* = (n*P + I) / (n*(R - P*m/12))

Note what falls out of the algebra: fleet size enters only through the
fixed integration cost I, so break-even is slower for small fleets and
approaches an asymptote as the fleet grows. When R <= P*m/12 the rent
never catches up and t* does not exist.

Sources for the input ranges are listed in the post; all are industry
estimates, since no major vendor publishes a price list.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "data" / "raas-model.json"

# Published ranges (industry estimates, not audited vendor prices).
PRICE = {"low": 30_000, "mid": 55_000, "high": 80_000}   # transport AMR, per unit
# The published RaaS range is $2,000-$8,000 per robot per month. Third-party
# per-vendor estimates for the picking-AMR class cluster in $2,000-$4,000, so
# the headline scenario uses that band and the grid carries the full ceiling.
RENT = {"low": 2_000, "mid": 3_000, "high": 4_000, "ceiling": 8_000}
MAINT_RATE = 0.15          # annual maintenance as share of capex (12-20% cited)
INTEGRATION = 40_000       # one-time WMS/network integration ($15k-100k cited)
SERVICE_LIFE_MONTHS = 72   # 5-7 years cited; 6 years used
HORIZON = 72


def breakeven_months(n, price, rent, maint=MAINT_RATE, integration=INTEGRATION):
    """Month at which cumulative buy cost equals cumulative rent cost."""
    monthly_maint_per_robot = price * maint / 12
    gap = rent - monthly_maint_per_robot
    if gap <= 0:
        return None  # renting never catches up: maintenance alone exceeds rent
    return (n * price + integration) / (n * gap)


def curve(n, price, rent, horizon=HORIZON):
    buy, ren = [], []
    for t in range(horizon + 1):
        buy.append(round(n * price + INTEGRATION + n * price * MAINT_RATE * t / 12))
        ren.append(round(n * rent * t))
    return buy, ren


def main():
    fleets = [3, 5, 10, 20, 50]

    # Break-even by fleet size, mid-range prices.
    by_fleet = []
    for n in fleets:
        t = breakeven_months(n, PRICE["mid"], RENT["mid"])
        by_fleet.append({
            "fleet": n,
            "breakevenMonths": round(t, 1) if t else None,
            "beyondServiceLife": bool(t and t > SERVICE_LIFE_MONTHS),
        })

    # Break-even across the full grid of published price and rent ranges,
    # for a 10-robot fleet.
    grid = []
    for pk in ("low", "mid", "high"):
        row = []
        for rk in ("low", "mid", "high", "ceiling"):
            t = breakeven_months(10, PRICE[pk], RENT[rk])
            row.append({
                "priceKey": pk, "rentKey": rk,
                "price": PRICE[pk], "rent": RENT[rk],
                "breakevenMonths": round(t, 1) if t else None,
                "beyondServiceLife": bool(t and t > SERVICE_LIFE_MONTHS),
            })
        grid.append(row)

    flat = [c for row in grid for c in row]
    solved = [c["breakevenMonths"] for c in flat if c["breakevenMonths"]]
    within_life = [c for c in flat if c["breakevenMonths"] and not c["beyondServiceLife"]]

    # Service life is disputed (5-7 years cited; 8-10 years claimed elsewhere).
    # Break-even does not depend on it, but the totals do, so show all three.
    horizons = {}
    for label, months in (("6y", 72), ("8y", 96), ("10y", 120)):
        b, r = curve(10, PRICE["mid"], RENT["mid"], horizon=months)
        horizons[label] = {"months": months, "buyUSD": b[months], "rentUSD": r[months],
                           "rentMinusBuyUSD": r[months] - b[months]}

    buy10, rent10 = curve(10, PRICE["mid"], RENT["mid"])
    t10 = breakeven_months(10, PRICE["mid"], RENT["mid"])

    # Six-year total cost for a 10-robot fleet, mid case.
    six_year_buy = buy10[SERVICE_LIFE_MONTHS]
    six_year_rent = rent10[SERVICE_LIFE_MONTHS]

    model = {
        "generatedBy": "scripts/build-raas-model.py",
        "assumptions": {
            "unitPriceUSD": PRICE,
            "monthlyRentPerRobotUSD": RENT,
            "annualMaintenanceShareOfCapex": MAINT_RATE,
            "oneTimeIntegrationUSD": INTEGRATION,
            "serviceLifeMonths": SERVICE_LIFE_MONTHS,
            "note": "All inputs are published industry estimates, not audited vendor prices.",
        },
        "byFleet": by_fleet,
        "horizons": horizons,
        "grid": grid,
        "gridSummary": {
            "cells": len(flat),
            "solvedCells": len(solved),
            "neverBreakEven": sum(1 for c in flat if c["breakevenMonths"] is None),
            "withinServiceLife": len(within_life),
            "beyondServiceLife": sum(1 for c in flat if c["beyondServiceLife"]),
            "fastestMonths": min(solved),
            "slowestMonths": max(solved),
        },
        "figure": {
            "fleet": 10,
            "price": PRICE["mid"],
            "rent": RENT["mid"],
            "horizonMonths": HORIZON,
            "buyCumulative": buy10,
            "rentCumulative": rent10,
            "breakevenMonths": round(t10, 1),
            "sixYearBuyUSD": six_year_buy,
            "sixYearRentUSD": six_year_rent,
            "sixYearDifferenceUSD": six_year_rent - six_year_buy,
        },
    }

    OUT.write_text(json.dumps(model, indent=1) + "\n")
    print(f"wrote {OUT}")
    print(f"break-even by fleet (mid case): "
          f"{[(d['fleet'], d['breakevenMonths']) for d in by_fleet]}")
    print(f"grid: {len(solved)}/{len(flat)} cells break even at all; "
          f"{len(within_life)} within the {SERVICE_LIFE_MONTHS}-month service life")
    print(f"fastest {min(solved)} months, slowest {max(solved)} months")
    print(f"10-robot mid case: break-even {round(t10,1)} months; "
          f"6-year buy ${six_year_buy:,} vs rent ${six_year_rent:,}")
    for k, v in horizons.items():
        print(f"  {k}: buy ${v['buyUSD']:,} vs rent ${v['rentUSD']:,} "
              f"(rent costs ${v['rentMinusBuyUSD']:,} more)")


if __name__ == "__main__":
    main()
