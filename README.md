# BusGo

**BusGo is for the city bus you already take: report potholes on its route, see which ones are confirmed, and ask for help boarding. It does not book cabs or bikes — it is not Rapido or Uber.**

Live: **https://yatishferz.github.io/BusGo-Drivers-Prototype/** (passenger) · **https://yatishferz.github.io/BusGo-Drivers-Prototype/driver.html** (driver)

Plain HTML/JS + Leaflet, saved in the browser's localStorage, hosted on GitHub Pages. No backend, no build step, no accounts. Everything a user enters stays on their own phone.

---

## Where this version came from

On **6 September 2026** the first version of BusGo was shown to **nine bus drivers** at a depot in Hyderabad, on a phone. Four of them said something substantive; three ignored it; one gave a polite brush-off; one didn't understand what it was. The notes from that afternoon are the spec for this version.

**The drivers have not seen this version. Nothing here is approved by them.** This is what was built *in response* to what they said, not what they asked for.

The version they saw is kept unchanged in [`archive/2026-09-06_depot_version/`](archive/2026-09-06_depot_version/).

## What drivers said → what changed

| # | Driver said | What changed | Where |
|---|---|---|---|
| 1 | **Driver 3:** the on-time bonus is "a bit ridiculous" — traffic, passengers delay the bus, and leaving on time gets the driver criticised | **On-time bonus removed.** The driver page had "On-Time This Month 24/26 · 92%", "Incentive Earned Rs.2,400", Bronze/Silver/Gold/Platinum tiers and "8 more on-time trips to unlock Platinum". All gone. **Nothing replaces it** — paying for an outcome the driver can't control was the mistake, and the fix is not to pay for it. | `driver.html` (whole file) |
| 2 | **Driver 9:** "Will we receive reward for the pothole? Then maybe few will fake report it." | **No reward of any kind, and reports only count once verified.** Each report is one vote tagged with a random id for the phone that sent it. A spot is **confirmed** only when (a) **three different phones** report it within 40 m, or (b) one report has a **photo taken at the phone's GPS position**. Until then it is grey and labelled "unverified · 1 of 3". The heat layer uses confirmed spots only. | `busgo.js` → `groupReports()`; rule text on the home page and in the report form |
| 3 | **Driver 6:** "a bit troublesome to use this technology" | **Driver screen cut to the minimum.** Two big buttons — POTHOLE HERE, ROAD BLOCKED — one tap each, no form, no typing, no map, no stats. They **lock while the bus is moving** (GPS speed above ~5 km/h). Everything that needs typing (type, severity, photo, note) moved to the passenger app. 1,219 lines → about 150. | `driver.html` |
| 4 | **Driver 8:** "Is it similar to Rapido or Uber?" | **One sentence, first thing on the screen**, on both pages, saying what BusGo is and what it is not. The app was also stripped of the things that made it *look* like a ride-booking app: seat picking, "Pay and Book", refunds, invented ETAs. | top of `index.html` and `driver.html` |
| 5 | **Driver 7:** third-party helpers for disabled passengers mean extra cost and "a bit of commotion". Counter-proposal — use the conductor, small stipend, optional tips — also refused: "their hands are already full." | **Kept the feature. Marked it unsolved.** The "Help boarding" page stays, with its request form. The three invented helpers ("Ramesh Kumar, 4 yrs experience") and the "Helper will assist you" message are gone — they pretended the problem was solved. In their place is an **Open problem** box that says exactly what happened at the depot. A request is saved on the phone only; nobody is dispatched. | `index.html` → "Help boarding" |
| 6 | (not from a driver) | **One map, one reporting flow.** The old passenger page had no map and the old driver page had its own; the two files shared nothing. Now one `busgo.js` holds the storage key, the verification rule and the map, and both pages use it. A driver's tap appears on a passenger's map. A **pothole heat layer** was added on top, built from confirmed spots only. | `busgo.js` → `makeMap()` |

## Open problems — on purpose

