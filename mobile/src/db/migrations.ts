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

// Keys must be `m<idx>` (zero-padded to 4) — Drizzle's Expo migrator looks up
// each journal entry by `m${idx.toString().padStart(4, "0")}`, not by tag.
const migrations: Record<string, string> = {
  m0000: m0000,
  m0001: m0001,
  m0002: m0002,
};

export default { journal, migrations };
