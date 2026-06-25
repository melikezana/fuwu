import type { Database } from "@/lib/supabase/types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type ProfileRole = ProfileRow["role"];

export type CurrentUserProfile = Pick<
  ProfileRow,
  "full_name" | "id" | "phone" | "role" | "avatar_url"
>;
