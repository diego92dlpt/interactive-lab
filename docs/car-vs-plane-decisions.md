# Car-vs-plane tool: decision log
Compiled October 17, 2026, at handoff. Each entry is a decision followed by a one-line reason. Entries marked UNVERIFIED rest on my general knowledge or rules of thumb rather than a source I checked during this session. Entries marked KNOWN ISSUE are worth fixing in Claude Code.

## The three items you asked about

### 1. Highway share defaults to 50%, and the rest of the driving uses combined (not city) mpg.
- Where it came from: you suggested taking the midpoint of highway and combined mpg for a long trip with stops and starts, and I implemented that literally.
- Why combined rather than city: we never collected city mpg for the presets, and a cross-country trip has very little true city driving.
- KNOWN ISSUE, the label overstates how much city-like driving there is. EPA's combined rating already weights about 55% city and 45% highway. So "50% highway" in the tool works out to roughly 70–75% highway-equivalent driving, not 50%. The label "Highway share of driving" therefore misdescribes what the slider does. Fix by either relabelling it ("Share using highway rating") or switching to a city/highway blend and adding city mpg to every preset.
- The blend averages fuel per mile, not mpg, which is the mathematically correct way to mix ratings. So 50/50 is not exactly the midpoint of the two mpg numbers.

### 2. Cabin factors: 0.8 economy, 2.4 business, 7.4 first.
- Source: the World Bank (2013) estimated that on widebodies business class has 3.04 times the footprint of economy and first class 9.28 times.
- The problem: our aircraft figures are per average seat, not per economy seat, so the ratios needed an anchor.
- The anchor I chose: assume the cabin-average seat is about 1.25 times an economy seat, which makes economy 0.8 of the average. Then business is 0.8 × 3.04 ≈ 2.4 and first is 0.8 × 9.28 ≈ 7.4.
- UNVERIFIED: the 1.25 / 0.8 anchor is my rough assumption, not derived from real seat maps. The true value varies by airline and aircraft. A premium-heavy layout such as Lufthansa's A380, with first and business, would have a higher cabin average, making economy lower than 0.8 and business lower than 2.4.

### 3. Keeping the chart pinned on phones.
- Partly deliberate, and untested. Pinning applies at every screen width. On narrow screens I made the rows thinner and hid the comments column.
- What I proposed and didn't build: a compact pinned version on phones that would show only the cars and the selected aircraft.
- I previously said the phone chart would take "roughly a third of a phone screen". That was an unverified estimate. With the toolbar, legend and about 11 rows, the pinned area could take closer to half the screen and squeeze the settings panels.
- KNOWN ISSUE: test it on a real phone first. If the pinned area is too tall, either unpin it below a certain screen height, or build the compact pinned version.

## Scope and framing

- Comparing fuel burned in the vehicle during the trip, per occupant (tank-to-wheel / tank-to-wake). Reason: it's a physical comparison that can be defended, independent of prices and policies.
- Fictional straight road on the same path as the flight. Reason: this was your premise; it isolates vehicle efficiency from geography.
- Routing penalty for the plane: considered, then rejected. Reason: the car follows the same path, so penalising only the plane would be unfair (your call).
- Excluded: labour, infrastructure, maintenance, vehicle manufacturing, upstream fuel production, time, price, safety, local pollutants. Reason: outside the fuel-per-trip scope; all are listed in the FAQ so critics can see them addressed.
- Upstream fuel production excluded. Reason: it adds roughly 15–25% for both fuels, so it largely cancels (UNVERIFIED range). The question of how a refinery's emissions are split among its co-products is noted in the FAQ.
- Trip distance defaults to 3,851 miles. Reason: approximate great-circle distance from JFK to Frankfurt (UNVERIFIED, from memory).

## Choice of measure

