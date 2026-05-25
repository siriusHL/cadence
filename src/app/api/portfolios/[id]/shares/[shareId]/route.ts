import { revalidatePath } from 'next/cache';
import { withAuth, json } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

/**
 * DELETE /api/portfolios/:id/shares/:shareId
 * RLS lets either the owner OR the recipient remove the share row.
 */
export const DELETE = withAuth<{ id: string; shareId: string }>(
  {},
  async ({ params }) => {
    const supabase = await getSupabaseServer();
    const { error } = await supabase
      .from('portfolio_shares')
      .delete()
      .eq('id', params.shareId)
      .eq('portfolio_id', params.id);
    if (error) return json({ error: error.message }, 500);

    revalidatePath('/app/portfolios');
    return json({ deleted: params.shareId });
  },
);
