import { AuthProvider } from "@refinedev/core";
import { supabaseClient } from "../lib/supabaseClient";
import { devLog } from "../lib/devLogger";

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    if (!email || !password) {
      return {
        success: false,
        error: {
          name: "LoginError",
          message: "Please enter both email and password.",
        },
      };
    }

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        devLog.warn("Auth", `Supabase login failed: ${error.message}`);
        return {
          success: false,
          error: {
            name: "LoginError",
            message: error.message || "Invalid email or password.",
          },
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: {
            name: "LoginError",
            message: "User session could not be established.",
          },
        };
      }

      // Fetch user profile from accounts table
      let accountProfile: any = null;
      try {
        const { data: profile } = await supabaseClient
          .from("accounts")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();
        accountProfile = profile;
      } catch (profileErr) {
        devLog.warn("Auth", "Could not fetch user profile record:", profileErr);
      }

      const activeUser = {
        id: data.user.id,
        email: data.user.email || email,
        name: accountProfile?.full_name || data.user.user_metadata?.name || email.split("@")[0],
        avatar: accountProfile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
        role: "authenticated",
        householdType: data.user.user_metadata?.householdType || accountProfile?.household_type || "Residential",
      };

      localStorage.setItem("powerforecast_active_user", JSON.stringify(activeUser));
      devLog.info("Auth", "Authentication successful", activeUser);

      return {
        success: true,
        redirectTo: "/dashboard",
      };
    } catch (err: any) {
      devLog.error("Auth", "Unexpected login error:", err);
      return {
        success: false,
        error: {
          name: "LoginError",
          message: err?.message || "An unexpected error occurred during login.",
        },
      };
    }
  },

  register: async ({ email, password, name, householdType }) => {
    if (!email || !password) {
      return {
        success: false,
        error: {
          name: "RegisterError",
          message: "Please provide an email and password.",
        },
      };
    }

    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            name: name?.trim() || email.split("@")[0],
            householdType: householdType || "Residential (Meralco 230V)",
          },
        },
      });

      if (error) {
        devLog.warn("Auth", `Supabase registration failed: ${error.message}`);
        return {
          success: false,
          error: {
            name: "RegisterError",
            message: error.message || "Failed to create account.",
          },
        };
      }

      if (data?.user) {
        const activeUser = {
          id: data.user.id,
          email: data.user.email || email,
          name: name?.trim() || data.user.user_metadata?.name || email.split("@")[0],
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
          role: "authenticated",
          householdType: householdType || "Residential (Meralco 230V)",
        };
        localStorage.setItem("powerforecast_active_user", JSON.stringify(activeUser));
        devLog.info("Auth", "User registered successfully", activeUser);
      }

      return {
        success: true,
        redirectTo: "/dashboard",
      };
    } catch (err: any) {
      devLog.error("Auth", "Unexpected registration error:", err);
      return {
        success: false,
        error: {
          name: "RegisterError",
          message: err?.message || "An unexpected error occurred during registration.",
        },
      };
    }
  },

  logout: async () => {
    try {
      await supabaseClient.auth.signOut();
    } catch (err) {
      devLog.warn("Auth", "Sign out error:", err);
    }
    localStorage.removeItem("powerforecast_active_user");
    devLog.info("Auth", "User logged out successfully");
    return {
      success: true,
      redirectTo: "/login",
    };
  },

  check: async () => {
    try {
      const { data, error } = await supabaseClient.auth.getSession();
      if (error || !data?.session?.user) {
        // Clear cached user if Supabase session is absent or expired
        localStorage.removeItem("powerforecast_active_user");
        return {
          authenticated: false,
          redirectTo: "/login",
          logout: true,
        };
      }

      return {
        authenticated: true,
      };
    } catch {
      localStorage.removeItem("powerforecast_active_user");
      return {
        authenticated: false,
        redirectTo: "/login",
        logout: true,
      };
    }
  },

  getIdentity: async () => {
    try {
      const { data: authData, error: authError } = await supabaseClient.auth.getUser();
      if (authError || !authData?.user) {
        return null;
      }

      const user = authData.user;

      // Query accounts table for customized profile metadata
      const { data: profile } = await supabaseClient
        .from("accounts")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      const activeUser = {
        id: user.id,
        name: profile?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User",
        email: profile?.email || user.email || "",
        avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`,
        householdType: user.user_metadata?.householdType || profile?.household_type || "Residential",
        provider: profile?.provider || "email",
      };

      localStorage.setItem("powerforecast_active_user", JSON.stringify(activeUser));
      return activeUser;
    } catch (e) {
      devLog.warn("Auth", "Error fetching user identity", e);
      return null;
    }
  },

  onError: async (error) => {
    console.error("Auth error:", error);
    return { error };
  },
};

export default authProvider;