- CO₂ per person is the default. Reason: a litre of jet fuel, gasoline or diesel isn't the same unit, while CO₂ is comparable across all three.
- Energy (MJ) offered as an alternative. Reason: an equally fair physical basis.
- Raw litres kept, with a warning. Reason: it was the starting point of the conversation and people think in fuel volume, but it isn't a fair basis.
- Cost as a measure: rejected. Reason: international jet fuel is untaxed and road fuel is taxed, so it would measure tax policy.
- The earlier "+8% jet fuel to gasoline-equivalent" adjustment: removed. Reason: the number was too low (the true energy gap is about 11%) and the "density" explanation was wrong.
- Non-CO₂ effects handled through the measure ("CO₂e") rather than a scenario. Reason: so scenarios never change the measure (your rule).

## Fuel constants

- Gasoline (E10): 2.35 kg CO₂ per litre, from EPA's 8,887 g per gallon. Energy 31.1 MJ per litre (UNVERIFIED, standard lower-heating-value reference).
- Diesel: 2.69 kg CO₂ per litre, from EPA's 10,180 g per gallon. Energy 35.8 MJ per litre (UNVERIFIED).
- Jet fuel: 3.16 kg CO₂ per kg (the ICAO standard), 43.2 MJ per kg, 0.80 kg per litre. Reason: the aircraft data are in kg of fuel, so per-kg factors avoid an extra conversion.
- KNOWN ISSUE: the FAQ says jet fuel emits about 2.53 kg CO₂ per litre (0.8 × 3.16). Earlier in our conversation I quoted EPA's 9.75 kg per gallon, which is about 2.58 per litre. The two differ by about 2%; pick one and use it in both places.
- Car non-CO₂ factor: 1.03. Reason: EPA says CO₂ is 95–99% of a car's greenhouse effect (UNVERIFIED this session).
- Aircraft non-CO₂ multiplier: default 2.0, range 1–3. Reason: published estimates run from about 1.7 to 3 with large uncertainty, so it's left to the user (UNVERIFIED range).

## Aircraft data

- Source: Wikipedia's "Fuel economy in aircraft" tables. Reason: they gave per-type numbers compiled from manufacturer and analyst sources; the paid databases weren't accessible.
- The ICCT per-type transatlantic chart: tried, but the report PDF blocked access.
- Data from flights of 3,000–3,400 nmi used wherever available. Reason: closest to JFK–Frankfurt (~3,340 nmi). Longer flights burn more fuel per km because they carry more fuel.
- A350-900 and 777-300ER use data from longer flights (about 5,000 and 5,500 nmi). Reason: no closer row existed; flagged in their tooltips as slightly overstating.
- Only types that can fly the route are included. A320neo, 737 MAX 8 and 737-800 were dropped. Reason: their data were for 1,000 nmi flights, and they can't fly JFK–Frankfurt nonstop.
- A321LR and 757-200 added. Reason: these narrowbodies do fly the transatlantic market and have data at 3,400 nmi.
- Default on: A321LR, 767-300ER, 787-9, A330-900neo, A350-900, 777-300ER, 747-400, A380. Reason: a representative mix of old and new types without crowding the chart.
- Fuel stored as total kg per km, with the seat count applied separately. Reason: so the seat count can be adjusted.
- A380 seats set to Lufthansa's 509 instead of the source's 544. Reason: the source layout was denser than real airlines fly it, which flattered the A380.
- KNOWN ISSUE: the A380's fuel burn wasn't reduced for carrying 35 fewer passengers, so it slightly overstates.
- The seat-count slider (70–115%) scales seats without changing fuel burn. Reason: kept simple; the error is small. A caveat, not a fix.
- Year entered service, engine count and production status are UNVERIFIED (from memory). Worth a quick check before wide sharing.

## Aircraft assumptions

