# Tago Children’s Sports Schedule

A static GitHub Pages site for the family’s Fall 2026 sports schedule: Lea’s Glendale softball, Tala’s 7th-grade Hickory Hills volleyball, and Kal’s Mighty Mites football.

## Edit the schedule

All editable schedule information lives in [`data/schedule.json`](data/schedule.json). The website reads that file when it loads, so ordinary changes normally require no HTML, CSS, or JavaScript edits.

To make an ordinary change, edit the matching object in the `events` list, commit it, and push (or commit through GitHub’s web editor). For example, once Kal’s Sep. 19 game time is known, change:

```json
"startTime": null,
"status": "pending"
```

to:

```json
"startTime": "10:30 AM",
"status": "confirmed"
```

Add an event by copying an existing event object and giving it a new `id`, `child`, ISO `date` (`YYYY-MM-DD`), `event`, and any known fields. Use `endDate` only for multi-day events.

To cancel an event, set `"status": "cancelled"` and optionally add a short cancellation note. To change any TBD item to confirmed, provide its known time or details and set `"status": "confirmed"`.

Tala’s A-Team-only events have `"conditional": "a-team"`. Once coaches decide her status, change those events to `"conditional": null` if she makes A Team, or set their `status` to `"cancelled"` if she does not.

## Publishing and previewing

GitHub Pages publishes from the `main` branch’s root directory. After a commit reaches `main`, Pages changes commonly appear within a few minutes (occasionally longer).

For a local preview without installing anything, run this from the repository root:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/`. A local HTTP server is needed because browsers block `fetch()` of `data/schedule.json` from a `file://` URL.
