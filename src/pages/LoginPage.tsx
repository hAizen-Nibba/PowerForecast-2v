import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLogin } from "@refinedev/core";
import {
  Zap,
  Sun,
  Moon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  PlayCircle,
} from "lucide-react";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { mutate: login, isLoading } = useLogin();

  const [isDark, setIsDark] = useState<boolean>(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHoveredBulb, setIsHoveredBulb] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter your email and password.");
      return;
    }

    login(
      { email, password, rememberMe },
      {
        onSuccess: () => navigate("/dashboard"),
        onError: (err: any) => setErrorMessage(err?.message || "Invalid credentials."),
      }
    );
  };

  const handleGuestDemo = () => {
    setErrorMessage(null);
    login(
      { isGuest: true },
      {
        onSuccess: () => navigate("/dashboard"),
      }
    );
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 relative overflow-x-hidden ${
      isDark
        ? "bg-gradient-to-b from-[#0e1258] via-[#1e278b] to-[#3152d8] text-white"
        : "bg-gradient-to-b from-white via-[#e6ecff] to-[#768bf7] text-[#100b46]"
    }`}>
      {/* 1. Header Navbar */}
      <header className={`w-full h-16 border-b flex items-center justify-between px-4 sm:px-8 z-30 backdrop-blur-md ${
        isDark ? "bg-[#0b0933]/90 border-white/10" : "bg-white/90 border-[#6c7ae0]/20"
      }`}>
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src="/Assets/LOGO.png"
            alt="PowerForecast"
            className="h-9 w-auto"
            onError={(e: any) => (e.target.style.display = "none")}
          />
          <div className="flex items-center gap-1">
            <span className={`text-lg font-extrabold tracking-tight ${isDark ? "text-white" : "text-[#100b46]"}`}>
              power
            </span>
            <span className="text-lg font-extrabold tracking-tight text-[#ffd54f]">
              forecast
            </span>
          </div>
        </Link>

        {/* Right nav items */}
        <div className="flex items-center gap-3.5">
          {/* Theme Switch */}
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold hidden sm:inline ${isDark ? "text-white" : "text-[#100b46]"}`}>
              {isDark ? "Dark" : "Light"}
            </span>
            <button
              type="button"
              onClick={() => setIsDark(!isDark)}
              className={`w-11 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                isDark ? "bg-[#5c68db] justify-end" : "bg-slate-300 justify-start"
              }`}
              title="Toggle Theme"
            >
              <div className="w-4 h-4 rounded-full bg-white shadow flex items-center justify-center text-[10px]">
                {isDark ? <Moon className="w-2.5 h-2.5 text-[#5c68db]" /> : <Sun className="w-2.5 h-2.5 text-amber-500" />}
              </div>
            </button>
          </div>

          <Link
            to="/signup"
            className={`text-xs font-bold transition-colors ${
              isDark ? "text-white hover:text-[#ffd54f]" : "text-[#100b46] hover:text-[#5a5cc7]"
            }`}
          >
            Sign Up
          </Link>

          <Link
            to="/dashboard"
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#ffd54f] hover:bg-[#ffc107] text-[#0f0a3e] shadow-md shadow-[#ffd54f]/20 transition-all flex items-center gap-1"
          >
            <Zap className="w-3.5 h-3.5 fill-[#0f0a3e]" />
            <span>Launch App</span>
          </Link>
        </div>
      </header>

      {/* 2. Main Login Area */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center p-4 sm:p-8 max-w-5xl mx-auto w-full gap-8">
        {/* Left Side: Light Bulb Graphic from original assets */}
        <div
          className="hidden lg:flex flex-col items-center justify-center relative cursor-pointer select-none group"
          onMouseEnter={() => setIsHoveredBulb(true)}
          onMouseLeave={() => setIsHoveredBulb(false)}
        >
          <div className={`w-72 h-72 rounded-full absolute -z-10 blur-3xl transition-opacity duration-500 ${
            isHoveredBulb || isDark ? "opacity-40 bg-[#ffd54f]" : "opacity-10 bg-indigo-400"
          }`} />
          <img
            src={isHoveredBulb ? "/Assets/On.png" : "/Assets/Off.png"}
            alt="Bulb"
            className="w-64 h-auto drop-shadow-2xl transition-transform duration-300 group-hover:scale-105"
            onError={(e: any) => {
              e.target.src = "/Assets/On.png";
            }}
          />
          <span className="text-[11px] font-mono text-slate-200 mt-2 font-medium tracking-wide">
            {isHoveredBulb ? "⚡ Grid Synchronized" : "💡 Hover to Energize"}
          </span>
        </div>

        {/* Right Side: Login Card */}
        <div className="w-full max-w-md">
          <div className={`p-6 sm:p-8 rounded-3xl border shadow-2xl backdrop-blur-xl space-y-5 transition-all ${
            isDark
              ? "bg-[#17143d]/92 border-white/10 shadow-black/40 text-white"
              : "bg-white/92 border-[#6c7ae0]/25 shadow-[#1a1072]/15 text-[#100b46]"
          }`}>
            <div className="space-y-1">
              <h1 className="text-2xl font-black tracking-tight">
                Log In
              </h1>
              <p className={`text-xs ${isDark ? "text-slate-300" : "text-[#3d3e75]"}`}>
                Welcome back to <span className="font-bold">power</span><span className="font-bold text-[#ffd54f]">forecast</span>
              </p>
            </div>

            {/* Google Social Login */}
            <button
              type="button"
              onClick={handleGuestDemo}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-sm ${
                isDark
                  ? "bg-white text-[#222] border-transparent hover:bg-slate-100"
                  : "bg-white text-[#100b46] border-[#6c7ae0]/30 hover:bg-slate-50"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className={`flex-1 h-px ${isDark ? "bg-white/20" : "bg-[#6c7ae0]/30"}`} />
              <span className={`text-[11px] uppercase font-bold tracking-wider ${isDark ? "text-slate-300" : "text-[#5a5cc7]"}`}>
                or
              </span>
              <div className={`flex-1 h-px ${isDark ? "bg-white/20" : "bg-[#6c7ae0]/30"}`} />
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Email / Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 text-slate-300">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white text-slate-900 rounded-xl pl-10 pr-4 py-2.5 font-medium border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5c68db] shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 text-slate-300">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white text-slate-900 rounded-xl pl-10 pr-10 py-2.5 font-medium border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5c68db] shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-800 cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password & Remember Me */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-[#04006e] focus:ring-0 cursor-pointer"
                  />
                  <span className={isDark ? "text-slate-300" : "text-[#3d3e75]"}>Remember me</span>
                </label>

                <span className="text-xs text-[#ffd54f] hover:underline cursor-pointer">
                  Forgot Password?
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#04006e] hover:bg-[#09038e] text-white shadow-lg shadow-[#04006e]/40 transition-all cursor-pointer mt-2"
              >
                {isLoading ? "Logging in..." : "Login"}
              </button>
            </form>

            {/* Instant Guest Demo Trigger */}
            <div className="pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={handleGuestDemo}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#ffd54f]/10 hover:bg-[#ffd54f]/20 border border-[#ffd54f]/40 text-[#ffd54f] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Instant Guest Demo Access</span>
              </button>
            </div>

            {/* Footer Sign up link */}
            <p className={`text-center text-xs pt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              New to the ball?{" "}
              <Link to="/signup" className="text-[#ffd54f] hover:underline font-bold">
                Sign up!
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
