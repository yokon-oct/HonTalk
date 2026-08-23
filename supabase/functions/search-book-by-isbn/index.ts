// Supabase Edge Function: search-book-by-isbn
//
// 楽天ブックス API で ISBN 検索を行う（サーバー側で API キーを保持）。
// HonTalk アプリのバーコードスキャン → 楽天フォールバック検索で利用。
//
// - JWT 認証必須（verify_jwt = true）
// - シークレット（直接呼び出し）: RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY
// - シークレット（VPS プロキシ経由）: RAKUTEN_PROXY_URL, RAKUTEN_PROXY_SECRET
//
// 注意: Supabase Edge Functions の出口 IP は固定されないため、
// 楽天の IP 制限がある場合は scripts/rakuten-proxy/server.mjs を VPS で実行する。

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RAKUTEN_BOOKS_API =
  'https://openapi.rakuten.co.jp/services/api/BooksBook/Search/20170404';

interface RakutenBookItem {
  title: string;
  author: string;
  publisherName?: string;
  isbn?: string;
  itemCaption?: string;
  salesDate?: string;
  largeImageUrl?: string;
  mediumImageUrl?: string;
}

interface RakutenBooksResponse {
  Items?: Array<{ Item: RakutenBookItem } | RakutenBookItem>;
  items?: RakutenBookItem[];
}

interface BookSearchResult {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
    imageLinks?: { thumbnail?: string };
  };
}

function normalizeIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, '').toUpperCase();
}

function isValidIsbn(isbn: string): boolean {
  return /^\d{10}$/.test(isbn) || /^\d{13}$/.test(isbn);
}

function parseRakutenSalesDate(salesDate?: string): string | undefined {
  if (!salesDate) return undefined;
  const match = salesDate.match(/(\d{4})年(?:(\d{1,2})月(?:(\d{1,2})日)?)?/);
  if (!match) return undefined;
  const [, year, month = '01', day = '01'] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function toBookSearchResult(item: RakutenBookItem, isbn: string): BookSearchResult {
  return {
    id: `rakuten:${isbn}`,
    volumeInfo: {
      title: item.title,
      authors: item.author ? [item.author] : ['著者不明'],
      publisher: item.publisherName,
      publishedDate: parseRakutenSalesDate(item.salesDate),
      description: item.itemCaption,
      industryIdentifiers: [{ type: 'ISBN_13', identifier: isbn }],
      imageLinks: item.largeImageUrl
        ? { thumbnail: item.largeImageUrl.replace('http://', 'https://') }
        : item.mediumImageUrl
          ? { thumbnail: item.mediumImageUrl.replace('http://', 'https://') }
          : undefined,
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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

    const body = await req.json();
    const isbn = normalizeIsbn(String(body?.isbn ?? ''));

    if (!isValidIsbn(isbn)) {
      return new Response(JSON.stringify({ error: 'invalid_isbn' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const proxyUrl = Deno.env.get('RAKUTEN_PROXY_URL');

    if (proxyUrl) {
      const proxySecret = Deno.env.get('RAKUTEN_PROXY_SECRET') ?? '';
      const url = `${proxyUrl.replace(/\/$/, '')}/?isbn=${encodeURIComponent(isbn)}`;
      const headers: Record<string, string> = {};
      if (proxySecret) {
        headers['X-Proxy-Secret'] = proxySecret;
      }
      // ngrok 無料版のブラウザ警告ページをスキップ
      if (proxyUrl.includes('ngrok')) {
        headers['ngrok-skip-browser-warning'] = 'true';
      }

      const proxyResponse = await fetch(url, { headers });
      const responseText = await proxyResponse.text();

      let proxyData: { book?: BookSearchResult | null; error?: string; message?: string };
      try {
        proxyData = JSON.parse(responseText);
      } catch {
        console.error('Proxy returned non-JSON response:', responseText.slice(0, 200));
        return new Response(
          JSON.stringify({
            error: 'proxy_invalid_response',
            message:
              'プロキシが JSON 以外を返しました。ngrok 利用時は ngrok-skip-browser-warning ヘッダーが必要です。',
          }),
          {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      if (proxyData.error === 'rakuten_ip_not_allowed') {
        return new Response(JSON.stringify(proxyData), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (proxyData.error === 'invalid_proxy_secret') {
        return new Response(JSON.stringify({ error: 'invalid_proxy_secret' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ book: proxyData.book ?? null }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const applicationId = Deno.env.get('RAKUTEN_APP_ID');
    const accessKey = Deno.env.get('RAKUTEN_ACCESS_KEY');

    if (!applicationId || !accessKey) {
      return new Response(
        JSON.stringify({
          error: 'rakuten_not_configured',
          message:
            'RAKUTEN_PROXY_URL または RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY が未設定です。',
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const params = new URLSearchParams({
      applicationId,
      accessKey,
      isbn,
      formatVersion: '2',
      hits: '1',
    });

    const response = await fetch(`${RAKUTEN_BOOKS_API}?${params}`);

    if (response.status === 403) {
      return new Response(
        JSON.stringify({
          error: 'rakuten_ip_not_allowed',
          message:
            '楽天APIのIP制限により拒否されました。VPS プロキシ（scripts/rakuten-proxy/server.mjs）を設定してください。',
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!response.ok) {
      console.warn(`Rakuten Books API error: ${response.status}`);
      return new Response(JSON.stringify({ book: null }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data: RakutenBooksResponse = await response.json();
    const rawItem =
      data.items?.[0] ??
      (data.Items?.[0] && 'Item' in data.Items[0] ? data.Items[0].Item : data.Items?.[0]);

    if (!rawItem || typeof rawItem !== 'object' || !('title' in rawItem)) {
      return new Response(JSON.stringify({ book: null }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ book: toBookSearchResult(rawItem, isbn) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('search-book-by-isbn error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
