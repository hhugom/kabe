# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues. Use the `gh` CLI for all operations.
Repo: `hhugom/kabe` (inferred from `git remote -v`; `gh` resolves it automatically inside the clone).

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub **sub-issue** (`gh api --method POST repos/hhugom/kabe/issues/<map>/sub_issues -F sub_issue_id=<child-db-id>`, where the db id comes from `gh api repos/hhugom/kabe/issues/<child> --jq .id`). Put `Part of #<map>` at the top of the child body too. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, assign the ticket to the driving dev.
- **Blocking**: GitHub's **native issue dependencies** — the canonical, UI-visible representation. Add an edge with `gh api --method POST repos/hhugom/kabe/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>` (blocker's numeric **database id**, not `#number`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only — the live gate).
- **Frontier query**: list the map's open sub-issues (`gh api repos/hhugom/kabe/issues/<map>/sub_issues`), drop any with `issue_dependencies_summary.blocked_by > 0` or an assignee; first in map order wins.
- **Claim**: `gh issue edit <n> --add-assignee @me` — the session's first write.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.

## Active wayfinder maps

- [Map: Recent practice (Home section + history screen)](https://github.com/hhugom/kabe/issues/42) — Home "Recent practice" section + a practice-history screen; destination is a handoff PRD.
