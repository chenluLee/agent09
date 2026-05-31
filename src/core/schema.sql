pragma journal_mode = wal;
pragma foreign_keys = on;

create table if not exists schema_version (
  version integer primary key,
  applied_at text not null
);

create table if not exists sources (
  source_id text primary key,
  source_type text not null,
  root_path text not null
);

create table if not exists documents (
  document_id text primary key,
  source_id text not null references sources(source_id),
  source_type text not null,
  path text not null,
  title text not null,
  content_hash text not null,
  frontmatter_json text not null,
  tags_json text not null,
  links_json text not null,
  modified_time_ms integer not null
);

create table if not exists chunks (
  chunk_id text primary key,
  document_id text not null references documents(document_id) on delete cascade,
  kind text not null,
  ordinal integer not null,
  text text not null
);

create virtual table if not exists note_fts using fts5(
  document_id unindexed,
  title,
  tags,
  path,
  body,
  tokenize = 'unicode61 remove_diacritics 2'
);
