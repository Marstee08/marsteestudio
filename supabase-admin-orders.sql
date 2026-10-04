-- ALREADY APPLIED to the Mars Tee Studio Supabase project (migration "admin_orders_access").
-- Kept here as a record only - you do not need to run it again.
-- Admin = auth.uid() 6e642c59-4b33-4493-a328-a2dfe4847850 (same account that manages Product).

create policy "Admin can view all orders" on public."Order" for select to authenticated
  using (auth.uid() = '6e642c59-4b33-4493-a328-a2dfe4847850'::uuid);
create policy "Admin can update order status" on public."Order" for update to authenticated
  using (auth.uid() = '6e642c59-4b33-4493-a328-a2dfe4847850'::uuid)
  with check (auth.uid() = '6e642c59-4b33-4493-a328-a2dfe4847850'::uuid);
grant update (status) on public."Order" to authenticated;

-- status now also allows 'completed' and 'cancelled' (was pending / paid / failed only)
alter table public."Order" drop constraint "Order_status_check";
alter table public."Order" add constraint "Order_status_check"
  check (status = any (array['pending','paid','failed','completed','cancelled']));
