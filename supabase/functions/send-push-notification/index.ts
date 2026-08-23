// Supabase Edge Function: send-push-notification
//
// notificationService.createNotification() から呼び出され、
// 対象ユーザーの登録済み端末（Expo Push Token）に実際のプッシュ通知を送信する。
//
// - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY は Supabase により
//   すべての Edge Function に自動的に注入される環境変数のため、
//   別途シークレット登録は不要。
// - 通知設定 (notification_settings) は create_notification RPC 側でも
//   チェックされているが、直接このFunctionが呼ばれるケースに備えてここでも確認する。

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_CHUNK_SIZE = 100;

type NotificationType = 'like' | 'comment' | 'follow' | 'recommend' | 'system';

interface RequestBody {
  user_id: string;
  actor_id?: string | null;
  type: NotificationType;
  reference_type?: string | null;
  reference_id?: string | null;
  message?: string | null;
}

function buildMessageBody(type: NotificationType, actorName: string, fallbackMessage?: string | null): string {
  switch (type) {
    case 'like':
      return `${actorName}さんがあなたの投稿にいいねしました`;
    case 'comment':
      return `${actorName}さんがあなたの投稿にコメントしました`;
    case 'follow':
      return `${actorName}さんがあなたをフォローしました`;
    case 'recommend':
      return `${actorName}さんが本をおすすめしました`;
    case 'system':
    default:
      return fallbackMessage || '新しい通知があります';
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as RequestBody;

    if (!body?.user_id || !body?.type) {
      return new Response(JSON.stringify({ error: 'user_id and type are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 自分自身への通知は送信しない
    if (body.actor_id && body.actor_id === body.user_id) {
      return new Response(JSON.stringify({ skipped: 'self_notification' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 受信者の通知設定を確認する
    const { data: recipient, error: recipientError } = await supabase
      .from('profiles')
      .select('notification_settings')
      .eq('id', body.user_id)
      .single();

    if (recipientError || !recipient) {
      return new Response(JSON.stringify({ skipped: 'recipient_not_found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const settings = (recipient.notification_settings ?? {}) as Record<string, boolean>;
    if (settings[body.type] === false) {
      return new Response(JSON.stringify({ skipped: 'notification_disabled' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 送信対象のトークンを取得する
    const { data: tokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', body.user_id);

    if (tokensError || !tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ skipped: 'no_push_tokens' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 送信者（actor）のニックネームを取得する
    let actorName = '誰か';
    if (body.actor_id) {
      const { data: actor } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', body.actor_id)
        .single();
      if (actor?.nickname) actorName = actor.nickname;
    }

    const title = 'HonTalk';
    const messageBody = buildMessageBody(body.type, actorName, body.message);
    const data = {
      type: body.type,
      reference_type: body.reference_type ?? null,
      reference_id: body.reference_id ?? null,
      actor_id: body.actor_id ?? null,
    };

    const messages = tokens.map(({ token }) => ({
      to: token,
      sound: 'default',
      title,
      body: messageBody,
      data,
      priority: 'high',
      channelId: 'alerts',
    }));

    const invalidTokens: string[] = [];

    for (const batch of chunk(messages, EXPO_PUSH_CHUNK_SIZE)) {
      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(batch),
      });

      const result = await response.json();
      const tickets = Array.isArray(result?.data) ? result.data : [];

      tickets.forEach((ticket: { status: string; details?: { error?: string } }, index: number) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          invalidTokens.push(batch[index].to);
        }
      });
    }

    // 無効化された（アンインストール等）トークンをクリーンアップする
    if (invalidTokens.length > 0) {
      await supabase.from('push_tokens').delete().in('token', invalidTokens);
    }

    return new Response(
      JSON.stringify({ sent: messages.length, removed_invalid_tokens: invalidTokens.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('send-push-notification error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
