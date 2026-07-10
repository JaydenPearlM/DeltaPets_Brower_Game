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
      aliune_signal_reports: {
        Row: {
          condition: string
          corruption: string
          created_at: string
          enabled: boolean
          end_time: string | null
          ends_at: string | null
          id: string
          region: string
          report_age_days: number | null
          report_text: string
          start_time: string | null
          starts_at: string | null
          town: string | null
          updated_at: string
        }
        Insert: {
          condition: string
          corruption: string
          created_at?: string
          enabled?: boolean
          end_time?: string | null
          ends_at?: string | null
          id?: string
          region: string
          report_age_days?: number | null
          report_text: string
          start_time?: string | null
          starts_at?: string | null
          town?: string | null
          updated_at?: string
        }
        Update: {
          condition?: string
          corruption?: string
          created_at?: string
          enabled?: boolean
          end_time?: string | null
          ends_at?: string | null
          id?: string
          region?: string
          report_age_days?: number | null
          report_text?: string
          start_time?: string | null
          starts_at?: string | null
          town?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      aliune_signals: {
        Row: {
          condition: string
          corrupted_egg_bonus: number
          corruption: string
          created_at: string
          enabled: boolean
          ends_at: string
          id: string
          irregular_eggs: boolean
          portal_event: boolean
          region: string
          report_age_days: number
          report_text: string
          starts_at: string
          updated_at: string
        }
        Insert: {
          condition: string
          corrupted_egg_bonus?: number
          corruption: string
          created_at?: string
          enabled?: boolean
          ends_at: string
          id?: string
          irregular_eggs?: boolean
          portal_event?: boolean
          region: string
          report_age_days?: number
          report_text: string
          starts_at: string
          updated_at?: string
        }
        Update: {
          condition?: string
          corrupted_egg_bonus?: number
          corruption?: string
          created_at?: string
          enabled?: boolean
          ends_at?: string
          id?: string
          irregular_eggs?: boolean
          portal_event?: boolean
          region?: string
          report_age_days?: number
          report_text?: string
          starts_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      alpha_systems: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          released_at: string | null
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          released_at?: string | null
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          released_at?: string | null
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean
          page_scope: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          page_scope?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          page_scope?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      awards: {
        Row: {
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          key: string
          name: string
          rarity: string | null
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          key: string
          name: string
          rarity?: string | null
          type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          key?: string
          name?: string
          rarity?: string | null
          type?: string
        }
        Relationships: []
      }
      battle_run_fights: {
        Row: {
          created_at: string
          enemy_level: number
          enemy_line: Database["public"]["Enums"]["elemental_line"] | null
          fight_number: number
          id: string
          kind: Database["public"]["Enums"]["fight_kind"]
          result: string
          reward: Json
          run_id: string
        }
        Insert: {
          created_at?: string
          enemy_level?: number
          enemy_line?: Database["public"]["Enums"]["elemental_line"] | null
          fight_number: number
          id?: string
          kind?: Database["public"]["Enums"]["fight_kind"]
          result: string
          reward?: Json
          run_id: string
        }
        Update: {
          created_at?: string
          enemy_level?: number
          enemy_line?: Database["public"]["Enums"]["elemental_line"] | null
          fight_number?: number
          id?: string
          kind?: Database["public"]["Enums"]["fight_kind"]
          result?: string
          reward?: Json
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_run_fights_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "battle_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_runs: {
        Row: {
          created_at: string
          current_fight: number
          ended_at: string | null
          id: string
          pet_id: string
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_fight?: number
          ended_at?: string | null
          id?: string
          pet_id: string
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_fight?: number
          ended_at?: string | null
          id?: string
          pet_id?: string
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_runs_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_care: {
        Row: {
          alpha_ribbon_awarded: boolean
          completed_date_eastern: string | null
          completed_delta_day: number | null
          created_at: string
          last_completed_at: string | null
          streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          alpha_ribbon_awarded?: boolean
          completed_date_eastern?: string | null
          completed_delta_day?: number | null
          created_at?: string
          last_completed_at?: string | null
          streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          alpha_ribbon_awarded?: boolean
          completed_date_eastern?: string | null
          completed_delta_day?: number | null
          created_at?: string
          last_completed_at?: string | null
          streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_login_rewards: {
        Row: {
          id: string
          last_claimed_at: string | null
          streak: number
        }
        Insert: {
          id: string
          last_claimed_at?: string | null
          streak?: number
        }
        Update: {
          id?: string
          last_claimed_at?: string | null
          streak?: number
        }
        Relationships: []
      }
      eggs: {
        Row: {
          created_at: string
          hatch_ready_at: string
          hatched_at: string | null
          id: string
          pet_id: string | null
          starter_element: Database["public"]["Enums"]["elemental_line"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hatch_ready_at: string
          hatched_at?: string | null
          id?: string
          pet_id?: string | null
          starter_element: Database["public"]["Enums"]["elemental_line"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hatch_ready_at?: string
          hatched_at?: string | null
          id?: string
          pet_id?: string | null
          starter_element?: Database["public"]["Enums"]["elemental_line"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eggs_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eggs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      element_defs: {
        Row: {
          created_at: string
          display_name: string
          id: string
          key: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          key: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          key?: string
          sort_order?: number
        }
        Relationships: []
      }
      game_config: {
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
      hatchery_shelf_slots: {
        Row: {
          created_at: string
          id: string
          item_key: string | null
          slot_index: number
          unlocked: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_key?: string | null
          slot_index: number
          unlocked?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_key?: string | null
          slot_index?: number
          unlocked?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hatchery_slots: {
        Row: {
          created_at: string
          id: string
          pet_id: string | null
          slot_index: number
          unlocked: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pet_id?: string | null
          slot_index: number
          unlocked?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pet_id?: string | null
          slot_index?: number
          unlocked?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hatchery_slots_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      home_objects: {
        Row: {
          created_at: string
          id: string
          kind: string
          placed: boolean
          rotation: number
          updated_at: string
          user_id: string
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          placed?: boolean
          rotation?: number
          updated_at?: string
          user_id: string
          x?: number
          y?: number
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          placed?: boolean
          rotation?: number
          updated_at?: string
          user_id?: string
          x?: number
          y?: number
        }
        Relationships: []
      }
      homepage_alerts: {
        Row: {
          alert_color: string
          alert_type: string
          created_at: string
          cta_href: string | null
          cta_label: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          message: string
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          alert_color?: string
          alert_type?: string
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          message: string
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          alert_color?: string
          alert_type?: string
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      homepage_logs: {
        Row: {
          category: Database["public"]["Enums"]["log_category"]
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          patch_html: string | null
          title: string
        }
        Insert: {
          category: Database["public"]["Enums"]["log_category"]
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          patch_html?: string | null
          title: string
        }
        Update: {
          category?: Database["public"]["Enums"]["log_category"]
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          patch_html?: string | null
          title?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          item_id: string
          pet_id: string | null
          qty: number
          updated_at: string
          user_id: string
        }
        Insert: {
          item_id: string
          pet_id?: string | null
          qty?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          item_id?: string
          pet_id?: string | null
          qty?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_defs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      item_defs: {
        Row: {
          created_at: string
          description: string | null
          effects: Json
          id: string
          name: string
          rarity: number
          slug: string
          stack_limit: number
          type: Database["public"]["Enums"]["item_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          effects?: Json
          id?: string
          name: string
          rarity?: number
          slug: string
          stack_limit?: number
          type: Database["public"]["Enums"]["item_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          effects?: Json
          id?: string
          name?: string
          rarity?: number
          slug?: string
          stack_limit?: number
          type?: Database["public"]["Enums"]["item_type"]
          updated_at?: string
        }
        Relationships: []
      }
      party_slots: {
        Row: {
          created_at: string
          id: string
          pet_id: string
          slot_index: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pet_id: string
          slot_index: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pet_id?: string
          slot_index?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_slots_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: true
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      patch_notes: {
        Row: {
          body: string | null
          created_at: string
          fixed_notes: string | null
          id: string
          is_published: boolean
          new_notes: string | null
          notes: string | null
          released_at: string
          summary: string | null
          title: string | null
          updated_notes: string | null
          version: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          fixed_notes?: string | null
          id?: string
          is_published?: boolean
          new_notes?: string | null
          notes?: string | null
          released_at?: string
          summary?: string | null
          title?: string | null
          updated_notes?: string | null
          version: string
        }
        Update: {
          body?: string | null
          created_at?: string
          fixed_notes?: string | null
          id?: string
          is_published?: boolean
          new_notes?: string | null
          notes?: string | null
          released_at?: string
          summary?: string | null
          title?: string | null
          updated_notes?: string | null
          version?: string
        }
        Relationships: []
      }
      personalities: {
        Row: {
          created_at: string
          definition: string
          id: string
          key: string
          modifiers: Json
          name: string
        }
        Insert: {
          created_at?: string
          definition: string
          id?: string
          key: string
          modifiers?: Json
          name: string
        }
        Update: {
          created_at?: string
          definition?: string
          id?: string
          key?: string
          modifiers?: Json
          name?: string
        }
        Relationships: []
      }
      pet_awards: {
        Row: {
          award_id: string
          context: Json
          earned_at: string
          id: string
          pet_id: string
        }
        Insert: {
          award_id: string
          context?: Json
          earned_at?: string
          id?: string
          pet_id: string
        }
        Update: {
          award_id?: string
          context?: Json
          earned_at?: string
          id?: string
          pet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_awards_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "awards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_awards_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_element_affinities: {
        Row: {
          affinity: number
          element_id: string
          pet_id: string
          updated_at: string
        }
        Insert: {
          affinity?: number
          element_id: string
          pet_id: string
          updated_at?: string
        }
        Update: {
          affinity?: number
          element_id?: string
          pet_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_element_affinities_element_id_fkey"
            columns: ["element_id"]
            isOneToOne: false
            referencedRelation: "element_defs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_element_affinities_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_elements: {
        Row: {
          air: number
          earth: number
          fire: number
          ice: number
          light: number
          null_element: number
          pet_id: string
          shadow: number
          storm: number
          water: number
        }
        Insert: {
          air?: number
          earth?: number
          fire?: number
          ice?: number
          light?: number
          null_element?: number
          pet_id: string
          shadow?: number
          storm?: number
          water?: number
        }
        Update: {
          air?: number
          earth?: number
          fire?: number
          ice?: number
          light?: number
          null_element?: number
          pet_id?: string
          shadow?: number
          storm?: number
          water?: number
        }
        Relationships: [
          {
            foreignKeyName: "pet_elements_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: true
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_skills: {
        Row: {
          equipped: boolean
          pet_id: string
          skill_id: string
          unlocked_at: string
        }
        Insert: {
          equipped?: boolean
          pet_id: string
          skill_id: string
          unlocked_at?: string
        }
        Update: {
          equipped?: boolean
          pet_id?: string
          skill_id?: string
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_skills_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_defs"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_stat_allocations: {
        Row: {
          atk: number
          created_at: string
          def: number
          hp: number
          id: string
          level: number
          magi: number
          mana: number
          pet_id: string
          spd: number
          xp: number
        }
        Insert: {
          atk?: number
          created_at?: string
          def?: number
          hp?: number
          id?: string
          level: number
          magi?: number
          mana?: number
          pet_id: string
          spd?: number
          xp?: number
        }
        Update: {
          atk?: number
          created_at?: string
          def?: number
          hp?: number
          id?: string
          level?: number
          magi?: number
          mana?: number
          pet_id?: string
          spd?: number
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "pet_stat_allocations_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_stats: {
        Row: {
          base_atk: number
          base_def: number
          base_hp: number
          base_magi: number
          base_mana: number
          base_spd: number
          base_total: number
          created_at: string
          pet_id: string
          updated_at: string
        }
        Insert: {
          base_atk: number
          base_def: number
          base_hp: number
          base_magi: number
          base_mana: number
          base_spd: number
          base_total?: number
          created_at?: string
          pet_id: string
          updated_at?: string
        }
        Update: {
          base_atk?: number
          base_def?: number
          base_hp?: number
          base_magi?: number
          base_mana?: number
          base_spd?: number
          base_total?: number
          created_at?: string
          pet_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_stats_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: true
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          age: Database["public"]["Enums"]["age_stage"]
          atk: number
          bond: number
          cd_bond_ends_at: string | null
          cd_clean_ends_at: string | null
          cd_feed_ends_at: string | null
          cd_play_ends_at: string | null
          clean: number
          comfort: number
          created_at: string
          def: number
          description: string | null
          energy: number
          gender: Database["public"]["Enums"]["pet_gender"]
          growth_strong_stats: string[] | null
          growth_weak_stat: string | null
          happy: number
          hatch_ends_at: string | null
          hatch_time_alignment: string | null
          hatched_at: string | null
          hatchery_slot_index: number | null
          hp_cur: number
          hp_max: number
          hunger: number
          id: string
          is_active: boolean
          last_care_decay_at: string | null
          last_cared_at: string | null
          last_fed_at: string
          last_hunger_decay_at: string
          level: number
          line: Database["public"]["Enums"]["elemental_line"]
          location: string | null
          magi: number
          mana: number
          name: string | null
          neglect_hours: number
          nickname: string | null
          personality_id: string | null
          personality_key: string | null
          pending_hatch_minutes: number | null
          ran_away: boolean
          rest: number
          runaway_at: string | null
          spd: number
          species: string | null
          stage: Database["public"]["Enums"]["pet_stage"]
          unspent_points: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          age?: Database["public"]["Enums"]["age_stage"]
          atk?: number
          bond?: number
          cd_bond_ends_at?: string | null
          cd_clean_ends_at?: string | null
          cd_feed_ends_at?: string | null
          cd_play_ends_at?: string | null
          clean?: number
          comfort?: number
          created_at?: string
          def?: number
          description?: string | null
          energy?: number
          gender?: Database["public"]["Enums"]["pet_gender"]
          growth_strong_stats?: string[] | null
          growth_weak_stat?: string | null
          happy?: number
          hatch_ends_at?: string | null
          hatch_time_alignment?: string | null
          hatched_at?: string | null
          hatchery_slot_index?: number | null
          hp_cur?: number
          hp_max?: number
          hunger?: number
          id?: string
          is_active?: boolean
          last_care_decay_at?: string | null
          last_cared_at?: string | null
          last_fed_at?: string
          last_hunger_decay_at?: string
          level?: number
          line: Database["public"]["Enums"]["elemental_line"]
          location?: string | null
          magi?: number
          mana?: number
          name?: string | null
          neglect_hours?: number
          nickname?: string | null
          personality_id?: string | null
          personality_key?: string | null
          pending_hatch_minutes?: number | null
          ran_away?: boolean
          rest?: number
          runaway_at?: string | null
          spd?: number
          species?: string | null
          stage?: Database["public"]["Enums"]["pet_stage"]
          unspent_points?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          age?: Database["public"]["Enums"]["age_stage"]
          atk?: number
          bond?: number
          cd_bond_ends_at?: string | null
          cd_clean_ends_at?: string | null
          cd_feed_ends_at?: string | null
          cd_play_ends_at?: string | null
          clean?: number
          comfort?: number
          created_at?: string
          def?: number
          description?: string | null
          energy?: number
          gender?: Database["public"]["Enums"]["pet_gender"]
          growth_strong_stats?: string[] | null
          growth_weak_stat?: string | null
          happy?: number
          hatch_ends_at?: string | null
          hatch_time_alignment?: string | null
          hatched_at?: string | null
          hatchery_slot_index?: number | null
          hp_cur?: number
          hp_max?: number
          hunger?: number
          id?: string
          is_active?: boolean
          last_care_decay_at?: string | null
          last_cared_at?: string | null
          last_fed_at?: string
          last_hunger_decay_at?: string
          level?: number
          line?: Database["public"]["Enums"]["elemental_line"]
          location?: string | null
          magi?: number
          mana?: number
          name?: string | null
          neglect_hours?: number
          nickname?: string | null
          personality_id?: string | null
          personality_key?: string | null
          pending_hatch_minutes?: number | null
          ran_away?: boolean
          rest?: number
          runaway_at?: string | null
          spd?: number
          species?: string | null
          stage?: Database["public"]["Enums"]["pet_stage"]
          unspent_points?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "pets_personality_id_fkey"
            columns: ["personality_id"]
            isOneToOne: false
            referencedRelation: "personalities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          alpha_ribbon_awarded: boolean
          created_at: string
          daily_care_completed_at: string | null
          display_name: string | null
          email: string | null
          food_trough_unlocked: boolean
          hatchery_initialized: boolean
          intro_cutscene_completed: boolean
          intro_seen: boolean
          is_admin: boolean
          role: string
          timezone: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          alpha_ribbon_awarded?: boolean
          created_at?: string
          daily_care_completed_at?: string | null
          display_name?: string | null
          email?: string | null
          food_trough_unlocked?: boolean
          hatchery_initialized?: boolean
          intro_cutscene_completed?: boolean
          intro_seen?: boolean
          is_admin?: boolean
          role?: string
          timezone?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          alpha_ribbon_awarded?: boolean
          created_at?: string
          daily_care_completed_at?: string | null
          display_name?: string | null
          email?: string | null
          food_trough_unlocked?: boolean
          hatchery_initialized?: boolean
          intro_cutscene_completed?: boolean
          intro_seen?: boolean
          is_admin?: boolean
          role?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      pve_active_buffs: {
        Row: {
          buff_type: string
          created_at: string
          description: string
          expires_at: string
          id: string
          strength: number
          updated_at: string
          user_id: string
        }
        Insert: {
          buff_type: string
          created_at?: string
          description: string
          expires_at: string
          id?: string
          strength?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          buff_type?: string
          created_at?: string
          description?: string
          expires_at?: string
          id?: string
          strength?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pve_instabilities: {
        Row: {
          condition: string
          corruption_level: string
          created_at: string
          description: string
          enabled: boolean
          expires_at: string
          has_boss: boolean
          id: string
          region: string
          reward_buffs: Json
          reward_materials: Json
          reward_xp: number
          spawned_at: string
          total_fights: number
          updated_at: string
        }
        Insert: {
          condition: string
          corruption_level: string
          created_at?: string
          description: string
          enabled?: boolean
          expires_at: string
          has_boss?: boolean
          id?: string
          region?: string
          reward_buffs?: Json
          reward_materials?: Json
          reward_xp?: number
          spawned_at?: string
          total_fights?: number
          updated_at?: string
        }
        Update: {
          condition?: string
          corruption_level?: string
          created_at?: string
          description?: string
          enabled?: boolean
          expires_at?: string
          has_boss?: boolean
          id?: string
          region?: string
          reward_buffs?: Json
          reward_materials?: Json
          reward_xp?: number
          spawned_at?: string
          total_fights?: number
          updated_at?: string
        }
        Relationships: []
      }
      pve_instability_fights: {
        Row: {
          completed_at: string | null
          created_at: string
          enemy_element: string
          enemy_level: number
          enemy_line: string
          enemy_name: string
          fight_number: number
          id: string
          result: string | null
          rewards: Json | null
          run_id: string
          started_at: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          enemy_element: string
          enemy_level: number
          enemy_line: string
          enemy_name: string
          fight_number: number
          id?: string
          result?: string | null
          rewards?: Json | null
          run_id: string
          started_at?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          enemy_element?: string
          enemy_level?: number
          enemy_line?: string
          enemy_name?: string
          fight_number?: number
          id?: string
          result?: string | null
          rewards?: Json | null
          run_id?: string
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pve_instability_fights_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "pve_instability_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      pve_instability_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          current_fight: number
          id: string
          instability_id: string
          pet_id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_fight?: number
          id?: string
          instability_id: string
          pet_id: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_fight?: number
          id?: string
          instability_id?: string
          pet_id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pve_instability_runs_instability_id_fkey"
            columns: ["instability_id"]
            isOneToOne: false
            referencedRelation: "pve_instabilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pve_instability_runs_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pve_research_stats: {
        Row: {
          created_at: string
          first_clear_at: string | null
          rarest_drop_tier: number
          total_bosses_defeated: number
          total_fights_won: number
          total_instabilities_cleared: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_clear_at?: string | null
          rarest_drop_tier?: number
          total_bosses_defeated?: number
          total_fights_won?: number
          total_instabilities_cleared?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_clear_at?: string | null
          rarest_drop_tier?: number
          total_bosses_defeated?: number
          total_fights_won?: number
          total_instabilities_cleared?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      signup_trigger_errors: {
        Row: {
          created_at: string
          email: string | null
          error_message: string
          id: number
          step: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          error_message: string
          id?: number
          step: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          error_message?: string
          id?: number
          step?: string
          user_id?: string | null
        }
        Relationships: []
      }
      skill_defs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          required_level: number
          requirements: Json
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          required_level?: number
          requirements?: Json
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          required_level?: number
          requirements?: Json
          slug?: string
        }
        Relationships: []
      }
      user_resources: {
        Row: {
          trough_capacity: number
          trough_fill: number
          updated_at: string
          user_id: string
        }
        Insert: {
          trough_capacity?: number
          trough_fill?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          trough_capacity?: number
          trough_fill?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_ledger: {
        Row: {
          created_at: string
          currency: Database["public"]["Enums"]["currency_kind"]
          delta: number
          id: string
          reason: string
          ref_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          currency: Database["public"]["Enums"]["currency_kind"]
          delta: number
          id?: string
          reason: string
          ref_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_kind"]
          delta?: number
          id?: string
          reason?: string
          ref_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          crystals: number
          dots: number
          gems: number
          updated_at: string
          user_id: string
        }
        Insert: {
          crystals?: number
          dots?: number
          gems?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          crystals?: number
          dots?: number
          gems?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      homepage_alerts_live: {
        Row: {
          alert_color: string | null
          alert_type: string | null
          cta_href: string | null
          cta_label: string | null
          ends_at: string | null
          id: string | null
          message: string | null
          starts_at: string | null
          updated_at: string | null
        }
        Insert: {
          alert_color?: string | null
          alert_type?: string | null
          cta_href?: string | null
          cta_label?: string | null
          ends_at?: string | null
          id?: string | null
          message?: string | null
          starts_at?: string | null
          updated_at?: string | null
        }
        Update: {
          alert_color?: string | null
          alert_type?: string | null
          cta_href?: string | null
          cta_label?: string | null
          ends_at?: string | null
          id?: string | null
          message?: string | null
          starts_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      homepage_aliune_signal_live: {
        Row: {
          condition: string | null
          corruption: string | null
          created_at: string | null
          end_time: string | null
          ends_at: string | null
          id: string | null
          region: string | null
          report_age_days: number | null
          report_text: string | null
          start_time: string | null
          starts_at: string | null
          updated_at: string | null
        }
        Insert: {
          condition?: string | null
          corruption?: string | null
          created_at?: string | null
          end_time?: string | null
          ends_at?: string | null
          id?: string | null
          region?: string | null
          report_age_days?: number | null
          report_text?: string | null
          start_time?: string | null
          starts_at?: string | null
          updated_at?: string | null
        }
        Update: {
          condition?: string | null
          corruption?: string | null
          created_at?: string | null
          end_time?: string | null
          ends_at?: string | null
          id?: string | null
          region?: string | null
          report_age_days?: number | null
          report_text?: string | null
          start_time?: string | null
          starts_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      homepage_alpha_systems_live: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          released_at: string | null
          sort_order: number | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          released_at?: string | null
          sort_order?: number | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          released_at?: string | null
          sort_order?: number | null
          title?: string | null
        }
        Relationships: []
      }
      homepage_announcements_live: {
        Row: {
          body: string | null
          created_at: string | null
          id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      homepage_patch_notes_live: {
        Row: {
          created_at: string | null
          fixed_notes: string | null
          id: string | null
          new_notes: string | null
          notes: string | null
          released_at: string | null
          summary: string | null
          title: string | null
          updated_notes: string | null
          version: string | null
        }
        Insert: {
          created_at?: string | null
          fixed_notes?: string | null
          id?: string | null
          new_notes?: string | null
          notes?: string | null
          released_at?: string | null
          summary?: string | null
          title?: string | null
          updated_notes?: string | null
          version?: string | null
        }
        Update: {
          created_at?: string | null
          fixed_notes?: string | null
          id?: string | null
          new_notes?: string | null
          notes?: string | null
          released_at?: string | null
          summary?: string | null
          title?: string | null
          updated_notes?: string | null
          version?: string | null
        }
        Relationships: []
      }
      v_pet_storage_stats: {
        Row: {
          atk: number | null
          base_total: number | null
          def: number | null
          hp: number | null
          magi: number | null
          mana: number | null
          pet_id: string | null
          spd: number | null
        }
        Insert: {
          atk?: number | null
          base_total?: number | null
          def?: number | null
          hp?: number | null
          magi?: number | null
          mana?: number | null
          pet_id?: string | null
          spd?: number | null
        }
        Update: {
          atk?: number | null
          base_total?: number | null
          def?: number | null
          hp?: number | null
          magi?: number | null
          mana?: number | null
          pet_id?: string | null
          spd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_stats_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: true
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      v_pet_total_stats: {
        Row: {
          allocated_levels: number | null
          atk: number | null
          base_total: number | null
          def: number | null
          hp: number | null
          magi: number | null
          mana: number | null
          pet_id: string | null
          spd: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_stats_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: true
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_hunger_decay: { Args: { p_pet_id: string }; Returns: number }
      apply_pet_care_decay: {
        Args: { p_pet_id: string }
        Returns: {
          clean: number
          comfort: number
          energy: number
          happy: number
          hunger: number
          last_care_decay_at: string
          ran_away: boolean
          rest: number
        }[]
      }
      consume_trough: {
        Args: { p_amount: number; p_user_id: string }
        Returns: {
          trough_capacity: number
          trough_fill: number
        }[]
      }
      extract_eastern_date: { Args: { ts: string }; Returns: string }
      generate_aliune_signal_report: {
        Args: { p_start: string }
        Returns: undefined
      }
      get_active_buffs: {
        Args: { p_user_id?: string }
        Returns: {
          buff_type: string
          created_at: string
          description: string
          expires_at: string
          id: string
          strength: number
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "pve_active_buffs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_active_instabilities: {
        Args: { p_region?: string }
        Returns: {
          condition: string
          corruption_level: string
          created_at: string
          description: string
          enabled: boolean
          expires_at: string
          has_boss: boolean
          id: string
          region: string
          reward_buffs: Json
          reward_materials: Json
          reward_xp: number
          spawned_at: string
          total_fights: number
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "pve_instabilities"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_email_by_username: { Args: { p_username: string }; Returns: string }
      get_or_create_kithna_tutorial_signal: {
        Args: never
        Returns: {
          condition: string
          corruption: string
          created_at: string
          enabled: boolean
          end_time: string
          ends_at: string
          id: string
          region: string
          report_age_days: number
          report_text: string
          start_time: string
          starts_at: string
          town: string
          updated_at: string
        }[]
      }
      hatch_pet: {
        Args: {
          p_description: string
          p_egg_id: string
          p_gender: string
          p_growth_strong_stats: string[]
          p_growth_weak_stat: string
          p_hatch_time_alignment: string
          p_hatchling_name: string
          p_iv_atk: number
          p_iv_def: number
          p_iv_hp: number
          p_iv_magi: number
          p_iv_mana: number
          p_iv_spd: number
          p_personality_id: string
          p_personality_key: string
          p_user_id: string
        }
        Returns: {
          error_message: string
          pet_row: Database["public"]["Tables"]["pets"]["Row"]
          success: boolean
        }[]
      }
      increment_pve_research_stats: {
        Args: {
          p_bosses_defeated?: number
          p_fights_won?: number
          p_instabilities_cleared?: number
          p_user_id: string
        }
        Returns: undefined
      }
      increment_wallet: {
        Args: { p_crystals?: number; p_dots?: number; p_user_id: string }
        Returns: undefined
      }
      log_signup_trigger_error: {
        Args: {
          p_email: string
          p_error_message: string
          p_step: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      age_stage:
        | "Baby_sprout"
        | "Toddler_sprout"
        | "Teen_sprout"
        | "Adult_sprout"
        | "Legion"
      currency_kind: "dots" | "crystals" | "gems"
      element_kind:
        | "null"
        | "water"
        | "fire"
        | "earth"
        | "air"
        | "ice"
        | "storm"
        | "light"
        | "shadow"
      elemental_line:
        | "water"
        | "fire"
        | "earth"
        | "air"
        | "ice"
        | "storm"
        | "light"
        | "shadow"
      fight_kind: "normal" | "boss"
      item_type:
        | "care"
        | "battle_food"
        | "material"
        | "equipment"
        | "currency_pack"
      log_category: "complete" | "coming_next" | "patch"
      personality_trait:
        | "friendly"
        | "honest"
        | "deceiver"
        | "loyal"
        | "cowardly"
        | "brave"
        | "vengeful"
        | "impulsive"
        | "reasonable"
        | "lazy"
        | "diligent"
        | "naive"
        | "cruel"
        | "optimistic"
        | "pessimistic"
        | "arrogant"
        | "humble"
        | "snob"
        | "respectful"
        | "greedy"
        | "generous"
        | "kind"
      pet_gender: "male" | "female" | "null" | "null_gender"
      pet_location: "hatchery" | "active" | "storage"
      pet_stage:
        | "egg"
        | "baby"
        | "child"
        | "teen"
        | "legion"
        | "mythical"
        | "hatchling"
        | "lowform"
        | "highform"
        | "mythic_legendary"
        | "mythical_legendary"
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
      age_stage: [
        "Baby_sprout",
        "Toddler_sprout",
        "Teen_sprout",
        "Adult_sprout",
        "Legion",
      ],
      currency_kind: ["dots", "crystals", "gems"],
      element_kind: [
        "null",
        "water",
        "fire",
        "earth",
        "air",
        "ice",
        "storm",
        "light",
        "shadow",
      ],
      elemental_line: [
        "water",
        "fire",
        "earth",
        "air",
        "ice",
        "storm",
        "light",
        "shadow",
      ],
      fight_kind: ["normal", "boss"],
      item_type: [
        "care",
        "battle_food",
        "material",
        "equipment",
        "currency_pack",
      ],
      log_category: ["complete", "coming_next", "patch"],
      personality_trait: [
        "friendly",
        "honest",
        "deceiver",
        "loyal",
        "cowardly",
        "brave",
        "vengeful",
        "impulsive",
        "reasonable",
        "lazy",
        "diligent",
        "naive",
        "cruel",
        "optimistic",
        "pessimistic",
        "arrogant",
        "humble",
        "snob",
        "respectful",
        "greedy",
        "generous",
        "kind",
      ],
      pet_gender: ["male", "female", "null", "null_gender"],
      pet_location: ["hatchery", "active", "storage"],
      pet_stage: [
        "egg",
        "baby",
        "child",
        "teen",
        "legion",
        "mythical",
        "hatchling",
        "lowform",
        "highform",
        "mythic_legendary",
        "mythical_legendary",
      ],
    },
  },
} as const
