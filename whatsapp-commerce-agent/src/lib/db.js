import { createClient } from '@supabase/supabase-js';

/**
 * Thin data-access layer over Supabase so route handlers stay readable
 * (and so tests can swap in an in-memory fake with the same shape).
 */
export function createDb({ url, serviceRoleKey }) {
  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const unwrap = ({ data, error }) => {
    if (error) throw new Error(`Supabase error: ${error.message}`);
    return data;
  };

  return {
    async upsertUser({ phone, name }) {
      const row = name ? { phone, name } : { phone };
      return unwrap(
        await supabase.from('users').upsert(row, { onConflict: 'phone' }).select().single(),
      );
    },

    async listActiveServices() {
      return unwrap(
        await supabase
          .from('services')
          .select('id, name, description, price, currency')
          .eq('is_active', true)
          .order('name'),
      );
    },

    async getService(id) {
      return unwrap(
        await supabase
          .from('services')
          .select('id, name, description, price, currency')
          .eq('id', id)
          .eq('is_active', true)
          .maybeSingle(),
      );
    },

    async createBooking(booking) {
      return unwrap(await supabase.from('bookings').insert(booking).select().single());
    },

    async getBookingByReference(reference) {
      return unwrap(
        await supabase
          .from('bookings')
          .select('*, users(phone, name), services(name)')
          .eq('paystack_reference', reference)
          .maybeSingle(),
      );
    },

    /**
     * Atomically flips pending -> paid. Returns the updated row, or null if the
     * booking was already paid (duplicate webhook) so we don't re-notify.
     */
    async markBookingPaid(reference, paidAt) {
      return unwrap(
        await supabase
          .from('bookings')
          .update({ status: 'paid', paid_at: paidAt })
          .eq('paystack_reference', reference)
          .eq('status', 'pending')
          .select()
          .maybeSingle(),
      );
    },
  };
}
