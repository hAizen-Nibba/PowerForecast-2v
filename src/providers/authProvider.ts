import { AuthProvider } from "@refinedev/core";

export const authProvider: AuthProvider = {
  login: async ({ email, password, isGuest }) => {
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
      return {
        success: true,
        redirectTo: "/dashboard",
      };
    }

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
        message: "Please enter a valid email address.",
      },
    };
  },

  register: async ({ email, password, name, householdType }) => {
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
    localStorage.removeItem("powerforecast_active_user");
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

    return {
      authenticated: false,
    };
  },

  getIdentity: async () => {
    const raw = localStorage.getItem("powerforecast_active_user");
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }
    return {
      id: "guest-user",
      name: "Guest Explorer",
      email: "guest@powerforecast.ph",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Powerforecast",
      householdType: "Residential",
    };
  },

  onError: async (error) => {
    console.error("Auth error:", error);
    return { error };
  },
};
