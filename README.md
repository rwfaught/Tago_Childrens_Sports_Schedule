# Tago Children’s Sports Schedule

A static GitHub Pages site for the family’s Fall 2026 sports schedule: Lea’s Glendale softball, Tala’s 7th-grade Hickory Hills volleyball, and Kal’s Mighty Mites football.

## Edit the schedule

Ordinary schedule updates are made in the Google Sheet’s **Public Schedule** tab. Edit the row, save normally in Google Sheets, wait a short moment for Google’s published feed to update, then refresh the website. No GitHub commit is needed for ordinary event changes.

The published tab is the source of event rows. Its columns are mapped by the site into the existing schedule fields (dates, times, status, conditional A-Team handling, locations, and public notes). Keep dates as `YYYY-MM-DD`; multi-day dates use `YYYY-MM-DD to YYYY-MM-DD`. Use `All day` or `TBD` in Start Time where appropriate.

`data/schedule.json` remains in the repository as a durable baseline and automatic local fallback. If the Google Sheet feed is temporarily unavailable or invalid, the site displays that local schedule and shows a small **Local fallback** notice. Do not manually edit the JSON for routine changes.

Do not put private information in the published Public Schedule tab. The Private Notes tab is not included in the published CSV feed and is not read by this website.

Structural or presentation changes—HTML, CSS, JavaScript, static metadata, or the fallback baseline—still require Git/GitHub changes and a deployment from `main`.

## Publishing and previewing

GitHub Pages publishes from the `main` branch’s root directory. Structural site changes commonly appear within a few minutes after a commit reaches `main` (occasionally longer).

For a local preview without installing anything, run this from the repository root:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/`. A local HTTP server is needed because browsers block `fetch()` of local files from a `file://` URL.
