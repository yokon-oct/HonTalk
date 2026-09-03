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
const RAKUTEN_TOTAL_API =
  'https://openapi.rakuten.co.jp/services/api/BooksTotal/Search/20170404';

function parseRakutenSalesDate(salesDate) {
  if (!salesDate) return undefined;
  const match = salesDate.match(/(\d{4})年(?:(\d{1,2})月(?:(\d{1,2})日)?)?/);
  if (!match) return undefined;
  const [, year, month = '01', day = '01'] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function toBookSearchResult(item, isbn) {
  const resolvedIsbn = (isbn ?? item.isbn ?? '').replace(/[^0-9Xx]/g, '').toUpperCase();
  if (!/^\d{10}$/.test(resolvedIsbn) && !/^\d{13}$/.test(resolvedIsbn)) {
    return null;
  }

  return {
    id: `rakuten:${resolvedIsbn}`,
    volumeInfo: {
      title: item.title,
      authors: item.author ? [item.author] : ['著者不明'],
      publisher: item.publisherName,
      publishedDate: parseRakutenSalesDate(item.salesDate),
      description: item.itemCaption,
      industryIdentifiers: resolvedIsbn ? [{ type: 'ISBN_13', identifier: resolvedIsbn }] : undefined,
      imageLinks: item.largeImageUrl
        ? { thumbnail: item.largeImageUrl.replace('http://', 'https://') }
        : item.mediumImageUrl
          ? { thumbnail: item.mediumImageUrl.replace('http://', 'https://') }
          : undefined,
    },
  };
}

function unwrapRakutenItems(data) {
  if (Array.isArray(data.items)) return data.items;
  if (!Array.isArray(data.Items)) return [];
  return data.Items.map((entry) => entry?.Item ?? entry).filter((item) => item?.title);
}

function isBookLikeGenre(genreId) {
  if (!genreId) return true;
  return /^(001|002|003|004)/.test(genreId);
}

function toSearchResults(data) {
  const seen = new Set();
  const results = [];
  for (const raw of unwrapRakutenItems(data)) {
    if (!isBookLikeGenre(raw.booksGenreId)) continue;
    const mapped = toBookSearchResult(raw);
    if (!mapped?.volumeInfo?.title || seen.has(mapped.id)) continue;
    seen.add(mapped.id);
    results.push(mapped);
  }
  return results;
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
  const query = (url.searchParams.get('q') ?? url.searchParams.get('title') ?? '').trim();

  const commonParams = {
    applicationId: RAKUTEN_APP_ID,
    accessKey: RAKUTEN_ACCESS_KEY,
    formatVersion: '2',
    outOfStockFlag: '1',
  };

  try {
    if (query) {
      const totalParams = new URLSearchParams({ ...commonParams, keyword: query, hits: '20' });
      const totalRes = await fetch(`${RAKUTEN_TOTAL_API}?${totalParams}`);

      if (totalRes.status === 403) {
        return sendJson(res, 502, {
          error: 'rakuten_ip_not_allowed',
          message: 'VPS の IP が楽天の許可リストに未登録です。curl https://api.ipify.org で IP を確認してください。',
        });
      }

      if (totalRes.ok) {
        const totalData = await totalRes.json();
        const books = toSearchResults(totalData);
        if (books.length > 0) {
          return sendJson(res, 200, { books });
        }
      }

      const titleParams = new URLSearchParams({ ...commonParams, title: query, hits: '20' });
      const titleRes = await fetch(`${RAKUTEN_BOOKS_API}?${titleParams}`);

      if (titleRes.status === 403) {
        return sendJson(res, 502, {
          error: 'rakuten_ip_not_allowed',
          message: 'VPS の IP が楽天の許可リストに未登録です。curl https://api.ipify.org で IP を確認してください。',
        });
      }

      if (!titleRes.ok) {
        return sendJson(res, 200, { books: [] });
      }

      const titleData = await titleRes.json();
      return sendJson(res, 200, { books: toSearchResults(titleData) });
    }

    if (!/^\d{10}$/.test(isbn) && !/^\d{13}$/.test(isbn)) {
      return sendJson(res, 400, { error: 'invalid_isbn' });
    }

    const params = new URLSearchParams({
      ...commonParams,
      isbn,
      hits: '1',
    });

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
  console.log('Keyword search: GET /?q=ノルウェイの森');
});
