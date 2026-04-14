export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      beta_feedback: {
        Row: {
          created_at: string
          feedback_text: string
          id: string
          screen_context: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_text: string
          id?: string
          screen_context?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_text?: string
          id?: string
          screen_context?: string | null
          user_id?: string
        }
        Relationships: []
      }
      community_members: {
        Row: {
          community_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      crisis_events: {
        Row: {
          age_group: string | null
          id: string
          keyword: string
          routed_at: string
        }
        Insert: {
          age_group?: string | null
          id?: string
          keyword: string
          routed_at?: string
        }
        Update: {
          age_group?: string | null
          id?: string
          keyword?: string
          routed_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      family_members: {
        Row: {
          family_id: string
          id: string
          invited_at: string | null
          joined_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          family_id: string
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          family_id?: string
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_agent_runs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          status: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      journal_insights: {
        Row: {
          created_at: string
          entry_count: number
          id: string
          insight_text: string
          primary_theme: string
          question_count: number
          scripture_ref: string | null
          scripture_text: string | null
          themes: string[]
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          entry_count?: number
          id?: string
          insight_text: string
          primary_theme: string
          question_count?: number
          scripture_ref?: string | null
          scripture_text?: string | null
          themes?: string[]
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          entry_count?: number
          id?: string
          insight_text?: string
          primary_theme?: string
          question_count?: number
          scripture_ref?: string | null
          scripture_text?: string | null
          themes?: string[]
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      language_waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          language_code: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          language_code: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          language_code?: string
        }
        Relationships: []
      }
      processed_webhook_events: {
        Row: {
          event_id: string
          event_type: string | null
          processed_at: string | null
        }
        Insert: {
          event_id: string
          event_type?: string | null
          processed_at?: string | null
        }
        Update: {
          event_id?: string
          event_type?: string | null
          processed_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_group: string | null
          beta_granted_at: string | null
          beta_granted_by: string | null
          beta_notes: string | null
          created_at: string
          grace_period_until: string | null
          id: string
          is_suspended: boolean | null
          language_preference: string
          plan: string
          preferred_bible_version: string
          preferred_currency: string | null
          previous_role: string | null
          role: string
          role_changed_at: string | null
          role_changed_by: string | null
          stripe_customer_id: string | null
          suspended_at: string | null
          suspended_by: string | null
          trial_converted: boolean
          trial_ends_at: string | null
          trial_nudge_sent: Json
          trial_started_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_group?: string | null
          beta_granted_at?: string | null
          beta_granted_by?: string | null
          beta_notes?: string | null
          created_at?: string
          grace_period_until?: string | null
          id?: string
          is_suspended?: boolean | null
          language_preference?: string
          plan?: string
          preferred_bible_version?: string
          preferred_currency?: string | null
          previous_role?: string | null
          role?: string
          role_changed_at?: string | null
          role_changed_by?: string | null
          stripe_customer_id?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          trial_converted?: boolean
          trial_ends_at?: string | null
          trial_nudge_sent?: Json
          trial_started_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_group?: string | null
          beta_granted_at?: string | null
          beta_granted_by?: string | null
          beta_notes?: string | null
          created_at?: string
          grace_period_until?: string | null
          id?: string
          is_suspended?: boolean | null
          language_preference?: string
          plan?: string
          preferred_bible_version?: string
          preferred_currency?: string | null
          previous_role?: string | null
          role?: string
          role_changed_at?: string | null
          role_changed_by?: string | null
          stripe_customer_id?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          trial_converted?: boolean
          trial_ends_at?: string | null
          trial_nudge_sent?: Json
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          endpoint: string
          id: string
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          endpoint?: string
          id?: string
          request_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          endpoint?: string
          id?: string
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      rate_limits_anonymous: {
        Row: {
          count: number | null
          created_at: string | null
          key: string
        }
        Insert: {
          count?: number | null
          created_at?: string | null
          key: string
        }
        Update: {
          count?: number | null
          created_at?: string | null
          key?: string
        }
        Relationships: []
      }
      reflection_entries: {
        Row: {
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          title: string | null
          updated_at: string
          user_id: string
          writing_prompt: string | null
        }
        Insert: {
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
          writing_prompt?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
          writing_prompt?: string | null
        }
        Relationships: []
      }
      role_change_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_role: string | null
          notes: string | null
          old_role: string | null
          target_user_id: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_role?: string | null
          notes?: string | null
          old_role?: string | null
          target_user_id?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_role?: string | null
          notes?: string | null
          old_role?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      saved_verses: {
        Row: {
          book: string
          chapter: number
          created_at: string
          id: string
          session_id: string | null
          user_id: string
          verse_number: number
          verse_text: string
          version: string
        }
        Insert: {
          book: string
          chapter: number
          created_at?: string
          id?: string
          session_id?: string | null
          user_id: string
          verse_number: number
          verse_text: string
          version?: string
        }
        Update: {
          book?: string
          chapter?: number
          created_at?: string
          id?: string
          session_id?: string | null
          user_id?: string
          verse_number?: number
          verse_text?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_verses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "wisdom_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_themes: {
        Row: {
          confidence: number
          id: string
          session_id: string
          theme: string
        }
        Insert: {
          confidence?: number
          id?: string
          session_id: string
          theme: string
        }
        Update: {
          confidence?: number
          id?: string
          session_id?: string
          theme?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_themes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "wisdom_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_cycle: string | null
          created_at: string
          id: string
          plan_type: string
          presentment_amount: number | null
          presentment_currency: string | null
          status: string
          stripe_subscription_id: string | null
          user_id: string
        }
        Insert: {
          billing_cycle?: string | null
          created_at?: string
          id?: string
          plan_type?: string
          presentment_amount?: number | null
          presentment_currency?: string | null
          status?: string
          stripe_subscription_id?: string | null
          user_id: string
        }
        Update: {
          billing_cycle?: string | null
          created_at?: string
          id?: string
          plan_type?: string
          presentment_amount?: number | null
          presentment_currency?: string | null
          status?: string
          stripe_subscription_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_prompts: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          version: string
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          version: string
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          version?: string
        }
        Relationships: []
      }
      usage_daily: {
        Row: {
          date: string
          id: string
          question_count: number
          user_id: string | null
        }
        Insert: {
          date?: string
          id?: string
          question_count?: number
          user_id?: string | null
        }
        Update: {
          date?: string
          id?: string
          question_count?: number
          user_id?: string | null
        }
        Relationships: []
      }
      user_patterns: {
        Row: {
          first_seen: string
          id: string
          last_seen: string
          occurrence: number
          theme: string
          user_id: string
        }
        Insert: {
          first_seen?: string
          id?: string
          last_seen?: string
          occurrence?: number
          theme: string
          user_id: string
        }
        Update: {
          first_seen?: string
          id?: string
          last_seen?: string
          occurrence?: number
          theme?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verse_annotations: {
        Row: {
          created_at: string
          id: string
          note: string
          saved_verse_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note: string
          saved_verse_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          saved_verse_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verse_annotations_saved_verse_id_fkey"
            columns: ["saved_verse_id"]
            isOneToOne: false
            referencedRelation: "saved_verses"
            referencedColumns: ["id"]
          },
        ]
      }
      wisdom_sessions: {
        Row: {
          created_at: string
          expires_at: string | null
          flagged: boolean
          id: string
          question: string
          response: string
          saved_to_journal: boolean | null
          scripture_refs: string[] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          flagged?: boolean
          id?: string
          question: string
          response: string
          saved_to_journal?: boolean | null
          scripture_refs?: string[] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          flagged?: boolean
          id?: string
          question?: string
          response?: string
          saved_to_journal?: boolean | null
          scripture_refs?: string[] | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_age_group: { Args: { dob: string }; Returns: string }
      cleanup_anon_rate_limits: { Args: never; Returns: undefined }
      cleanup_deleted_reflections: { Args: never; Returns: undefined }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_community_admin: {
        Args: { _community_id: string; _user_id: string }
        Returns: boolean
      }
      is_family_owner: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
