// SQL strings are hand-mirrored from drizzle/*.sql because Metro doesn't bundle
// raw .sql assets by default. When schema changes, regenerate via `npm run db:generate`
// and copy the new file's contents into a new constant below.
import journal from '../../drizzle/meta/_journal.json';

const m0000 = `CREATE TABLE \`drills\` (
\t\`id\` text PRIMARY KEY NOT NULL,
\t\`name\` text NOT NULL,
\t\`category\` text NOT NULL,
\t\`metric\` text NOT NULL,
\t\`target\` integer,
\t\`notes\` text,
\t\`created_at\` text NOT NULL,
\t\`updated_at\` text NOT NULL,
\t\`deleted_at\` text
);
`;

const m0001 = `CREATE TABLE \`drill_entries\` (
\t\`id\` text PRIMARY KEY NOT NULL,
\t\`session_id\` text NOT NULL,
\t\`drill_id\` text NOT NULL,
\t\`value\` integer NOT NULL,
\t\`attempted\` integer,
\t\`notes\` text,
\t\`performed_at\` text NOT NULL,
\t\`created_at\` text NOT NULL,
\t\`updated_at\` text NOT NULL,
\t\`deleted_at\` text
);
--> statement-breakpoint
CREATE TABLE \`sessions\` (
\t\`id\` text PRIMARY KEY NOT NULL,
\t\`started_at\` text NOT NULL,
\t\`ended_at\` text,
\t\`routine_id\` text,
\t\`notes\` text,
\t\`created_at\` text NOT NULL,
\t\`updated_at\` text NOT NULL,
\t\`deleted_at\` text
);
`;

const m0002 = `CREATE TABLE \`routine_items\` (
\t\`id\` text PRIMARY KEY NOT NULL,
\t\`routine_id\` text NOT NULL,
\t\`drill_id\` text NOT NULL,
\t\`planned_sets\` integer,
\t\`position\` integer NOT NULL,
\t\`created_at\` text NOT NULL,
\t\`updated_at\` text NOT NULL,
\t\`deleted_at\` text
);
--> statement-breakpoint
CREATE TABLE \`routines\` (
\t\`id\` text PRIMARY KEY NOT NULL,
\t\`name\` text NOT NULL,
\t\`created_at\` text NOT NULL,
\t\`updated_at\` text NOT NULL,
\t\`deleted_at\` text
);
`;

// Make drills.target NOT NULL (SQLite → table recreate). Existing rows with a null
// target are backfilled to a coherent per-metric default during the copy so the
// migration succeeds on dev DBs seeded before targets were mandatory.
const m0003 = `PRAGMA foreign_keys=OFF;--> statement-breakpoint
DROP TABLE IF EXISTS \`__new_drills\`;--> statement-breakpoint
CREATE TABLE \`__new_drills\` (
\t\`id\` text PRIMARY KEY NOT NULL,
\t\`name\` text NOT NULL,
\t\`category\` text NOT NULL,
\t\`metric\` text NOT NULL,
\t\`target\` integer NOT NULL,
\t\`notes\` text,
\t\`created_at\` text NOT NULL,
\t\`updated_at\` text NOT NULL,
\t\`deleted_at\` text
);
--> statement-breakpoint
INSERT INTO \`__new_drills\`("id", "name", "category", "metric", "target", "notes", "created_at", "updated_at", "deleted_at") SELECT "id", "name", "category", "metric", COALESCE("target", CASE "metric" WHEN 'duration' THEN 120 WHEN 'accuracy' THEN 65 ELSE 20 END), "notes", "created_at", "updated_at", "deleted_at" FROM \`drills\`;--> statement-breakpoint
DROP TABLE \`drills\`;--> statement-breakpoint
ALTER TABLE \`__new_drills\` RENAME TO \`drills\`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
`;

// Keys must be `m<idx>` (zero-padded to 4) — Drizzle's Expo migrator looks up
// each journal entry by `m${idx.toString().padStart(4, "0")}`, not by tag.
const migrations: Record<string, string> = {
  m0000: m0000,
  m0001: m0001,
  m0002: m0002,
  m0003: m0003,
};

export default { journal, migrations };
