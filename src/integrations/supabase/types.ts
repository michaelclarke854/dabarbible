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
      app_sessions: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          screen_count: number
          session_id: string
          started_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          screen_count?: number
          session_id: string
          started_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          screen_count?: number
          session_id?: string
          started_at?: string
          updated_at?: string
          user_id?: string | null
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
      bible_verses: {
        Row: {
          book_name: string
          book_order: number
          book_slug: string
          chapter: number
          text: string
          text_norm: string
          verse: number
          version: string
        }
        Insert: {
          book_name: string
          book_order: number
          book_slug: string
          chapter: number
          text: string
          text_norm: string
          verse: number
          version: string
        }
        Update: {
          book_name?: string
          book_order?: number
          book_slug?: string
          chapter?: number
          text?: string
          text_norm?: string
          verse?: number
          version?: string
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
      congregation_pulse: {
        Row: {
          ai_draft: string | null
          ai_verses: Json | null
          ai_word_count: number | null
          broadcast_sent: boolean
          broadcast_sent_at: string | null
          community_id: string
          created_at: string
          email_sent_at: string | null
          email_sent_to_pastor: boolean
          grateful: number
          had_activity: boolean
          id: string
          searching: number
          struggling: number
          top_categories: Json | null
          week_start: string
        }
        Insert: {
          ai_draft?: string | null
          ai_verses?: Json | null
          ai_word_count?: number | null
          broadcast_sent?: boolean
          broadcast_sent_at?: string | null
          community_id: string
          created_at?: string
          email_sent_at?: string | null
          email_sent_to_pastor?: boolean
          grateful?: number
          had_activity?: boolean
          id?: string
          searching?: number
          struggling?: number
          top_categories?: Json | null
          week_start: string
        }
        Update: {
          ai_draft?: string | null
          ai_verses?: Json | null
          ai_word_count?: number | null
          broadcast_sent?: boolean
          broadcast_sent_at?: string | null
          community_id?: string
          created_at?: string
          email_sent_at?: string | null
          email_sent_to_pastor?: boolean
          grateful?: number
          had_activity?: boolean
          id?: string
          searching?: number
          struggling?: number
          top_categories?: Json | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "congregation_pulse_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "pastoral_communities"
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
      crisis_log: {
        Row: {
          id: string
          keyword_matched: string
          session_id: string | null
          severity: string
          severity_reason: string | null
          triggered_at: string | null
        }
        Insert: {
          id?: string
          keyword_matched: string
          session_id?: string | null
          severity?: string
          severity_reason?: string | null
          triggered_at?: string | null
        }
        Update: {
          id?: string
          keyword_matched?: string
          session_id?: string | null
          severity?: string
          severity_reason?: string | null
          triggered_at?: string | null
        }
        Relationships: []
      }
      dabar_blog_posts: {
        Row: {
          article_type: string
          author_name: string
          awareness_level: number | null
          bible_books: string[] | null
          content: string
          created_at: string
          denomination: string | null
          excerpt: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          og_title: string | null
          pillar_slug: string | null
          primary_keyword: string | null
          published: boolean
          published_at: string | null
          reading_time_minutes: number | null
          schema_faq: Json | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          article_type?: string
          author_name?: string
          awareness_level?: number | null
          bible_books?: string[] | null
          content: string
          created_at?: string
          denomination?: string | null
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_title?: string | null
          pillar_slug?: string | null
          primary_keyword?: string | null
          published?: boolean
          published_at?: string | null
          reading_time_minutes?: number | null
          schema_faq?: Json | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          article_type?: string
          author_name?: string
          awareness_level?: number | null
          bible_books?: string[] | null
          content?: string
          created_at?: string
          denomination?: string | null
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_title?: string | null
          pillar_slug?: string | null
          primary_keyword?: string | null
          published?: boolean
          published_at?: string | null
          reading_time_minutes?: number | null
          schema_faq?: Json | null
          slug?: string
          title?: string
          updated_at?: string
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
      email_templates: {
        Row: {
          body: string
          created_at: string
          denomination: string
          id: string
          is_active: boolean
          step: number
          subject: string
          template_key: string
          updated_at: string
          version: number
        }
        Insert: {
          body: string
          created_at?: string
          denomination?: string
          id?: string
          is_active?: boolean
          step: number
          subject: string
          template_key: string
          updated_at?: string
          version?: number
        }
        Update: {
          body?: string
          created_at?: string
          denomination?: string
          id?: string
          is_active?: boolean
          step?: number
          subject?: string
          template_key?: string
          updated_at?: string
          version?: number
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
      funnel_events: {
        Row: {
          anon_session_id: string | null
          created_at: string
          event_name: string
          id: string
          metadata: Json | null
          screen: string | null
          user_id: string | null
        }
        Insert: {
          anon_session_id?: string | null
          created_at?: string
          event_name: string
          id?: string
          metadata?: Json | null
          screen?: string | null
          user_id?: string | null
        }
        Update: {
          anon_session_id?: string | null
          created_at?: string
          event_name?: string
          id?: string
          metadata?: Json | null
          screen?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      generated_videos: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          public_url: string | null
          reflection_theme: string | null
          render_status: string
          storage_path: string | null
          verse_ref: string | null
          verse_text: string | null
          video_type: string
          week_start: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          public_url?: string | null
          reflection_theme?: string | null
          render_status?: string
          storage_path?: string | null
          verse_ref?: string | null
          verse_text?: string | null
          video_type: string
          week_start: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          public_url?: string | null
          reflection_theme?: string | null
          render_status?: string
          storage_path?: string | null
          verse_ref?: string | null
          verse_text?: string | null
          video_type?: string
          week_start?: string
        }
        Relationships: []
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
      lead_gen_log: {
        Row: {
          errors: string[] | null
          id: string
          leads_found: number
          leads_inserted: number
          leads_skipped: number
          run_at: string
          sources_searched: string[] | null
          status: string
        }
        Insert: {
          errors?: string[] | null
          id?: string
          leads_found?: number
          leads_inserted?: number
          leads_skipped?: number
          run_at?: string
          sources_searched?: string[] | null
          status?: string
        }
        Update: {
          errors?: string[] | null
          id?: string
          leads_found?: number
          leads_inserted?: number
          leads_skipped?: number
          run_at?: string
          sources_searched?: string[] | null
          status?: string
        }
        Relationships: []
      }
      onboarding_intent: {
        Row: {
          created_at: string | null
          id: string
          intent_key: string
          intent_label: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          intent_key: string
          intent_label: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          intent_key?: string
          intent_label?: string
          user_id?: string
        }
        Relationships: []
      }
      outreach_config: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      outreach_email_log: {
        Row: {
          body_preview: string | null
          clicked_at: string | null
          delivered_at: string | null
          id: string
          lead_id: string
          opened_at: string | null
          resend_id: string | null
          sent_at: string | null
          sequence_step: number
          status: string
          subject: string
        }
        Insert: {
          body_preview?: string | null
          clicked_at?: string | null
          delivered_at?: string | null
          id?: string
          lead_id: string
          opened_at?: string | null
          resend_id?: string | null
          sent_at?: string | null
          sequence_step?: number
          status?: string
          subject: string
        }
        Update: {
          body_preview?: string | null
          clicked_at?: string | null
          delivered_at?: string | null
          id?: string
          lead_id?: string
          opened_at?: string | null
          resend_id?: string | null
          sent_at?: string | null
          sequence_step?: number
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_email_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "pastor_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_reply_log: {
        Row: {
          agent_response_sent: boolean | null
          body_preview: string | null
          from_email: string
          from_name: string | null
          id: string
          intent: string | null
          lead_id: string | null
          processed: boolean | null
          received_at: string | null
          subject: string | null
        }
        Insert: {
          agent_response_sent?: boolean | null
          body_preview?: string | null
          from_email: string
          from_name?: string | null
          id?: string
          intent?: string | null
          lead_id?: string | null
          processed?: boolean | null
          received_at?: string | null
          subject?: string | null
        }
        Update: {
          agent_response_sent?: boolean | null
          body_preview?: string | null
          from_email?: string
          from_name?: string | null
          id?: string
          intent?: string | null
          lead_id?: string | null
          processed?: boolean | null
          received_at?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_reply_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "pastor_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      pastor_leads: {
        Row: {
          church_name: string
          church_size: string | null
          country_code: string
          created_at: string | null
          denomination: string | null
          email: string
          email_verified: boolean
          email_verified_at: string | null
          id: string
          initial_sent_at: string | null
          internal_notes: string | null
          language: string
          last_contacted_at: string | null
          pastor_name: string
          reply_received_at: string | null
          source: string
          source_url: string | null
          status: string
          suppressed: boolean | null
          trial_started_at: string | null
        }
        Insert: {
          church_name: string
          church_size?: string | null
          country_code?: string
          created_at?: string | null
          denomination?: string | null
          email: string
          email_verified?: boolean
          email_verified_at?: string | null
          id?: string
          initial_sent_at?: string | null
          internal_notes?: string | null
          language?: string
          last_contacted_at?: string | null
          pastor_name: string
          reply_received_at?: string | null
          source?: string
          source_url?: string | null
          status?: string
          suppressed?: boolean | null
          trial_started_at?: string | null
        }
        Update: {
          church_name?: string
          church_size?: string | null
          country_code?: string
          created_at?: string | null
          denomination?: string | null
          email?: string
          email_verified?: boolean
          email_verified_at?: string | null
          id?: string
          initial_sent_at?: string | null
          internal_notes?: string | null
          language?: string
          last_contacted_at?: string | null
          pastor_name?: string
          reply_received_at?: string | null
          source?: string
          source_url?: string | null
          status?: string
          suppressed?: boolean | null
          trial_started_at?: string | null
        }
        Relationships: []
      }
      pastor_message_drafts: {
        Row: {
          community_id: string
          created_at: string
          id: string
          outline: string
          pastor_id: string
          question_count: number
          scripture_refs: string[]
          share_token: string | null
          status: string
          theme: string
          title: string
          updated_at: string
        }
        Insert: {
          community_id: string
          created_at?: string
          id?: string
          outline: string
          pastor_id: string
          question_count?: number
          scripture_refs?: string[]
          share_token?: string | null
          status?: string
          theme: string
          title: string
          updated_at?: string
        }
        Update: {
          community_id?: string
          created_at?: string
          id?: string
          outline?: string
          pastor_id?: string
          question_count?: number
          scripture_refs?: string[]
          share_token?: string | null
          status?: string
          theme?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pastor_message_drafts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "pastoral_communities"
            referencedColumns: ["id"]
          },
        ]
      }
      pastoral_access_applications: {
        Row: {
          approved_at: string | null
          church_name: string
          church_size: string | null
          country: string | null
          created_at: string | null
          denomination: string | null
          email: string
          how_heard: string | null
          id: string
          pastor_name: string
          status: string
        }
        Insert: {
          approved_at?: string | null
          church_name: string
          church_size?: string | null
          country?: string | null
          created_at?: string | null
          denomination?: string | null
          email: string
          how_heard?: string | null
          id?: string
          pastor_name: string
          status?: string
        }
        Update: {
          approved_at?: string | null
          church_name?: string
          church_size?: string | null
          country?: string | null
          created_at?: string | null
          denomination?: string | null
          email?: string
          how_heard?: string | null
          id?: string
          pastor_name?: string
          status?: string
        }
        Relationships: []
      }
      pastoral_announcements: {
        Row: {
          community_id: string
          delivered_count: number
          id: string
          message_body: string
          pastor_id: string
          pulse_id: string | null
          recipient_count: number
          scripture_refs: string[]
          sent_at: string
        }
        Insert: {
          community_id: string
          delivered_count?: number
          id?: string
          message_body: string
          pastor_id: string
          pulse_id?: string | null
          recipient_count?: number
          scripture_refs?: string[]
          sent_at?: string
        }
        Update: {
          community_id?: string
          delivered_count?: number
          id?: string
          message_body?: string
          pastor_id?: string
          pulse_id?: string | null
          recipient_count?: number
          scripture_refs?: string[]
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pastoral_announcements_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "pastoral_communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pastoral_announcements_pulse_id_fkey"
            columns: ["pulse_id"]
            isOneToOne: false
            referencedRelation: "congregation_pulse"
            referencedColumns: ["id"]
          },
        ]
      }
      pastoral_checkin_requests: {
        Row: {
          community_id: string
          id: string
          member_id: string
          mood_signal: string
          requested_at: string
          resolved_at: string | null
          status: string
          trigger_type: string
        }
        Insert: {
          community_id: string
          id?: string
          member_id: string
          mood_signal: string
          requested_at?: string
          resolved_at?: string | null
          status?: string
          trigger_type?: string
        }
        Update: {
          community_id?: string
          id?: string
          member_id?: string
          mood_signal?: string
          requested_at?: string
          resolved_at?: string | null
          status?: string
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pastoral_checkin_requests_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "pastoral_communities"
            referencedColumns: ["id"]
          },
        ]
      }
      pastoral_communities: {
        Row: {
          created_at: string
          first_broadcast_sent_at: string | null
          first_member_joined_at: string | null
          id: string
          invite_code: string
          name: string
          onboarding_completed: boolean
          pastor_id: string
          seat_cap: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_broadcast_sent_at?: string | null
          first_member_joined_at?: string | null
          id?: string
          invite_code?: string
          name: string
          onboarding_completed?: boolean
          pastor_id: string
          seat_cap?: number
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_broadcast_sent_at?: string | null
          first_member_joined_at?: string | null
          id?: string
          invite_code?: string
          name?: string
          onboarding_completed?: boolean
          pastor_id?: string
          seat_cap?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      pastoral_community_members: {
        Row: {
          community_id: string
          id: string
          join_source: string
          joined_at: string
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          join_source?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          join_source?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pastoral_community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "pastoral_communities"
            referencedColumns: ["id"]
          },
        ]
      }
      pastoral_inquiries: {
        Row: {
          church_name: string
          congregation_size: string | null
          created_at: string
          email: string
          id: string
          name: string
          notes: string | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          church_name: string
          congregation_size?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          church_name?: string
          congregation_size?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: []
      }
      pastoral_leads: {
        Row: {
          church_name: string | null
          church_size: string | null
          city: string | null
          created_at: string
          denomination: string | null
          email: string
          id: string
          last_contacted_at: string | null
          linkedin_url: string | null
          name: string
          next_contact_at: string | null
          notes: string | null
          reply_received: boolean | null
          source: string | null
          state: string | null
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          church_name?: string | null
          church_size?: string | null
          city?: string | null
          created_at?: string
          denomination?: string | null
          email: string
          id?: string
          last_contacted_at?: string | null
          linkedin_url?: string | null
          name: string
          next_contact_at?: string | null
          notes?: string | null
          reply_received?: boolean | null
          source?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          church_name?: string | null
          church_size?: string | null
          city?: string | null
          created_at?: string
          denomination?: string | null
          email?: string
          id?: string
          last_contacted_at?: string | null
          linkedin_url?: string | null
          name?: string
          next_contact_at?: string | null
          notes?: string | null
          reply_received?: boolean | null
          source?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      pastoral_outreach_log: {
        Row: {
          clicked: boolean | null
          email_type: string
          id: string
          lead_id: string
          opened: boolean | null
          resend_id: string | null
          sent_at: string
          subject: string
        }
        Insert: {
          clicked?: boolean | null
          email_type: string
          id?: string
          lead_id: string
          opened?: boolean | null
          resend_id?: string | null
          sent_at?: string
          subject: string
        }
        Update: {
          clicked?: boolean | null
          email_type?: string
          id?: string
          lead_id?: string
          opened?: boolean | null
          resend_id?: string | null
          sent_at?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "pastoral_outreach_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "pastoral_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      pastoral_threshold_alerts: {
        Row: {
          alert_type: string
          community_id: string
          contacted_at: string | null
          created_at: string
          email_sent: boolean
          id: string
          member_id: string
          nudge_sent: boolean
          revealed_at: string | null
          signal_count: number
          status: string
        }
        Insert: {
          alert_type?: string
          community_id: string
          contacted_at?: string | null
          created_at?: string
          email_sent?: boolean
          id?: string
          member_id: string
          nudge_sent?: boolean
          revealed_at?: string | null
          signal_count?: number
          status?: string
        }
        Update: {
          alert_type?: string
          community_id?: string
          contacted_at?: string | null
          created_at?: string
          email_sent?: boolean
          id?: string
          member_id?: string
          nudge_sent?: boolean
          revealed_at?: string | null
          signal_count?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pastoral_threshold_alerts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "pastoral_communities"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_log: {
        Row: {
          answered_at: string | null
          answered_note: string | null
          created_at: string
          deleted_at: string | null
          id: string
          request: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answered_at?: string | null
          answered_note?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          request: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answered_at?: string | null
          answered_note?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          request?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      processed_webhook_events: {
        Row: {
          event_id: string
          event_type: string | null
          processed_at: string | null
          provider: string | null
        }
        Insert: {
          event_id: string
          event_type?: string | null
          processed_at?: string | null
          provider?: string | null
        }
        Update: {
          event_id?: string
          event_type?: string | null
          processed_at?: string | null
          provider?: string | null
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
          daily_verse_last_sent_on: string | null
          daily_verse_opt_in: boolean
          daily_verse_opted_in_at: string | null
          daily_verse_prompt_seen: boolean
          daily_verse_send_hour_utc: number
          daily_verse_unsub_token: string | null
          grace_period_until: string | null
          id: string
          is_pastor: boolean
          is_suspended: boolean | null
          language_preference: string
          onboarding_completed_at: string | null
          onboarding_intent_key: string | null
          paddle_customer_id: string | null
          pastoral_community_id: string | null
          pending_checkin: boolean
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
          trial_nudges_sent: Json
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
          daily_verse_last_sent_on?: string | null
          daily_verse_opt_in?: boolean
          daily_verse_opted_in_at?: string | null
          daily_verse_prompt_seen?: boolean
          daily_verse_send_hour_utc?: number
          daily_verse_unsub_token?: string | null
          grace_period_until?: string | null
          id?: string
          is_pastor?: boolean
          is_suspended?: boolean | null
          language_preference?: string
          onboarding_completed_at?: string | null
          onboarding_intent_key?: string | null
          paddle_customer_id?: string | null
          pastoral_community_id?: string | null
          pending_checkin?: boolean
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
          trial_nudges_sent?: Json
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
          daily_verse_last_sent_on?: string | null
          daily_verse_opt_in?: boolean
          daily_verse_opted_in_at?: string | null
          daily_verse_prompt_seen?: boolean
          daily_verse_send_hour_utc?: number
          daily_verse_unsub_token?: string | null
          grace_period_until?: string | null
          id?: string
          is_pastor?: boolean
          is_suspended?: boolean | null
          language_preference?: string
          onboarding_completed_at?: string | null
          onboarding_intent_key?: string | null
          paddle_customer_id?: string | null
          pastoral_community_id?: string | null
          pending_checkin?: boolean
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
          trial_nudges_sent?: Json
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_pastoral_community_id_fkey"
            columns: ["pastoral_community_id"]
            isOneToOne: false
            referencedRelation: "pastoral_communities"
            referencedColumns: ["id"]
          },
        ]
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
      response_flags: {
        Row: {
          created_at: string
          flag_notes: string | null
          flag_type: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          flag_notes?: string | null
          flag_type: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          flag_notes?: string | null
          flag_type?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "response_flags_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "wisdom_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      revenuecat_events: {
        Row: {
          app_user_id: string | null
          created_at: string
          environment: string | null
          error_message: string | null
          event_id: string | null
          event_type: string
          expiration_at: string | null
          id: string
          processed: boolean
          product_id: string | null
          raw: Json
          updated_at: string
        }
        Insert: {
          app_user_id?: string | null
          created_at?: string
          environment?: string | null
          error_message?: string | null
          event_id?: string | null
          event_type: string
          expiration_at?: string | null
          id?: string
          processed?: boolean
          product_id?: string | null
          raw: Json
          updated_at?: string
        }
        Update: {
          app_user_id?: string | null
          created_at?: string
          environment?: string | null
          error_message?: string | null
          event_id?: string | null
          event_type?: string
          expiration_at?: string | null
          id?: string
          processed?: boolean
          product_id?: string | null
          raw?: Json
          updated_at?: string
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
          apple_product_id: string | null
          billing_cycle: string | null
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          environment: string | null
          id: string
          last_webhook_event_id: string | null
          paddle_subscription_id: string | null
          plan_type: string
          presentment_amount: number | null
          presentment_currency: string | null
          provider: string
          revenuecat_entitlement: string | null
          revenuecat_user_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          apple_product_id?: string | null
          billing_cycle?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          environment?: string | null
          id?: string
          last_webhook_event_id?: string | null
          paddle_subscription_id?: string | null
          plan_type?: string
          presentment_amount?: number | null
          presentment_currency?: string | null
          provider?: string
          revenuecat_entitlement?: string | null
          revenuecat_user_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          apple_product_id?: string | null
          billing_cycle?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          environment?: string | null
          id?: string
          last_webhook_event_id?: string | null
          paddle_subscription_id?: string | null
          plan_type?: string
          presentment_amount?: number | null
          presentment_currency?: string | null
          provider?: string
          revenuecat_entitlement?: string | null
          revenuecat_user_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_requests: {
        Row: {
          category: string
          created_at: string
          email: string
          id: string
          message: string
          resolved_at: string | null
          status: string
          subject: string
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          email: string
          id?: string
          message: string
          resolved_at?: string | null
          status?: string
          subject: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          email?: string
          id?: string
          message?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          user_id?: string | null
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
      user_passkeys: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_name: string | null
          id: string
          public_key: string
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_name?: string | null
          id?: string
          public_key: string
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_name?: string | null
          id?: string
          public_key?: string
          user_id?: string
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
      verse_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      webauthn_challenges: {
        Row: {
          challenge: string
          created_at: string
          expires_at: string
          id: string
          session_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          challenge: string
          created_at?: string
          expires_at?: string
          id?: string
          session_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          challenge?: string
          created_at?: string
          expires_at?: string
          id?: string
          session_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      wisdom_sessions: {
        Row: {
          ai_provider: string | null
          created_at: string
          crisis_marker: boolean
          expires_at: string | null
          flagged: boolean
          id: string
          question: string
          reflection_category: string | null
          response: string
          saved_to_journal: boolean | null
          scripture_refs: string[] | null
          user_id: string | null
        }
        Insert: {
          ai_provider?: string | null
          created_at?: string
          crisis_marker?: boolean
          expires_at?: string | null
          flagged?: boolean
          id?: string
          question: string
          reflection_category?: string | null
          response: string
          saved_to_journal?: boolean | null
          scripture_refs?: string[] | null
          user_id?: string | null
        }
        Update: {
          ai_provider?: string | null
          created_at?: string
          crisis_marker?: boolean
          expires_at?: string | null
          flagged?: boolean
          id?: string
          question?: string
          reflection_category?: string | null
          response?: string
          saved_to_journal?: boolean | null
          scripture_refs?: string[] | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      admin_true_engagement: {
        Row: {
          day: string | null
          engaged_sessions: number | null
          engagement_rate_pct: number | null
          total_anon_sessions: number | null
        }
        Relationships: []
      }
      pastoral_community_themes: {
        Row: {
          community_id: string | null
          last_question_at: string | null
          month: string | null
          question_count: number | null
          theme: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pastoral_community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "pastoral_communities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_age_group: { Args: { dob: string }; Returns: string }
      cleanup_anon_rate_limits: { Args: never; Returns: undefined }
      cleanup_deleted_reflections: { Args: never; Returns: undefined }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_cron_shared_secret: { Args: never; Returns: string }
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
      is_member_of_community: {
        Args: { _community_id: string; _user_id: string }
        Returns: boolean
      }
      is_pastor_of_community: {
        Args: { _community_id: string; _user_id: string }
        Returns: boolean
      }
      lookup_community_by_invite: {
        Args: { _invite_code: string }
        Returns: {
          id: string
          name: string
          type: string
        }[]
      }
      lookup_draft_by_share_token: {
        Args: { _share_token: string }
        Returns: {
          created_at: string
          outline: string
          scripture_refs: string[]
          theme: string
          title: string
        }[]
      }
      lookup_user_by_verse_unsub_token: {
        Args: { _token: string }
        Returns: {
          user_id: string
        }[]
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
