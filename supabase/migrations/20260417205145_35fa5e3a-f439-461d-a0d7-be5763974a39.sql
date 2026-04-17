CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE UNIQUE INDEX IF NOT EXISTS saved_verses_user_book_chapter_verse_uniq
ON public.saved_verses (user_id, book, chapter, verse_number);

CREATE INDEX IF NOT EXISTS wisdom_sessions_user_created_idx
ON public.wisdom_sessions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS wisdom_sessions_question_trgm_idx
ON public.wisdom_sessions USING gin (question gin_trgm_ops);

CREATE INDEX IF NOT EXISTS wisdom_sessions_response_trgm_idx
ON public.wisdom_sessions USING gin (response gin_trgm_ops);

CREATE INDEX IF NOT EXISTS reflection_entries_user_created_idx
ON public.reflection_entries (user_id, created_at DESC)
WHERE deleted_at IS NULL;