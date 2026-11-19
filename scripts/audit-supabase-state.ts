import { supabaseAdmin } from '../src/server/auth';

async function main() {
  const c = supabaseAdmin();
  if (!c) {
    console.log('No supabase client configured');
    return;
  }

  console.log('=== 1. RPC FUNCTIONS IN SUPABASE ===');
  const { data: rpcTest, error: rpcErr } = await c.rpc('consume_credits_atomic', {
    p_user_id: '00000000-0000-0000-0000-000000000000',
    p_workspace_id: '00000000-0000-0000-0000-000000000000',
    p_units: 1,
    p_description: 'probe',
    p_job_id: null
  });
  console.log('consume_credits_atomic result:', { rpcTest, rpcErr });

  const { data: rpcRefundTest, error: rpcRefundErr } = await c.rpc('refund_credits_atomic', {
    p_user_id: '00000000-0000-0000-0000-000000000000',
    p_workspace_id: '00000000-0000-0000-0000-000000000000',
    p_units: 1,
    p_reason: 'probe',
    p_job_id: null
  });
  console.log('refund_credits_atomic result:', { rpcRefundTest, rpcRefundErr });

  console.log('\n=== 2. ADMIN USER METADATA ===');
  const { data: userData } = await c.auth.admin.getUserById('aac445bc-f4f7-4ecd-b8c5-4a1f61cac2f5');
  console.log('User id:', userData?.user?.id);
  console.log('User email:', userData?.user?.email);
  console.log('User credits in metadata:', userData?.user?.user_metadata?.credits);

  console.log('\n=== 3. WORKSPACES IN SUPABASE ===');
  const { data: wsData } = await c.from('workspaces').select('*').in('id', ['f2491275-957e-43db-8921-9b4ae3534f87', 'aac445bc-f4f7-4ecd-b8c5-4a1f61cac2f5']);
  console.log('Workspaces:', wsData);

  console.log('\n=== 4. GENERATED SITES IN SUPABASE ===');
  const { data: sitesData } = await c.from('generated_sites').select('id, slug, business_name, user_id, status, created_at');
  console.log('Total sites:', sitesData?.length);
  console.log('Sites:', sitesData);

  console.log('\n=== 5. STORAGE BUCKET site-assets ===');
  const { data: storageList, error: storageErr } = await c.storage.from('site-assets').list();
  console.log('Storage files in site-assets:', storageList, storageErr);

  console.log('\n=== 6. CREDIT ENTRIES IN SUPABASE ===');
  const { data: creditEntries, error: ceErr } = await c.from('credit_entries').select('*').limit(10);
  console.log('Credit entries:', creditEntries, ceErr);

  console.log('\n=== 7. SITE MESSAGES IN SUPABASE ===');
  const { data: siteMessages, error: smErr } = await c.from('site_messages').select('*').limit(10);
  console.log('Site messages table:', { count: siteMessages?.length, error: smErr });
}

main().catch(console.error);

