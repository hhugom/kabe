# Research: the `listRecentSessions` query

Asset for **[#44](https://github.com/hhugom/kabe/issues/44)** on map **[#42](https://github.com/hhugom/kabe/issues/42)** (Recent practice).
Planning artifact — a query *spec*, not an implementation. Feeds the PRD; #45/#46 build UI on top.

## What the row needs (from #43)

Per **completed** Session (`endedAt` set, ≥1 non-deleted `DrillEntry`, `deletedAt` null), the
content model wants: routine name *or* category-derived fallback · date (`startedAt`) ·
distinct-drill count · categories touched · wall-clock duration · (available) drill-name list.
Activity-only — **no** metric aggregates (reps/accuracy/target totals). Order: most recent first.

## What the schema gives us

- `sessions`: `id, startedAt, endedAt, routineId, notes, deletedAt` — timestamps are **TEXT
  ISO-8601**, so `startedAt` sorts correctly as a string (`desc`) and duration is
  `Date.parse(endedAt) − Date.parse(startedAt)` in JS.
- `drill_entries`: `sessionId, drillId, value, attempted, performedAt, deletedAt`.
- `drills`: `id, name, category (wall|service), deletedAt`.
- `routines`: `id, name, deletedAt`.

Current query idiom (`src/use-cases/sessions.ts`): core `db.select().from().where().orderBy().all()`,
`isNull(x.deletedAt)` soft-delete filters, `inArray` for batches. **No `count` / `sql` /
`groupBy` / `leftJoin` / `desc` used anywhere in the codebase yet.**

## Recommended: two-step fetch + aggregate in JS (Approach B)

Matches the existing idiom exactly; introduces no new SQL primitives. The dataset is a single
solo user's sessions on local SQLite, so the extra rows + JS are negligible.

```ts
// 1. Candidate completed sessions, most-recent-first. Over-fetch (see gap G2).
const rows = await db.select().from(sessions)
  .where(and(isNull(sessions.deletedAt), isNotNull(sessions.endedAt)))  // isNotNull: new helper
  .orderBy(desc(sessions.startedAt))                                     // desc: new helper
  .limit(limit + slack).all();

// 2. Their non-deleted entries in one batch.
const ids = rows.map(r => r.id);
const entries = await db.select().from(drillEntries)
  .where(and(inArray(drillEntries.sessionId, ids), isNull(drillEntries.deletedAt))).all();

// 3. Drills referenced by those entries — do NOT filter deletedAt (see gap G3, historical truth).
const drillIds = [...new Set(entries.map(e => e.drillId))];
const drillById = index(await db.select().from(drills).where(inArray(drills.id, drillIds)).all());

// 4. Routines for headline — treat deleted as absent (see gap G4).
const routineName = /* select routines where id in (...) and deletedAt is null */;

// 5. Aggregate in JS per session; drop sessions with 0 entries; keep first `limit`.
```

**Return type (raw facts; formatting lives downstream):**

```ts
type RecentSessionSummary = {
  id: string;
  startedAt: string;              // ISO — hybrid relative/absolute formatting is a UI concern
  endedAt: string;                // duration = endedAt − startedAt, computed in the mapper
  routineName: string | null;     // null ⇒ ad-hoc OR routine soft-deleted ⇒ category fallback
  drillCount: number;             // distinct drillId among non-deleted entries
  categories: ('wall' | 'service')[];  // distinct, from the (possibly-deleted) drills
  drillNames: string[];           // distinct, order by first performedAt; available for history row
};
```

The headline fallback ("Wall/Service/Mixed session"), the "3 drills · Wall" string, and the
hybrid date are **presentation** — a pure mapper over this record, not SQL. Keep them out of the
query so #45/#46 can format the same record differently.

## Alternative: single SQL aggregation (Approach A)

One round-trip: `sessions LEFT JOIN drill_entries (non-deleted) JOIN drills LEFT JOIN routines`,
`GROUP BY session`, `HAVING count(entries) > 0`, with `count(distinct drillId)`,
`group_concat(distinct category)`, `group_concat(distinct name)`, `order by startedAt desc limit N`.
Drizzle 0.45 supports this via `sql\`...\``, `.leftJoin`, `.groupBy`, `.having`; expo-sqlite has
`count(distinct)` and `group_concat`. **More correct DB-wise** (HAVING applies the ≥1-entry filter
and the limit *together*, dodging gap G2), but it introduces aggregation SQL the repo has never
used and `group_concat` string-splitting — higher verification cost, and unverified on this
expo-sqlite/drizzle setup.

**Recommendation:** ship **Approach B** for v1 (idiomatic, low-risk, tiny data). Revisit A only if
the history list ever needs true DB-side pagination at scale.

## Feasibility gaps & nuances

- **G1 — new query helpers.** Either approach needs `desc` and a not-null check on `endedAt`
  (`isNotNull`, or `ne`/`sql`). Trivially available in drizzle-orm 0.45, just not yet imported.
- **G2 — "≥1 entry" vs `limit`.** The ≥1-entry filter is applied in JS (Approach B), so a limited
  first fetch can under-fill a page once empties are dropped. Mitigate by over-fetching a slack
  (fine for the Home teaser's top-3) — or use Approach A's `HAVING`. True pagination is still
  **fog** (history "recent window", deferred to #46); the query just needs to accept a `limit`.
- **G3 — historical drills.** A drill used in a past session may since be soft-deleted. To describe
  what was practiced, resolve drill **name + category regardless of `drills.deletedAt`** (do not
  filter it) — otherwise old rows lose their categories/names.
- **G4 — deleted routine ⇒ fallback.** Per #43, headline uses the routine name only if the routine
  is **not** deleted; a soft-deleted routine is treated as absent (`routineName: null`) and the row
  falls back to the category-derived label. Note the asymmetry with G3 (drills kept, routines not) —
  intentional, straight from the #43 decisions.
- **G5 — zero-duration / clock skew.** `endedAt − startedAt` can be ~0 (quick session) or, rarely,
  negative if clocks moved; the mapper should clamp at 0. Not a query concern, but flagged for the
  duration formatter.

## Deferred (stays fog)

- The **"recent" window / pagination / grouping** (last-N vs time-boxed, day/week grouping) — the
  query exposes a `limit` (+ future cursor); the actual window is decided when the history-screen
  shape lands (#46).
