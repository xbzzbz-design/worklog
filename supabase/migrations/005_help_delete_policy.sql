-- Allow a person to delete (cancel) their own help request.
-- Without this, deletes were silently blocked by RLS and the request
-- reappeared on refresh.
CREATE POLICY "help_delete" ON public.help_requests
  FOR DELETE TO authenticated
  USING (author_id = auth.uid());
