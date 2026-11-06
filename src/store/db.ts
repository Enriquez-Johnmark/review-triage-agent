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
     company_replied integer not null check (company_replied in (0, 1)),
     fetched_at text not null,
     primary key (store, store_review_id)
   );
   create index reviews_app_at on reviews (app_id, at);`,
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
