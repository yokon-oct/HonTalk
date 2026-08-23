/**
 * 楽天ブックス API 用 固定IPプロキシ（VPS で実行）
 *
 * Supabase Edge Functions の出口 IP は固定されないため、
 * 固定 IP を持つ VPS 上でこのサーバーを動かし、
 * 楽天ウェブサービスの「許可されたIPアドレス」に VPS の IP を登録する。
 *
 * 起動:
 *   RAKUTEN_APP_ID=xxx RAKUTEN_ACCESS_KEY=xxx PROXY_SECRET=任意の秘密文字列 \
 *     node scripts/rakuten-proxy/server.mjs
 *
 * VPS の IP 確認:
 *   curl https://api.ipify.org
 */

import http from 'node:http';

const PORT = Number(process.env.PORT ?? 8787);
const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID;
const RAKUTEN_ACCESS_KEY = process.env.RAKUTEN_ACCESS_KEY;
const PROXY_SECRET = process.env.PROXY_SECRET ?? '';
const RAKUTEN_BOOKS_API =
  'https://openapi.rakuten.co.jp/services/api/BooksBook/Search/20170404';

function parseRakutenSalesDate(salesDate) {
  if (!salesDate) return undefined;
  const match = salesDate.match(/(\d{4})年(?:(\d{1,2})月(?:(\d{1,2})日)?)?/);
  if (!match) return undefined;
  const [, year, month = '01', day = '01'] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function toBookSearchResult(item, isbn) {
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

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'method_not_allowed' });
  }

  if (PROXY_SECRET && req.headers['x-proxy-secret'] !== PROXY_SECRET) {
    return sendJson(res, 401, { error: 'invalid_proxy_secret' });
  }

  if (!RAKUTEN_APP_ID || !RAKUTEN_ACCESS_KEY) {
    return sendJson(res, 503, { error: 'rakuten_not_configured' });
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const isbn = (url.searchParams.get('isbn') ?? '').replace(/[^0-9Xx]/g, '').toUpperCase();

  if (!/^\d{10}$/.test(isbn) && !/^\d{13}$/.test(isbn)) {
    return sendJson(res, 400, { error: 'invalid_isbn' });
  }

  const params = new URLSearchParams({
    applicationId: RAKUTEN_APP_ID,
    accessKey: RAKUTEN_ACCESS_KEY,
    isbn,
    formatVersion: '2',
    hits: '1',
  });

  try {
    const rakutenRes = await fetch(`${RAKUTEN_BOOKS_API}?${params}`);

    if (rakutenRes.status === 403) {
      return sendJson(res, 502, {
        error: 'rakuten_ip_not_allowed',
        message: 'VPS の IP が楽天の許可リストに未登録です。curl https://api.ipify.org で IP を確認してください。',
      });
    }

    if (!rakutenRes.ok) {
      return sendJson(res, 200, { book: null });
    }

    const data = await rakutenRes.json();
    const rawItem =
      data.items?.[0] ??
      (data.Items?.[0]?.Item ?? data.Items?.[0]);

    if (!rawItem?.title) {
      return sendJson(res, 200, { book: null });
    }

    return sendJson(res, 200, { book: toBookSearchResult(rawItem, isbn) });
  } catch (error) {
    console.error('proxy error:', error);
    return sendJson(res, 500, { error: String(error) });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Rakuten proxy listening on http://0.0.0.0:${PORT}`);
  console.log('Health check: GET /?isbn=9784101001014');
});
