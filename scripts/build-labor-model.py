#!/usr/bin/env python3
"""Build src/data/labor-model.json: honest automation payback math.

Every number in the labor post comes from this script. The design rule is
the same as the RaaS model: state each input, compute rather than assert,
and make the sensitivity visible, because the answer is dominated by two
assumptions people rarely write down (how many shifts the robot actually
covers, and what fraction of designed throughput it really achieves).

Wage inputs are BLS series pulled from the public API and verified:
  CES4349300003  NAICS 493 average hourly earnings, all employees
  CES4349300008  same, production and nonsupervisory employees

The base case deliberately uses WAGE ONLY, with no benefits multiplier.
That understates the true cost of labour and therefore understates the
savings, which is the conservative direction for a piece arguing that
payback claims are usually optimistic.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "data" / "labor-model.json"

# --- verified wage inputs (BLS public API, retrieved this session) ---
WAGE_ALL_MAY26 = 26.66      # CES4349300003, May 2026
WAGE_ALL_MAY25 = 25.46      # CES4349300003, May 2025
WAGE_PROD_MAY26 = 25.92     # CES4349300008, May 2026, frontline workers

# --- robot cost inputs, from the RaaS model's published ranges ---
ROBOT_PRICE = {"low": 30_000, "mid": 55_000, "high": 80_000}
MAINT_RATE = 0.15
INTEGRATION = 40_000

# --- operating assumptions, each one stated because each one moves the answer ---
HOURS_PER_SHIFT = 8
DAYS_PER_YEAR = 250          # 5-day operation; 7-day operations should use 350
SHIFTS = [1, 2, 3]
# Fraction of a worker's hours a robot actually displaces. Not 1.0: robots
# need charging, get blocked, and someone still handles exceptions.
DISPLACEMENT = [0.5, 0.7, 0.9]
RAMP_MONTHS = 6              # months at reduced output after go-live


def annual_labor_cost(wage, shifts):
    return wage * HOURS_PER_SHIFT * DAYS_PER_YEAR * shifts


def payback_months(price, wage, shifts, displacement, fleet=10):
    """Months for cumulative savings to cover capex plus maintenance."""
    capex = fleet * price + INTEGRATION
    annual_saving = annual_labor_cost(wage, shifts) * displacement * fleet
    annual_maint = fleet * price * MAINT_RATE
    net_annual = annual_saving - annual_maint
    if net_annual <= 0:
        return None
    # Ramp: assume half output during the ramp period.
    monthly = net_annual / 12
    months, recovered = 0, 0.0
    while recovered < capex and months < 600:
        months += 1
        recovered += monthly * (0.5 if months <= RAMP_MONTHS else 1.0)
    return round(months, 1) if months < 600 else None


def main():
    wage = WAGE_PROD_MAY26  # frontline wage is the honest one for displacement

    grid = []
    for shifts in SHIFTS:
        row = []
        for disp in DISPLACEMENT:
            t = payback_months(ROBOT_PRICE["mid"], wage, shifts, disp)
            row.append({
                "shifts": shifts,
                "displacement": disp,
                "paybackMonths": t,
                "beyondThreeYears": bool(t and t > 36),
                "beyondOneYear": bool(t and t > 12),
            })
        grid.append(row)

    by_price = []
    for k in ("low", "mid", "high"):
        t = payback_months(ROBOT_PRICE[k], wage, 2, 0.7)
        by_price.append({"priceKey": k, "price": ROBOT_PRICE[k], "paybackMonths": t})

    base = payback_months(ROBOT_PRICE["mid"], wage, 2, 0.7)
    no_ramp_monthly = (annual_labor_cost(wage, 2) * 0.7 * 10
                       - 10 * ROBOT_PRICE["mid"] * MAINT_RATE) / 12
    no_ramp = round((10 * ROBOT_PRICE["mid"] + INTEGRATION) / no_ramp_monthly, 1)

    solved = [c["paybackMonths"] for row in grid for c in row if c["paybackMonths"]]

    model = {
        "generatedBy": "scripts/build-labor-model.py",
        "wages": {
            "allEmployeesMay2026": WAGE_ALL_MAY26,
            "allEmployeesMay2025": WAGE_ALL_MAY25,
            "yoyPct": round((WAGE_ALL_MAY26 / WAGE_ALL_MAY25 - 1) * 100, 2),
            "productionNonsupervisoryMay2026": WAGE_PROD_MAY26,
            "note": "BLS CES series for NAICS 493. Wage only, no benefits multiplier applied.",
        },
        "assumptions": {
            "hoursPerShift": HOURS_PER_SHIFT,
            "daysPerYear": DAYS_PER_YEAR,
            "robotPriceUSD": ROBOT_PRICE,
            "annualMaintenanceShareOfCapex": MAINT_RATE,
            "oneTimeIntegrationUSD": INTEGRATION,
            "rampMonthsAtHalfOutput": RAMP_MONTHS,
            "fleet": 10,
        },
        "annualLaborCostPerWorker": {
            f"{s}shift": round(annual_labor_cost(wage, s)) for s in SHIFTS
        },
        "grid": grid,
        "byPrice": by_price,
        "base": {
            "shifts": 2,
            "displacement": 0.7,
            "paybackMonths": base,
            "paybackMonthsIgnoringRamp": no_ramp,
            "rampCostMonths": round(base - no_ramp, 1) if base else None,
        },
        "summary": {
            "fastestMonths": min(solved) if solved else None,
            "slowestMonths": max(solved) if solved else None,
            "cellsBeyondThreeYears": sum(1 for row in grid for c in row if c["beyondThreeYears"]),
            "cellsWithinOneYear": sum(
                1 for row in grid for c in row
                if c["paybackMonths"] and c["paybackMonths"] <= 12),
            "totalCells": sum(len(row) for row in grid),
        },
    }

    OUT.write_text(json.dumps(model, indent=1) + "\n")
    print(f"wrote {OUT}")
    print(f"wage used (frontline): ${wage}/hr; YoY on all-employee series "
          f"{model['wages']['yoyPct']}%")
    print(f"annual labour cost per worker: {model['annualLaborCostPerWorker']}")
    print(f"base case (2 shifts, 70% displacement, $55k robots): {base} months "
          f"({no_ramp} ignoring ramp, so ramp costs {model['base']['rampCostMonths']} months)")
    print(f"grid payback range: {min(solved)} to {max(solved)} months")
    print(f"cells beyond 3 years: {model['summary']['cellsBeyondThreeYears']}"
          f"/{model['summary']['totalCells']}; within 12 months: "
          f"{model['summary']['cellsWithinOneYear']}")
    for d in by_price:
        print(f"  ${d['price']:,} robots: {d['paybackMonths']} months")


if __name__ == "__main__":
    main()
