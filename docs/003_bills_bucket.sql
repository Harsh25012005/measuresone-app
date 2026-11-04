-- Public bucket for PDF bills shared over WhatsApp as a link.
-- Same shape as shop-logos / design-photos: anyone with the link can read a
-- file (the link is what gets sent to the customer), but a shop can only
-- write into its own `<shop_id>/` folder. File names are random UUIDs, so
-- bills can't be guessed from an order number.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bills', 'bills', true, 2097152, array['application/pdf'])
on conflict (id) do nothing;

create policy bills_read on storage.objects for select to authenticated
  using (bucket_id = 'bills' and (storage.foldername(name))[1] = (auth_shop_id())::text);

create policy bills_write on storage.objects for insert to authenticated
  with check (bucket_id = 'bills' and (storage.foldername(name))[1] = (auth_shop_id())::text);

create policy bills_update on storage.objects for update to authenticated
  using (bucket_id = 'bills' and (storage.foldername(name))[1] = (auth_shop_id())::text);

create policy bills_delete on storage.objects for delete to authenticated
  using (bucket_id = 'bills' and (storage.foldername(name))[1] = (auth_shop_id())::text);

-- Bills can embed up to 9 (shrunk) cloth photos, so allow 5 MB per PDF.
update storage.buckets set file_size_limit = 5242880 where id = 'bills';
