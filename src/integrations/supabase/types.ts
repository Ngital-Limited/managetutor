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
      agency_profiles: {
        Row: {
          agency_name: string
          agency_name_bn: string | null
          created_at: string | null
          description: string | null
          description_bn: string | null
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
          agency_name_bn?: string | null
          created_at?: string | null
          description?: string | null
          description_bn?: string | null
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
          agency_name_bn?: string | null
          created_at?: string | null
          description?: string | null
          description_bn?: string | null
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
        Relationships: []
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
          name_bn: string
          name_en: string
        }
        Insert: {
          created_at?: string | null
          district_id: string
          id?: string
          name_bn: string
          name_en: string
        }
        Update: {
          created_at?: string | null
          district_id?: string
          id?: string
          name_bn?: string
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
        Relationships: []
      }
      demo_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          district_id: string | null
          email: string | null
          full_name: string
          full_name_bn: string | null
          id: string
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          district_id?: string | null
          email?: string | null
          full_name: string
          full_name_bn?: string | null
          id?: string
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          district_id?: string | null
          email?: string | null
          full_name?: string
          full_name_bn?: string | null
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
          division_bn: string
          division_en: string
          id: string
          name_bn: string
          name_en: string
        }
        Insert: {
          created_at?: string | null
          division_bn: string
          division_en: string
          id?: string
          name_bn: string
          name_en: string
        }
        Update: {
          created_at?: string | null
          division_bn?: string
          division_en?: string
          id?: string
          name_bn?: string
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
      jobs: {
        Row: {
          area_id: string | null
          budget_max: number | null
          budget_min: number | null
          class_level: string | null
          created_at: string | null
          days_per_week: number | null
          description: string
          description_bn: string | null
          district_id: string
          duration_hours: number | null
          id: string
          is_featured: boolean | null
          parent_id: string
          preferred_tutor_gender: Database["public"]["Enums"]["gender"] | null
          special_requirements: string | null
          status: Database["public"]["Enums"]["job_status"] | null
          student_gender: Database["public"]["Enums"]["gender"] | null
          subject_id: string | null
          teaching_mode: Database["public"]["Enums"]["teaching_mode"] | null
          title: string
          title_bn: string | null
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
          description_bn?: string | null
          district_id: string
          duration_hours?: number | null
          id?: string
          is_featured?: boolean | null
          parent_id: string
          preferred_tutor_gender?: Database["public"]["Enums"]["gender"] | null
          special_requirements?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          student_gender?: Database["public"]["Enums"]["gender"] | null
          subject_id?: string | null
          teaching_mode?: Database["public"]["Enums"]["teaching_mode"] | null
          title: string
          title_bn?: string | null
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
          description_bn?: string | null
          district_id?: string
          duration_hours?: number | null
          id?: string
          is_featured?: boolean | null
          parent_id?: string
          preferred_tutor_gender?: Database["public"]["Enums"]["gender"] | null
          special_requirements?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          student_gender?: Database["public"]["Enums"]["gender"] | null
          subject_id?: string | null
          teaching_mode?: Database["public"]["Enums"]["teaching_mode"] | null
          title?: string
          title_bn?: string | null
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
          full_name_bn: string | null
          id: string
          is_banned: boolean | null
          phone: string | null
          phone_verified: boolean | null
          preferred_language: string | null
          updated_at: string | null
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
          full_name_bn?: string | null
          id: string
          is_banned?: boolean | null
          phone?: string | null
          phone_verified?: boolean | null
          preferred_language?: string | null
          updated_at?: string | null
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
          full_name_bn?: string | null
          id?: string
          is_banned?: boolean | null
          phone?: string | null
          phone_verified?: boolean | null
          preferred_language?: string | null
          updated_at?: string | null
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
        Relationships: []
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
          category_bn: string | null
          category_en: string | null
          created_at: string | null
          id: string
          name_bn: string
          name_en: string
        }
        Insert: {
          category_bn?: string | null
          category_en?: string | null
          created_at?: string | null
          id?: string
          name_bn: string
          name_en: string
        }
        Update: {
          category_bn?: string | null
          category_en?: string | null
          created_at?: string | null
          id?: string
          name_bn?: string
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
      tutor_profiles: {
        Row: {
          average_rating: number | null
          bio: string | null
          bio_bn: string | null
          created_at: string | null
          display_name: string | null
          district_id: string | null
          education: string | null
          education_bn: string | null
          experience_years: number | null
          gender: Database["public"]["Enums"]["gender"]
          hourly_rate_max: number | null
          hourly_rate_min: number | null
          id: string
          is_available: boolean | null
          is_featured: boolean | null
          teaching_mode: Database["public"]["Enums"]["teaching_mode"] | null
          total_reviews: number | null
          total_students: number | null
          updated_at: string | null
          user_id: string
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at: string | null
        }
        Insert: {
          average_rating?: number | null
          bio?: string | null
          bio_bn?: string | null
          created_at?: string | null
          display_name?: string | null
          district_id?: string | null
          education?: string | null
          education_bn?: string | null
          experience_years?: number | null
          gender: Database["public"]["Enums"]["gender"]
          hourly_rate_max?: number | null
          hourly_rate_min?: number | null
          id?: string
          is_available?: boolean | null
          is_featured?: boolean | null
          teaching_mode?: Database["public"]["Enums"]["teaching_mode"] | null
          total_reviews?: number | null
          total_students?: number | null
          updated_at?: string | null
          user_id: string
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
        }
        Update: {
          average_rating?: number | null
          bio?: string | null
          bio_bn?: string | null
          created_at?: string | null
          display_name?: string | null
          district_id?: string | null
          education?: string | null
          education_bn?: string | null
          experience_years?: number | null
          gender?: Database["public"]["Enums"]["gender"]
          hourly_rate_max?: number | null
          hourly_rate_min?: number | null
          id?: string
          is_available?: boolean | null
          is_featured?: boolean | null
          teaching_mode?: Database["public"]["Enums"]["teaching_mode"] | null
          total_reviews?: number | null
          total_students?: number | null
          updated_at?: string | null
          user_id?: string
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tutor_profiles_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
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
        Relationships: []
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
    }
    Enums: {
      app_role: "parent" | "tutor" | "agency" | "admin"
      application_status: "pending" | "accepted" | "rejected" | "withdrawn"
      gender: "male" | "female" | "any"
      job_status: "open" | "in_progress" | "completed" | "cancelled"
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
      application_status: ["pending", "accepted", "rejected", "withdrawn"],
      gender: ["male", "female", "any"],
      job_status: ["open", "in_progress", "completed", "cancelled"],
      teaching_mode: ["online", "in_person", "hybrid"],
      verification_status: ["pending", "approved", "rejected"],
    },
  },
} as const
