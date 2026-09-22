# Meal Fold

A personal restaurant calorie and macro tracker, built and edited directly on your computer. Combine foods across restaurants, adjust portions, save one entry per meal, and copy a condensed summary.

## Start on your Mac

Double-click **Start Meal Fold.command** in this folder. Open the Local address printed in the window, usually http://localhost:5173. Keep that window open while using the app. If it is already running, use the existing browser tab.

Requires Node.js 22.13 or newer. The launcher installs dependencies if missing and initializes the local database without removing existing meals. On another machine, you can also run:

```sh
npm ci
npm run setup
npm run dev
```

Click **Sign in to your log** once if prompted. This uses a local development identity, not an online account. The database lives in `.wrangler/state` and survives server restarts. Source code is backed up to GitHub; your private meal history is deliberately excluded. To back up meals, stop the app and separately copy `.wrangler/state` securely. If browser cookies are cleared, use the local sign-in again to reopen the same laptop log.

## Restaurants and data

2,427 catalog entries, including sizes and regional variants. Sources checked September 21, 2026. Coverage follows the published sources; custom combinations and items without published nutrition remain limited.

| Restaurant | Entries | Coverage |
| --- | ---: | --- |
| Raising Cane’s | 118 | Full August 2026 nutrition sheet: food, combos and listed drink sizes, plus a clearly labeled naked-chicken estimate. Off-menu preparations are not published by Cane’s. |
| Taco Bell | 538 | Full Taco Bell-linked Nutritionix table checked September 21, 2026, including standard menu, breakfast, sauces, drinks, regional and Cantina recipes. Availability varies. Unlimited custom combinations are not included. The preserved Fresco-style option remains a historical third-party estimate. |
| Panda Express | 178 | All numeric rows in the published nutrition table: entrées, sides, cub meals, appetizers, sauces and drink sizes. Local and limited-time offerings can differ. |
| Kura Sushi | 163 | All numeric rows in the published US nutrition table. Values describe one listed menu serving, which can contain multiple pieces. Serving weights are not published. |
| 7 Leaves | 105 | All 105 entries in the published table, including sizes and add-ons. Some macro cells and add-on sizes are blank; assumptions remain labeled Estimate. The page gives a menu date of June 15, 2026 and nutrition review date of January 1, 2019. |
| Coffee Bean & Tea Leaf | 420 | All usable rows in the published US drinks and add-ons PDF, including sizes and seasonal recipes. Repeated names with different sugar values are kept as alternate published rows. Food items and rows without nutrition are not covered by this PDF. |
| Starbucks | 684 | All 284 products in the public US menu were retrieved. 684 size-and-recipe entries have complete nutrition. 24 products supplied no complete nutrition (mostly retail coffee beans, plus two seasonal drinks and a shopping bag) and are excluded. Milk, syrup, foam and other customizations require manual adjustment. |
| In-N-Out | 97 | Full January 2026 nutrition sheet: burgers, Protein Style, mustard/ketchup variants, fries, shakes, cocoa, milk and listed fountain sizes with and without ice. Other secret-menu combinations are not published. |
| Chipotle | 124 | Full official US PDF: adult and kid ingredients, sides, beverages and regional supplier variants. The PDF file is dated March 2025 and its charts October 2024; newer limited-time recipes are not verified by this sheet. Build meals ingredient by ingredient. |

Search includes serving sizes. Category filters and progressive loading keep large menus manageable. Quantities represent multiples of the listed portion, not a different cup size. Choose the exact drink size: ice, shots and syrups do not scale uniformly with cup volume. Custom milk/sweetness changes are currently manual macro estimates in **Customize**. The app does not automatically model milk swaps or syrup pumps.