- Seats filled: 80% default. Reason: typical for transatlantic flights (UNVERIFIED as a specific figure).
- KNOWN ISSUE: fuel is simply divided by the share of seats filled, as if an emptier plane burned the same fuel. It burns slightly less, so low settings make planes look a little worse than reality. Caveated in the FAQ.
- Cargo allocation: 12% default, range 0–25%. Reason: ICCT 2018 shows belly cargo was about 101 of about 848 million tonnes of CO₂ from passenger aircraft (≈12%).
- The earlier 10% default: replaced. Reason: it was a placeholder with no source.
- Cabin factors: see item 2 above.
- Widebody fleet average (gray bar): 89 g CO₂ per passenger-km, 2019. Reason: a measured, real-world benchmark against the modeled numbers. The figure came via Statista citing ICCT, so it's secondhand. Seats filled, cargo, seat count and cabin settings deliberately don't apply to it.
- Traffic shares by model: rejected. Reason: only available in paid databases. Class-level shares from ICCT 2018 are in the FAQ instead (passenger narrowbodies 43% of commercial aviation CO₂, passenger widebodies 33%, regional aircraft 5%, freight 19%).
- Warning below 1,000 miles. Reason: long-flight data flatter planes on short trips, where takeoff and climb dominate.

## Car data

