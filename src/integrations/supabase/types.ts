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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_permissions: {
        Row: {
          can_manage_jobs: boolean
          can_manage_revenue: boolean
          can_manage_reviews: boolean
          can_manage_settings: boolean
          can_manage_tickets: boolean
          can_manage_users: boolean
          can_send_notifications: boolean
          can_verify_documents: boolean
          can_view_analytics: boolean
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_manage_jobs?: boolean
          can_manage_revenue?: boolean
          can_manage_reviews?: boolean
          can_manage_settings?: boolean
          can_manage_tickets?: boolean
          can_manage_users?: boolean
          can_send_notifications?: boolean
          can_verify_documents?: boolean
          can_view_analytics?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_manage_jobs?: boolean
          can_manage_revenue?: boolean
          can_manage_reviews?: boolean
          can_manage_settings?: boolean
          can_manage_tickets?: boolean
          can_manage_users?: boolean
          can_send_notifications?: boolean
          can_verify_documents?: boolean
          can_view_analytics?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_permissions_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_profiles: {
        Row: {
          agency_name: string
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          total_tutors: number | null
          updated_at: string | null
          user_id: string
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at: string | null
          website: string | null
        }
        Insert: {
          agency_name: string
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          total_tutors?: number | null
          updated_at?: string | null
          user_id: string
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
          website?: string | null
        }
        Update: {
          agency_name?: string
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          total_tutors?: number | null
          updated_at?: string | null
          user_id?: string
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_profiles_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_tutors: {
        Row: {
          agency_id: string
          id: string
          joined_at: string | null
          tutor_id: string
        }
        Insert: {
          agency_id: string
          id?: string
          joined_at?: string | null
          tutor_id: string
        }
        Update: {
          agency_id?: string
          id?: string
          joined_at?: string | null
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_tutors_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_tutors_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          cover_message: string | null
          created_at: string | null
          id: string
          job_id: string
          proposed_rate: number | null
          status: Database["public"]["Enums"]["application_status"] | null
          tutor_id: string
          updated_at: string | null
        }
        Insert: {
          cover_message?: string | null
          created_at?: string | null
          id?: string
          job_id: string
          proposed_rate?: number | null
          status?: Database["public"]["Enums"]["application_status"] | null
          tutor_id: string
          updated_at?: string | null
        }
        Update: {
          cover_message?: string | null
          created_at?: string | null
          id?: string
          job_id?: string
          proposed_rate?: number | null
          status?: Database["public"]["Enums"]["application_status"] | null
          tutor_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          created_at: string | null
          district_id: string
          id: string
          name_en: string
        }
        Insert: {
          created_at?: string | null
          district_id: string
          id?: string
          name_en: string
        }
        Update: {
          created_at?: string | null
          district_id?: string
          id?: string
          name_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "areas_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_id_profiles_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_profiles_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
          phone: string | null
          subject: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
          phone?: string | null
          subject: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          phone?: string | null
          subject?: string
        }
        Relationships: []
      }
      demo_bookings: {
        Row: {
          application_id: string | null
          cancellation_reason: string | null
          class_fee: number
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          parent_id: string
          parent_phone: string | null
          platform_commission: number
          preferred_date: string
          preferred_time: string
          status: string
          subject_id: string | null
          tutor_id: string
          tutor_payout: number
          updated_at: string
        }
        Insert: {
          application_id?: string | null
          cancellation_reason?: string | null
          class_fee: number
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          parent_id: string
          parent_phone?: string | null
          platform_commission?: number
          preferred_date: string
          preferred_time: string
          status?: string
          subject_id?: string | null
          tutor_id: string
          tutor_payout?: number
          updated_at?: string
        }
        Update: {
          application_id?: string | null
          cancellation_reason?: string | null
          class_fee?: number
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          parent_id?: string
          parent_phone?: string | null
          platform_commission?: number
          preferred_date?: string
          preferred_time?: string
          status?: string
          subject_id?: string | null
          tutor_id?: string
          tutor_payout?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_bookings_parent_id_profiles_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_bookings_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_bookings_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          district_id: string | null
          email: string | null
          full_name: string
          id: string
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          district_id?: string | null
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          district_id?: string | null
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demo_profiles_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          created_at: string | null
          division_en: string
          id: string
          name_en: string
        }
        Insert: {
          created_at?: string | null
          division_en: string
          id?: string
          name_en: string
        }
        Update: {
          created_at?: string | null
          division_en?: string
          id?: string
          name_en?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          parent_id: string
          tutor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          tutor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_parent_id_profiles_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_listings: {
        Row: {
          amount_paid: number | null
          created_at: string | null
          end_date: string
          id: string
          is_active: boolean | null
          job_id: string | null
          listing_type: string
          start_date: string
          stripe_payment_id: string | null
          tutor_id: string | null
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          job_id?: string | null
          listing_type: string
          start_date: string
          stripe_payment_id?: string | null
          tutor_id?: string | null
        }
        Update: {
          amount_paid?: number | null
          created_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          job_id?: string | null
          listing_type?: string
          start_date?: string
          stripe_payment_id?: string | null
          tutor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "featured_listings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_listings_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_subjects: {
        Row: {
          created_at: string | null
          id: string
          job_id: string
          subject_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id: string
          subject_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_subjects_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          area_id: string | null
          budget_max: number | null
          budget_min: number | null
          class_level: string | null
          created_at: string | null
          days_per_week: number | null
          description: string
          district_id: string
          duration_hours: number | null
          fixed_time: string | null
          id: string
          is_featured: boolean | null
          job_reference: string | null
          location_details: string | null
          number_of_students: number | null
          parent_id: string
          preferred_time: string | null
          preferred_tutor_gender: Database["public"]["Enums"]["gender"] | null
          slug: string | null
          special_requirements: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["job_status"] | null
          student_age: string | null
          student_gender: Database["public"]["Enums"]["gender"] | null
          student_school_name: string | null
          subject_id: string | null
          teaching_mode: Database["public"]["Enums"]["teaching_mode"] | null
          title: string
          total_applications: number | null
          updated_at: string | null
        }
        Insert: {
          area_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
          class_level?: string | null
          created_at?: string | null
          days_per_week?: number | null
          description: string
          district_id: string
          duration_hours?: number | null
          fixed_time?: string | null
          id?: string
          is_featured?: boolean | null
          job_reference?: string | null
          location_details?: string | null
          number_of_students?: number | null
          parent_id: string
          preferred_time?: string | null
          preferred_tutor_gender?: Database["public"]["Enums"]["gender"] | null
          slug?: string | null
          special_requirements?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          student_age?: string | null
          student_gender?: Database["public"]["Enums"]["gender"] | null
          student_school_name?: string | null
          subject_id?: string | null
          teaching_mode?: Database["public"]["Enums"]["teaching_mode"] | null
          title: string
          total_applications?: number | null
          updated_at?: string | null
        }
        Update: {
          area_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
          class_level?: string | null
          created_at?: string | null
          days_per_week?: number | null
          description?: string
          district_id?: string
          duration_hours?: number | null
          fixed_time?: string | null
          id?: string
          is_featured?: boolean | null
          job_reference?: string | null
          location_details?: string | null
          number_of_students?: number | null
          parent_id?: string
          preferred_time?: string | null
          preferred_tutor_gender?: Database["public"]["Enums"]["gender"] | null
          slug?: string | null
          special_requirements?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          student_age?: string | null
          student_gender?: Database["public"]["Enums"]["gender"] | null
          student_school_name?: string | null
          subject_id?: string | null
          teaching_mode?: Database["public"]["Enums"]["teaching_mode"] | null
          title?: string
          total_applications?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_parent_id_profiles_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          job_id: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          job_id?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          job_id?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_profiles_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_profiles_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          currency: string
          gateway_response: Json | null
          id: string
          listing_type: string | null
          plan_id: string | null
          status: string
          transaction_id: string
          user_id: string
          validation_id: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          gateway_response?: Json | null
          id?: string
          listing_type?: string | null
          plan_id?: string | null
          status?: string
          transaction_id: string
          user_id: string
          validation_id?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          gateway_response?: Json | null
          id?: string
          listing_type?: string | null
          plan_id?: string | null
          status?: string
          transaction_id?: string
          user_id?: string
          validation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          account_name: string | null
          account_number: string
          admin_notes: string | null
          amount: number
          bank_name: string | null
          branch_name: string | null
          created_at: string
          id: string
          payment_method: string
          processed_at: string | null
          processed_by: string | null
          status: string
          tutor_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_number: string
          admin_notes?: string | null
          amount: number
          bank_name?: string | null
          branch_name?: string | null
          created_at?: string
          id?: string
          payment_method?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          tutor_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string
          admin_notes?: string | null
          amount?: number
          bank_name?: string | null
          branch_name?: string | null
          created_at?: string
          id?: string
          payment_method?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          tutor_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_requests_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          area_id: string | null
          avatar_url: string | null
          banned_at: string | null
          banned_reason: string | null
          created_at: string | null
          district_id: string | null
          email: string
          email_verified: boolean | null
          full_name: string
          id: string
          is_approved: boolean | null
          is_banned: boolean | null
          phone: string | null
          phone_verified: boolean | null
          preferred_language: string | null
          referral_source: string | null
          updated_at: string | null
          user_reference: string | null
        }
        Insert: {
          area_id?: string | null
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          created_at?: string | null
          district_id?: string | null
          email: string
          email_verified?: boolean | null
          full_name: string
          id: string
          is_approved?: boolean | null
          is_banned?: boolean | null
          phone?: string | null
          phone_verified?: boolean | null
          preferred_language?: string | null
          referral_source?: string | null
          updated_at?: string | null
          user_reference?: string | null
        }
        Update: {
          area_id?: string | null
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          created_at?: string | null
          district_id?: string | null
          email?: string
          email_verified?: boolean | null
          full_name?: string
          id?: string
          is_approved?: boolean | null
          is_banned?: boolean | null
          phone?: string | null
          phone_verified?: boolean | null
          preferred_language?: string | null
          referral_source?: string | null
          updated_at?: string | null
          user_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          demo_booking_id: string | null
          id: string
          parent_id: string
          processed_at: string | null
          processed_by: string | null
          reason: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          demo_booking_id?: string | null
          id?: string
          parent_id: string
          processed_at?: string | null
          processed_by?: string | null
          reason: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          demo_booking_id?: string | null
          id?: string
          parent_id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_demo_booking_id_fkey"
            columns: ["demo_booking_id"]
            isOneToOne: false
            referencedRelation: "demo_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          description: string | null
          id: string
          report_type: string
          reported_user_id: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          report_type: string
          reported_user_id: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          report_type?: string
          reported_user_id?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_user_id_profiles_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_profiles_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_update_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          reason: string
          review_id: string
          status: string
          tutor_id: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          reason: string
          review_id: string
          status?: string
          tutor_id: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          reason?: string
          review_id?: string
          status?: string
          tutor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_update_requests_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_update_requests_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          is_approved: boolean | null
          job_id: string | null
          parent_id: string
          rating: number
          tutor_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          job_id?: string | null
          parent_id: string
          rating: number
          tutor_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          job_id?: string | null
          parent_id?: string
          rating?: number
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_parent_id_profiles_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          category_en: string | null
          created_at: string | null
          id: string
          name_en: string
        }
        Insert: {
          category_en?: string | null
          created_at?: string | null
          id?: string
          name_en: string
        }
        Update: {
          category_en?: string | null
          created_at?: string | null
          id?: string
          name_en?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          featured_profile: boolean | null
          id: string
          is_active: boolean | null
          max_applications_per_month: number | null
          name: string
          name_bn: string | null
          price_monthly: number
          price_quarterly: number | null
          price_yearly: number | null
          priority_support: boolean | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          featured_profile?: boolean | null
          id?: string
          is_active?: boolean | null
          max_applications_per_month?: number | null
          name: string
          name_bn?: string | null
          price_monthly: number
          price_quarterly?: number | null
          price_yearly?: number | null
          priority_support?: boolean | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          featured_profile?: boolean | null
          id?: string
          is_active?: boolean | null
          max_applications_per_month?: number | null
          name?: string
          name_bn?: string | null
          price_monthly?: number
          price_quarterly?: number | null
          price_yearly?: number | null
          priority_support?: boolean | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_notes: string | null
          assigned_to: string | null
          category: string
          created_at: string
          description: string
          id: string
          priority: string
          related_job_id: string | null
          related_user_id: string | null
          resolved_at: string | null
          status: string
          subject: string
          ticket_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_to?: string | null
          category?: string
          created_at?: string
          description: string
          id?: string
          priority?: string
          related_job_id?: string | null
          related_user_id?: string | null
          resolved_at?: string | null
          status?: string
          subject: string
          ticket_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          priority?: string
          related_job_id?: string | null
          related_user_id?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string
          ticket_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_related_job_id_fkey"
            columns: ["related_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_admin_notes: {
        Row: {
          admin_id: string
          category: string
          created_at: string
          id: string
          note: string
          tutor_id: string
          updated_at: string
        }
        Insert: {
          admin_id: string
          category?: string
          created_at?: string
          id?: string
          note: string
          tutor_id: string
          updated_at?: string
        }
        Update: {
          admin_id?: string
          category?: string
          created_at?: string
          id?: string
          note?: string
          tutor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_admin_notes_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_admin_notes_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_education: {
        Row: {
          created_at: string
          current_semester: string | null
          degree: string
          field_of_study: string | null
          id: string
          institution: string
          is_current: boolean | null
          passing_year: number | null
          result: string | null
          tutor_id: string
        }
        Insert: {
          created_at?: string
          current_semester?: string | null
          degree: string
          field_of_study?: string | null
          id?: string
          institution: string
          is_current?: boolean | null
          passing_year?: number | null
          result?: string | null
          tutor_id: string
        }
        Update: {
          created_at?: string
          current_semester?: string | null
          degree?: string
          field_of_study?: string | null
          id?: string
          institution?: string
          is_current?: boolean | null
          passing_year?: number | null
          result?: string | null
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_education_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_job_experiences: {
        Row: {
          company: string
          created_at: string
          designation: string
          end_date: string | null
          id: string
          is_current: boolean | null
          responsibilities: string | null
          start_date: string | null
          tutor_id: string
        }
        Insert: {
          company: string
          created_at?: string
          designation: string
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          responsibilities?: string | null
          start_date?: string | null
          tutor_id: string
        }
        Update: {
          company?: string
          created_at?: string
          designation?: string
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          responsibilities?: string | null
          start_date?: string | null
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_job_experiences_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_profiles: {
        Row: {
          area_id: string | null
          average_rating: number | null
          bio: string | null
          class_levels: string[] | null
          created_at: string | null
          date_of_birth: string | null
          display_name: string | null
          district_id: string | null
          education: string | null
          education_detail: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          experience_years: number | null
          father_name: string | null
          father_phone: string | null
          featured_blurb: string | null
          gender: Database["public"]["Enums"]["gender"]
          height: string | null
          id: string
          is_available: boolean | null
          is_featured: boolean | null
          is_student: boolean
          marital_status: string | null
          monthly_salary_max: number | null
          monthly_salary_min: number | null
          mother_name: string | null
          mother_phone: string | null
          national_id_no: string | null
          nationality: string | null
          permanent_address: string | null
          present_address: string | null
          religion: string | null
          slug: string | null
          success_stories: string | null
          teaching_mode: Database["public"]["Enums"]["teaching_mode"] | null
          teaching_philosophy: string | null
          total_reviews: number | null
          total_students: number | null
          updated_at: string | null
          user_id: string
          verification_paid: boolean
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at: string | null
          video_url: string | null
          weight: string | null
        }
        Insert: {
          area_id?: string | null
          average_rating?: number | null
          bio?: string | null
          class_levels?: string[] | null
          created_at?: string | null
          date_of_birth?: string | null
          display_name?: string | null
          district_id?: string | null
          education?: string | null
          education_detail?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          experience_years?: number | null
          father_name?: string | null
          father_phone?: string | null
          featured_blurb?: string | null
          gender: Database["public"]["Enums"]["gender"]
          height?: string | null
          id?: string
          is_available?: boolean | null
          is_featured?: boolean | null
          is_student?: boolean
          marital_status?: string | null
          monthly_salary_max?: number | null
          monthly_salary_min?: number | null
          mother_name?: string | null
          mother_phone?: string | null
          national_id_no?: string | null
          nationality?: string | null
          permanent_address?: string | null
          present_address?: string | null
          religion?: string | null
          slug?: string | null
          success_stories?: string | null
          teaching_mode?: Database["public"]["Enums"]["teaching_mode"] | null
          teaching_philosophy?: string | null
          total_reviews?: number | null
          total_students?: number | null
          updated_at?: string | null
          user_id: string
          verification_paid?: boolean
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
          video_url?: string | null
          weight?: string | null
        }
        Update: {
          area_id?: string | null
          average_rating?: number | null
          bio?: string | null
          class_levels?: string[] | null
          created_at?: string | null
          date_of_birth?: string | null
          display_name?: string | null
          district_id?: string | null
          education?: string | null
          education_detail?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          experience_years?: number | null
          father_name?: string | null
          father_phone?: string | null
          featured_blurb?: string | null
          gender?: Database["public"]["Enums"]["gender"]
          height?: string | null
          id?: string
          is_available?: boolean | null
          is_featured?: boolean | null
          is_student?: boolean
          marital_status?: string | null
          monthly_salary_max?: number | null
          monthly_salary_min?: number | null
          mother_name?: string | null
          mother_phone?: string | null
          national_id_no?: string | null
          nationality?: string | null
          permanent_address?: string | null
          present_address?: string | null
          religion?: string | null
          slug?: string | null
          success_stories?: string | null
          teaching_mode?: Database["public"]["Enums"]["teaching_mode"] | null
          teaching_philosophy?: string | null
          total_reviews?: number | null
          total_students?: number | null
          updated_at?: string | null
          user_id?: string
          verification_paid?: boolean
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
          video_url?: string | null
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tutor_profiles_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_profiles_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_profiles_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_subjects: {
        Row: {
          created_at: string | null
          id: string
          subject_id: string
          tutor_profile_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          subject_id: string
          tutor_profile_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          subject_id?: string
          tutor_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_subjects_tutor_profile_id_fkey"
            columns: ["tutor_profile_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          applications_used: number | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          applications_used?: number | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          applications_used?: number | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_documents: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          document_type: string
          document_url: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_status"] | null
          tutor_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          document_type: string
          document_url: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"] | null
          tutor_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          document_type?: string
          document_url?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"] | null
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_documents_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_unique_job_slug: {
        Args: {
          _area_id: string
          _district_id: string
          _exclude_id?: string
          _job_reference: string
          _title: string
        }
        Returns: string
      }
      generate_unique_tutor_slug: {
        Args: { _base: string; _exclude_id?: string }
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      slugify: { Args: { _text: string }; Returns: string }
    }
    Enums: {
      app_role: "parent" | "tutor" | "agency" | "admin"
      application_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "withdrawn"
        | "shortlisted"
        | "waiting"
        | "invited_to_demo"
      gender: "male" | "female" | "any"
      job_status:
        | "pending_approval"
        | "open"
        | "in_progress"
        | "completed"
        | "cancelled"
      teaching_mode: "online" | "in_person" | "hybrid"
      verification_status: "pending" | "approved" | "rejected"
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
      app_role: ["parent", "tutor", "agency", "admin"],
      application_status: [
        "pending",
        "accepted",
        "rejected",
        "withdrawn",
        "shortlisted",
        "waiting",
        "invited_to_demo",
      ],
      gender: ["male", "female", "any"],
      job_status: [
        "pending_approval",
        "open",
        "in_progress",
        "completed",
        "cancelled",
      ],
      teaching_mode: ["online", "in_person", "hybrid"],
      verification_status: ["pending", "approved", "rejected"],
    },
  },
} as const
