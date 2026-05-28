-- Live support messaging: stream new rows on `messages` over Realtime so the
-- user's unread badge lights up the instant support replies — no reload, no
-- polling.
--
-- RLS still governs delivery: Realtime evaluates the messages_select policy
-- (from 0012) per subscriber, so each client only receives inserts in threads
-- they own. The client additionally filters to sender='support'.

alter publication supabase_realtime add table messages;