- Typical midsize sedan, 30 combined / 38 highway mpg. UNVERIFIED round numbers, labelled "approximate". It started out as "median sedan", which was never sourced.
- Hybrid sedan, 57 / 56. Prius-class EPA label (UNVERIFIED this session).
- Midsize SUV, 25 / 30. UNVERIFIED, labelled "approximate".
- US road average, 24.8 / 29. Combined figure from FHWA's 2022 VM-1 table (verified); the highway figure is my estimate.
- 2014 VW Jetta TDI, 34 / 42. EPA rated it 30 city / 42 highway (verified); 34 combined is calculated. Noted: these ratings were achieved with the software later found in the emissions scandal.
- 2020 Ram 1500 EcoDiesel 4x2, 26 / 32 (verified EPA ratings).
- European compact diesel, 43.9 / 48. A typical WLTP rating of 4.7 L/100 km (UNVERIFIED assumption, not looked up) plus ICCT's 14% real-world gap (verified); highway figure estimated.
- One bar per fuel type with a preset dropdown, rather than one bar per diesel preset. Reason: your call, to keep the chart uncluttered.
- Diesel included at all. Reason: it shows engine efficiency, and why mpg alone misleads (diesel's mpg advantage shrinks in CO₂).
- New US diesel sedans don't exist as a preset. Reason: they largely left the US market after the 2015 VW scandal.
- Electric cars: not modeled. Reason: the result depends on the power grid charging them; a different analysis, noted in the FAQ.

## Car formulas and adjustments

- Luggage counted as weight on the car, not as half a passenger. Reason: the plane figures already include bags, so treating luggage as extra people would double-count.
- Adults assumed to weigh 80 kg; luggage defaults to 25 kg per person. Reason: matches the ~100 kg per passenger with bags that aviation calculators use (UNVERIFIED).
- Weight penalty measured above EPA's 300 lb test load. Reason: EPA ratings already include that load.
- Penalty of 1.5% per 100 lb in combined driving and 1.0% on the highway. Reason: weight matters less at steady speed. UNVERIFIED: fueleconomy.gov's rule of thumb is up to about 1% per 100 lb, so 1.5% may be high. A solo driver with no luggage gets a slight bonus, which is intended.
- Speed penalty of 0, 5, 10 or 15% for 65, 70, 75 and 80 mph, applied only to the highway share. Reason: rule of thumb; UNVERIFIED.
- Road-distance penalty: 0% by default, 12% in "Real-world driving", range 0–30%. Reason: New York to San Francisco is about 2,900 road miles against about 2,590 straight-line miles, roughly 12%, and that's a best case.
- UNVERIFIED: the two distances, the 17–20% examples for other routes, and the "about 1.2 typical" figure all come from memory. The Ballou et al. (2002) circuity paper turned up in my search, but I couldn't read its values.
- Airport access driving: 0–120 miles, default 0. The gasoline car's per-person value is added to every plane bar and spread over the trip distance. Reason: an optional fix for the door-to-door asymmetry.
- The weight and speed penalties are multiplied together. Reason: simple and transparent; small interaction errors are acceptable.

## Scenarios

- Five presets: Couple road trip (the baseline), Solo driver, Family of 4 (SUV, economy seats), Business traveler (1 person, business class), Real-world driving (US road-average car, 75 mph, 12% road penalty). Reason: each changes only a few things, so its effect is easy to read.
- "Climate view" preset: rejected. Reason: it would have to change the measure, breaking your rule that scenarios never change the measure.
- Dots and tints compare against the fixed baseline, not the last preset clicked. Reason: one consistent reference point; a preset's changes stay visible.
- A chip shows "· modified" after edits. Reason: always clear which scenario you're looking at.
- KNOWN ISSUE: "Real-world driving" makes only the cars pessimistic and leaves the planes at their defaults. A critic could call it lopsided. Consider adding a matching realistic-plane adjustment, or renaming it "Real-world car".

## Layout decisions

- Chart pinned at the top (layout A). Reason: you picked it; it keeps the chart visible while settings change.
- Four buttons in a 2×2 grid that open into a full panel with a back button. Reason: your design. It reserves the space panels need, so the page doesn't jump.
- Each button shows a one-line summary and a dot when changed. Reason: you can see the state without opening anything.
- The measure and "per 100 miles / whole trip" sit in a toolbar above the chart, outside the panels. Reason: they change the question being asked, not the assumptions.
- Scenario chips and a status bar sit between the chart and the settings. Reason: clicking a chip updates the chart immediately.
- Status bar: one line with the scenario and headline numbers, one line listing changes from the baseline. Reason: your request, for a readable summary without opening panels.
- Three bordered zones (chart, scenarios, settings). Reason: you noted the sections ran together.
- Colours: gasoline orange, diesel yellow, aircraft blue, fleet average gray. Reason: your request, warm for cars and cool for planes. Each colour also has a text label, so colour isn't the only cue.
- Fixed row height, with comments on one truncated line. Reason: you saw uneven row spacing.
- Bars drawn in HTML instead of a charting library (Chart.js in the first version). Reason: so a comments column could line up with each bar.
- Tooltips: started as hover on the whole row, then a separate "i" button column, finally the comment text itself (dotted underline). On phones, tapping a row opens it. Reason: whole-row hover got in the way; the "i" column wasn't what you meant.
- Units moved from each value into the chart heading. Reason: long units like "kg CO₂e" were clipping in the value column.
- Rows sort by value by default, with a "Keep rows in fixed order" switch. Reason: sorted is easier to read, while fixed order stops rows moving while comparing.
- Aircraft checkboxes moved into the Aircraft panel. Reason: when they sat below the chart, toggling one pushed content around and sent your next click to the wrong place.
- Data date in the footer; FAQ inside the tool. Reason: shared copies carry their own context and caveats.
- URL parameters for measure, show, scenario and multiplier, accepted after "?" or "#". Reason: your request to share specific views; "#" because some browsers drop "?" on local files.
- KNOWN ISSUE: links can't capture custom settings, only those four parameters. A "copy link to this view" button is the obvious next step.
- Standalone file carries its own colours, fonts and dark mode, so it works outside the chat. Icon fonts were avoided because they wouldn't load in the standalone file.

## Tooling

- Building it in this chat: in hindsight, the wrong choice once it became iterative. Reason: you couldn't test on your phone or keep a working file between versions. Claude Code or a local file would have been better.

## Considered and rejected (summary)

- Cost as a measure (taxes distort it).
- The +8% energy adjustment (wrong number and wrong reasoning).
- Routing penalty for planes (the car shares the path).
- Pure highway mpg for the car (unrealistic with stops).
- Counting luggage as extra passengers (double-counts against the plane).
- Model-level traffic shares (paywalled).
- Four separate diesel bars (clutter).
- A climate scenario (would change the measure).
- Whole-row hover and the "i" button column (got in the way, and weren't what you meant).
- A charting library (couldn't align a comments column).
- Short-haul narrowbody data (wrong flight length, can't fly the route).
- Modeling electric cars, trains, ships or sustainable aviation fuel (different analyses).

## Suggested first tasks for Claude Code

- Fix the highway-share label, or add city mpg to the presets.
- Make the jet fuel CO₂-per-litre figure consistent with the FAQ.
- Test the pinned chart on a real phone.
- Verify the UNVERIFIED car presets and aircraft details.
- Consider balancing or renaming the "Real-world driving" scenario.
- Add a "copy link to this view" button that captures every setting.

## Post-handoff changes (Claude Code, October 17, 2026)

- Published at interactive-lab.vercel.app/car-vs-plane/ (file: public/car-vs-plane/index.html).
- Highway-share slider relabelled "Share at highway mpg"; default stays 50%. The car tooltip and the car FAQ now explain the blend with combined mpg.
- Weight penalty changed to a flat 1% per 100 lb in all driving (US DOE, fueleconomy.gov), replacing 1.5% combined / 1.0% highway.
- Chart no longer pinned on screens 540px wide or narrower, or 700px tall or shorter.
- Link-preview card added (og-preview.png plus Open Graph and Twitter tags).
- Cabin factors checked: 7.4 is correct (0.8 x 9.28); no change.
- Jet fuel CO2 per litre: the page consistently uses 2.53 (0.8 x 3.16); the 2.58 figure appeared only in the chat; no change.
- Aircraft service years, engine counts and production status reviewed against general knowledge; no discrepancies found.
- Car presets re-sourced from 2024 EPA labels (fueleconomy.gov): typical midsize sedan 30/38 -> 31/37 (Accord 32/37, Altima 31/38, Malibu 31/36); midsize SUV 25/30 -> 24/29 (Explorer 24/28, Santa Fe 24/29, Sorento 23-26/29-31). Values are combined/highway mpg.
- New diesel preset "Midsize diesel SUV": 2016-18 Jeep Grand Cherokee EcoDiesel 2WD, 25/30 (EPA 22 city / 30 hwy). Family of 4 now uses it instead of the Jetta TDI sedan, so the gasoline SUV is no longer compared against a diesel sedan. Effect: Family diesel 7.2 -> 9.9 kg CO2 per person per 100 mi; the family SUV now roughly ties the best modern jets in economy rather than the diesel beating everything.
- Sensitivity check: none of these changes flip a headline takeaway (couple ~ widebody average; modern jets ~20% better than a couple's sedan; solo driver ~2x any plane; family SUV ~ ties best jets).
- FAQ: "Real roads" answer now points to the gray widebody-average bar as the measured real-world plane and notes taxiing and idling are under 1% of fuel on this flight; dropped the note about using "#" for local files (the page still accepts it).
- Default aircraft: 747-8 switched on (typically flown by Lufthansa on Frankfurt–JFK), 747-400 switched off (mostly retired). Considered and deferred: A340-300/600, 787-10, A350-1000 (add rows without changing the story), and the 777-9 (add once it is in passenger service).
- "The short answer" added as a collapsible box above the chart (not inside the FAQ, which is two clicks deep). Wording checked against the default numbers in both CO₂ and CO₂e; phrased in rounded terms so small default changes don't make it wrong.
- "Copy link to this view" button added (resolves the earlier known issue). The link stores measure, view, multiplier and scenario plus only the settings that differ from that scenario (all car/aircraft/trip fields, aircraft selection by name, fleet-average toggle, fixed order). Invalid values in a link are ignored and out-of-range numbers are clamped. If the browser blocks clipboard access, the link is still placed in the address bar.
