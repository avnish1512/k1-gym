import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  useWindowDimensions,
  StatusBar,
  SafeAreaView,
  Pressable,
  Platform,
  Alert,
  AppState as NativeAppState
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import 'react-native-url-polyfill/auto';
import Svg, { Path, Circle, Text as SvgText, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'k1gym_state_v2';
const LEGACY_STORAGE_KEY = 'k1gym_state';
const THEME_STORAGE_KEY = 'k1gym_theme_mode';
const REALTIME_CHANNEL_NAME = 'k1gym_realtime_state';
const REALTIME_STORAGE_EVENT_KEY = 'k1gym_realtime_event';
const ONLINE_SYNC_ROOT = 'gym_workspaces';
const ONLINE_SYNC_WORKSPACE_ID = process.env.EXPO_PUBLIC_SYNC_WORKSPACE_ID || 'k1-gym-main';
const FIREBASE_DATABASE_URL = (process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || '').replace(/\/+$/, '');
const ONLINE_SYNC_CONFIGURED = Boolean(FIREBASE_DATABASE_URL);
const ONLINE_SYNC_SETUP_MESSAGE = 'Add Firebase Realtime Database URL env var, then redeploy.';
const ONLINE_SYNC_SETUP_ERROR = 'Online sync not configured';
const APP_DATA_VERSION = 2;

const THEMES = {
  dark: {
    background: '#0c0c0f',
    surface: '#13131a',
    surfaceMuted: '#1a1a24',
    border: '#2a2a3a',
    text: '#f1f1f5',
    muted: '#a0a0b8',
    subtle: '#666680',
    placeholder: '#666680',
    primary: '#f97316',
    primarySoft: 'rgba(249, 115, 22, 0.1)',
    blue: '#3b82f6',
    blueSoft: 'rgba(59, 130, 246, 0.1)',
    success: '#22c55e',
    successSoft: 'rgba(34, 197, 94, 0.1)',
    danger: '#ef4444',
    dangerSoft: 'rgba(239, 68, 68, 0.1)',
    dangerBorder: 'rgba(239, 68, 68, 0.4)',
    modalOverlay: 'rgba(0, 0, 0, 0.7)',
    shadow: '#000',
    onAccent: '#ffffff',
    chartPointFill: '#13131a',
    avatarText: '#13131a',
    themeIcon: '#facc15'
  },
  light: {
    background: '#f6f7fb',
    surface: '#ffffff',
    surfaceMuted: '#eef1f7',
    border: '#d8dee9',
    text: '#111827',
    muted: '#5b6475',
    subtle: '#7a8496',
    placeholder: '#94a3b8',
    primary: '#ea580c',
    primarySoft: 'rgba(234, 88, 12, 0.12)',
    blue: '#2563eb',
    blueSoft: 'rgba(37, 99, 235, 0.12)',
    success: '#16a34a',
    successSoft: 'rgba(22, 163, 74, 0.12)',
    danger: '#dc2626',
    dangerSoft: 'rgba(220, 38, 38, 0.12)',
    dangerBorder: 'rgba(220, 38, 38, 0.35)',
    modalOverlay: 'rgba(15, 23, 42, 0.45)',
    shadow: '#64748b',
    onAccent: '#ffffff',
    chartPointFill: '#ffffff',
    avatarText: '#111827',
    themeIcon: '#334155'
  }
};

const getTheme = (mode) => THEMES[mode] || THEMES.dark;

const getOnlineWorkspacePath = () => `${ONLINE_SYNC_ROOT}/${ONLINE_SYNC_WORKSPACE_ID}`;

const buildFirebaseUrl = (path, query = '') => {
  if (!FIREBASE_DATABASE_URL) return '';
  const encodedPath = path
    .split('/')
    .filter(Boolean)
    .map(part => encodeURIComponent(part))
    .join('/');
  return `${FIREBASE_DATABASE_URL}/${encodedPath}.json${query ? `?${query}` : ''}`;
};

// --- STARTER DATA ---
const DEFAULT_PLANS = [
  { id: "p1", name: "Monthly Cardio", price: 1200, duration: 1, features: "Cardio Access, Locker Room, 1 Safe Session" },
  { id: "p2", name: "3-Month Premium", price: 3200, duration: 3, features: "All Gym Access, Trainer Guidance, Free Steam Bath" },
  { id: "p3", name: "Annual VIP Elite", price: 11999, duration: 12, features: "Full 24/7 Access, Personal Trainer, Diet Matrix, Free Towels" }
];

const DEFAULT_MEMBERS = [
  { id: "m1", name: "Rohan Sharma", phone: "+91 9876543210", planId: "p2", dueDate: "2026-04-15", status: "overdue" },
  { id: "m2", name: "Amit Patel", phone: "+91 9123456789", planId: "p1", dueDate: "2026-06-10", status: "paid" },
  { id: "m3", name: "Priya Singh", phone: "+91 8887776665", planId: "p3", dueDate: "2026-07-28", status: "paid" }
];

const DEFAULT_TRANSACTIONS = [
  { id: "t1", memberName: "Amit Patel", planName: "Monthly Cardio", amount: 1416, date: "2026-05-10", mode: "UPI / GPay" },
  { id: "t2", memberName: "Priya Singh", planName: "Annual VIP Elite", amount: 14158, date: "2026-05-28", mode: "Card" },
  { id: "t3", memberName: "Rohan Sharma", planName: "3-Month Premium", amount: 3776, date: "2026-01-15", mode: "Cash" }
];

const DEFAULT_SETTINGS = {
  gymName: "K1 GYM & FITNESS",
  ownerName: "Avnish",
  currency: "\u20b9",
  taxRate: 18
};

const cloneList = (list) => list.map(item => ({ ...item }));

const createId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const getLocalDateISO = (date = new Date()) => {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().split('T')[0];
};

const isValidDateString = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

const parseLocalDate = (value) => {
  if (!isValidDateString(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const addMonthsToDateString = (value, months) => {
  const source = parseLocalDate(value) || new Date();
  const target = new Date(source.getFullYear(), source.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(source.getDate(), lastDay));
  return getLocalDateISO(target);
};

const formatDateLabel = (value) => {
  const date = parseLocalDate(value);
  if (!date) return 'Invalid date';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const createStarterState = () => ({
  members: cloneList(DEFAULT_MEMBERS),
  plans: cloneList(DEFAULT_PLANS),
  transactions: cloneList(DEFAULT_TRANSACTIONS),
  settings: { ...DEFAULT_SETTINGS },
  meta: {
    dataVersion: APP_DATA_VERSION,
    revision: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
    changeReason: 'Starter workspace created'
  }
});

const normalizeAppState = (rawState) => {
  const raw = rawState && typeof rawState === 'object' ? rawState : {};
  const now = new Date().toISOString();
  return {
    members: Array.isArray(raw.members) ? cloneList(raw.members) : cloneList(DEFAULT_MEMBERS),
    plans: Array.isArray(raw.plans) ? cloneList(raw.plans) : cloneList(DEFAULT_PLANS),
    transactions: Array.isArray(raw.transactions) ? cloneList(raw.transactions) : cloneList(DEFAULT_TRANSACTIONS),
    settings: { ...DEFAULT_SETTINGS, ...(raw.settings || {}) },
    meta: {
      dataVersion: APP_DATA_VERSION,
      revision: Number(raw.meta?.revision) || 1,
      updatedAt: raw.meta?.updatedAt || now,
      updatedBy: raw.meta?.updatedBy || 'system',
      changeReason: raw.meta?.changeReason || 'Workspace loaded'
    }
  };
};

const stampAppState = (state, clientId, changeReason, revisionFloor = 0) => {
  const normalized = normalizeAppState(state);
  return {
    ...normalized,
    meta: {
      ...normalized.meta,
      dataVersion: APP_DATA_VERSION,
      revision: Math.max(Number(normalized.meta.revision) || 0, revisionFloor) + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: clientId,
      changeReason
    }
  };
};

const refreshOverdueMembers = (state) => {
  const today = getLocalDateISO();
  let changed = false;
  const transactions = [...state.transactions];
  const members = state.members.map(member => {
    if (isValidDateString(member.dueDate) && member.dueDate < today && member.status !== 'overdue') {
      changed = true;
      transactions.unshift({
        id: createId('t_auto'),
        memberName: member.name,
        planName: 'Auto status update',
        amount: 0,
        date: today,
        mode: 'System Notification'
      });
      return { ...member, status: 'overdue' };
    }
    return member;
  });

  return {
    changed,
    state: changed ? { ...state, members, transactions } : state
  };
};

const formatRelativeSyncTime = (isoValue) => {
  if (!isoValue) return 'not saved yet';
  const timestamp = new Date(isoValue).getTime();
  if (Number.isNaN(timestamp)) return 'recently';

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return formatDateLabel(getLocalDateISO(new Date(timestamp)));
};

export default function App() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [themeMode, setThemeMode] = useState('dark');
  const theme = useMemo(() => getTheme(themeMode), [themeMode]);
  const isDarkMode = themeMode === 'dark';
  // create responsive styles dependent on current width and theme
  const styles = useMemo(() => createStyles(width, theme), [width, theme]);

  // --- STATE ---
  const [appState, setAppState] = useState(null); // { members, plans, transactions, settings }
  const [currentView, setCurrentView] = useState('dashboard');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberFilter, setMemberFilter] = useState('all');

  // --- MODAL VISIBILITY STATES ---
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [renewingMember, setRenewingMember] = useState(null);

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const [memberDetailOpen, setMemberDetailOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const clientIdRef = useRef(createId('client'));
  const lastRevisionRef = useRef(0);
  const broadcastChannelRef = useRef(null);
  const appStateRef = useRef(null);
  const [syncStatus, setSyncStatus] = useState({
    live: false,
    mode: 'online',
    onlineReady: false,
    lastSyncedAt: null,
    message: ONLINE_SYNC_CONFIGURED ? 'Connecting online sync' : ONLINE_SYNC_SETUP_MESSAGE,
    error: ONLINE_SYNC_CONFIGURED ? null : ONLINE_SYNC_SETUP_ERROR
  });

  // --- FORM FIELD STATES ---
  // Member Form
  const [formMemberName, setFormMemberName] = useState('');
  const [formMemberPhone, setFormMemberPhone] = useState('');
  const [formMemberPlanId, setFormMemberPlanId] = useState('');
  const [formMemberDueDate, setFormMemberDueDate] = useState('');
  const [formMemberStatus, setFormMemberStatus] = useState('paid');

  // Renew Form
  const [renewPlanId, setRenewPlanId] = useState('');
  const [renewPaymentMode, setRenewPaymentMode] = useState('UPI / GPay');

  // Plan Form
  const [formPlanName, setFormPlanName] = useState('');
  const [formPlanPrice, setFormPlanPrice] = useState('');
  const [formPlanDuration, setFormPlanDuration] = useState('');
  const [formPlanFeatures, setFormPlanFeatures] = useState('');

  // Settings Form
  const [formGymName, setFormGymName] = useState('');
  const [formOwnerName, setFormOwnerName] = useState('');
  const [formCurrency, setFormCurrency] = useState('\u20b9');
  const [formTaxRate, setFormTaxRate] = useState('18');

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then(savedTheme => {
        if (!mounted || !['dark', 'light'].includes(savedTheme)) return;
        setThemeMode(savedTheme);
      })
      .catch(e => {
        console.warn('Failed to load theme preference', e);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  // --- PERSISTENCE, MIGRATION & REAL-TIME PEER SYNC ---
  const publishStateToPeers = (state) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const payload = {
      sourceId: clientIdRef.current,
      sentAt: new Date().toISOString(),
      state
    };

    try {
      broadcastChannelRef.current?.postMessage(payload);
    } catch (e) {
      console.warn('BroadcastChannel sync failed', e);
    }

    try {
      window.localStorage.setItem(REALTIME_STORAGE_EVENT_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('Storage event sync failed', e);
    }
  };

  const pushStateOnline = async (state, message = 'Saved online') => {
    if (!ONLINE_SYNC_CONFIGURED) {
      return { ok: false, skipped: true };
    }

    try {
      const normalized = normalizeAppState(state);
      const response = await fetch(buildFirebaseUrl(getOnlineWorkspacePath()), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          state: normalized,
          revision: Number(normalized.meta?.revision) || 1,
          updated_at: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Firebase save failed (${response.status}): ${errorText}`);
      }

      setSyncStatus({
        live: true,
        mode: 'online',
        onlineReady: true,
        lastSyncedAt: new Date().toISOString(),
        message,
        error: null
      });
      return { ok: true };
    } catch (e) {
      console.error('Failed to save online state', e);
      setSyncStatus(prev => ({
        ...prev,
        live: false,
        mode: 'online',
        onlineReady: false,
        error: 'Online save failed'
      }));
      return { ok: false, error: e };
    }
  };

  const fetchOnlineWorkspace = async () => {
    if (!ONLINE_SYNC_CONFIGURED) {
      return { ok: false, skipped: true };
    }

    try {
      const response = await fetch(buildFirebaseUrl(getOnlineWorkspacePath()));
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Firebase fetch failed (${response.status}): ${errorText}`);
      }

      return { ok: true, data: await response.json() };
    } catch (e) {
      return { ok: false, error: e };
    }
  };

  const persistState = async (state, { broadcast = true, online = true, message = 'Saved to device cache' } = {}) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (broadcast && ONLINE_SYNC_CONFIGURED) publishStateToPeers(state);
      setSyncStatus(prev => {
        if (!ONLINE_SYNC_CONFIGURED) {
          return {
            live: false,
            mode: 'online',
            onlineReady: false,
            lastSyncedAt: prev.lastSyncedAt,
            message: ONLINE_SYNC_SETUP_MESSAGE,
            error: ONLINE_SYNC_SETUP_ERROR
          };
        }

        return {
          live: true,
          mode: 'online',
          onlineReady: prev.onlineReady,
          lastSyncedAt: new Date().toISOString(),
          message,
          error: null
        };
      });
      if (online) {
        await pushStateOnline(state, message);
      }
    } catch (e) {
      console.error('Failed to persist state', e);
      setSyncStatus(prev => ({
        ...prev,
        live: false,
        error: 'Device cache save failed'
      }));
    }
  };

  const applyIncomingState = async (incomingState, message = 'Updated from another window') => {
    const normalized = normalizeAppState(incomingState);
    const incomingRevision = Number(normalized.meta?.revision) || 0;
    if (incomingRevision <= lastRevisionRef.current) return;

    lastRevisionRef.current = incomingRevision;
    setAppState(normalized);
    await persistState(normalized, { broadcast: true, online: false, message });
  };

  const syncOnlineWorkspace = async (localState, message = 'Online sync checked') => {
    if (!ONLINE_SYNC_CONFIGURED) return;

    try {
      const result = await fetchOnlineWorkspace();
      if (!result.ok) throw result.error;

      const onlineState = result.data?.state ? normalizeAppState(result.data.state) : null;
      const onlineRevision = Number(onlineState?.meta?.revision || result.data?.revision) || 0;
      const localRevision = Number(localState?.meta?.revision) || 0;

      if (!onlineState) {
        await pushStateOnline(localState || appStateRef.current || createStarterState(), 'Online workspace created');
        return;
      }

      if (onlineRevision > lastRevisionRef.current) {
        await applyIncomingState(onlineState, 'Synced latest online changes');
        return;
      }

      if (localState && localRevision > onlineRevision) {
        await pushStateOnline(localState, 'Uploaded device cache to online sync');
        return;
      }

      setSyncStatus({
        live: true,
        mode: 'online',
        onlineReady: true,
        lastSyncedAt: new Date().toISOString(),
        message,
        error: null
      });
    } catch (e) {
      console.error('Failed to sync cloud workspace', e);
      setSyncStatus(prev => ({
        ...prev,
        live: false,
        mode: 'online',
        onlineReady: false,
        error: 'Online sync failed'
      }));
    }
  };

  const saveState = async (nextState, changeReason = 'Workspace updated') => {
    const stampedState = stampAppState(nextState, clientIdRef.current, changeReason, lastRevisionRef.current);
    lastRevisionRef.current = stampedState.meta.revision;
    setAppState(stampedState);
    await persistState(stampedState, { broadcast: true, message: changeReason });
  };

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        const legacySaved = saved ? null : await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
        const parsed = saved || legacySaved ? JSON.parse(saved || legacySaved) : createStarterState();
        const normalized = normalizeAppState(parsed);
        const overdueRefresh = refreshOverdueMembers(normalized);
        const nextState = overdueRefresh.changed
          ? stampAppState(overdueRefresh.state, clientIdRef.current, 'Overdue statuses refreshed', normalized.meta.revision)
          : normalized;

        if (!mounted) return;
        lastRevisionRef.current = Number(nextState.meta?.revision) || 1;
        setAppState(nextState);
        await persistState(nextState, {
          broadcast: overdueRefresh.changed,
          online: false,
          message: legacySaved ? 'Migrated saved workspace' : 'Workspace ready'
        });
        await syncOnlineWorkspace(nextState, 'Workspace ready');
      } catch (e) {
        console.error('Failed to load state', e);
        const fallbackState = createStarterState();
        if (!mounted) return;
        lastRevisionRef.current = fallbackState.meta.revision;
        setAppState(fallbackState);
        await persistState(fallbackState, { broadcast: false, online: false, message: 'Starter workspace ready' });
        await syncOnlineWorkspace(fallbackState, 'Starter workspace ready');
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!ONLINE_SYNC_CONFIGURED || Platform.OS !== 'web' || typeof window === 'undefined') return undefined;

    const handlePayload = (payload, message) => {
      if (!payload || payload.sourceId === clientIdRef.current || !payload.state) return;
      applyIncomingState(payload.state, message);
    };

    const handleStorage = (event) => {
      if (event.key !== REALTIME_STORAGE_EVENT_KEY || !event.newValue) return;
      try {
        handlePayload(JSON.parse(event.newValue), 'Updated from another browser tab');
      } catch (e) {
        console.warn('Could not parse realtime storage payload', e);
      }
    };

    if ('BroadcastChannel' in window) {
      broadcastChannelRef.current = new BroadcastChannel(REALTIME_CHANNEL_NAME);
      broadcastChannelRef.current.onmessage = (event) => {
        handlePayload(event.data, 'Updated from live browser channel');
      };
    }

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      broadcastChannelRef.current?.close?.();
      broadcastChannelRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ONLINE_SYNC_CONFIGURED) return undefined;

    const pullOnlineChanges = () => {
      syncOnlineWorkspace(appStateRef.current, 'Checked online sync');
    };

    const handleRealtimeEvent = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const nextState = payload?.data?.state;
        if (!nextState || nextState.meta?.updatedBy === clientIdRef.current) return;
        applyIncomingState(nextState, 'Updated from online sync');
      } catch (e) {
        console.warn('Could not parse online realtime event', e);
      }
    };

    let eventSource = null;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'EventSource' in window) {
      eventSource = new window.EventSource(buildFirebaseUrl(getOnlineWorkspacePath()));
      eventSource.onopen = () => {
        setSyncStatus(prev => ({
          ...prev,
          live: true,
          mode: 'online',
          onlineReady: true,
          message: prev.message === 'Connecting online sync' ? 'Online realtime connected' : prev.message,
          error: null
        }));
      };
      eventSource.onerror = () => {
        setSyncStatus(prev => ({
          ...prev,
          live: false,
          mode: 'online',
          onlineReady: false,
          error: 'Online realtime reconnecting'
        }));
      };
      eventSource.addEventListener('put', handleRealtimeEvent);
      eventSource.addEventListener('patch', handleRealtimeEvent);
    }

    const intervalId = setInterval(pullOnlineChanges, 30000);

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const handleVisibilityChange = () => {
        if (!document.hidden) pullOnlineChanges();
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        clearInterval(intervalId);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        eventSource?.removeEventListener?.('put', handleRealtimeEvent);
        eventSource?.removeEventListener?.('patch', handleRealtimeEvent);
        eventSource?.close?.();
      };
    }

    return () => {
      clearInterval(intervalId);
      eventSource?.removeEventListener?.('put', handleRealtimeEvent);
      eventSource?.removeEventListener?.('patch', handleRealtimeEvent);
      eventSource?.close?.();
    };
  }, []);

  useEffect(() => {
    if (!appState) return undefined;

    const refreshIfNeeded = () => {
      const overdueRefresh = refreshOverdueMembers(appState);
      if (overdueRefresh.changed) {
        saveState(overdueRefresh.state, 'Overdue statuses refreshed');
      }
    };

    const intervalId = setInterval(refreshIfNeeded, 60000);
    let nativeSubscription;

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const handleVisibilityChange = () => {
        if (!document.hidden) refreshIfNeeded();
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        clearInterval(intervalId);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    if (NativeAppState?.addEventListener) {
      nativeSubscription = NativeAppState.addEventListener('change', nextState => {
        if (nextState === 'active') refreshIfNeeded();
      });
    }

    return () => {
      clearInterval(intervalId);
      nativeSubscription?.remove?.();
    };
  }, [appState]);

  useEffect(() => {
    if (!appState || !selectedMember) return;
    const latestMember = appState.members.find(member => member.id === selectedMember.id);
    if (latestMember) {
      if (latestMember !== selectedMember) setSelectedMember(latestMember);
    } else {
      setMemberDetailOpen(false);
      setSelectedMember(null);
    }
  }, [appState, selectedMember?.id]);

  const handleResetDatabase = () => {
    const runReset = () => {
      const defaultState = createStarterState();
      saveState(defaultState, 'Workspace restored to starter data');
      if (Platform.OS === 'web') {
        alert("Workspace restored to starter data.");
      } else {
        Alert.alert("Reset Success", "Workspace restored to starter data.");
      }
    };

    if (Platform.OS === 'web') {
      if (confirm("WARNING: This will wipe all local workspace changes and restore the starter gym dataset. Continue?")) {
        runReset();
      }
    } else {
      Alert.alert(
        "Restore defaults",
        "WARNING: This will wipe all local workspace changes and restore the starter gym dataset. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Restore", style: "destructive", onPress: runReset }
        ]
      );
    }
  };

  // --- DYNAMIC CALCULATIONS ---
  const kpiStats = useMemo(() => {
    if (!appState) return { active: 0, activePercent: 0, revenue: 0, pending: 0 };
    const currencySymbol = appState.settings.currency || '\u20b9';

    // Active count
    const active = appState.members.filter(m => m.status === 'paid').length;
    const total = appState.members.length;
    const activePercent = total > 0 ? Math.round((active / total) * 100) : 0;

    // MTD Revenue
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const mtdRevenue = appState.transactions
      .filter(t => {
        if (!t.date || t.amount === 0) return false;
        const transDate = parseLocalDate(t.date);
        if (!transDate) return false;
        return transDate.getFullYear() === currentYear && transDate.getMonth() === currentMonth;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    // Pending Collections
    const pending = appState.members
      .filter(m => m.status === 'overdue')
      .reduce((sum, m) => {
        const plan = appState.plans.find(p => p.id === m.planId);
        return sum + (plan ? plan.price : 0);
      }, 0);

    return { active, activePercent, revenue: mtdRevenue, pending, currencySymbol };
  }, [appState]);

  // SVG Chart data points mapping
  const chartDetails = useMemo(() => {
    if (!appState) return { pathD: '', areaD: '', months: [], yCoords: [], maxVal: 1000 };
    const today = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        value: 0
      });
    }

    appState.transactions.forEach(t => {
      if (!t.date || t.amount <= 0) return;
      const tDate = parseLocalDate(t.date);
      if (!tDate) return;
      const tYear = tDate.getFullYear();
      const tMonth = tDate.getMonth();
      const match = months.find(m => m.year === tYear && m.month === tMonth);
      if (match) {
        match.value += t.amount;
      }
    });

    const maxVal = Math.max(...months.map(m => m.value), 1000);
    const xCoords = [40, 128, 216, 304, 392, 480];
    const yCoords = months.map(m => 170 - (m.value / maxVal) * 140);

    const pathD = `M ${xCoords[0]} ${yCoords[0]} L ${xCoords[1]} ${yCoords[1]} L ${xCoords[2]} ${yCoords[2]} L ${xCoords[3]} ${yCoords[3]} L ${xCoords[4]} ${yCoords[4]} L ${xCoords[5]} ${yCoords[5]}`;
    const areaD = `${pathD} L 480 170 L 40 170 Z`;

    return { pathD, areaD, months, yCoords, xCoords, maxVal };
  }, [appState]);

  const filteredMembers = useMemo(() => {
    if (!appState) return [];
    const search = memberSearch.trim().toLowerCase();
    return appState.members.filter(m => {
      // Filter status
      if (memberFilter === 'paid' && m.status !== 'paid') return false;
      if (memberFilter === 'overdue' && m.status !== 'overdue') return false;

      // Filter search
      const plan = appState.plans.find(p => p.id === m.planId);
      const planName = plan ? plan.name.toLowerCase() : '';
      const nameMatch = m.name.toLowerCase().includes(search);
      const phoneMatch = m.phone.toLowerCase().includes(search);
      const planMatch = planName.includes(search);

      return nameMatch || phoneMatch || planMatch;
    });
  }, [appState, memberSearch, memberFilter]);

  const showAlert = (title, message = '') => {
    if (Platform.OS === 'web') {
      alert(message ? `${title}\n\n${message}` : title);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleToggleTheme = () => {
    const nextThemeMode = isDarkMode ? 'light' : 'dark';
    setThemeMode(nextThemeMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, nextThemeMode).catch(e => {
      console.warn('Failed to save theme preference', e);
    });
  };

  // --- ACTIONS ---
  // Save Member (Add / Edit)
  const handleSaveMember = () => {
    const memberName = formMemberName.trim();
    const memberPhone = formMemberPhone.trim();
    const dueDate = formMemberDueDate.trim();

    if (!memberName || !memberPhone || !formMemberPlanId || !dueDate) {
      showAlert('Missing details', 'Please fill all required member fields.');
      return;
    }

    if (memberPhone.replace(/\D/g, '').length < 7) {
      showAlert('Invalid phone number', 'Please enter a reachable member phone number.');
      return;
    }

    if (!isValidDateString(dueDate)) {
      showAlert('Invalid date', 'Use the YYYY-MM-DD format for the member due date.');
      return;
    }

    const plan = appState.plans.find(p => p.id === formMemberPlanId);
    if (!plan) {
      showAlert('Plan required', 'Select an active membership plan before saving the member.');
      return;
    }

    const planName = plan ? plan.name : '';

    let nextMembers = [...appState.members];
    let nextTransactions = [...appState.transactions];

    if (editingMember) {
      // EDIT
      nextMembers = nextMembers.map(m =>
        m.id === editingMember.id
          ? { ...m, name: memberName, phone: memberPhone, planId: formMemberPlanId, dueDate, status: formMemberStatus }
          : m
      );
    } else {
      // ADD NEW
      const newId = createId('m');
      nextMembers.push({
        id: newId,
        name: memberName,
        phone: memberPhone,
        planId: formMemberPlanId,
        dueDate,
        status: formMemberStatus
      });

      // Log transaction if initial status is paid
      if (formMemberStatus === 'paid') {
        const taxRate = parseFloat(appState.settings.taxRate) || 0;
        const basePrice = plan ? plan.price : 0;
        const taxAmount = Math.round(basePrice * (taxRate / 100));
        const totalAmount = basePrice + taxAmount;

        nextTransactions.unshift({
          id: createId('t'),
          memberName,
          planName: planName,
          amount: totalAmount,
          date: getLocalDateISO(),
          mode: "UPI / GPay"
        });
      }
    }

    saveState({ ...appState, members: nextMembers, transactions: nextTransactions }, editingMember ? 'Member profile updated' : 'Member registered');
    setMemberModalOpen(false);
    setEditingMember(null);
  };

  const handleOpenAddMember = () => {
    setEditingMember(null);
    setFormMemberName('');
    setFormMemberPhone('');
    setFormMemberPlanId(appState?.plans?.[0]?.id || '');
    setFormMemberDueDate(getLocalDateISO());
    setFormMemberStatus('paid');
    setMemberModalOpen(true);
  };

  const handleOpenEditMember = (member) => {
    setEditingMember(member);
    setFormMemberName(member.name);
    setFormMemberPhone(member.phone);
    setFormMemberPlanId(member.planId);
    setFormMemberDueDate(member.dueDate);
    setFormMemberStatus(member.status);
    setMemberModalOpen(true);
  };

  const handleDeleteMember = (member) => {
    const runDelete = () => {
      const nextMembers = appState.members.filter(m => m.id !== member.id);
      const nextTransactions = [...appState.transactions];
      nextTransactions.unshift({
        id: createId('t_del'),
        memberName: member.name,
        planName: "Member deregistered",
        amount: 0,
        date: getLocalDateISO(),
        mode: "System"
      });
      saveState({ ...appState, members: nextMembers, transactions: nextTransactions }, 'Member deleted');
    };

    if (Platform.OS === 'web') {
      if (confirm(`Are you sure you want to delete member ${member.name}?`)) {
        runDelete();
      }
    } else {
      Alert.alert(
        "Delete Member",
        `Are you sure you want to delete member ${member.name}?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: runDelete }
        ]
      );
    }
  };

  // Renew Actions
  const handleOpenRenew = (member) => {
    setRenewingMember(member);
    setRenewPlanId(member.planId);
    setRenewPaymentMode('UPI / GPay');
    setRenewModalOpen(true);
  };

  const handleViewMemberDetail = (member) => {
    setSelectedMember(member);
    setMemberDetailOpen(true);
  };

  const handleConfirmRenew = () => {
    if (!renewingMember || !renewPlanId) return;

    const plan = appState.plans.find(p => p.id === renewPlanId);
    if (!plan) return;

    const taxRate = parseFloat(appState.settings.taxRate) || 0;
    const basePrice = plan.price;
    const taxAmount = Math.round(basePrice * (taxRate / 100));
    const totalAmount = basePrice + taxAmount;

    const todayStr = getLocalDateISO();
    const renewalBaseDate = renewingMember.status === 'paid' && renewingMember.dueDate >= todayStr
      ? renewingMember.dueDate
      : todayStr;
    const newDueDateStr = addMonthsToDateString(renewalBaseDate, plan.duration);

    const nextMembers = appState.members.map(m =>
      m.id === renewingMember.id
        ? { ...m, planId: renewPlanId, dueDate: newDueDateStr, status: 'paid' }
        : m
    );

    const nextTransactions = [...appState.transactions];
    nextTransactions.unshift({
      id: createId('t_ren'),
      memberName: renewingMember.name,
      planName: plan.name,
      amount: totalAmount,
      date: todayStr,
      mode: renewPaymentMode
    });

    saveState({ ...appState, members: nextMembers, transactions: nextTransactions }, 'Membership renewed');
    setRenewModalOpen(false);
    setRenewingMember(null);
    setMemberFilter('all'); // Reset filter to show the renewed member immediately
    
    // Show success message
    if (Platform.OS === 'web') {
      alert(`Renewal successful!\n\n${renewingMember.name} is now PAID until ${formatDateLabel(newDueDateStr)}`);
    } else {
      Alert.alert('Renewal Successful', `${renewingMember.name} is now PAID until ${formatDateLabel(newDueDateStr)}`);
    }
  };

  // Save Plan (Add / Edit)
  const handleSavePlan = () => {
    const planName = formPlanName.trim();
    const priceText = formPlanPrice.trim();
    const durationText = formPlanDuration.trim();

    if (!planName || !priceText || !durationText) {
      showAlert('Missing details', 'Please fill all required plan fields.');
      return;
    }

    let nextPlans = [...appState.plans];
    const price = Number.parseInt(priceText, 10);
    const duration = Number.parseInt(durationText, 10);

    if (!/^\d+$/.test(priceText) || price <= 0) {
      showAlert('Invalid price', 'Plan price must be a positive whole number.');
      return;
    }

    if (!/^\d+$/.test(durationText) || duration <= 0 || duration > 120) {
      showAlert('Invalid duration', 'Plan duration must be between 1 and 120 months.');
      return;
    }

    if (editingPlan) {
      // EDIT
      nextPlans = nextPlans.map(p =>
        p.id === editingPlan.id
          ? { ...p, name: planName, price, duration, features: formPlanFeatures.trim() }
          : p
      );
    } else {
      // ADD NEW
      const newId = createId('p');
      nextPlans.push({
        id: newId,
        name: planName,
        price,
        duration,
        features: formPlanFeatures.trim()
      });
    }

    saveState({ ...appState, plans: nextPlans }, editingPlan ? 'Plan updated' : 'Plan created');
    setPlanModalOpen(false);
    setEditingPlan(null);
  };

  const handleOpenAddPlan = () => {
    setEditingPlan(null);
    setFormPlanName('');
    setFormPlanPrice('');
    setFormPlanDuration('');
    setFormPlanFeatures('');
    setPlanModalOpen(true);
  };

  const handleOpenEditPlan = (plan) => {
    setEditingPlan(plan);
    setFormPlanName(plan.name);
    setFormPlanPrice(String(plan.price));
    setFormPlanDuration(String(plan.duration));
    setFormPlanFeatures(plan.features || '');
    setPlanModalOpen(true);
  };

  const handleDeletePlan = (plan) => {
    const planUsers = appState.members.filter(m => m.planId === plan.id);
    if (planUsers.length > 0) {
      const msg = `Cannot delete this plan. It is currently assigned to ${planUsers.length} active member(s).`;
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert("Plan in use", msg);
      return;
    }

    const runDelete = () => {
      const nextPlans = appState.plans.filter(p => p.id !== plan.id);
      saveState({ ...appState, plans: nextPlans }, 'Plan deleted');
    };

    if (Platform.OS === 'web') {
      if (confirm("Are you sure you want to delete this membership plan?")) {
        runDelete();
      }
    } else {
      Alert.alert(
        "Delete Plan",
        "Are you sure you want to delete this membership plan?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: runDelete }
        ]
      );
    }
  };

  // Settings Action
  const handleSaveSettings = () => {
    const gymName = formGymName.trim();
    const ownerName = formOwnerName.trim();
    const taxRate = Number.parseFloat(formTaxRate);

    if (!gymName || !ownerName) {
      showAlert('Missing settings', 'Please fill the gym name and owner name.');
      return;
    }

    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
      showAlert('Invalid GST rate', 'Tax rate must be a number between 0 and 100.');
      return;
    }

    const nextSettings = {
      gymName,
      ownerName,
      currency: formCurrency || '\u20b9',
      taxRate
    };

    saveState({ ...appState, settings: nextSettings }, 'Settings updated');
    showAlert('Success', 'Settings updated successfully.');
  };

  // Load settings into form once loaded
  useEffect(() => {
    if (appState) {
      setFormGymName(appState.settings.gymName);
      setFormOwnerName(appState.settings.ownerName);
      setFormCurrency(appState.settings.currency);
      setFormTaxRate(String(appState.settings.taxRate));
    }
  }, [appState, currentView]);

  // Helper colors for member profile avatars
  const getAvatarColor = (name) => {
    const colors = [
      '#e0f2fe', '#dbeafe', '#d1fae5', '#fef3c7', '#fee2e2', '#f3e8ff', '#fae8ff', '#ffedd5'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const formatCurrency = (val) => {
    const symbol = appState?.settings?.currency || '\u20b9';
    if (val >= 100000) {
      return `${symbol}${(val / 100000).toFixed(1)}L`;
    } else if (val >= 1000) {
      return `${symbol}${(val / 1000).toFixed(1)}K`;
    }
    return `${symbol}${val}`;
  };

  if (!appState) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
        <Text style={styles.loadingText}>Loading Gym Console...</Text>
      </View>
    );
  }

  // --- RENDER PARTS ---
  const renderSyncStatus = (compact = false) => {
    const lastSavedAt = syncStatus.lastSyncedAt || appState.meta?.updatedAt;
    const onlineSetupRequired = !ONLINE_SYNC_CONFIGURED;
    const statusLabel = onlineSetupRequired
      ? 'Online setup'
      : syncStatus.error
      ? 'Sync issue'
      : syncStatus.onlineReady
        ? 'Online sync'
        : 'Connecting';
    const statusMeta = onlineSetupRequired
      ? ONLINE_SYNC_SETUP_MESSAGE
      : syncStatus.error || `${syncStatus.message} - ${formatRelativeSyncTime(lastSavedAt)}`;

    return (
      <View style={[styles.syncStatus, compact && styles.syncStatusCompact]}>
        <View style={[styles.syncDot, syncStatus.error ? styles.syncDotError : styles.syncDotLive]} />
        <View style={styles.syncTextWrap}>
          <Text style={[styles.syncLabel, compact && styles.syncLabelCompact]}>{statusLabel}</Text>
          {!compact ? <Text style={styles.syncMeta}>{statusMeta}</Text> : null}
        </View>
      </View>
    );
  };

  const renderThemeToggle = (compact = false) => {
    const nextThemeLabel = isDarkMode ? 'Switch to light mode' : 'Switch to dark mode';

    return (
      <TouchableOpacity
        style={[styles.themeToggle, compact && styles.themeToggleCompact]}
        onPress={handleToggleTheme}
        accessibilityRole="button"
        accessibilityLabel={nextThemeLabel}
      >
        <MaterialIcons
          name={isDarkMode ? 'light-mode' : 'dark-mode'}
          size={compact ? 20 : 22}
          color={isDarkMode ? theme.themeIcon : theme.primary}
        />
        {!compact ? (
          <Text style={styles.themeToggleText}>{isDarkMode ? 'Light mode' : 'Dark mode'}</Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderSidebar = () => {
    const views = [
      { id: 'dashboard', name: 'Dashboard', icon: 'dashboard' },
      { id: 'members', name: 'Members', icon: 'group' },
      { id: 'plans', name: 'Membership Plans', icon: 'payments' },
      { id: 'settings', name: 'Settings', icon: 'settings' }
    ];

    return (
      <View style={styles.sidebar}>
        <View style={styles.sidebarBrand}>
          <MaterialIcons name="fitness-center" size={28} color={theme.primary} style={styles.brandIcon} />
          <Text style={styles.brandText}>{appState.settings.gymName}</Text>
        </View>
        <View style={styles.sidebarAdmin}>
          <View style={[styles.avatarCircle, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>{appState.settings.ownerName?.[0]?.toUpperCase()}</Text>
          </View>
          <View style={styles.adminMeta}>
            <Text style={styles.adminName}>{appState.settings.ownerName}</Text>
            <Text style={styles.adminRole}>Gym Owner</Text>
          </View>
        </View>
        {renderSyncStatus()}
        {renderThemeToggle()}
        <View style={styles.sidebarNav}>
          {views.map(v => (
            <TouchableOpacity
              key={v.id}
              style={[styles.navBtn, currentView === v.id && styles.navBtnActive]}
              onPress={() => setCurrentView(v.id)}
            >
              <MaterialIcons
                name={v.icon}
                size={22}
                color={currentView === v.id ? theme.primary : theme.muted}
                style={styles.navBtnIcon}
              />
              <Text style={[styles.navBtnText, currentView === v.id && styles.navBtnTextActive]}>
                {v.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderMobileHeader = () => {
    return (
      <View style={styles.mobileHeader}>
        <View style={styles.mobileHeaderBrand}>
          <MaterialIcons name="fitness-center" size={24} color={theme.primary} />
          <Text style={styles.mobileBrandText}>{appState.settings.gymName}</Text>
        </View>
        <View style={styles.mobileHeaderActions}>
          {renderThemeToggle(true)}
          {renderSyncStatus(true)}
          <View style={[styles.avatarCircle, { width: 32, height: 32, backgroundColor: theme.primary }]}>
            <Text style={[styles.avatarText, { fontSize: 14 }]}>{appState.settings.ownerName?.[0]?.toUpperCase()}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderMobileNav = () => {
    const views = [
      { id: 'dashboard', name: 'Home', icon: 'home' },
      { id: 'members', name: 'Members', icon: 'group' },
      { id: 'plans', name: 'Plans', icon: 'payments' },
      { id: 'settings', name: 'Settings', icon: 'settings' }
    ];

    return (
      <View style={styles.mobileNav}>
        {views.map(v => (
          <TouchableOpacity
            key={v.id}
            style={styles.mobileNavBtn}
            onPress={() => setCurrentView(v.id)}
          >
            <MaterialIcons
              name={v.icon}
              size={24}
              color={currentView === v.id ? theme.primary : theme.muted}
            />
            <Text style={[styles.mobileNavText, currentView === v.id && styles.mobileNavTextActive]}>
              {v.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // --- VIEWS ---
  const renderDashboardView = () => {
    const recentActivity = appState.transactions.slice(0, 5);

    return (
      <ScrollView contentContainerStyle={styles.viewContent}>
        <View style={styles.viewHeader}>
          <Text style={styles.viewTitle}>Overview</Text>
          <Text style={styles.viewSubtitle}>Real-time facility performance and revenue metrics.</Text>
        </View>

        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrapper, { backgroundColor: theme.blueSoft }]}>
              <MaterialIcons name="group" size={24} color={theme.blue} />
            </View>
            <View style={styles.kpiContent}>
              <Text style={styles.kpiLabel}>Active Members</Text>
              <View style={styles.kpiValueRow}>
                <Text style={styles.kpiValue}>{kpiStats.active}</Text>
                <View style={[styles.trendBadge, { backgroundColor: theme.successSoft }]}>
                  <Text style={[styles.trendText, { color: theme.success }]}>{kpiStats.activePercent}% Active</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrapper, { backgroundColor: theme.successSoft }]}>
              <MaterialIcons name="account-balance-wallet" size={24} color={theme.success} />
            </View>
            <View style={styles.kpiContent}>
              <Text style={styles.kpiLabel}>Revenue (MTD)</Text>
              <View style={styles.kpiValueRow}>
                <Text style={[styles.kpiValue, styles.fontMono]}>{formatCurrency(kpiStats.revenue)}</Text>
                <View style={[styles.trendBadge, { backgroundColor: theme.successSoft }]}>
                  <MaterialIcons name="arrow-upward" size={12} color={theme.success} />
                  <Text style={[styles.trendText, { color: theme.success }]}>+8%</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrapper, { backgroundColor: theme.dangerSoft }]}>
              <MaterialIcons name="warning" size={24} color={theme.danger} />
            </View>
            <View style={styles.kpiContent}>
              <Text style={styles.kpiLabel}>Pending Collections</Text>
              <View style={styles.kpiValueRow}>
                <Text style={[styles.kpiValue, styles.fontMono, { color: theme.danger }]}>
                  {formatCurrency(kpiStats.pending)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Analytics Grid */}
        <View style={styles.analyticsGrid}>
          <View style={styles.analyticsCard}>
            <Text style={styles.cardTitle}>Revenue Performance (Past 6 Months)</Text>
            <View style={styles.chartWrapper}>
              <Svg width="100%" height="200" viewBox="0 0 500 200" style={styles.chartSvg}>
                <Defs>
                  <LinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={theme.primary} stopOpacity={0.2} />
                    <Stop offset="100%" stopColor={theme.primary} stopOpacity={0.0} />
                  </LinearGradient>
                </Defs>

                {/* Grid Lines */}
                <Line x1="40" y1="20" x2="480" y2="20" stroke={theme.border} strokeDasharray="4" />
                <Line x1="40" y1="70" x2="480" y2="70" stroke={theme.border} strokeDasharray="4" />
                <Line x1="40" y1="120" x2="480" y2="120" stroke={theme.border} strokeDasharray="4" />
                <Line x1="40" y1="170" x2="480" y2="170" stroke={theme.border} />

                {/* Chart Area and Line */}
                {chartDetails.pathD ? (
                  <>
                    <Path d={chartDetails.areaD} fill="url(#chartGrad)" />
                    <Path d={chartDetails.pathD} fill="none" stroke={theme.primary} strokeWidth="3" />
                  </>
                ) : null}

                {/* Data Points */}
                {chartDetails.xCoords.map((x, idx) => (
                  <Circle
                    key={idx}
                    cx={x}
                    cy={chartDetails.yCoords[idx]}
                    r="4"
                    fill={theme.chartPointFill}
                    stroke={theme.primary}
                    strokeWidth="2"
                  />
                ))}

                {/* Labels */}
                {chartDetails.months.map((m, idx) => (
                  <SvgText
                    key={idx}
                    x={chartDetails.xCoords[idx]}
                    y="190"
                    textAnchor="middle"
                    fontSize="10"
                    fill={theme.muted}
                  >
                    {m.label}
                  </SvgText>
                ))}

                {/* Y Axis Labels */}
                <SvgText x="15" y="173" textAnchor="middle" fontSize="9" fill={theme.muted}>0</SvgText>
                <SvgText x="15" y="123" textAnchor="middle" fontSize="9" fill={theme.muted}>
                  {formatCurrency(Math.round(chartDetails.maxVal * 0.35))}
                </SvgText>
                <SvgText x="15" y="73" textAnchor="middle" fontSize="9" fill={theme.muted}>
                  {formatCurrency(Math.round(chartDetails.maxVal * 0.7))}
                </SvgText>
                <SvgText x="15" y="23" textAnchor="middle" fontSize="9" fill={theme.muted}>
                  {formatCurrency(chartDetails.maxVal)}
                </SvgText>
              </Svg>
            </View>
          </View>

          <View style={styles.analyticsCard}>
            <Text style={styles.cardTitle}>Recent Activity Log</Text>
            {recentActivity.length === 0 ? (
              <Text style={styles.emptyText}>No recent activities logged.</Text>
            ) : (
              <View style={styles.timeline}>
                {recentActivity.map((t, idx) => {
                  let markerColor = theme.primary;
                  let desc = '';

                  if (t.mode === 'System Notification') {
                    markerColor = theme.danger;
                    desc = `${t.memberName} membership status updated to overdue.`;
                  } else if (t.amount > 0) {
                    markerColor = theme.success;
                    desc = `Collected ${appState.settings.currency || '\u20b9'}${t.amount} from ${t.memberName} for ${t.planName} via ${t.mode}.`;
                  } else {
                    desc = `Registered ${t.memberName} on plan ${t.planName}.`;
                  }

                  return (
                    <View key={t.id} style={styles.timelineItem}>
                      <View style={[styles.timelineMarker, { backgroundColor: markerColor }]} />
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineDesc}>{desc}</Text>
                        <Text style={styles.timelineDate}>
                          {formatDateLabel(t.date)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderMembersView = () => {
    return (
      <View style={styles.flexContainer}>
        <View style={styles.rosterHeader}>
          <View style={styles.rosterHeaderText}>
            <Text style={styles.viewTitle}>Member Roster</Text>
            <Text style={styles.viewSubtitle}>Manage memberships, billing statuses, and renewals.</Text>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleOpenAddMember}>
            <MaterialIcons name="person-add" size={20} color={theme.onAccent} />
            <Text style={styles.primaryBtnText}>Add Member</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Controls */}
        <View style={styles.rosterControls}>
          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={20} color={theme.muted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, phone, or plan..."
              placeholderTextColor={theme.placeholder}
              value={memberSearch}
              onChangeText={setMemberSearch}
            />
          </View>
          <View style={styles.filterChips}>
            {['all', 'paid', 'overdue'].map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, memberFilter === f && styles.filterChipActive]}
                onPress={() => setMemberFilter(f)}
              >
                <Text style={[styles.filterChipText, memberFilter === f && styles.filterChipTextActive]}>
                  {f.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Member List */}
        <ScrollView contentContainerStyle={styles.rosterScroll}>
          {filteredMembers.length === 0 ? (
            <Text style={styles.emptyText}>No members found.</Text>
          ) : (
            filteredMembers.map(m => {
              const plan = appState.plans.find(p => p.id === m.planId);
              const initials = m.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

              return (
                <Pressable key={m.id} style={styles.memberCard} onPress={() => handleViewMemberDetail(m)}>
                  <View style={styles.memberCardHeader}>
                    <View style={styles.memberMeta}>
                      <View style={[styles.memberAvatar, { backgroundColor: getAvatarColor(m.name) }]}>
                        <Text style={styles.memberAvatarText}>{initials}</Text>
                      </View>
                      <View>
                        <Text style={styles.memberNameText}>{m.name}</Text>
                        <Text style={styles.memberPhoneText}>{m.phone}</Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, m.status === 'paid' ? styles.statusPaid : styles.statusOverdue]}>
                      <Text style={[styles.statusBadgeText, m.status === 'paid' ? styles.statusPaidText : styles.statusOverdueText]}>
                        {m.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.memberCardBody}>
                    <View style={styles.bodyItem}>
                      <Text style={styles.bodyItemLabel}>Assigned Plan</Text>
                      <Text style={styles.bodyItemVal}>{plan ? plan.name : 'Unknown Plan'}</Text>
                    </View>
                    <View style={styles.bodyItem}>
                      <Text style={styles.bodyItemLabel}>Next Due Date</Text>
                      <Text style={[styles.bodyItemVal, styles.fontMono]}>
                        {formatDateLabel(m.dueDate)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.memberCardActions}>
                    <TouchableOpacity style={styles.secondaryBtn} onPress={() => handleOpenEditMember(m)}>
                      <MaterialIcons name="edit" size={16} color={theme.muted} />
                      <Text style={styles.secondaryBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.dangerBtn} onPress={() => handleDeleteMember(m)}>
                      <MaterialIcons name="delete" size={16} color={theme.danger} />
                      <Text style={styles.dangerBtnText}>Delete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.renewActionBtn} onPress={() => handleOpenRenew(m)}>
                      <MaterialIcons name="autorenew" size={16} color={theme.onAccent} />
                      <Text style={styles.renewActionBtnText}>Renew</Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
    );
  };

  const renderPlansView = () => {
    const symbol = appState.settings.currency || '\u20b9';
    return (
      <View style={styles.flexContainer}>
        <View style={styles.rosterHeader}>
          <View style={styles.rosterHeaderText}>
            <Text style={styles.viewTitle}>Membership Plans</Text>
            <Text style={styles.viewSubtitle}>Add or edit plans available for gym registrations.</Text>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleOpenAddPlan}>
            <MaterialIcons name="add" size={20} color={theme.onAccent} />
            <Text style={styles.primaryBtnText}>Create Plan</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.plansScroll}>
          <View style={styles.plansGrid}>
            {appState.plans.length === 0 ? (
              <Text style={styles.emptyText}>No plans created. Create a plan to register members.</Text>
            ) : (
              appState.plans.map(p => {
                const isPremium = p.duration >= 12;
                const features = p.features ? p.features.split(',') : [];

                return (
                  <View key={p.id} style={[styles.planCard, isPremium && styles.planCardPremium]}>
                    <Text style={styles.planTitleText}>{p.name}</Text>
                    <View style={styles.planPricingRow}>
                      <Text style={styles.planPriceText}>{symbol}{p.price}</Text>
                      <Text style={styles.planDurationText}>/ {p.duration} Mo</Text>
                    </View>
                    <View style={styles.featuresList}>
                      {features.map((f, idx) => (
                        <View key={idx} style={styles.featureItem}>
                          <MaterialIcons name="check-circle" size={16} color={theme.primary} style={styles.featureIcon} />
                          <Text style={styles.featureText}>{f.trim()}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.planActions}>
                      <TouchableOpacity style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => handleOpenEditPlan(p)}>
                        <MaterialIcons name="edit" size={16} color={theme.muted} />
                        <Text style={styles.secondaryBtnText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.dangerBtn, { marginLeft: 10 }]} onPress={() => handleDeletePlan(p)}>
                        <MaterialIcons name="delete" size={16} color={theme.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderSettingsView = () => {
    return (
      <ScrollView contentContainerStyle={styles.viewContent}>
        <View style={styles.viewHeader}>
          <Text style={styles.viewTitle}>System Settings</Text>
          <Text style={styles.viewSubtitle}>Manage facility name, profiles, and dashboard configuration.</Text>
        </View>

        <View style={styles.settingsCard}>
          <Text style={styles.settingsCardTitle}>Gym Profile</Text>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Gym Center Name</Text>
            <TextInput
              style={styles.formInput}
              value={formGymName}
              onChangeText={setFormGymName}
              placeholder="K1 GYM"
              placeholderTextColor={theme.placeholder}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Owner Name</Text>
            <TextInput
              style={styles.formInput}
              value={formOwnerName}
              onChangeText={setFormOwnerName}
              placeholder="Avnish"
              placeholderTextColor={theme.placeholder}
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.formLabel}>Default Currency</Text>
              <View style={styles.customSelect}>
                {['\u20b9', '$', '\u20ac'].map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.customSelectOption, formCurrency === c && styles.customSelectOptionActive]}
                    onPress={() => setFormCurrency(c)}
                  >
                    <Text style={[styles.customSelectOptionText, formCurrency === c && styles.customSelectOptionTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>Tax Rate (GST %)</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                value={formTaxRate}
                onChangeText={setFormTaxRate}
                placeholder="18"
                placeholderTextColor={theme.placeholder}
              />
            </View>
          </View>

          <TouchableOpacity style={[styles.primaryBtn, { alignSelf: 'flex-start', marginTop: 10 }]} onPress={handleSaveSettings}>
            <Text style={styles.primaryBtnText}>Save Settings</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingsCard}>
          <Text style={styles.settingsCardTitle}>Data & Sync</Text>
          <View style={styles.syncInfoGrid}>
            <View style={styles.syncInfoItem}>
              <Text style={styles.bodyItemLabel}>Mode</Text>
              <Text style={styles.bodyItemVal}>
                {!ONLINE_SYNC_CONFIGURED
                  ? 'Online setup needed'
                  : (syncStatus.onlineReady ? 'Online realtime sync' : 'Online sync pending')}
              </Text>
            </View>
            <View style={styles.syncInfoItem}>
              <Text style={styles.bodyItemLabel}>Revision</Text>
              <Text style={[styles.bodyItemVal, styles.fontMono]}>#{appState.meta?.revision || 1}</Text>
            </View>
            <View style={styles.syncInfoItem}>
              <Text style={styles.bodyItemLabel}>Last Saved</Text>
              <Text style={styles.bodyItemVal}>
                {ONLINE_SYNC_CONFIGURED
                  ? formatRelativeSyncTime(syncStatus.lastSyncedAt || appState.meta?.updatedAt)
                  : 'Not online yet'}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.settingsCard, styles.dangerCard]}>
          <Text style={[styles.settingsCardTitle, { color: theme.danger }]}>Danger Zone</Text>
          <Text style={styles.dangerDesc}>
            Resetting your workspace wipes all custom additions and restores the starter gym dataset.
          </Text>
          <TouchableOpacity style={styles.dangerActionBtn} onPress={handleResetDatabase}>
            <MaterialIcons name="restore" size={20} color={theme.onAccent} />
            <Text style={styles.dangerActionBtnText}>Restore Starter Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // --- MODAL COMPONENTS ---
  const renderMemberModal = () => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={memberModalOpen}
        onRequestClose={() => setMemberModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingMember ? "Edit Member Profile" : "Register New Member"}
              </Text>
              <TouchableOpacity onPress={() => setMemberModalOpen(false)}>
                <MaterialIcons name="close" size={24} color={theme.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Full Name</Text>
                <TextInput
                  style={styles.formInput}
                  value={formMemberName}
                  onChangeText={setFormMemberName}
                  placeholder="e.g. Rohan Sharma"
                  placeholderTextColor={theme.placeholder}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Phone Number</Text>
                <TextInput
                  style={styles.formInput}
                  value={formMemberPhone}
                  onChangeText={setFormMemberPhone}
                  placeholder="e.g. +91 9876543210"
                  placeholderTextColor={theme.placeholder}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Assigned Plan</Text>
                <View style={styles.customSelectCol}>
                  {appState.plans.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.customSelectRow, formMemberPlanId === p.id && styles.customSelectRowActive]}
                      onPress={() => setFormMemberPlanId(p.id)}
                    >
                      <Text style={[styles.customSelectRowText, formMemberPlanId === p.id && styles.customSelectRowTextActive]}>
                        {p.name} ({appState.settings.currency || '\u20b9'}{p.price})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Registration/Start Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.formInput}
                  value={formMemberDueDate}
                  onChangeText={setFormMemberDueDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.placeholder}
                />
              </View>

              {!editingMember && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Initial Payment Status</Text>
                  <View style={styles.customSelect}>
                    <TouchableOpacity
                      style={[styles.customSelectOption, formMemberStatus === 'paid' && styles.customSelectOptionActive, { flex: 1 }]}
                      onPress={() => setFormMemberStatus('paid')}
                    >
                      <Text style={[styles.customSelectOptionText, formMemberStatus === 'paid' && styles.customSelectOptionTextActive]}>
                        Paid (Active)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.customSelectOption, formMemberStatus === 'overdue' && styles.customSelectOptionActive, { flex: 1 }]}
                      onPress={() => setFormMemberStatus('overdue')}
                    >
                      <Text style={[styles.customSelectOptionText, formMemberStatus === 'overdue' && styles.customSelectOptionTextActive]}>
                        Overdue
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setMemberModalOpen(false)}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { marginLeft: 10 }]} onPress={handleSaveMember}>
                <Text style={styles.primaryBtnText}>Save Member</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderRenewModal = () => {
    if (!renewingMember) return null;
    const currentPlan = appState.plans.find(p => p.id === renewingMember.planId);
    const selectedPlan = appState.plans.find(p => p.id === renewPlanId);

    const basePrice = selectedPlan ? selectedPlan.price : 0;
    const taxRate = parseFloat(appState.settings.taxRate) || 0;
    const taxAmount = Math.round(basePrice * (taxRate / 100));
    const totalAmount = basePrice + taxAmount;
    const symbol = appState.settings.currency || '\u20b9';

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={renewModalOpen}
        onRequestClose={() => setRenewModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Renew Membership</Text>
              <TouchableOpacity onPress={() => setRenewModalOpen(false)}>
                <MaterialIcons name="close" size={24} color={theme.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.renewSummary}>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>Member</Text>
                  <Text style={styles.summaryVal}>{renewingMember.name}</Text>
                </View>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>Current Plan</Text>
                  <Text style={styles.summaryVal}>{currentPlan ? currentPlan.name : 'None'}</Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Renewal Plan</Text>
                <View style={styles.customSelectCol}>
                  {appState.plans.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.customSelectRow, renewPlanId === p.id && styles.customSelectRowActive]}
                      onPress={() => setRenewPlanId(p.id)}
                    >
                      <Text style={[styles.customSelectRowText, renewPlanId === p.id && styles.customSelectRowTextActive]}>
                        {p.name} ({symbol}{p.price})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Payment Mode</Text>
                <View style={styles.customSelectCol}>
                  {['UPI / GPay', 'Cash', 'Card', 'Bank Transfer'].map(mode => (
                    <TouchableOpacity
                      key={mode}
                      style={[styles.customSelectRow, renewPaymentMode === mode && styles.customSelectRowActive]}
                      onPress={() => setRenewPaymentMode(mode)}
                    >
                      <Text style={[styles.customSelectRowText, renewPaymentMode === mode && styles.customSelectRowTextActive]}>
                        {mode}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.renewPriceBox}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Base Price:</Text>
                  <Text style={[styles.priceVal, styles.fontMono]}>{symbol}{basePrice}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Tax ({taxRate}%):</Text>
                  <Text style={[styles.priceVal, styles.fontMono]}>{symbol}{taxAmount}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, styles.totalText]}>Total Collected:</Text>
                  <Text style={[styles.priceVal, styles.fontMono, styles.totalText, { color: theme.primary }]}>
                    {symbol}{totalAmount}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setRenewModalOpen(false)}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.successBtn, { marginLeft: 10 }]} onPress={handleConfirmRenew}>
                <MaterialIcons name="payment" size={18} color={theme.onAccent} style={{ marginRight: 6 }} />
                <Text style={styles.successBtnText}>Confirm & Renew</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderMemberDetailModal = () => {
    if (!selectedMember || !appState) return null;
    
    const memberPlan = appState.plans.find(p => p.id === selectedMember.planId);
    const memberTransactions = appState.transactions.filter(t => t.memberName === selectedMember.name);
    const symbol = appState.settings.currency || '\u20b9';

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={memberDetailOpen}
        onRequestClose={() => setMemberDetailOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Member Details & History</Text>
              <TouchableOpacity onPress={() => setMemberDetailOpen(false)}>
                <MaterialIcons name="close" size={24} color={theme.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Member Info Section */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Member Information</Text>
                <View style={styles.detailGrid}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Name</Text>
                    <Text style={styles.detailValue}>{selectedMember.name}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Phone</Text>
                    <Text style={styles.detailValue}>{selectedMember.phone}</Text>
                  </View>
                </View>
              </View>

              {/* Current Plan Section */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Current Plan</Text>
                <View style={styles.planDetailBox}>
                  <View style={styles.planDetailRow}>
                    <Text style={styles.planDetailLabel}>Plan Name</Text>
                    <Text style={styles.planDetailValue}>{memberPlan ? memberPlan.name : 'N/A'}</Text>
                  </View>
                  <View style={styles.planDetailRow}>
                    <Text style={styles.planDetailLabel}>Status</Text>
                    <View style={[styles.statusBadge, selectedMember.status === 'paid' ? styles.statusPaid : styles.statusOverdue]}>
                      <Text style={[styles.statusBadgeText, selectedMember.status === 'paid' ? styles.statusPaidText : styles.statusOverdueText]}>
                        {selectedMember.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.planDetailRow}>
                    <Text style={styles.planDetailLabel}>Next Due Date</Text>
                    <Text style={[styles.planDetailValue, styles.fontMono]}>
                      {formatDateLabel(selectedMember.dueDate)}
                    </Text>
                  </View>
                  {memberPlan && (
                    <>
                      <View style={styles.planDetailRow}>
                        <Text style={styles.planDetailLabel}>Duration</Text>
                        <Text style={styles.planDetailValue}>{memberPlan.duration} Month(s)</Text>
                      </View>
                      <View style={styles.planDetailRow}>
                        <Text style={styles.planDetailLabel}>Plan Price</Text>
                        <Text style={styles.planDetailValue}>{symbol}{memberPlan.price}</Text>
                      </View>
                    </>
                  )}
                </View>
              </View>

              {/* Payment History Section */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Payment History</Text>
                {memberTransactions.length === 0 ? (
                  <Text style={styles.emptyText}>No transaction history available.</Text>
                ) : (
                  <View style={styles.transactionList}>
                    {memberTransactions.map((t, idx) => (
                      <View key={idx} style={styles.transactionItem}>
                        <View style={styles.transactionHeader}>
                          <Text style={styles.transactionPlan}>{t.planName}</Text>
                          <Text style={styles.transactionAmount}>{symbol}{t.amount}</Text>
                        </View>
                        <View style={styles.transactionFooter}>
                          <Text style={styles.transactionMode}>{t.mode}</Text>
                          <Text style={styles.transactionDate}>
                            {formatDateLabel(t.date)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={() => setMemberDetailOpen(false)}>
                <Text style={styles.primaryBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderPlanModal = () => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={planModalOpen}
        onRequestClose={() => setPlanModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingPlan ? "Edit Plan Settings" : "Create Membership Plan"}
              </Text>
              <TouchableOpacity onPress={() => setPlanModalOpen(false)}>
                <MaterialIcons name="close" size={24} color={theme.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Plan Name</Text>
                <TextInput
                  style={styles.formInput}
                  value={formPlanName}
                  onChangeText={setFormPlanName}
                  placeholder="e.g. 3-Month Premium"
                  placeholderTextColor={theme.placeholder}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.formLabel}>Price (Base Amount)</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={formPlanPrice}
                    onChangeText={setFormPlanPrice}
                    placeholder="e.g. 2999"
                    placeholderTextColor={theme.placeholder}
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Duration (Months)</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={formPlanDuration}
                    onChangeText={setFormPlanDuration}
                    placeholder="e.g. 3"
                    placeholderTextColor={theme.placeholder}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Key Features / Description (comma-separated)</Text>
                <TextInput
                  style={styles.formInput}
                  value={formPlanFeatures}
                  onChangeText={setFormPlanFeatures}
                  placeholder="e.g. Gym Access, Free Trainer, Diet Plan"
                  placeholderTextColor={theme.placeholder}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setPlanModalOpen(false)}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { marginLeft: 10 }]} onPress={handleSavePlan}>
                <Text style={styles.primaryBtnText}>Save Plan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.appContainer}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      {isMobile ? renderMobileHeader() : null}
      <View style={styles.mainLayout}>
        {!isMobile ? renderSidebar() : null}
        <View style={styles.contentArea}>
          {currentView === 'dashboard' ? renderDashboardView() : null}
          {currentView === 'members' ? renderMembersView() : null}
          {currentView === 'plans' ? renderPlansView() : null}
          {currentView === 'settings' ? renderSettingsView() : null}
        </View>
      </View>
      {isMobile ? renderMobileNav() : null}

      {/* Forms and Action Modals */}
      {renderMemberModal()}
      {renderRenewModal()}
      {renderMemberDetailModal()}
      {renderPlanModal()}
    </SafeAreaView>
  );
}

// --- DESIGNS AND STYLES ---
const createStyles = (width, theme) => StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: theme.background,
    ...Platform.select({
      web: {
        height: '100dvh',
        minHeight: '100vh',
        display: 'flex',
      },
    }),
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '600',
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
    ...Platform.select({
      web: {
        minHeight: width >= 768 ? '100vh' : 0,
        overflow: 'hidden',
      },
    }),
  },
  contentArea: {
    flex: 1,
    backgroundColor: theme.background,
    minWidth: 0,
  },
  viewContent: {
    padding: Platform.OS === 'web' && width < 600 ? 16 : 24,
    paddingTop: Platform.OS === 'web' && width < 600 ? 28 : 24,
    paddingBottom: Platform.OS === 'web' && width < 768 ? 96 : 24,
  },
  flexContainer: {
    flex: 1,
    padding: Platform.OS === 'web' && width < 600 ? 16 : 24,
  },

  // Sidebar (Desktop navigation)
  sidebar: {
    width: 260,
    backgroundColor: theme.surface,
    borderRightWidth: 1,
    borderRightColor: theme.border,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  sidebarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  brandIcon: {
    marginRight: 8,
  },
  brandText: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sidebarAdmin: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceMuted,
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: theme.onAccent,
    fontSize: 16,
    fontWeight: 'bold',
  },
  adminMeta: {
    marginLeft: 12,
  },
  adminName: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '600',
  },
  adminRole: {
    color: theme.muted,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 18,
  },
  syncStatusCompact: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 0,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  syncDotLive: {
    backgroundColor: theme.success,
  },
  syncDotError: {
    backgroundColor: theme.danger,
  },
  syncTextWrap: {
    flexShrink: 1,
  },
  syncLabel: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '800',
  },
  syncLabelCompact: {
    fontSize: 11,
  },
  syncMeta: {
    color: theme.muted,
    fontSize: 11,
    marginTop: 2,
  },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 18,
  },
  themeToggleCompact: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginBottom: 0,
  },
  themeToggleText: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 10,
  },
  sidebarNav: {
    flex: 1,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 6,
  },
  navBtnActive: {
    backgroundColor: theme.primarySoft,
  },
  navBtnIcon: {
    marginRight: 12,
  },
  navBtnText: {
    color: theme.muted,
    fontSize: 14,
    fontWeight: '500',
  },
  navBtnTextActive: {
    color: theme.primary,
    fontWeight: '700',
  },

  // Mobile Topbar header
  mobileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexShrink: 0,
    zIndex: 10,
  },
  mobileHeaderBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  mobileBrandText: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
    flexShrink: 1,
  },
  mobileHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },

  // Mobile navigation bottom bar
  mobileNav: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'web' ? 'calc(10px + env(safe-area-inset-bottom))' : 10,
    flexShrink: 0,
    zIndex: 10,
  },
  mobileNavBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileNavText: {
    color: theme.muted,
    fontSize: 10,
    marginTop: 4,
  },
  mobileNavTextActive: {
    color: theme.primary,
    fontWeight: 'bold',
  },

  // Views general header
  viewHeader: {
    marginBottom: 24,
  },
  viewTitle: {
    color: theme.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  viewSubtitle: {
    color: theme.muted,
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },

  // KPI Dashboard Cards
  kpiGrid: {
    flexDirection: Platform.OS === 'web' && width >= 600 ? 'row' : 'column',
    gap: 16,
    marginBottom: 24,
  },
  kpiCard: {
    ...(Platform.OS === 'web' && width >= 600 ? { flex: 1 } : { width: '100%' }),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: Platform.OS === 'web' && width < 600 ? 12 : 16,
    padding: Platform.OS === 'web' && width < 600 ? 14 : 20,
    minHeight: Platform.OS === 'web' && width < 600 ? 86 : 0,
    overflow: 'hidden',
  },
  kpiIconWrapper: {
    width: Platform.OS === 'web' && width < 600 ? 44 : 48,
    height: Platform.OS === 'web' && width < 600 ? 44 : 48,
    borderRadius: Platform.OS === 'web' && width < 600 ? 10 : 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Platform.OS === 'web' && width < 600 ? 14 : 16,
  },
  kpiContent: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  kpiLabel: {
    color: theme.muted,
    fontSize: Platform.OS === 'web' && width < 600 ? 11 : 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: 4,
    marginTop: 6,
  },
  kpiValue: {
    color: theme.text,
    fontSize: Platform.OS === 'web' && width < 600 ? 28 : 24,
    fontWeight: '800',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  trendText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  fontMono: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontWeight: '700',
  },

  // Dashboard Analytics Grid (SVG Chart & Timeline)
  analyticsGrid: {
    flexDirection: Platform.OS === 'web' && width >= 1024 ? 'row' : 'column',
    gap: 20,
  },
  analyticsCard: {
    ...(Platform.OS === 'web' && width >= 1024 ? { flex: 1 } : { width: '100%' }),
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: Platform.OS === 'web' && width < 600 ? 12 : 16,
    padding: Platform.OS === 'web' && width < 600 ? 14 : 20,
    overflow: 'hidden',
  },
  cardTitle: {
    color: theme.text,
    fontSize: Platform.OS === 'web' && width < 600 ? 14 : 15,
    fontWeight: '700',
    marginBottom: Platform.OS === 'web' && width < 600 ? 14 : 20,
    lineHeight: 20,
  },
  chartWrapper: {
    width: '100%',
    height: Platform.OS === 'web' && width < 600 ? 180 : 200,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  chartSvg: {
    overflow: 'hidden',
  },
  emptyText: {
    color: theme.subtle,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 32,
  },

  // Recent Activity Log Timeline
  timeline: {
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineMarker: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 16,
  },
  timelineContent: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: theme.surfaceMuted,
    paddingBottom: 12,
  },
  timelineDesc: {
    color: theme.text,
    fontSize: 13,
    lineHeight: 18,
  },
  timelineDate: {
    color: theme.subtle,
    fontSize: 11,
    marginTop: 4,
  },

  // Member Roster view
  rosterHeader: {
    flexDirection: Platform.OS === 'web' && width >= 600 ? 'row' : 'column',
    justifyContent: Platform.OS === 'web' && width >= 600 ? 'space-between' : 'flex-start',
    alignItems: Platform.OS === 'web' && width >= 600 ? 'center' : 'stretch',
    gap: Platform.OS === 'web' && width >= 600 ? 16 : 12,
    marginBottom: 20,
  },
  rosterHeaderText: {
    ...(Platform.OS === 'web' && width >= 600 ? { flex: 1 } : { width: '100%' }),
    minWidth: 0,
  },
  rosterControls: {
    flexDirection: Platform.OS === 'web' && width >= 600 ? 'row' : 'column',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  searchBox: {
    ...(Platform.OS === 'web' && width >= 600 ? { flex: 1 } : { width: '100%' }),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: theme.text,
    fontSize: 14,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    justifyContent: 'center',
  },
  filterChipActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primarySoft,
  },
  filterChipText: {
    color: theme.muted,
    fontSize: 11,
    fontWeight: 'bold',
  },
  filterChipTextActive: {
    color: theme.primary,
  },
  rosterScroll: {
    paddingBottom: 40,
  },

  // Member Cards
  memberCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  memberCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    color: theme.avatarText,
    fontSize: 15,
    fontWeight: 'bold',
  },
  memberNameText: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700',
  },
  memberPhoneText: {
    color: theme.muted,
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPaid: {
    backgroundColor: theme.successSoft,
  },
  statusPaidText: {
    color: theme.success,
  },
  statusOverdue: {
    backgroundColor: theme.dangerSoft,
  },
  statusOverdueText: {
    color: theme.danger,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  memberCardBody: {
    flexDirection: 'row',
    backgroundColor: theme.surfaceMuted,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  bodyItem: {
    flex: 1,
  },
  bodyItemLabel: {
    color: theme.subtle,
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  bodyItemVal: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  memberCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 40,
    justifyContent: 'center',
    flexShrink: 0,
  },
  primaryBtnText: {
    color: theme.onAccent,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 36,
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  dangerBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: theme.dangerSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerBtnText: {
    color: theme.danger,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  renewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 36,
    justifyContent: 'center',
  },
  renewActionBtnText: {
    color: theme.onAccent,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },

  // Membership Plans View
  plansScroll: {
    paddingBottom: 40,
  },
  plansGrid: {
    flexDirection: Platform.OS === 'web' && width >= 768 ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: 20,
  },
  planCard: {
    width: Platform.OS === 'web' && width >= 768 ? 'calc(33.333% - 14px)' : '100%',
    minWidth: Platform.OS === 'web' && width >= 768 ? 260 : 0,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 20,
    padding: 24,
  },
  planCardPremium: {
    borderColor: theme.primary,
    borderWidth: 2,
  },
  planTitleText: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '800',
  },
  planPricingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 12,
    marginBottom: 20,
  },
  planPriceText: {
    color: theme.text,
    fontSize: 28,
    fontWeight: '800',
  },
  planDurationText: {
    color: theme.muted,
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
  featuresList: {
    flex: 1,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureIcon: {
    marginRight: 8,
  },
  featureText: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  planActions: {
    flexDirection: 'row',
    marginTop: 'auto',
  },

  // Settings Panel
  settingsCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  settingsCardTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 20,
  },
  syncInfoGrid: {
    flexDirection: Platform.OS === 'web' && width >= 600 ? 'row' : 'column',
    gap: 12,
  },
  syncInfoItem: {
    ...(Platform.OS === 'web' && width >= 600 ? { flex: 1 } : { width: '100%' }),
    backgroundColor: theme.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 14,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: Platform.OS === 'web' && width < 600 ? 'column' : 'row',
  },
  formLabel: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: theme.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
    color: theme.text,
    fontSize: 14,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  customSelect: {
    flexDirection: 'row',
    backgroundColor: theme.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 4,
  },
  customSelectOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customSelectOptionActive: {
    backgroundColor: theme.primary,
  },
  customSelectOptionText: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: 'bold',
  },
  customSelectOptionTextActive: {
    color: theme.onAccent,
  },
  dangerCard: {
    borderColor: theme.dangerBorder,
  },
  dangerDesc: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  dangerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.danger,
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 40,
    alignSelf: 'flex-start',
  },
  dangerActionBtnText: {
    color: theme.onAccent,
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 6,
  },

  // Modals Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  modalTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '800',
  },
  modalBody: {
    padding: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  customSelectCol: {
    gap: 8,
  },
  customSelectRow: {
    backgroundColor: theme.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  customSelectRowActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primarySoft,
  },
  customSelectRowText: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  customSelectRowTextActive: {
    color: theme.primary,
    fontWeight: 'bold',
  },

  // Renewal specific
  renewSummary: {
    flexDirection: 'row',
    backgroundColor: theme.surfaceMuted,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 16,
  },
  summaryCol: {
    flex: 1,
  },
  summaryLabel: {
    color: theme.subtle,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  summaryVal: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  renewPriceBox: {
    backgroundColor: theme.surfaceMuted,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  priceVal: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 8,
  },
  totalText: {
    fontSize: 14,
    fontWeight: '800',
  },
  successBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.success,
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 40,
    justifyContent: 'center',
  },
  successBtnText: {
    color: theme.onAccent,
    fontSize: 13,
    fontWeight: 'bold',
  },

  // Member Detail Modal Styles
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  detailItem: {
    flex: 1,
    backgroundColor: theme.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 12,
  },
  detailLabel: {
    color: theme.subtle,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  detailValue: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
  },
  planDetailBox: {
    backgroundColor: theme.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 16,
  },
  planDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  planDetailLabel: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  planDetailValue: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
  },
  transactionList: {
    gap: 10,
  },
  transactionItem: {
    backgroundColor: theme.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 12,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionPlan: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
  },
  transactionAmount: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  transactionMode: {
    color: theme.muted,
    fontSize: 11,
    fontWeight: '500',
  },
  transactionDate: {
    color: theme.subtle,
    fontSize: 11,
    fontWeight: '500',
  },
});
