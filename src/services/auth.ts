import { supabase } from "@/lib/supabase/client";
import { Profile, UserRole, AuthSession } from "@/types/auth";

export const authService = {
  /**
   * Fetches the current active session from Supabase.
   */
  async getSession(): Promise<AuthSession | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) return null;

      return {
        user: {
          id: session.user.id,
          email: session.user.email,
          phone: session.user.phone,
        }
      };
    } catch (err) {
      console.error("Error fetching session:", err);
      return null;
    }
  },

  /**
   * Fetches the profile and role data for a given user ID.
   */
  async getProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
        
      if (error || !data) return null;
      return data as Profile;
    } catch (err) {
      console.error("Error fetching profile:", err);
      return null;
    }
  },

  /**
   * Helper to check if a user is an admin.
   */
  async isAdmin(): Promise<boolean> {
    const session = await this.getSession();
    if (!session?.user) return false;
    
    const profile = await this.getProfile(session.user.id);
    return profile?.role === "admin";
  },

  /**
   * Helper to check if a user is an approved provider.
   */
  async isProvider(): Promise<boolean> {
    const session = await this.getSession();
    if (!session?.user) return false;
    
    const profile = await this.getProfile(session.user.id);
    return profile?.role === "provider";
  },

  /**
   * Helper to check if a user is a customer.
   */
  async isCustomer(): Promise<boolean> {
    const session = await this.getSession();
    if (!session?.user) return false;
    
    const profile = await this.getProfile(session.user.id);
    return profile?.role === "customer";
  },

  /**
   * Logs out the current user safely.
   */
  async signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }
};