- **Help boarding is not solved.** Drivers refused third-party helpers (cost, commotion) and refused the conductor (hands full). Everyone on the bus is already at capacity. This looks like a staffing and funding question, not an app feature. The page stays so the question stays visible.
- **Verification raises the cost of faking; it does not make faking impossible.** Three phones can still be three friends. A "photo at GPS position" can still be an old photo of a different hole. What it stops is the cheap attack driver 9 described — one person, one reward, many fake reports — because there is no reward and one phone can never confirm anything on its own.
- **Drivers haven't seen it.** The only test so far of "two big buttons, locked while moving" is the author's. Driver 6 may still find it troublesome.
- **No backend.** Reports live in each phone's localStorage. Two real phones do not see each other's reports yet. The storage layout (`busgo:reports`, one JSON array) is deliberately simple so that a backend could replace it later without changing the pages.
- **"Independent phone" is a random id in localStorage.** Clearing site data gives a phone a new id. Good enough to demonstrate the rule, not good enough to defend it against someone who knows that.

## How the verification rule works (plain words)

1. Every report is stored with: type, latitude/longitude, where the location came from (GPS fix, map tap, or the driver's current stop), an optional shrunken photo, a note, a timestamp, and the phone's random id.
2. Reports of the same type within **40 m** of each other are grouped into one **spot**.
3. A spot is **confirmed** if the group contains **3 or more different phone ids**, or any report in it has **a photo and a GPS-fix location**.
4. Confirmed spots are red and feed the heat layer. Unverified spots are grey, with "n of 3" next to them.
5. Nobody gets anything for any of this.

The code for steps 2–4 is `groupReports()` in `busgo.js`, about 40 lines.

## How to check each change in a browser

Open `index.html` (passenger) and `driver.html` (driver) in two tabs of the same browser.

1. **Bonus gone** — on the driver tab, search the page (Ctrl/Cmd-F) for `Rs.`, `%`, `tier`, `incentive`. Nothing. The word "bonus" appears exactly once, in the line that says there isn't one.
2. **Verification** — passenger tab → *Map*. Find "Pothole near Moosapet — unverified, 1 of 3". Press **demo: +1 phone** twice. It turns red, says "confirmed — 3 different phones agree", and a heat blob appears. (That demo button only exists so one laptop can pretend to be several phones.)
3. **Driver lock** — driver tab. On a laptop there is no GPS speed, so a *Demo controls* box appears. Press **Bus moving**: both buttons grey out and say "locked while moving". Press **Bus stopped**, then tap **POTHOLE HERE**: it flashes green "SAVED", and the passenger tab's map gets a new grey pin near the chosen stop without reloading.
4. **The sentence** — it's the first box on both pages.
5. **Help boarding** — passenger tab → *Help boarding*. The orange "Open problem — not solved" box is at the top. Save a request: the message says "Nobody is dispatched".
6. **One map** — there is exactly one map, on the passenger tab, and both tabs write to the same place (`busgo:reports` in localStorage — DevTools → Application → Local Storage).

**Reset:** passenger tab → Map → "Reset my reports". Sample data stays.

## Running it locally

Double-click `index.html`. For cross-tab sync to work, open both pages the same way (both as files, or both from one local server):

```
python3 -m http.server 8000
# then http://localhost:8000/index.html and http://localhost:8000/driver.html
```

## Updating the live site (no git needed)

The repo is `github.com/yatishferz/BusGo-Drivers-Prototype`, served by GitHub Pages from the `main` branch root. To publish a change: open the repo on github.com → **Add file → Upload files** → drag in the changed files → **Commit changes**. The site updates within a minute or two.

Both pages are served from the same place, which is what cross-tab sync needs.

## Files

```
index.html     passenger screen — map, report flow, help boarding
driver.html    driver screen — two buttons, speed lock
busgo.js       shared: storage key, device id, verification rule, map, sample data
busgo.css      shared styles
archive/2026-09-06_depot_version/   the version the nine drivers saw, untouched
storage-demo/  the two-file localStorage demo that preceded this (30 Aug 2026)
```

## Removed from the 6 Sep version

Seat picking · "Pay and Book" · refunds · ride rating · From/To search with invented stops · "Live Track" with invented ETAs on a timer · invented timetable · "Sent to GHMC" status (nothing was ever sent) · driver incentive tiers · driver personal-report form · three invented accessibility helpers.

None of these were real data. Removing them is part of answering driver 8: the app should not contradict its own first sentence.

## Sample data

The map starts with eleven invented example reports along route 219K (marked `seed: true` in `busgo.js` and "sample data" in the UI) so the verification rule can be seen in each state — confirmed by three phones, confirmed by photo-at-GPS, two of three, one of three. They are not real GHMC records.
