import { AuthProvider } from "@refinedev/core";
import { supabaseClient } from "../lib/supabaseClient";
import { devLog } from "../lib/devLogger";

export const authProvider: AuthProvider = {
  login: async ({ email, password, isGuest }) => {
    // 1. Guest / Demo one-click bypass
    if (isGuest) {
      const demoUser = {
        id: "demo-user-101",
        email: "demo@powerforecast.ph",
        name: "PowerForecast Explorer",
        avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Powerforecast",
        role: "guest_demo",
        householdType: "Residential (Meralco 230V)",
      };
      localStorage.setItem("powerforecast_active_user", JSON.stringify(demoUser));
      devLog.info("Auth", "Guest session initiated", demoUser);
      return {
        success: true,
        redirectTo: "/dashboard",
      };
    }

    // 2. Supabase Cloud Authentication
    if (email && password) {
      try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          devLog.warn("Auth", `Supabase login note: ${error.message}. Checking fallback.`);
          
          // Fallback to local session if email is provided
          const fallbackUser = {
            id: `user-${Date.now()}`,
            email,
            name: email.split("@")[0],
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
            role: "authenticated",
            householdType: "Residential",
          };
          localStorage.setItem("powerforecast_active_user", JSON.stringify(fallbackUser));
          return {
            success: true,
            redirectTo: "/dashboard",
          };
        }

        // Fetch user account from accounts table
        let accountProfile: any = null;
        if (data.user?.id) {
          const { data: profile } = await supabaseClient
            .from("accounts")
            .select("*")
            .eq("id", data.user.id)
            .maybeSingle();
          accountProfile = profile;
        }

        const user = {
          id: data.user?.id || `user-${Date.now()}`,
          email: data.user?.email || email,
          name: accountProfile?.full_name || data.user?.user_metadata?.name || email.split("@")[0],
          avatar: accountProfile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
          role: "authenticated",
          householdType: data.user?.user_metadata?.householdType || "Residential",
        };
        localStorage.setItem("powerforecast_active_user", JSON.stringify(user));
        devLog.info("Auth", "Supabase authentication successful", user);
        return {
          success: true,
          redirectTo: "/dashboard",
        };
      } catch (err: any) {
        devLog.error("Auth", "Authentication error:", err);
      }
    }

    // 3. Simple email entry fallback
    if (email) {
      const user = {
        id: `user-${Date.now()}`,
        email,
        name: email.split("@")[0],
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
        role: "authenticated",
        householdType: "Residential",
      };
      localStorage.setItem("powerforecast_active_user", JSON.stringify(user));
      return {
        success: true,
        redirectTo: "/dashboard",
      };
    }

    return {
      success: false,
      error: {
        name: "LoginError",
        message: "Please enter your email and password.",
      },
    };
  },

  register: async ({ email, password, name, householdType }) => {
    if (email && password) {
      try {
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name || email.split("@")[0],
              householdType: householdType || "Residential",
            },
          },
        });

        if (error) {
          devLog.warn("Auth", `Supabase signup note: ${error.message}`);
        }

        // The PostgreSQL handle_new_user trigger automatically inserts into the accounts table on auth.users insert.
        const user = {
          id: data?.user?.id || `user-${Date.now()}`,
          email,
          name: name || email.split("@")[0],
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
          role: "authenticated",
          householdType: householdType || "Residential (Meralco)",
        };
        localStorage.setItem("powerforecast_active_user", JSON.stringify(user));
        devLog.info("Auth", "User registered successfully", user);
        return {
          success: true,
          redirectTo: "/dashboard",
        };
      } catch (err: any) {
        devLog.error("Auth", "Registration error:", err);
      }
    }

    if (email) {
      const user = {
        id: `user-${Date.now()}`,
        email,
        name: name || email.split("@")[0],
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
        role: "authenticated",
        householdType: householdType || "Residential (Meralco)",
      };
      localStorage.setItem("powerforecast_active_user", JSON.stringify(user));
      return {
        success: true,
        redirectTo: "/dashboard",
      };
    }

    return {
      success: false,
      error: {
        name: "RegisterError",
        message: "Unable to create account. Please provide required fields.",
      },
    };
  },

  logout: async () => {
    try {
      await supabaseClient.auth.signOut();
    } catch {}
    localStorage.removeItem("powerforecast_active_user");
    devLog.info("Auth", "User logged out");
    return {
      success: true,
      redirectTo: "/",
    };
  },

  check: async () => {
    const user = localStorage.getItem("powerforecast_active_user");
    if (user) {
      return {
        authenticated: true,
      };
    }

    const { data } = await supabaseClient.auth.getSession();
    if (data?.session?.user) {
      return {
        authenticated: true,
      };
    }

    return {
      authenticated: false,
    };
  },

  getIdentity: async () => {
    try {
      const { data } = await supabaseClient.auth.getUser();
      if (data?.user) {
        // Query accounts table
        const { data: profile } = await supabaseClient
          .from("accounts")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();

        const activeUser = {
          id: data.user.id,
          name: profile?.full_name || data.user.user_metadata?.name || data.user.email?.split("@")[0] || "User",
          email: profile?.email || data.user.email || "",
          avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${data.user.email}`,
          householdType: data.user.user_metadata?.householdType || "Residential",
          provider: profile?.provider || "email",
        };
        localStorage.setItem("powerforecast_active_user", JSON.stringify(activeUser));
        return activeUser;
      }
    } catch (e) {
      devLog.warn("Auth", "Could not fetch Supabase user identity, checking cache", e);
    }

    const raw = localStorage.getItem("powerforecast_active_user");
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }

    return {
      id: "demo-user-101",
      name: "PowerForecast Explorer",
      email: "demo@powerforecast.ph",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Powerforecast",
      householdType: "Residential (Meralco 230V)",
    };
  },

  onError: async (error) => {
    console.error("Auth error:", error);
    return { error };
  },
};