Every food has a source link and preparation notes. Tap Published or Estimate to see all supplied nutrition facts, including sodium, sugar, fiber, saturated fat and other source-specific fields. These values describe the listed serving. Published “less than” macro values use half the upper bound for tracking and are labeled Estimate; the original bound stays visible. Editing a recipe removes its original secondary facts, since custom macros do not establish sodium or sugar. **Published** means transcribed restaurant data for that recipe, not guaranteed current availability or an exact measurement of your serving. **Estimate** identifies historical references, off-menu guesses or missing-value assumptions. At 7 Leaves, blank macro cells are explicitly assumed zero and marked estimated; portions without a source size are also marked estimated. No missing calories are inferred. Original source dates and retrieval dates are distinguished in notes. Calories may differ from a simple 4/4/9 calculation because of rounding, fiber and source inconsistencies.

Sources include [7 Leaves](https://7leavescafe.com/nutrition-facts), [Coffee Bean](https://www.coffeebean.com/pages/nutrition), [Starbucks](https://www.starbucks.com/menu), [In-N-Out](https://www.in-n-out.com/menu/nutrition-info), and [Chipotle](https://www.chipotle.com/nutrition-calculator). Exact item/PDF URLs are stored with each entry.

## Refresh nutrition

The app uses a checked-in snapshot, so browsing and logging do not depend on scraping restaurant sites. The optional importer reads public 7 Leaves HTML and Coffee Bean PDF tables:

```sh
python3 -m venv work/nutrition-env
work/nutrition-env/bin/pip install -r scripts/requirements-nutrition.txt
work/nutrition-env/bin/python scripts/import-nutrition.py
```

Review `git diff -- data/imported-menu.json` before committing an update. Downloads stay in ignored `work/`. The importer records URLs, retrieval dates and content hashes, checks numeric columns and minimum row counts, removes identical duplicate rows, and preserves differently published sugar values as labeled alternate rows. It keeps the prior catalog on failure. Upstream layout changes may require parser updates; no logins or access restrictions are bypassed. The other seven restaurants use `scripts/import-expanded-nutrition.py` and `data/refreshed-menu.json`. The parser rebuilds from reviewed public source captures in ignored `work/nutrition-refresh`; it does not silently fetch or invent missing records. Run with the same Python environment after updating those captures. It validates numeric columns, minimum counts and app field limits before replacing the snapshot.

Capture inputs are `taco-table.txt` (category, name and 11 Nutritionix columns separated by pipes), public Panda/Kura/In-N-Out web table captures with numbered lines, `canes.pdf`, `chipotle.pdf`, `starbucks-products.json` (public menu categories), and `starbucks/*.json` (public product details). Source URLs are defined in the parser. The checked date is explicit in the parser and must only change after checking the source again. The parser logs Starbucks records without complete nutrition; failed downloads must be reviewed separately. The running app does not fetch these sources. No scraper runs on a schedule. Saved meals retain a nutrition snapshot even if menus change.

## Development

- `app/page.tsx`: meal builder, source details, search, filters and daily log
- `app/globals.css`: responsive styling
- `lib/menu.ts`: restaurant list, shared types, catalog composition and totals
- `data/imported-menu.json`: generated nutrition snapshot
- `data/refreshed-menu.json`: expanded seven-restaurant snapshot
- `data/menu-coverage.json`: honest per-restaurant scope and limitations
- `scripts/import-nutrition.py`: optional repeatable public-data importer
- `app/api/meals/route.ts`: authenticated save/load/delete API
- `db/schema.ts`, `drizzle/`: schema and migrations

```sh
npm run typecheck
npm run build
python3 scripts/check-catalog.py
```

Future requests can be implemented in this same local repository and pushed to GitHub. No ZIP download or project recreation is needed.

## Hosting and privacy

GitHub stores source and version history; it does not host this running app or sync your meals. The app uses React, TypeScript, Vinext/Vite and a local Cloudflare D1 database. It runs on your laptop without a deployed Cloudflare account. It is not a static GitHub Pages site.

The original prototype includes Sites production authentication. Its local login is a development simulation. Public deployment requires real authentication and database configuration; the current development identity mechanism must remain local. This project has not been publicly deployed.

## Third-party materials

Restaurant names, nutrition data and the remotely linked Cane’s photo belong to their respective sources. Open-source dependencies and vendored components retain their licenses, including `build/sites-vite-plugin.LICENSE`. No open-source license has been selected for this project's custom code.
