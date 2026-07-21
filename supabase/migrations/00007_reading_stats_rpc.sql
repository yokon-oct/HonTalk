-- ==========================================
-- Migration 00007: Reading Statistics RPC
-- ==========================================

-- 読書統計を一括取得する RPC 関数
-- 月別読了冊数・ジャンル別冊数・評価分布・サマリーを返す
CREATE OR REPLACE FUNCTION public.get_reading_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;

    -- サマリー
    v_total_finished     INTEGER;
    v_total_reading      INTEGER;
    v_total_want         INTEGER;
    v_year_finished      INTEGER;
    v_year_reading       INTEGER;

    -- 月別（過去12ヶ月）
    v_monthly            JSONB;

    -- ジャンル別
    v_by_genre           JSONB;

    -- 評価分布
    v_ratings            JSONB;

    v_current_year       INTEGER := EXTRACT(YEAR FROM NOW())::INTEGER;
    v_12months_ago       TIMESTAMPTZ := NOW() - INTERVAL '11 months';
    v_month_start        TIMESTAMPTZ;
BEGIN
    -- ==========================================
    -- A. サマリー集計
    -- ==========================================

    SELECT
        COUNT(*) FILTER (WHERE rr.status = 'finished'),
        COUNT(*) FILTER (WHERE rr.status = 'reading'),
        COUNT(*) FILTER (WHERE rr.status = 'want_to_read')
    INTO v_total_finished, v_total_reading, v_total_want
    FROM public.reading_records rr
    WHERE rr.user_id = p_user_id;

    -- 今年の読了・読書中
    SELECT
        COUNT(*) FILTER (WHERE rr.status = 'finished'),
        COUNT(*) FILTER (WHERE rr.status = 'reading')
    INTO v_year_finished, v_year_reading
    FROM public.reading_records rr
    WHERE rr.user_id = p_user_id
      AND EXTRACT(YEAR FROM rr.updated_at) = v_current_year;

    -- ==========================================
    -- B. 月別読了冊数（過去12ヶ月）
    -- ==========================================
    v_month_start := DATE_TRUNC('month', NOW() - INTERVAL '11 months');

    SELECT jsonb_agg(
        jsonb_build_object(
            'year',  EXTRACT(YEAR FROM gs.month)::INTEGER,
            'month', EXTRACT(MONTH FROM gs.month)::INTEGER,
            'count', COALESCE(monthly_counts.cnt, 0)
        )
        ORDER BY gs.month
    )
    INTO v_monthly
    FROM generate_series(
        v_month_start,
        DATE_TRUNC('month', NOW()),
        INTERVAL '1 month'
    ) AS gs(month)
    LEFT JOIN (
        SELECT
            DATE_TRUNC('month', rr.updated_at) AS month,
            COUNT(*)::INTEGER AS cnt
        FROM public.reading_records rr
        WHERE rr.user_id = p_user_id
          AND rr.status = 'finished'
          AND rr.updated_at >= v_month_start
        GROUP BY DATE_TRUNC('month', rr.updated_at)
    ) AS monthly_counts ON gs.month = monthly_counts.month;

    -- ==========================================
    -- C. ジャンル別冊数（上位10件）
    -- ==========================================
    SELECT jsonb_agg(
        jsonb_build_object(
            'genre', COALESCE(b.genre, 'その他'),
            'count', genre_counts.cnt
        )
        ORDER BY genre_counts.cnt DESC
    )
    INTO v_by_genre
    FROM (
        SELECT
            b.genre,
            COUNT(*)::INTEGER AS cnt
        FROM public.reading_records rr
        JOIN public.books b ON rr.book_id = b.id
        WHERE rr.user_id = p_user_id
        GROUP BY b.genre
        ORDER BY cnt DESC
        LIMIT 10
    ) AS genre_counts
    JOIN public.books b ON b.genre = genre_counts.genre OR (b.genre IS NULL AND genre_counts.genre IS NULL)
    GROUP BY genre_counts.genre, genre_counts.cnt;

    -- ジャンル別は単純集計で再実装（サブクエリのJOINが複雑なため）
    SELECT jsonb_agg(
        jsonb_build_object(
            'genre', COALESCE(g.genre, 'その他'),
            'count', g.cnt
        )
        ORDER BY g.cnt DESC
    )
    INTO v_by_genre
    FROM (
        SELECT
            COALESCE(b.genre, 'その他') AS genre,
            COUNT(*)::INTEGER AS cnt
        FROM public.reading_records rr
        JOIN public.books b ON rr.book_id = b.id
        WHERE rr.user_id = p_user_id
        GROUP BY COALESCE(b.genre, 'その他')
        ORDER BY cnt DESC
        LIMIT 10
    ) AS g;

    -- ==========================================
    -- D. 評価分布（★1〜5）
    -- ==========================================
    SELECT jsonb_agg(
        jsonb_build_object(
            'rating', r.rating_val,
            'count',  COALESCE(rating_counts.cnt, 0)
        )
        ORDER BY r.rating_val
    )
    INTO v_ratings
    FROM (SELECT generate_series(1, 5) AS rating_val) AS r
    LEFT JOIN (
        SELECT
            rr.rating,
            COUNT(*)::INTEGER AS cnt
        FROM public.reading_records rr
        WHERE rr.user_id = p_user_id
          AND rr.rating IS NOT NULL
        GROUP BY rr.rating
    ) AS rating_counts ON r.rating_val = rating_counts.rating;

    -- ==========================================
    -- E. 結果を JSON にまとめて返す
    -- ==========================================
    v_result := jsonb_build_object(
        'summary', jsonb_build_object(
            'total_finished',  v_total_finished,
            'total_reading',   v_total_reading,
            'total_want',      v_total_want,
            'year_finished',   v_year_finished,
            'year_reading',    v_year_reading
        ),
        'monthly',   COALESCE(v_monthly,  '[]'::JSONB),
        'by_genre',  COALESCE(v_by_genre, '[]'::JSONB),
        'ratings',   COALESCE(v_ratings,  '[]'::JSONB)
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
