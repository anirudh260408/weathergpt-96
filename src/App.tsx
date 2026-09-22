import React, { useState, useEffect, useCallback, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { Navbar } from "./components/Navbar";
import { WeatherDashboard } from "./components/WeatherDashboard";
import { DangerBanner } from "./components/DangerBanner";
import { ForecastView } from "./components/ForecastView";
import { AIChatView } from "./components/AIChatView";
import { WeatherAtmosphere } from "./components/WeatherAtmosphere";
import { NearbyAssistance } from "./components/NearbyAssistance";
import { RecommendationsView } from "./components/RecommendationsView";
import { RetrospectiveWeatherView } from "./components/RetrospectiveWeatherView";
import { AlertsModal } from "./components/AlertsModal";
import { LocationModal } from "./components/LocationModal";
import { AccountModal } from "./components/AccountModal";
import { ProactiveSafetyBanner } from "./components/ProactiveSafetyBanner";
import { NotificationSettingsModal } from "./components/NotificationSettingsModal";
import {
  WeatherData,
  TemperatureUnit,
  ChatMessage,
  WeatherAlert,
  WeatherStatus,
  WeatherDelta,
  SafetyRecommendation,
  Theme,
  ChatHistoryItem,
  ChatSession,
  UserAccount,
  SavedUserLocation,
  GPSState,
  GPSStatus,
  ProactiveSafetyRisk,
  NotificationSettings,
  AppTab,
  LocationStatus,
} from "./types/weather";
import {
  evaluateWeatherAlerts,
  calculateWeatherStatus,
  detectWeatherChanges,
  generateRecommendations,
  fetchWeatherWithResilience,
} from "./utils/weatherEngine";
import { reverseGeocodeCoordinates, formatLocationName } from "./utils/locationService";
import {
  analyzeWeatherRisk,
  shouldNotifyUser,
  recordNotificationSent,
  triggerNativeBrowserNotification,
  getSavedNotificationSettings,
} from "./utils/proactiveSafetyEngine";
import {
  auth,
  onAuthStateChanged,
  syncUserFromFirestore,
  subscribeToUserFirestore,
  savePreferencesToFirestore,
  saveUserAccountToFirestore,
} from "./lib/firebase";
import { extractCandidateLocation, isExplicitGpsRequest } from "./utils/locationExtractor";
import { AlertCircle, RefreshCw, Sparkles, CheckCircle2, MapPin } from "lucide-react";

// Smart Emoji mapper based on user intent & keywords
const getSmartEmojiForQuery = (text: string): string => {
  const q = text.toLowerCase().trim();
  if (q.startsWith("hi") || q.startsWith("hello") || q.startsWith("hey") || q.includes("greet")) return "👋";
  if (q.includes("rain") || q.includes("umbrella") || q.includes("shower") || q.includes("wet")) return "☂️";
  if (q.includes("hyderabad") || q.includes("trip") || q.includes("pack") || q.includes("travel") || q.includes("week") || q.includes("arrange")) return "🧳";
  if (q.includes("shelter") || q.includes("safe") || q.includes("sudden") || q.includes("flood") || q.includes("storm") || q.includes("danger")) return "🛡️";
  if (q.includes("going out") || q.includes("step out") || q.includes("outside") || q.includes("leave")) return "🚶";
  if (q.includes("sun") || q.includes("hot") || q.includes("heat") || q.includes("uv") || q.includes("sunscreen") || q.includes("shades")) return "☀️";
  if (q.includes("sport") || q.includes("cricket") || q.includes("play") || q.includes("run") || q.includes("walk")) return "🏏";
  if (q.includes("tomorrow") || q.includes("forecast") || q.includes("5-day") || q.includes("weekly")) return "📅";
  return "🌤️";
};

const DEFAULT_CHAT_HISTORY: ChatHistoryItem[] = [
  {
    id: "h1",
    title: "Will it rain today?",
    query: "Will it rain today? Do I need to carry an umbrella? Simple clear answer with emojis.",
    timestamp: "Today",
    emoji: "☂️",
    category: "rain",
  },
  {
    id: "h2",
    title: "1-Week Hyderabad Trip",
    query: "Next week I am going to Hyderabad for 1 week. What will the weather be like and what important things do I need to pack and arrange? Clear checklist with emojis.",
    timestamp: "Today",
    emoji: "🧳",
    category: "travel",
  },
  {
    id: "h3",
    title: "Sudden Rain Shelters",
    query: "If rain suddenly happens, what are the nearest safe public places and shelters to take cover immediately? Clear safe options with emojis.",
    timestamp: "Yesterday",
    emoji: "🛡️",
    category: "shelter",
  },
  {
    id: "h4",
    title: "Going Out Now Check",
    query: "I am going out now. What is the weather and what should I carry — full sun (sunscreen/sunglasses) or full rain (umbrella)? Simple advice.",
    timestamp: "Yesterday",
    emoji: "🚶",
    category: "going_out",
  },
];

export default function App() {
  // Theme state ("dark" default matching user request and screenshot)
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem("weathergpt_theme");
      if (saved === "dark" || saved === "light") return saved;
    } catch {}
    return "dark";
  });

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("weathergpt_theme", next);
      } catch {}
      return next;
    });
  };

  // Core application states
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [prevWeatherData, setPrevWeatherData] = useState<WeatherData | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>("chat"); // Default to chat view matching user screenshot!
  const [unit, setUnit] = useState<TemperatureUnit>("C");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("UNKNOWN");
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [gpsNotification, setGpsNotification] = useState<string | null>(null);

  // Proactive Safety & GPS Monitoring State
  const [gpsState, setGpsState] = useState<GPSState>({
    status: "idle",
    coords: null,
    locationName: "",
    lastUpdated: null,
  });
  const [activeProactiveRisk, setActiveProactiveRisk] = useState<ProactiveSafetyRisk | null>(null);
  const [dismissedRiskIds, setDismissedRiskIds] = useState<Set<string>>(new Set());
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(getSavedNotificationSettings);
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);

  // Modals & Mobile controls
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const [isDangerModeSimulated, setIsDangerModeSimulated] = useState(false);

  // User Account & Security State (Synced with Firestore)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);

  // Listen to Firebase Auth state and subscribe to user's Firestore document
  useEffect(() => {
    let unsubscribeFirestoreDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeFirestoreDoc) {
        unsubscribeFirestoreDoc();
        unsubscribeFirestoreDoc = null;
      }

      if (firebaseUser) {
        try {
          const userDoc = await syncUserFromFirestore(firebaseUser);
          setCurrentUser(userDoc);
          if (userDoc.preferences?.unit) {
            setUnit(userDoc.preferences.unit);
          }

          // Real-time listener for cross-device & cross-session consistency
          unsubscribeFirestoreDoc = subscribeToUserFirestore(firebaseUser.uid, (updatedProfile) => {
            setCurrentUser(updatedProfile);
            if (updatedProfile.preferences?.unit) {
              setUnit(updatedProfile.preferences.unit);
            }
          });
        } catch (err) {
          console.warn("Error syncing user with Firestore:", err);
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestoreDoc) {
        unsubscribeFirestoreDoc();
      }
    };
  }, []);

  const handleToggleUnit = useCallback(() => {
    setUnit((prevUnit) => {
      const nextUnit: TemperatureUnit = prevUnit === "C" ? "F" : "C";
      // Persist to Firestore if user is authenticated
      if (currentUser?.id) {
        savePreferencesToFirestore(currentUser.id, {
          ...currentUser.preferences,
          unit: nextUnit,
        });
      }
      return nextUnit;
    });
  }, [currentUser]);

  const handleLogin = (user: UserAccount) => {
    setCurrentUser(user);
    if (user.preferences?.unit) {
      setUnit(user.preferences.unit);
    }
    if (user.id) {
      saveUserAccountToFirestore(user);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleUpdateUser = (user: UserAccount) => {
    setCurrentUser(user);
    if (user.preferences?.unit) {
      setUnit(user.preferences.unit);
    }
    if (user.id) {
      // Persist directly to Firestore using authenticated UID
      saveUserAccountToFirestore(user);
    }
  };

  const handleSelectSavedLocation = (loc: SavedUserLocation) => {
    fetchWeather({ lat: loc.latitude, lon: loc.longitude, name: loc.name }, true);
  };

  // Chat & AI Multi-Session states (ChatGPT-style)
  // RULE: Every application launch or refresh MUST start on a NEW CHAT.
  // Historical sessions remain available in Recent Chats, but are NOT restored automatically.
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const freshId = `sess-${Date.now()}`;
    const freshSession: ChatSession = {
      id: freshId,
      title: "New Chat",
      emoji: "🌤️",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isGenerating: false,
    };

    let historical: ChatSession[] = [];
    try {
      const saved = localStorage.getItem("weathergpt_chat_sessions_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          historical = parsed
            .map((s: ChatSession) => ({
              ...s,
              isGenerating: false,
              activeRequestId: undefined,
              activeMessageId: undefined,
            }))
            .filter((s) => s.messages && s.messages.length > 0);
        }
      }
    } catch (e) {
      console.warn("Failed to load chat sessions from localStorage", e);
    }

    return [freshSession, ...historical];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    // ALWAYS start on the fresh new chat on startup / refresh
    return sessions ? sessions[0].id : `sess-${Date.now()}`;
  });

  // Map of active AbortControllers keyed by session chatId
  const chatAbortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Sync sessions to localStorage
  useEffect(() => {
    try {
      // Don't persist ephemeral request state
      const cleaned = sessions.map((s) => ({
        ...s,
        isGenerating: false,
        activeRequestId: undefined,
        activeMessageId: undefined,
      }));
      localStorage.setItem("weathergpt_chat_sessions_v2", JSON.stringify(cleaned));
    } catch (e) {
      console.warn("Failed to save chat sessions to localStorage", e);
    }
  }, [sessions]);

  // Current session & messages derived
  const currentSession = sessions.find((s) => s.id === activeSessionId) || sessions[0] || {
    id: "sess-1",
    title: "Weather Assistant",
    emoji: "🌤️",
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isGenerating: false,
  };
  const chatMessages = currentSession.messages;

  const handleNewChat = () => {
    const newId = `sess-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: "New Chat",
      emoji: "💬",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isGenerating: false,
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    setActiveTab("chat");
    try {
      localStorage.setItem("weathergpt_active_session_id_v2", newId);
    } catch {}
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    try {
      localStorage.setItem("weathergpt_active_session_id_v2", id);
    } catch {}
  };

  const handleDeleteSession = (id: string) => {
    // Abort controller for deleted session if in-flight
    const controller = chatAbortControllersRef.current.get(id);
    if (controller) {
      controller.abort();
      chatAbortControllersRef.current.delete(id);
    }

    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (next.length === 0) {
        const freshId = `sess-${Date.now()}`;
        const fresh: ChatSession = {
          id: freshId,
          title: "Weather Assistant",
          emoji: "🌤️",
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isGenerating: false,
        };
        setActiveSessionId(freshId);
        return [fresh];
      }
      if (activeSessionId === id) {
        setActiveSessionId(next[0].id);
      }
      return next;
    });
  };

  const handleClearAllSessions = () => {
    // Abort all controllers
    chatAbortControllersRef.current.forEach((ctrl) => ctrl.abort());
    chatAbortControllersRef.current.clear();

    const freshId = `sess-${Date.now()}`;
    const fresh: ChatSession = {
      id: freshId,
      title: "Weather Assistant",
      emoji: "🌤️",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isGenerating: false,
    };
    setSessions([fresh]);
    setActiveSessionId(freshId);
    try {
      localStorage.removeItem("weathergpt_chat_sessions_v2");
      localStorage.setItem("weathergpt_active_session_id_v2", freshId);
    } catch (e) {}
  };

  // Fetch real weather data with robust multi-layer resilience
  const fetchWeather = useCallback(
    async (
      params: {
        lat?: number;
        lon?: number;
        city?: string;
        name?: string;
        region?: string;
        country?: string;
      },
      isManualRefresh: boolean = false
    ) => {
      try {
        if (isManualRefresh) setIsRefreshing(true);
        setGeneralError(null);

        const result = await fetchWeatherWithResilience(params);
        const data = result.data;

        if (result.warning) {
          setGeneralError(result.warning);
        }

        // Update states and preserve previous data for delta analysis (Section 8)
        setWeatherData((prev) => {
          if (prev && isManualRefresh) {
            setPrevWeatherData(prev);
          }
          return data;
        });

        // Set friendly last updated time
        const now = new Date();
        setLastUpdated(
          now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
        );
      } catch (err: any) {
        console.error("Failed to load weather data:", err);
        setGeneralError(err.message || "Weather service is temporarily unreachable.");
      } finally {
        setIsInitialLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  // Startup Location-First Flow:
  // Startup -> New Chat -> Check Location Status.
  // Never default to a hardcoded city. If location is unknown/denied, prompt user in chat.
  // Never fetch weather until a valid location is determined.
  useEffect(() => {
    if ("geolocation" in navigator && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          if (result.state === "granted") {
            handleUseGps(false);
          } else if (result.state === "denied") {
            setLocationStatus("GPS_DENIED");
          } else {
            setLocationStatus("UNKNOWN");
          }
        })
        .catch(() => {
          setLocationStatus("UNKNOWN");
        });
    } else {
      setLocationStatus("UNKNOWN");
    }
  }, []);

  // Derived Meteorological Calculations (Rule-based Safety Engine)
  const computedAlerts: WeatherAlert[] = weatherData ? evaluateWeatherAlerts(weatherData) : [];

  // If danger preview is toggled on, inject simulated danger alert
  const activeAlerts: WeatherAlert[] = isDangerModeSimulated
    ? [
        {
          id: "sim-danger",
          type: "storm",
          level: "danger",
          title: "SEVERE THUNDERSTORM & GALE WARNING",
          message: "Destructive wind gusts reaching 65 km/h and torrential rainfall detected in the vicinity.",
          action: "Seek substantial indoor shelter immediately. Stay clear of windows, loose hoardings, and downed power lines.",
          triggerValue: "Simulation Preview Mode",
          timestamp: new Date().toISOString(),
        },
        ...computedAlerts,
      ]
    : computedAlerts;

  const weatherStatus: WeatherStatus = weatherData
    ? calculateWeatherStatus(activeAlerts, weatherData)
    : {
        level: "NORMAL",
        title: "Initializing Telemetry",
        description: "Connecting to real weather sensors...",
        dominantFactor: "Loading",
        color: "text-slate-600",
        bgLight: "bg-slate-50 border-slate-200",
        borderColor: "border-slate-300",
        isDanger: false,
      };

  const weatherDelta: WeatherDelta = detectWeatherChanges(prevWeatherData, weatherData!);
  const recommendations: SafetyRecommendation[] = weatherData ? generateRecommendations(weatherData) : [];

  const isDangerActive = weatherStatus.isDanger || isDangerModeSimulated;

  // Proactive Weather Safety Risk Engine (Real-time Evaluation)
  useEffect(() => {
    if (!weatherData) return;

    const detectedRisk = analyzeWeatherRisk(weatherData, gpsState.status === "active");

    if (detectedRisk) {
      const evaluation = shouldNotifyUser(detectedRisk, notificationSettings, gpsState.status === "active");

      if (evaluation.shouldNotify) {
        // If condition escalated, mark it
        if (evaluation.isEscalated) {
          detectedRisk.escalated = true;
        }

        // Trigger native browser notification if permitted
        let browserNotified = false;
        if (notificationSettings.browserPermission === "granted") {
          triggerNativeBrowserNotification(detectedRisk).then((sent) => {
            browserNotified = sent;
            recordNotificationSent(detectedRisk, browserNotified);
          });
        } else {
          recordNotificationSent(detectedRisk, false);
        }

        setActiveProactiveRisk(detectedRisk);
      } else if (!activeProactiveRisk) {
        // Keep current active risk visible in banner if exists
        setActiveProactiveRisk(detectedRisk);
      }
    } else {
      // Clear risk if conditions returned to normal
      setActiveProactiveRisk(null);
    }
  }, [weatherData, gpsState.status, notificationSettings]);

  // Handle Location selection
  const handleSelectCoordinates = async (lat: number, lon: number, name?: string, region?: string, country?: string) => {
    let resolvedName = name;
    let resolvedRegion = region;
    let resolvedCountry = country;

    if (!resolvedName || resolvedName.includes("°") || /^-?\d+(\.\d+)?,/.test(resolvedName)) {
      try {
        const rev = await reverseGeocodeCoordinates(lat, lon);
        resolvedName = rev.name;
        resolvedRegion = rev.region;
        resolvedCountry = rev.country;
      } catch {
        resolvedName = "Location detected";
      }
    }

    setLocationStatus("MANUAL_SELECTED");
    await fetchWeather({ lat, lon, name: resolvedName, region: resolvedRegion, country: resolvedCountry }, true);
  };

  const handleSelectCity = async (city: string) => {
    setLocationStatus("MANUAL_SELECTED");
    await fetchWeather({ city }, true);
  };

  // Direct Browser GPS Trigger & Safety Tracking
  const handleUseGps = (openModalOnError: boolean = true) => {
    if (!("geolocation" in navigator)) {
      setGeneralError("GPS Geolocation is not supported in this browser.");
      setGpsState((prev) => ({ ...prev, status: "unavailable" }));
      setLocationStatus("GPS_UNAVAILABLE");
      return;
    }

    setLocationStatus("SCANNING");
    setGpsNotification("📍 Finding your location...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;

          // 1. Reverse geocode GPS coordinates to resolve human-readable city, state, and country
          setGpsNotification("📍 Identifying address & fetching live weather...");
          let resolvedLoc = await reverseGeocodeCoordinates(lat, lon);

          // 2. Fetch resilient real weather data with human location attached
          await fetchWeather(
            {
              lat,
              lon,
              name: resolvedLoc.name,
              region: resolvedLoc.region,
              country: resolvedLoc.country,
            },
            true
          );

          const standardFormattedName = formatLocationName(
            { name: resolvedLoc.name, region: resolvedLoc.region, country: resolvedLoc.country },
            "standard"
          );

          setLocationStatus("GPS_DETECTED");
          setGpsState({
            status: "active",
            coords: { latitude: lat, longitude: lon },
            locationName: standardFormattedName || resolvedLoc.name || "Location detected",
            lastUpdated: new Date().toISOString(),
            accuracyMeters: pos.coords.accuracy,
          });

          setGpsNotification(`📍 Location detected: ${standardFormattedName || resolvedLoc.name}`);
          setTimeout(() => setGpsNotification(null), 4000);
        } catch (err: any) {
          console.error("GPS fetch error:", err);
          setGeneralError("Failed to fetch weather for GPS coordinates. Please try manual location.");
          setGpsNotification(null);
          setLocationStatus("GPS_UNAVAILABLE");
        }
      },
      (err) => {
        console.warn("GPS error:", err);
        setGpsNotification(null);
        if (err.code === 1) {
          // Permission Denied
          setGpsState((prev) => ({ ...prev, status: "denied" }));
          setLocationStatus("GPS_DENIED");
          setGeneralError("GPS location access was denied. You can still select any city manually.");
        } else if (err.code === 3) {
          // Timeout
          setGpsState((prev) => ({ ...prev, status: "timeout" }));
          setLocationStatus("GPS_UNAVAILABLE");
        } else {
          setGpsState((prev) => ({ ...prev, status: "unavailable" }));
          setLocationStatus("GPS_UNAVAILABLE");
        }
        if (openModalOnError) {
          setIsLocationModalOpen(true);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // Handle AI Chat Message with strict Per-Chat State and Request Isolation
  const handleSendMessage = async (
    userQuery: string,
    style: "simple" | "detailed" = "simple",
    targetSessionId?: string,
    groundingPreference?: "auto" | "maps" | "search"
  ) => {
    if (!userQuery.trim()) return;

    const queryText = userQuery.trim();
    const targetChatId = targetSessionId || activeSessionId;

    // Find target session
    const targetSession = sessions.find((s) => s.id === targetChatId) || sessions[0];
    const resolvedChatId = targetSession ? targetSession.id : targetChatId;

    // Guard: Prevent double-submission if this chat is already generating
    if (targetSession?.isGenerating) {
      console.warn(`Chat ${resolvedChatId} is currently generating. Ignoring duplicate request.`);
      return;
    }

    const candidateLocation = extractCandidateLocation(queryText);
    const isGpsIntent = isExplicitGpsRequest(queryText);

    // Prepare current GPS coords if active or stored
    const gpsCoords =
      gpsState.coords
        ? {
            latitude: gpsState.coords.latitude,
            longitude: gpsState.coords.longitude,
            name: gpsState.locationName || "My Location",
          }
        : null;

    const sessionLocation = targetSession?.activeLocation || null;

    // Active session weather or global weather data
    let activeWeatherData = targetSession?.weatherData || weatherData;

    // Check if we have any location context:
    // 1. Explicit place mentioned in query (e.g. "Hyderabad weather", "Weather in Delhi")
    // 2. Existing session location (Conversation memory e.g. "What about tomorrow?")
    // 3. User GPS coords available
    // 4. Stored activeWeatherData
    const hasLocationContext =
      Boolean(candidateLocation) ||
      Boolean(sessionLocation) ||
      Boolean(gpsCoords) ||
      Boolean(activeWeatherData);

    const messageId = `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const userMsg: ChatMessage = {
      id: messageId,
      role: "user",
      content: queryText,
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
    };

    // Calculate smart emoji & title if this is the start of the session
    const emoji = getSmartEmojiForQuery(queryText);
    const sessionTitle = queryText.length > 26 ? queryText.slice(0, 26) + "..." : queryText;

    // Priority Rule 3: If GPS isn't available and no location mentioned, ask for location
    if (!hasLocationContext) {
      const locationPromptMsg: ChatMessage = {
        id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: "assistant",
        content: "📍 Please share your location using **Use My Location (GPS)** or tell me any city, town, or country (like *Hyderabad*, *Delhi*, or *New York*) to check live weather, radar, and forecasts.",
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === resolvedChatId) {
            const isFresh = s.messages.length === 0 || s.title === "New Chat" || s.title === "Weather Assistant";
            return {
              ...s,
              title: isFresh ? sessionTitle : s.title,
              emoji: isFresh ? emoji : s.emoji,
              messages: [...s.messages, userMsg, locationPromptMsg],
              updatedAt: new Date().toISOString(),
              isGenerating: false,
              activeRequestId: undefined,
              activeMessageId: undefined,
            };
          }
          return s;
        })
      );
      setIsLocationModalOpen(true);
      return;
    }

    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Snapshot target session's conversation history before appending
    const sessionHistory = (targetSession?.messages || []).map((m: ChatMessage) => ({
      role: m.role,
      content: m.content,
    }));

    // Abort any active in-flight request for THIS specific chat before starting a new one
    const prevController = chatAbortControllersRef.current.get(resolvedChatId);
    if (prevController) {
      prevController.abort();
    }
    const controller = new AbortController();
    chatAbortControllersRef.current.set(resolvedChatId, controller);

    // Append user message and set this specific chat to generating state
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === resolvedChatId) {
          const isFresh = s.messages.length === 0 || s.title === "New Chat" || s.title === "Weather Assistant";
          return {
            ...s,
            title: isFresh ? sessionTitle : s.title,
            emoji: isFresh ? emoji : s.emoji,
            messages: [...s.messages, userMsg],
            updatedAt: new Date().toISOString(),
            isGenerating: true,
            activeRequestId: requestId,
            activeMessageId: messageId,
          };
        }
        return s;
      })
    );

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: queryText,
          weatherData: activeWeatherData,
          safetyStatus: weatherStatus.level,
          activeAlerts,
          proactiveRisk: activeProactiveRisk,
          history: sessionHistory,
          style,
          chatId: resolvedChatId,
          messageId,
          requestId,
          gpsCoords,
          sessionLocation: isGpsIntent ? null : sessionLocation,
          groundingPreference,
          memoryContext: targetSession?.memoryContext,
        }),
      });

      const data = await response.json();
      const replyContent =
        data.reply || data.fallbackReply || "Weather telemetry analysis is unavailable at this moment.";

      const resolvedLoc = data.resolvedLocation || sessionLocation;
      const updatedWeatherData = data.weatherData || activeWeatherData;

      if (data.weatherData) {
        if (resolvedChatId === activeSessionId || !weatherData) {
          setWeatherData(data.weatherData);
          if (resolvedLoc?.mode === "custom") {
            setLocationStatus("MANUAL_SELECTED");
          } else if (resolvedLoc?.mode === "gps") {
            setLocationStatus("GPS_DETECTED");
          }
        }
      }

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: "assistant",
        content: replyContent,
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
        groundingMetrics: updatedWeatherData ? {
          location: updatedWeatherData.location.name,
          temp: `${updatedWeatherData.current.tempC}°C`,
          rainProb: `${updatedWeatherData.current.rainProbability}%`,
          wind: `${updatedWeatherData.current.windSpeedKmh} km/h`,
        } : undefined,
        sources: Array.isArray(data.sources) ? data.sources : [],
        groundingType: data.groundingType || "meteorological",
      };

      // Strict Chat Isolation: Only commit response to resolvedChatId AND matching requestId!
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === resolvedChatId && s.activeRequestId === requestId) {
            return {
              ...s,
              messages: [...s.messages, assistantMsg],
              activeLocation: resolvedLoc || s.activeLocation,
              weatherData: updatedWeatherData || s.weatherData,
              memoryContext: data.memoryContext || s.memoryContext,
              updatedAt: new Date().toISOString(),
              isGenerating: false,
              activeRequestId: undefined,
              activeMessageId: undefined,
            };
          }
          return s;
        })
      );
    } catch (err: any) {
      if (err?.name === "AbortError") {
        console.log(`Chat ${resolvedChatId} request ${requestId} cancelled.`);
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === resolvedChatId && s.activeRequestId === requestId) {
              return {
                ...s,
                isGenerating: false,
                activeRequestId: undefined,
                activeMessageId: undefined,
              };
            }
            return s;
          })
        );
        return;
      }
      console.error("Chat error:", err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: activeWeatherData
          ? `I had trouble connecting to the weather intelligence model right now. However, live measurements in ${activeWeatherData.location.name} show ${activeWeatherData.current.tempC}°C with ${activeWeatherData.current.condition} and ${activeWeatherData.current.rainProbability}% rain probability.`
          : `I had trouble connecting to the weather intelligence service right now. Please check your network or try again.`,
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
      };
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === resolvedChatId && s.activeRequestId === requestId) {
            return {
              ...s,
              messages: [...s.messages, errorMsg],
              updatedAt: new Date().toISOString(),
              isGenerating: false,
              activeRequestId: undefined,
              activeMessageId: undefined,
            };
          }
          return s;
        })
      );
    } finally {
      if (chatAbortControllersRef.current.get(resolvedChatId) === controller) {
        chatAbortControllersRef.current.delete(resolvedChatId);
      }
    }
  };

  // Stop generation for a chat
  const handleStopChat = (targetId?: string) => {
    const idToStop = targetId || activeSessionId;
    const controller = chatAbortControllersRef.current.get(idToStop);
    if (controller) {
      controller.abort();
      chatAbortControllersRef.current.delete(idToStop);
    }
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === idToStop && s.isGenerating) {
          return {
            ...s,
            isGenerating: false,
            activeRequestId: undefined,
            activeMessageId: undefined,
          };
        }
        return s;
      })
    );
  };

  // Helper for components to trigger chat questions directly
  const handleQuickAskAI = (prompt: string) => {
    setActiveTab("chat");
    handleSendMessage(prompt, "simple", activeSessionId);
  };

  const handleResetChat = (targetId?: string) => {
    const idToReset = targetId || activeSessionId;
    const controller = chatAbortControllersRef.current.get(idToReset);
    if (controller) {
      controller.abort();
      chatAbortControllersRef.current.delete(idToReset);
    }
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === idToReset) {
          return {
            ...s,
            messages: [],
            updatedAt: new Date().toISOString(),
            isGenerating: false,
            activeRequestId: undefined,
            activeMessageId: undefined,
          };
        }
        return s;
      })
    );
  };

  return (
    <div
      className={`relative flex h-screen w-screen overflow-hidden font-sans transition-colors duration-300 ${
        theme === "dark" ? "bg-[#070b14] text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Dynamic Weather Atmospheric Background & Effects */}
      <WeatherAtmosphere
        weatherData={weatherData}
        statusLevel={weatherStatus.level}
        theme={theme}
      />

      {/* 1. Left Sidebar (Matches user screenshot) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewChat={() => {
          handleNewChat();
          setActiveTab("chat");
        }}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        chatHistory={[]}
        onSelectHistoryItem={(queryOrTitle) => {
          handleSendMessage(queryOrTitle);
        }}
        onClearChatHistory={handleClearAllSessions}
        onUseGps={handleUseGps}
        locationName={weatherData?.location.name || "Detecting..."}
        onOpenLocationModal={() => setIsLocationModalOpen(true)}
        alerts={activeAlerts}
        onOpenAlertsModal={() => setIsAlertsModalOpen(true)}
        unit={unit}
        onToggleUnit={handleToggleUnit}
        uvIndex={weatherData?.current.uvIndex ?? 0}
        isRefreshing={isRefreshing}
        onRefresh={() => fetchWeather({ lat: weatherData?.location.latitude, lon: weatherData?.location.longitude }, true)}
        isDangerMode={isDangerModeSimulated}
        onToggleDangerPreview={() => setIsDangerModeSimulated((prev) => !prev)}
        isOpenMobile={isSidebarMobileOpen}
        onCloseMobile={() => setIsSidebarMobileOpen(false)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        currentUser={currentUser}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
      />

      {/* 2. Main Viewport Area */}
      <div className="flex flex-1 min-w-0 flex-col h-full overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          locationName={weatherData?.location.name || "Detecting..."}
          uvIndex={weatherData?.current.uvIndex ?? 0}
          unit={unit}
          onToggleUnit={handleToggleUnit}
          onOpenLocationModal={() => setIsLocationModalOpen(true)}
          onUseGps={handleUseGps}
          lastUpdated={lastUpdated}
          onRefresh={() =>
            fetchWeather(
              {
                lat: weatherData?.location.latitude,
                lon: weatherData?.location.longitude,
                name: weatherData?.location.name,
              },
              true
            )
          }
          isRefreshing={isRefreshing}
          onOpenMobileMenu={() => setIsSidebarMobileOpen(true)}
          statusLevel={weatherStatus.level}
          onOpenAlertsModal={() => setIsAlertsModalOpen(true)}
          activeAlertCount={activeAlerts.length}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          currentUser={currentUser}
          onOpenAccountModal={() => setIsAccountModalOpen(true)}
          gpsStatus={gpsState.status}
          onOpenNotificationSettings={() => setIsNotificationSettingsOpen(true)}
        />

        {/* Main Content Container with ambient radial glow in dark mode */}
        <main
          className={`flex-1 min-h-0 min-w-0 flex flex-col relative ${
            activeTab === "chat"
              ? "overflow-hidden p-1.5 sm:p-4"
              : "overflow-y-auto px-4 py-6 sm:px-6 lg:px-8"
          }`}
          style={{
            background:
              theme === "dark"
                ? "radial-gradient(ellipse at 50% 20%, rgba(14, 165, 233, 0.08) 0%, rgba(7, 11, 20, 1) 75%)"
                : undefined,
          }}
        >
          {/* General Network / API Error banner */}
          {generalError && (
            <div className="shrink-0 mb-3 mx-auto w-full max-w-4xl flex items-center justify-between rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs font-semibold text-rose-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>{generalError}</span>
              </div>
              <button
                onClick={() => {
                  if (weatherData?.location?.name) {
                    fetchWeather(
                      {
                        name: weatherData.location.name,
                        lat: weatherData.location.latitude,
                        lon: weatherData.location.longitude,
                      },
                      true
                    );
                  } else {
                    handleUseGps(true);
                  }
                }}
                className="rounded bg-rose-600 px-2.5 py-1 text-white hover:bg-rose-700"
              >
                Retry
              </button>
            </div>
          )}

          {/* Proactive GPS Safety Risk Notification Banner */}
          {activeProactiveRisk && !dismissedRiskIds.has(activeProactiveRisk.id) && (
            <div className="shrink-0 mb-2 mx-auto w-full max-w-4xl">
              <ProactiveSafetyBanner
                risk={activeProactiveRisk}
                onViewNearby={() => setActiveTab("nearby")}
                onAskAI={handleQuickAskAI}
                onDismiss={() => {
                  setDismissedRiskIds((prev) => new Set(prev).add(activeProactiveRisk.id));
                }}
                theme={theme}
                isGpsActive={gpsState.status === "active"}
              />
            </div>
          )}

          {/* Dangerous Weather Mode Banner (Section 15) */}
          {weatherData && isDangerActive && (
            <div className="shrink-0 mb-3 mx-auto w-full max-w-4xl">
              <DangerBanner
                alerts={activeAlerts}
                weatherData={weatherData}
                onViewNearbyAssistance={() => setActiveTab("nearby")}
                isSimulated={isDangerModeSimulated}
              />
            </div>
          )}

          {/* Tab Views */}
          {activeTab === "chat" ? (
            <div className="flex-1 min-h-0 min-w-0 flex flex-col h-full w-full max-w-4xl mx-auto overflow-hidden">
              <AIChatView
                messages={chatMessages}
                onSendMessage={(msg, pref) => handleSendMessage(msg, "simple", undefined, pref)}
                onStop={handleStopChat}
                isLoading={Boolean(currentSession?.isGenerating)}
                locationName={currentSession?.activeLocation?.name || weatherData?.location.name || ""}
                weatherData={currentSession?.weatherData || weatherData}
                onResetChat={handleResetChat}
                theme={theme}
                locationStatus={locationStatus}
                onUseGps={() => handleUseGps(true)}
                onOpenLocationModal={() => setIsLocationModalOpen(true)}
                onNewChat={handleNewChat}
                onSelectCity={handleSelectCity}
                locationMode={currentSession?.activeLocation?.mode || (locationStatus === "GPS_DETECTED" ? "gps" : "custom")}
              />
            </div>
          ) : isInitialLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className={`relative flex h-16 w-16 items-center justify-center rounded-2xl mb-3 shadow-inner ${
                theme === "dark" ? "bg-slate-800 text-cyan-400 border border-slate-700" : "bg-sky-100 text-sky-600"
              }`}>
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>
              <h3 className={`text-base font-extrabold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>
                Connecting to Meteorological Sensors
              </h3>
              <p className={`text-xs mt-1 max-w-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                Retrieving real atmospheric telemetry and calculating safety engine rules...
              </p>
            </div>
          ) : weatherData ? (
            <div className="mx-auto max-w-6xl w-full pb-8">
              {/* 2. Live Weather Dashboard View */}
              {activeTab === "dashboard" && (
                <WeatherDashboard
                  weatherData={weatherData}
                  weatherStatus={weatherStatus}
                  weatherDelta={weatherDelta}
                  unit={unit}
                  onAskAI={handleQuickAskAI}
                  onOpenLocationModal={() => setIsLocationModalOpen(true)}
                  onViewForecast={() => setActiveTab("forecast")}
                  onViewRetrospective={() => setActiveTab("retrospective")}
                  onViewNearby={() => setActiveTab("nearby")}
                  activeAlerts={activeAlerts}
                  theme={theme}
                />
              )}

              {/* 2.5 7-Day Retrospective Telemetry View (D3.js Line Chart) */}
              {activeTab === "retrospective" && (
                <RetrospectiveWeatherView
                  locationName={weatherData.location.name}
                  latitude={weatherData.location.latitude}
                  longitude={weatherData.location.longitude}
                  unit={unit}
                  gpsState={gpsState}
                  onAskAI={handleQuickAskAI}
                  onOpenLocationModal={() => setIsLocationModalOpen(true)}
                  theme={theme}
                />
              )}

              {/* 3. Hourly & 7-Day Forecast View */}
              {activeTab === "forecast" && (
                <ForecastView
                  weatherData={weatherData}
                  unit={unit}
                  onAskAI={handleQuickAskAI}
                  theme={theme}
                />
              )}

              {/* 4. Nearby Safe Places & Assistance View */}
              {activeTab === "nearby" && (
                <NearbyAssistance
                  weatherData={weatherData}
                  onAskAI={handleQuickAskAI}
                  theme={theme}
                />
              )}

              {/* 5. Personalized Recommendations View */}
              {activeTab === "recommendations" && (
                <RecommendationsView
                  weatherData={weatherData}
                  recommendations={recommendations}
                  onAskAI={handleQuickAskAI}
                  theme={theme}
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-md mx-auto">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl mb-4 border shadow-sm ${
                  theme === "dark" ? "bg-slate-800/80 border-slate-700 text-sky-400" : "bg-sky-50 border-sky-200 text-sky-600"
                }`}
              >
                <MapPin className="h-7 w-7" />
              </div>
              <h3 className={`text-base font-bold mb-1.5 ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
                Location Required
              </h3>
              <p className={`text-xs mb-5 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                To view real-time meteorological metrics, forecasts, and safety analytics, please select or share your location.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
                <button
                  onClick={() => handleUseGps(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 py-2.5 px-4 text-xs font-bold text-white shadow-sm transition hover:brightness-110 active:scale-[0.99]"
                >
                  <span>📍 Use My Location (GPS)</span>
                </button>
                <button
                  onClick={() => setIsLocationModalOpen(true)}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 px-4 text-xs font-semibold transition active:scale-[0.99] ${
                    theme === "dark"
                      ? "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-750"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>🔍 Search Any City</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Location Modal */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSelectCoordinates={handleSelectCoordinates}
        onSelectCity={handleSelectCity}
        currentLocationName={weatherData?.location.name || "Current Location"}
        theme={theme}
      />

      {/* Proactive Notification Settings Modal */}
      <NotificationSettingsModal
        isOpen={isNotificationSettingsOpen}
        onClose={() => setIsNotificationSettingsOpen(false)}
        theme={theme}
        onSettingsUpdated={(updated) => setNotificationSettings(updated)}
        isGpsActive={gpsState.status === "active"}
      />

      {/* Alerts Modal */}

      {weatherData && (
        <AlertsModal
          isOpen={isAlertsModalOpen}
          onClose={() => setIsAlertsModalOpen(false)}
          alerts={activeAlerts}
          weatherData={weatherData}
          onAskAI={handleQuickAskAI}
          onViewNearby={() => {
            setIsAlertsModalOpen(false);
            setActiveTab("nearby");
          }}
          theme={theme}
        />
      )}

      {/* Account & Security Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onUpdateUser={handleUpdateUser}
        onSelectLocation={handleSelectSavedLocation}
        theme={theme}
      />

      {/* GPS Notification Toast */}
      {gpsNotification && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-2xl bg-emerald-600/95 px-4 py-3 text-xs font-semibold text-white shadow-2xl backdrop-blur-md border border-emerald-400/40 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-200" />
          <span>{gpsNotification}</span>
        </div>
      )}
    </div>
  );
}
