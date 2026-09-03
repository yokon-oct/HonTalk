// Supabase Edge Function: search-books
//
// 楽天ブックス API でタイトル / 著者キーワード検索を行う。
// Google Books と並列に呼び、日本語書籍の取りこぼしを補う。
//
// - JWT 認証必須（verify_jwt = true）
// - シークレット（直接呼び出し）: RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY
// - シークレット（VPS プロキシ経由）: RAKUTEN_PROXY_URL, RAKUTEN_PROXY_SECRET

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RAKUTEN_BOOKS_API =
  'https://openapi.rakuten.co.jp/services/api/BooksBook/Search/20170404';
const RAKUTEN_TOTAL_API =
  'https://openapi.rakuten.co.jp/services/api/BooksTotal/Search/20170404';

interface RakutenBookItem {
  title: string;
  author: string;
  publisherName?: string;
  isbn?: string;
  itemCaption?: string;
  salesDate?: string;
  largeImageUrl?: string;
  mediumImageUrl?: string;
  booksGenreId?: string;
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

function parseRakutenSalesDate(salesDate?: string): string | undefined {
  if (!salesDate) return undefined;
  const match = salesDate.match(/(\d{4})年(?:(\d{1,2})月(?:(\d{1,2})日)?)?/);
  if (!match) return undefined;
  const [, year, month = '01', day = '01'] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function isBookLikeGenre(genreId?: string): boolean {
  if (!genreId) return true;
  return /^(001|002|003|004)/.test(genreId);
}

function toBookSearchResult(item: RakutenBookItem): BookSearchResult | null {
  const isbn = (item.isbn ?? '').replace(/[^0-9Xx]/g, '').toUpperCase();
  if (!item.title?.trim()) return null;
  if (!/^\d{10}$/.test(isbn) && !/^\d{13}$/.test(isbn)) return null;

  return {
    id: `rakuten:${isbn}`,
    volumeInfo: {
      title: item.title,
      authors: item.author ? [item.author] : ['著者不明'],
      publisher: item.publisherName,
      publishedDate: parseRakutenSalesDate(item.salesDate),
      description: item.itemCaption,
      industryIdentifiers: isbn ? [{ type: 'ISBN_13', identifier: isbn }] : undefined,
      imageLinks: item.largeImageUrl
        ? { thumbnail: item.largeImageUrl.replace('http://', 'https://') }
        : item.mediumImageUrl
          ? { thumbnail: item.mediumImageUrl.replace('http://', 'https://') }
          : undefined,
    },
  };
}

function unwrapRakutenItems(data: RakutenBooksResponse): RakutenBookItem[] {
  if (Array.isArray(data.items)) return data.items;
  if (!Array.isArray(data.Items)) return [];
  return data.Items.map((entry) => ('Item' in entry ? entry.Item : entry)).filter(
    (item): item is RakutenBookItem => !!item && typeof item === 'object' && 'title' in item,
  );
}

function toSearchResults(data: RakutenBooksResponse): BookSearchResult[] {
  const seen = new Set<string>();
  const results: BookSearchResult[] = [];

  for (const raw of unwrapRakutenItems(data)) {
    if (!isBookLikeGenre(raw.booksGenreId)) continue;
    const mapped = toBookSearchResult(raw);
    if (!mapped || seen.has(mapped.id)) continue;
    seen.add(mapped.id);
    results.push(mapped);
  }

  return results;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function searchRakutenDirect(
  query: string,
  applicationId: string,
  accessKey: string,
): Promise<BookSearchResult[]> {
  const common = {
    applicationId,
    accessKey,
    formatVersion: '2',
    hits: '20',
    outOfStockFlag: '1',
  };

  const totalParams = new URLSearchParams({ ...common, keyword: query });
  const totalResponse = await fetch(`${RAKUTEN_TOTAL_API}?${totalParams}`);

  if (totalResponse.ok) {
    const totalData: RakutenBooksResponse = await totalResponse.json();
    const totalItems = toSearchResults(totalData);
    if (totalItems.length > 0) return totalItems;
  }

  const titleParams = new URLSearchParams({ ...common, title: query });
  const titleResponse = await fetch(`${RAKUTEN_BOOKS_API}?${titleParams}`);

  if (titleResponse.status === 403) {
    throw Object.assign(new Error('rakuten_ip_not_allowed'), { code: 'rakuten_ip_not_allowed' });
  }

  if (!titleResponse.ok) return [];

  const titleData: RakutenBooksResponse = await titleResponse.json();
  return toSearchResults(titleData);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'unauthorized' }, 401);
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
      return jsonResponse({ error: 'unauthorized' }, 401);
    }

    const body = await req.json();
    const query = String(body?.query ?? '').trim();

    if (!query) {
      return jsonResponse({ error: 'invalid_query' }, 400);
    }

    const proxyUrl = Deno.env.get('RAKUTEN_PROXY_URL');

    if (proxyUrl) {
      const proxySecret = Deno.env.get('RAKUTEN_PROXY_SECRET') ?? '';
      const url = `${proxyUrl.replace(/\/$/, '')}/?q=${encodeURIComponent(query)}`;
      const headers: Record<string, string> = {};
      if (proxySecret) {
        headers['X-Proxy-Secret'] = proxySecret;
      }
      if (proxyUrl.includes('ngrok')) {
        headers['ngrok-skip-browser-warning'] = 'true';
      }

      const proxyResponse = await fetch(url, { headers });
      const responseText = await proxyResponse.text();

      let proxyData: { books?: BookSearchResult[]; book?: BookSearchResult | null; error?: string };
      try {
        proxyData = JSON.parse(responseText);
      } catch {
        return jsonResponse({ error: 'proxy_invalid_response' }, 502);
      }

      if (proxyData.error === 'rakuten_ip_not_allowed') {
        return jsonResponse(proxyData, 502);
      }

      if (proxyData.error === 'invalid_proxy_secret') {
        return jsonResponse({ error: 'invalid_proxy_secret' }, 502);
      }

      const items = Array.isArray(proxyData.books)
        ? proxyData.books
        : proxyData.book
          ? [proxyData.book]
          : [];
      return jsonResponse({ items });
    }

    const applicationId = Deno.env.get('RAKUTEN_APP_ID');
    const accessKey = Deno.env.get('RAKUTEN_ACCESS_KEY');

    if (!applicationId || !accessKey) {
      return jsonResponse(
        {
          error: 'rakuten_not_configured',
          message: 'RAKUTEN_PROXY_URL または RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY が未設定です。',
        },
        503,
      );
    }

    try {
      const items = await searchRakutenDirect(query, applicationId, accessKey);
      return jsonResponse({ items });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'rakuten_ip_not_allowed') {
        return jsonResponse(
          {
            error: 'rakuten_ip_not_allowed',
            message:
              '楽天APIのIP制限により拒否されました。VPS プロキシ（scripts/rakuten-proxy/server.mjs）を設定してください。',
          },
          502,
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('search-books error:', error);
    return jsonResponse({ error: String(error) }, 500);
  }
});
