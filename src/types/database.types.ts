/**
 * Supabase Database 型定義（プレースホルダー）
 *
 * 本番ではsupabase gen types typescriptコマンドで自動生成する。
 * 開発初期はこの手動型定義を使用する。
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nickname: string;
          avatar_url: string | null;
          bio: string;
          favorite_genres: string[];
          privacy_setting: 'public' | 'followers_only' | 'private';
          is_premium: boolean;
          notification_settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nickname: string;
          avatar_url?: string | null;
          bio?: string;
          favorite_genres?: string[];
          privacy_setting?: 'public' | 'followers_only' | 'private';
          is_premium?: boolean;
          notification_settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: any[];
        Update: {
          id?: string;
          nickname?: string;
          avatar_url?: string | null;
          bio?: string;
          favorite_genres?: string[];
          privacy_setting?: 'public' | 'followers_only' | 'private';
          is_premium?: boolean;
          notification_settings?: Json;
          updated_at?: string;
        };
      };
      books: {
        Row: {
          id: string;
          title: string;
          author: string;
          publisher: string | null;
          isbn: string | null;
          cover_image_url: string | null;
          genre: string | null;
          page_count: number | null;
          published_date: string | null;
          description: string | null;
          google_books_id: string | null;
          rakuten_books_id: string | null;
          average_rating: number;
          rating_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          author: string;
          publisher?: string | null;
          isbn?: string | null;
          cover_image_url?: string | null;
          genre?: string | null;
          page_count?: number | null;
          published_date?: string | null;
          description?: string | null;
          google_books_id?: string | null;
          rakuten_books_id?: string | null;
          average_rating?: number;
          rating_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: any[];
        Update: {
          title?: string;
          author?: string;
          publisher?: string | null;
          isbn?: string | null;
          cover_image_url?: string | null;
          genre?: string | null;
          page_count?: number | null;
          published_date?: string | null;
          description?: string | null;
          average_rating?: number;
          rating_count?: number;
          updated_at?: string;
        };
      };
      reading_records: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          status: 'want_to_read' | 'reading' | 'finished';
          rating: number | null;
          start_date: string | null;
          end_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id: string;
          status?: 'want_to_read' | 'reading' | 'finished';
          rating?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: any[];
        Update: {
          status?: 'want_to_read' | 'reading' | 'finished';
          rating?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          updated_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          book_id: string | null;
          reading_record_id: string | null;
          content: string;
          is_public: boolean;
          has_spoiler: boolean;
          like_count: number;
          comment_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id?: string | null;
          reading_record_id?: string | null;
          content: string;
          is_public?: boolean;
          has_spoiler?: boolean;
          like_count?: number;
          comment_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: any[];
        Update: {
          content?: string;
          is_public?: boolean;
          has_spoiler?: boolean;
          like_count?: number;
          comment_count?: number;
          updated_at?: string;
        };
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Relationships: any[];
        Update: {
          id?: string;
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
      };
      likes: {
        Row: {
          id: string;
          user_id: string;
          review_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          review_id: string;
          created_at?: string;
        };
        Relationships: any[];
        Update: {
          id?: string;
          user_id?: string;
          review_id?: string;
          created_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          user_id: string;
          review_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          review_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: any[];
        Update: {
          content?: string;
          updated_at?: string;
        };
      };
      shelves: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          is_default: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          is_default?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: any[];
        Update: {
          name?: string;
          sort_order?: number;
        };
      };
      shelf_books: {
        Row: {
          id: string;
          shelf_id: string;
          book_id: string;
          added_at: string;
        };
        Insert: {
          id?: string;
          shelf_id: string;
          book_id: string;
          added_at?: string;
        };
        Relationships: any[];
        Update: {
          id?: string;
          shelf_id?: string;
          book_id?: string;
          added_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          actor_id: string | null;
          type: 'like' | 'comment' | 'follow' | 'recommend' | 'system';
          reference_type: string | null;
          reference_id: string | null;
          message: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          actor_id?: string | null;
          type: 'like' | 'comment' | 'follow' | 'recommend' | 'system';
          reference_type?: string | null;
          reference_id?: string | null;
          message?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: any[];
        Update: {
          is_read?: boolean;
        };
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: any[];
        Update: {
          is_read?: boolean;
        };
      };
      blocks: {
        Row: {
          id: string;
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        Relationships: any[];
        Update: {
          id?: string;
          blocker_id?: string;
          blocked_id?: string;
          created_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: 'user' | 'review' | 'comment';
          target_id: string;
          category: 'spam' | 'inappropriate' | 'harassment' | 'other';
          description: string | null;
          status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: 'user' | 'review' | 'comment';
          target_id: string;
          category: 'spam' | 'inappropriate' | 'harassment' | 'other';
          description?: string | null;
          status?: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
          created_at?: string;
        };
        Relationships: any[];
        Update: {
          status?: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
        };
      };
    };
    Functions: {
      get_timeline: {
        Args: {
          p_user_id?: string;
          p_limit?: number;
          p_offset?: number;
          p_following_only?: boolean;
        };
        Returns: {
          id: string;
          book_id: string | null;
          book_title: string | null;
          book_author: string | null;
          book_cover_url: string | null;
          rating: number | null;
          content: string;
          is_spoiler: boolean;
          likes_count: number;
          comments_count: number;
          created_at: string;
          user_id: string;
          user_nickname: string;
          user_avatar_url: string | null;
          is_liked: boolean;
        }[];
      };
      get_following_timeline: {
        Args: {
          p_user_id: string;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          id: string;
          book_id: string | null;
          book_title: string | null;
          book_author: string | null;
          book_cover_url: string | null;
          rating: number | null;
          content: string;
          is_spoiler: boolean;
          likes_count: number;
          comments_count: number;
          created_at: string;
          user_id: string;
          user_nickname: string;
          user_avatar_url: string | null;
          is_liked: boolean;
        }[];
      };
      get_profile_stats: {
        Args: {
          p_user_id: string;
        };
        Returns: {
          followers_count: number;
          following_count: number;
          read_count: number;
          want_to_read_count: number;
        };
      };
      create_notification: {
        Args: {
          p_user_id: string;
          p_actor_id: string;
          p_type: string;
          p_reference_type?: string | null;
          p_reference_id?: string | null;
          p_message?: string | null;
        };
        Returns: void;
      };
      check_nickname_availability: {
        Args: {
          p_nickname: string;
        };
        Returns: boolean;
      };
      is_blocking: {
        Args: {
          p_blocker_id: string;
          p_blocked_id: string;
        };
        Returns: boolean;
      };
      get_blocked_users: {
        Args: {
          p_user_id: string;
        };
        Returns: {
          block_id: string;
          blocked_at: string;
          user_id: string;
          nickname: string;
          avatar_url: string | null;
          bio: string;
        }[];
      };
      submit_report: {
        Args: {
          p_reporter_id: string;
          p_target_type: string;
          p_target_id: string;
          p_category: string;
          p_description?: string | null;
        };
        Returns: Json;
      };
      get_reading_stats: {
        Args: {
          p_user_id: string;
        };
        Returns: Json;
      };
    };
    Views: {};
    CompositeTypes: {};
    Enums: {};
  };
}
