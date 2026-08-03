// Supabase Edge Function: send-test-push-notification
//
// ログイン中のユーザー自身の端末へテスト用プッシュ通知を送信する。
// アプリの「通知設定」画面から実機テストに利用する。
//
// - JWT 認証必須（verify_jwt = true）
// - 送信先は認証ユーザーの push_tokens のみ

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: tokens, error: tokensError } = await admin
      .from('push_tokens')
      .select('token')
      .eq('user_id', user.id);

    if (tokensError) {
      return new Response(JSON.stringify({ error: 'failed_to_fetch_tokens' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'no_push_tokens',
          message: 'この端末のプッシュトークンが登録されていません。通知を有効にしてから再度お試しください。',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const messages = tokens.map(({ token }) => ({
      to: token,
      sound: 'default',
      title: 'HonTalk',
      body: 'テスト通知です。プッシュ通知が正常に届いています。',
      data: {
        type: 'system',
        reference_type: null,
        reference_id: null,
        actor_id: null,
      },
    }));

    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    const tickets = Array.isArray(result?.data) ? result.data : [];
    const errors = tickets.filter((ticket: { status: string }) => ticket.status === 'error');

    if (errors.length > 0) {
      console.error('Expo push errors:', errors);
      return new Response(
        JSON.stringify({
          error: 'push_failed',
          message: 'プッシュ通知の送信に失敗しました。EAS の APNs / FCM 設定を確認してください。',
          details: errors,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(JSON.stringify({ sent: messages.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-test-push-notification error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
