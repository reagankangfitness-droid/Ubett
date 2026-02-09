// ── Row types (what you get back from a select) ─────────────

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export interface Location {
  id: string;
  user_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  wifi_ssid: string | null;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  user_id: string;
  location_id: string;
  label: string;
  emoji: string;
  sort_order: number;
  time_rule: TimeRule | null;
  is_active: boolean;
  created_at: string;
}

export interface TimeRule {
  days: number[]; // 0 = Sun … 6 = Sat
  start: string;  // "HH:mm"
  end: string;    // "HH:mm"
}

export interface CheckEvent {
  id: string;
  user_id: string;
  location_id: string;
  items_checked: string[]; // array of checklist_item ids
  items_total: number;
  all_checked: boolean;
  checked_at: string;
}

export interface Streak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_check_date: string | null;
  updated_at: string;
}

// ── Insert types (what you pass to an insert) ───────────────

export type ProfileInsert = Omit<Profile, 'created_at'>;

export type LocationInsert = Omit<Location, 'id' | 'created_at'> & {
  id?: string;
  radius_meters?: number;
};

export type ChecklistItemInsert = Omit<ChecklistItem, 'id' | 'created_at' | 'is_active'> & {
  id?: string;
  is_active?: boolean;
};

export type CheckEventInsert = Omit<CheckEvent, 'id' | 'checked_at'> & {
  id?: string;
};

export type StreakInsert = Omit<Streak, 'id' | 'updated_at' | 'current_streak' | 'longest_streak'> & {
  id?: string;
  current_streak?: number;
  longest_streak?: number;
};

// ── Supabase Database type map ──────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: Partial<ProfileInsert>;
      };
      locations: {
        Row: Location;
        Insert: LocationInsert;
        Update: Partial<LocationInsert>;
      };
      checklist_items: {
        Row: ChecklistItem;
        Insert: ChecklistItemInsert;
        Update: Partial<ChecklistItemInsert>;
      };
      check_events: {
        Row: CheckEvent;
        Insert: CheckEventInsert;
        Update: Partial<CheckEventInsert>;
      };
      streaks: {
        Row: Streak;
        Insert: StreakInsert;
        Update: Partial<StreakInsert>;
      };
    };
  };
}
