import Database from "better-sqlite3"

/** The schema, one step per migration; a released step is never edited. */
const MIGRATIONS: readonly string[] = [
  `create table reviews (
     store text not null check (store in ('google_play', 'app_store')),
     store_review_id text not null,
     app_id text not null,
     at text not null,
     stars integer not null check (stars between 1 and 5),
     text text not null,
     app_version text,
     -- 1 or 0, or null when the store doesn't say (Apple's public feed).
     company_replied integer check (company_replied in (0, 1)),
     fetched_at text not null,
     primary key (store, store_review_id)
   );
   create index reviews_app_at on reviews (app_id, at);`,
  // A review's sorting: a cause, or `needs_person_reason` when the model
  // couldn't sort it (B2). `set_by` is 'person' once someone changes it by
  // hand, and later sorting runs leave it alone (B5).
  `create table labels (
     store text not null,
     store_review_id text not null,
     cause text,
     language text check (language in ('taglish', 'tagalog', 'english')),
     money_involved integer check (money_involved in (0, 1)),
     confidence real check (confidence between 0 and 1),
     needs_person_reason text,
     set_by text not null check (set_by in ('model', 'person')),
     model text,
     labelled_at text not null,
     primary key (store, store_review_id),
     foreign key (store, store_review_id) references reviews (store, store_review_id) on delete cascade,
     check ((cause is null) = (needs_person_reason is not null))
   );
   -- Who did what, when (E4). Append-only: rows can't be changed or removed.
   create table audit_log (
     id integer primary key autoincrement,
     at text not null,
     actor text not null,
     action text not null,
     subject text not null,
     details text not null default '{}'
   );
   create trigger audit_log_no_update before update on audit_log
     begin select raise(abort, 'the audit log is append-only'); end;
   create trigger audit_log_no_delete before delete on audit_log
     begin select raise(abort, 'the audit log is append-only'); end;`,
]

export type Db = Database.Database

/** Opens the database at `path` (":memory:" for tests) and brings its schema
 *  up to date. */
export function openDb(path: string): Db {
  const db = new Database(path)
  db.pragma("journal_mode = WAL")
  db.pragma("foreign_keys = ON")
  db.exec("create table if not exists schema_migrations (version integer primary key)")
  const done = new Set(
    db
      .prepare("select version from schema_migrations")
      .all()
      .map((row) => (row as { version: number }).version),
  )
  MIGRATIONS.forEach((sql, index) => {
    const version = index + 1
    if (done.has(version)) return
    db.transaction(() => {
      db.exec(sql)
      db.prepare("insert into schema_migrations (version) values (?)").run(version)
    })()
  })
  return db
}
