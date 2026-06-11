-- Phase 1: enable Realtime on shopping_items (ADR-07)
-- Channel design (Phase 4): subscribe filtered by list_id=eq.{activeListId}

alter publication supabase_realtime add table public.shopping_items;
