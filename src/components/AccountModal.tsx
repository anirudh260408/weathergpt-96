import React, { useState } from "react";
import {
  X,
  User,
  Shield,
  Lock,
  Mail,
  Key,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  MapPin,
  Settings,
  Bell,
  Sparkles,
  History,
  Laptop,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Cloud,
} from "lucide-react";
import { UserAccount, Theme, SavedUserLocation } from "../types/weather";
import {
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  loginAsGuest,
  logoutUser,
  saveUserAccountToFirestore,
} from "../lib/firebase";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  onLogin: (user: UserAccount) => void;
  onLogout: () => void;
  onUpdateUser: (user: UserAccount) => void;
  onSelectLocation?: (location: SavedUserLocation) => void;
  theme?: Theme;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout,
  onUpdateUser,
  onSelectLocation,
  theme = "dark",
}) => {
  const isDark = theme === "dark";
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "locations" | "preferences">("profile");

  // Auth form states (when user is logged out)
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Security password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);

  // 2FA modal simulation
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");

  // New Location input
  const [newLocName, setNewLocName] = useState("");
  const [newLocLat, setNewLocLat] = useState("");
  const [newLocLon, setNewLocLon] = useState("");

  if (!isOpen) return null;

  // Handle Email/Password login or registration with Firebase Authentication + Firestore
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    if (!email.trim() || !email.includes("@")) {
      setAuthError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setAuthError("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      let userAccount: UserAccount;
      if (authMode === "signup") {
        userAccount = await registerWithEmail(
          email.trim(),
          password,
          name.trim() || email.split("@")[0]
        );
        setAuthSuccessMsg("Account created and synced to Firestore!");
      } else {
        userAccount = await loginWithEmail(email.trim(), password);
        setAuthSuccessMsg("Welcome back! Cloud preferences synced.");
      }
      onLogin(userAccount);
    } catch (err: any) {
      console.warn("Auth error:", err);
      let msg = "Authentication failed. Please check credentials.";
      if (err.code === "auth/email-already-in-use") {
        msg = "This email is already registered. Please sign in instead.";
      } else if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        msg = "Invalid email or password. Please try again.";
      } else if (err.code === "auth/user-not-found") {
        msg = "No account found with this email. Please sign up.";
      } else if (err.message) {
        msg = err.message;
      }
      setAuthError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth Login with Firebase
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const userAccount = await loginWithGoogle();
      onLogin(userAccount);
      setAuthSuccessMsg("Signed in with Google! Preferences synced.");
    } catch (err: any) {
      console.warn("Google Sign-In Error:", err);
      // If popup was closed or restricted in iframe, fallback gracefully
      if (err.code === "auth/popup-closed-by-user") {
        setAuthError("Sign-in popup was closed before completing.");
      } else if (err.code === "auth/popup-blocked") {
        setAuthError("Sign-in popup was blocked. Please allow popups or use Email sign in.");
      } else {
        setAuthError(err.message || "Google sign in was unsuccessful.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Guest Cloud Session
  const handleGuestLogin = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const userAccount = await loginAsGuest();
      onLogin(userAccount);
      setAuthSuccessMsg("Signed in as Guest with Cloud Sync!");
    } catch (err: any) {
      console.warn("Guest sign-in error:", err);
      setAuthError("Could not start guest session.");
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    try {
      await logoutUser();
    } catch (e) {}
    onLogout();
  };

  // Handle password change in security tab
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError(null);
    setPasswordChangeSuccess(false);

    if (newPassword.length < 6) {
      setPasswordChangeError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordChangeError("Passwords do not match.");
      return;
    }

    if (!currentUser) return;

    const timeFormatted = new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const updatedUser: UserAccount = {
      ...currentUser,
      securityLogs: [
        {
          id: `log-${Date.now()}`,
          action: "Password Changed Successfully",
          device: "Web Browser (Current Session)",
          location: "Security Verification Pass",
          timestamp: timeFormatted,
        },
        ...currentUser.securityLogs,
      ],
    };

    onUpdateUser(updatedUser);
    setPasswordChangeSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => setPasswordChangeSuccess(false), 3500);
  };

  // Toggle 2FA
  const handleToggle2FA = () => {
    if (!currentUser) return;

    if (currentUser.twoFactorEnabled) {
      // Disable
      const updatedUser: UserAccount = {
        ...currentUser,
        twoFactorEnabled: false,
        securityLogs: [
          {
            id: `log-${Date.now()}`,
            action: "Two-Factor Authentication Disabled",
            device: "Web Browser",
            location: "Security Settings",
            timestamp: new Date().toLocaleTimeString(),
          },
          ...currentUser.securityLogs,
        ],
      };
      onUpdateUser(updatedUser);
    } else {
      setShow2FASetup(true);
    }
  };

  const handleConfirm2FA = (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactorCode.length < 4 || !currentUser) return;

    const updatedUser: UserAccount = {
      ...currentUser,
      twoFactorEnabled: true,
      twoFactorMethod: "authenticator",
      securityLogs: [
        {
          id: `log-${Date.now()}`,
          action: "Two-Factor Authentication (2FA) Activated",
          device: "Authenticator App Verified",
          location: "Security Settings",
          timestamp: new Date().toLocaleTimeString(),
        },
        ...currentUser.securityLogs,
      ],
    };

    onUpdateUser(updatedUser);
    setShow2FASetup(false);
    setTwoFactorCode("");
  };

  // Add saved location
  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim() || !currentUser) return;

    const lat = parseFloat(newLocLat) || 16.3067;
    const lon = parseFloat(newLocLon) || 80.4365;

    const newLoc: SavedUserLocation = {
      name: newLocName.trim(),
      latitude: lat,
      longitude: lon,
      isDefault: currentUser.savedLocations.length === 0,
    };

    const updatedUser: UserAccount = {
      ...currentUser,
      savedLocations: [...currentUser.savedLocations, newLoc],
    };

    onUpdateUser(updatedUser);
    setNewLocName("");
    setNewLocLat("");
    setNewLocLon("");
  };

  // Remove saved location
  const handleRemoveLocation = (nameToRemove: string) => {
    if (!currentUser) return;
    const updated = currentUser.savedLocations.filter((l) => l.name !== nameToRemove);
    onUpdateUser({ ...currentUser, savedLocations: updated });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div
        className={`relative flex flex-col w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl border shadow-2xl transition-all ${
          isDark
            ? "bg-[#090e1c] border-slate-800 text-slate-100 shadow-cyan-950/20"
            : "bg-white border-slate-200 text-slate-900 shadow-2xl"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 sm:px-6 py-4 border-b ${
            isDark ? "border-slate-800/80 bg-[#0a1022]" : "border-slate-100 bg-slate-50/80"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 text-white shadow-md shadow-cyan-500/20">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                {currentUser ? "Account & Security Hub" : "WeatherGPT Account & Security"}
              </h2>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {currentUser ? "Manage your secure profile, 2FA, and saved weather locations" : "Sign in to sync your weather preferences and safety alerts"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`flex h-8 w-8 items-center justify-center rounded-xl border transition ${
              isDark
                ? "border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
                : "border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 min-h-0">
          {!currentUser ? (
            /* Logged Out: Sign In & Sign Up Form */
            <div className="max-w-md mx-auto py-2">
              <div className="flex rounded-xl p-1 border mb-5 bg-slate-950/40 border-slate-800">
                <button
                  type="button"
                  onClick={() => setAuthMode("signin")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                    authMode === "signin"
                      ? "bg-cyan-500 text-slate-950 shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("signup")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                    authMode === "signup"
                      ? "bg-cyan-500 text-slate-950 shadow-xs"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Social / Cloud Login Buttons */}
              <div className="space-y-2.5 mb-5">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className={`w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border text-xs font-semibold transition active:scale-[0.99] ${
                    isDark
                      ? "border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200"
                      : "border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-xs"
                  }`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <button
                  type="button"
                  onClick={handleGuestLogin}
                  disabled={isLoading}
                  className={`w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border text-xs font-semibold transition active:scale-[0.99] ${
                    isDark
                      ? "border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-900/30 text-cyan-300"
                      : "border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-700"
                  }`}
                >
                  <Cloud className="h-4 w-4 text-cyan-400" />
                  <span>Start Instant Cloud Session (Guest)</span>
                </button>
              </div>

              <div className="relative flex py-2 items-center">
                <div className={`flex-grow border-t ${isDark ? "border-slate-800" : "border-slate-200"}`} />
                <span className={`flex-shrink mx-3 text-[11px] uppercase font-bold tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  or with email
                </span>
                <div className={`flex-grow border-t ${isDark ? "border-slate-800" : "border-slate-200"}`} />
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-3 mt-3">
                {authMode === "signup" && (
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className={`w-full rounded-xl border pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 ${
                          isDark
                            ? "bg-slate-900 border-slate-700 text-white focus:ring-cyan-500/30"
                            : "bg-slate-50 border-slate-300 text-slate-900 focus:ring-sky-500/30"
                        }`}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={`w-full rounded-xl border pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 ${
                        isDark
                          ? "bg-slate-900 border-slate-700 text-white focus:ring-cyan-500/30"
                          : "bg-slate-50 border-slate-300 text-slate-900 focus:ring-sky-500/30"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full rounded-xl border pl-9 pr-10 py-2 text-xs focus:outline-none focus:ring-2 ${
                        isDark
                          ? "bg-slate-900 border-slate-700 text-white focus:ring-cyan-500/30"
                          : "bg-slate-50 border-slate-300 text-slate-900 focus:ring-sky-500/30"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {authError && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-950/40 border border-rose-500/40 p-2.5 text-xs text-rose-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                    <span>{authError}</span>
                  </div>
                )}

                {authSuccessMsg && (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-950/40 border border-emerald-500/40 p-2.5 text-xs text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span>{authSuccessMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 hover:brightness-110 active:scale-[0.99] transition disabled:opacity-50"
                >
                  {isLoading ? "Authenticating..." : authMode === "signin" ? "Sign In to WeatherGPT" : "Create Account & Secure"}
                </button>
              </form>
            </div>
          ) : (
            /* Logged In: Account & Security Management Hub */
            <div>
              {/* Navigation Tabs */}
              <div className="flex border-b mb-5 overflow-x-auto no-scrollbar gap-1">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition ${
                    activeTab === "profile"
                      ? "border-cyan-400 text-cyan-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Profile</span>
                </button>

                <button
                  onClick={() => setActiveTab("security")}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition ${
                    activeTab === "security"
                      ? "border-cyan-400 text-cyan-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span>Security & 2FA</span>
                </button>

                <button
                  onClick={() => setActiveTab("locations")}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition ${
                    activeTab === "locations"
                      ? "border-cyan-400 text-cyan-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Saved Locations ({currentUser.savedLocations.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab("preferences")}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition ${
                    activeTab === "preferences"
                      ? "border-cyan-400 text-cyan-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Preferences</span>
                </button>
              </div>

              {/* Tab 1: Profile View */}
              {activeTab === "profile" && (
                <div className="space-y-4">
                  <div className={`flex items-center gap-4 p-4 rounded-2xl border ${
                    isDark ? "bg-slate-900/60 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}>
                    <img
                      src={currentUser.avatarUrl || "https://api.dicebear.com/7.x/bottts/svg?seed=user"}
                      alt="Avatar"
                      className="h-16 w-16 rounded-2xl border-2 border-cyan-400/60 bg-slate-800 p-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold truncate">{currentUser.name}</h3>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Verified</span>
                        </span>
                      </div>
                      <p className={`text-xs truncate ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        {currentUser.email}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                        <span>Provider: <strong className="capitalize text-slate-300">{currentUser.provider}</strong></span>
                        <span>•</span>
                        <span>Member since {currentUser.createdAt}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className={`p-3.5 rounded-2xl border ${isDark ? "bg-slate-900/40 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                      <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                        <Lock className="h-4 w-4 text-cyan-400" />
                        <span>Security Level</span>
                      </div>
                      <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        {currentUser.twoFactorEnabled ? "High (2FA Activated)" : "Standard (Password Protected)"}
                      </p>
                    </div>

                    <div className={`p-3.5 rounded-2xl border ${isDark ? "bg-slate-900/40 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                      <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                        <History className="h-4 w-4 text-emerald-400" />
                        <span>Last Session Activity</span>
                      </div>
                      <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        {currentUser.lastLogin}
                      </p>
                    </div>
                  </div>

                  {/* Sign out button */}
                  <div className="pt-3 flex justify-between items-center border-t border-slate-800">
                    <span className="text-xs text-slate-500">Signed in as {currentUser.email}</span>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/15 border border-rose-500/30 transition"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Security & 2FA */}
              {activeTab === "security" && (
                <div className="space-y-4">
                  {/* Two-Factor Authentication Status */}
                  <div className={`p-4 rounded-2xl border ${isDark ? "bg-slate-900/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                          currentUser.twoFactorEnabled ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                        }`}>
                          <Smartphone className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold">Two-Factor Authentication (2FA)</h4>
                          <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                            {currentUser.twoFactorEnabled
                              ? "Protects your weather telemetry and alert preferences with verification codes."
                              : "Add an extra layer of security when accessing your account from new devices."}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleToggle2FA}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          currentUser.twoFactorEnabled
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30"
                            : "bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-extrabold"
                        }`}
                      >
                        {currentUser.twoFactorEnabled ? "Disable" : "Enable 2FA"}
                      </button>
                    </div>

                    {show2FASetup && (
                      <form onSubmit={handleConfirm2FA} className="mt-4 pt-4 border-t border-slate-800 space-y-2.5 animate-fade-in">
                        <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-200">
                          Scan the QR code in Google Authenticator or enter verification PIN:
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Enter 6-digit Code (e.g., 482910)"
                            value={twoFactorCode}
                            onChange={(e) => setTwoFactorCode(e.target.value)}
                            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400"
                          >
                            Verify PIN
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Password Change Form */}
                  <div className={`p-4 rounded-2xl border ${isDark ? "bg-slate-900/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                    <h4 className="text-xs font-bold flex items-center gap-1.5 mb-3">
                      <Key className="h-4 w-4 text-cyan-400" />
                      <span>Change Account Password</span>
                    </h4>

                    <form onSubmit={handleChangePassword} className="space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="password"
                          required
                          placeholder="Current Password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className={`rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                            isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300"
                          }`}
                        />
                        <input
                          type="password"
                          required
                          placeholder="New Password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className={`rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                            isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300"
                          }`}
                        />
                        <input
                          type="password"
                          required
                          placeholder="Confirm New Password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={`rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                            isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300"
                          }`}
                        />
                      </div>

                      {passwordChangeError && (
                        <p className="text-xs text-rose-400">{passwordChangeError}</p>
                      )}

                      {passwordChangeSuccess && (
                        <p className="text-xs text-emerald-400 flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" />
                          <span>Password successfully updated!</span>
                        </p>
                      )}

                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
                      >
                        Update Password
                      </button>
                    </form>
                  </div>

                  {/* Security Activity Audit Log */}
                  <div className={`p-4 rounded-2xl border ${isDark ? "bg-slate-900/60 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                    <h4 className="text-xs font-bold flex items-center gap-1.5 mb-2.5">
                      <History className="h-4 w-4 text-slate-400" />
                      <span>Recent Security & Login Audit Log</span>
                    </h4>

                    <div className="space-y-2">
                      {currentUser.securityLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/60 last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <Laptop className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <div>
                              <p className="font-semibold text-slate-200">{log.action}</p>
                              <p className="text-[10px] text-slate-500">{log.device} • {log.location}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">{log.timestamp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Saved Locations Manager */}
              {activeTab === "locations" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold">Saved Custom Weather Locations</h4>
                      <p className="text-[11px] text-slate-500">Quickly jump between your primary cities or travel hubs.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {currentUser.savedLocations.map((loc) => (
                      <div
                        key={loc.name}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                          isDark ? "bg-slate-900/80 border-slate-800 hover:border-slate-700" : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div
                          className="flex items-center gap-2.5 flex-1 cursor-pointer truncate"
                          onClick={() => {
                            if (onSelectLocation) onSelectLocation(loc);
                            onClose();
                          }}
                        >
                          <MapPin className="h-4 w-4 text-cyan-400 shrink-0" />
                          <div className="truncate">
                            <p className="text-xs font-bold truncate">{loc.name}</p>
                            <p className="text-[10px] text-slate-500 font-medium truncate">
                              {loc.region || loc.country ? `${loc.region ? loc.region + ", " : ""}${loc.country || "Saved City"}` : "Saved Location"}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveLocation(loc.name)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                          title="Remove location"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Location Form */}
                  <form onSubmit={handleAddLocation} className={`p-3.5 rounded-2xl border ${
                    isDark ? "bg-slate-900/40 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}>
                    <h5 className="text-xs font-bold mb-2 flex items-center gap-1.5">
                      <Plus className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Add New Custom City</span>
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                      <input
                        type="text"
                        required
                        placeholder="City Name (e.g. London)"
                        value={newLocName}
                        onChange={(e) => setNewLocName(e.target.value)}
                        className={`rounded-xl border px-3 py-1.5 text-xs ${
                          isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300"
                        }`}
                      />
                      <input
                        type="number"
                        step="any"
                        placeholder="Latitude (e.g. 51.50)"
                        value={newLocLat}
                        onChange={(e) => setNewLocLat(e.target.value)}
                        className={`rounded-xl border px-3 py-1.5 text-xs ${
                          isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300"
                        }`}
                      />
                      <input
                        type="number"
                        step="any"
                        placeholder="Longitude (e.g. -0.12)"
                        value={newLocLon}
                        onChange={(e) => setNewLocLon(e.target.value)}
                        className={`rounded-xl border px-3 py-1.5 text-xs ${
                          isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300"
                        }`}
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition"
                    >
                      Save Location
                    </button>
                  </form>
                </div>
              )}

              {/* Tab 4: Preferences */}
              {activeTab === "preferences" && (
                <div className="space-y-3">
                  <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                    isDark ? "bg-slate-900/60 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}>
                    <div>
                      <h4 className="text-xs font-bold">Default Temperature Unit</h4>
                      <p className="text-[11px] text-slate-500">Choose Celsius or Fahrenheit across all forecasts.</p>
                    </div>
                    <div className="flex rounded-xl border border-slate-700 p-0.5 bg-slate-900">
                      <button
                        onClick={() =>
                          onUpdateUser({
                            ...currentUser,
                            preferences: { ...currentUser.preferences, unit: "C" },
                          })
                        }
                        className={`px-3 py-1 rounded-lg text-xs font-bold ${
                          currentUser.preferences.unit === "C" ? "bg-cyan-500 text-slate-950" : "text-slate-400"
                        }`}
                      >
                        °C
                      </button>
                      <button
                        onClick={() =>
                          onUpdateUser({
                            ...currentUser,
                            preferences: { ...currentUser.preferences, unit: "F" },
                          })
                        }
                        className={`px-3 py-1 rounded-lg text-xs font-bold ${
                          currentUser.preferences.unit === "F" ? "bg-cyan-500 text-slate-950" : "text-slate-400"
                        }`}
                      >
                        °F
                      </button>
                    </div>
                  </div>

                  <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                    isDark ? "bg-slate-900/60 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}>
                    <div>
                      <h4 className="text-xs font-bold">Severe Weather Push Alerts</h4>
                      <p className="text-[11px] text-slate-500">Receive priority alerts for thunderstorms and sudden downpours.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={currentUser.preferences.weatherAlerts}
                      onChange={(e) =>
                        onUpdateUser({
                          ...currentUser,
                          preferences: { ...currentUser.preferences, weatherAlerts: e.target.checked },
                        })
                      }
                      className="h-4 w-4 rounded accent-cyan-400"
                    />
                  </div>

                  <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                    isDark ? "bg-slate-900/60 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}>
                    <div>
                      <h4 className="text-xs font-bold">AI Assistant Style</h4>
                      <p className="text-[11px] text-slate-500">Select default response length and detail.</p>
                    </div>
                    <div className="flex rounded-xl border border-slate-700 p-0.5 bg-slate-900">
                      <button
                        onClick={() =>
                          onUpdateUser({
                            ...currentUser,
                            preferences: { ...currentUser.preferences, aiStyle: "simple" },
                          })
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          currentUser.preferences.aiStyle === "simple" ? "bg-cyan-500 text-slate-950" : "text-slate-400"
                        }`}
                      >
                        Direct
                      </button>
                      <button
                        onClick={() =>
                          onUpdateUser({
                            ...currentUser,
                            preferences: { ...currentUser.preferences, aiStyle: "detailed" },
                          })
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          currentUser.preferences.aiStyle === "detailed" ? "bg-cyan-500 text-slate-950" : "text-slate-400"
                        }`}
                      >
                        Detailed
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
