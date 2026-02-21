import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';
import * as Calendar from 'expo-calendar';
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,   
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { 
  doc, onSnapshot, updateDoc, arrayUnion, setDoc, getDoc, 
  collection, query, orderBy, limit, getDocs 
} from 'firebase/firestore';
import { auth, db } from '../config/firebase'; 

// --- INITIAL STATE ---
const INITIAL_USER_DATA = {
  name: '', 
  email: '',
  profileImage: null,
  createdAt: new Date().toISOString(),
  lastActiveDate: new Date().toISOString().split('T')[0],
  isSetupComplete: false,
  
  // Physical Stats (Always stored in Metric: Years, YYYY-MM-DD, Kg, Cm)
  age: null,
  dob: null,
  weight: 0, 
  height: 0,

  // Data Containers
  history: [], 
  customEvents: [],
  schedule: [],

  // Tracking Stats
  stats: {
    streak: 0, 
    bestStreak: 0, 
    caloriesBurnedTotal: 0, 
    caloriesBurnedToday: 0, 
    workoutsCompletedTotal: 0, 
    workoutsCompletedToday: 0,
    minutes: 0,
    steps: 0, 
    stepGoal: 10000, 
    hydrationCurrent: 0, 
    hydrationGoal: 2500, // Stored in ML
    weeklyGoalCurrent: 0, 
    weeklyGoalTarget: 5,
  },

  // App Preferences
  preferences: {
    isAutoSyncEnabled: false,
    pushNotifications: true,
    // Units (Default Metric)
    units: {
      weight: 'kg',      // 'kg' | 'lbs'
      height: 'cm',      // 'cm' | 'ft'
      volume: 'ml',      // 'ml' | 'oz' | 'glasses'
      energy: 'kcal'     // 'kcal' | 'kJ'
    }
  },
};

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);       
  const [userData, setUserData] = useState(INITIAL_USER_DATA); 
  const [loading, setLoading] = useState(true);
  const [pedometerSubscription, setPedometerSubscription] = useState(null);
  
  const appState = useRef(AppState.currentState);

  // --- PEDOMETER REFS (Fix for Android resetting steps) ---
  const sessionStartSteps = useRef(0); // Snapshots DB steps when app opens/logins
  const currentSessionSteps = useRef(0); // Tracks live steps from sensor in this session

  // ============================================================
  // 1. HELPER FUNCTIONS & CONVERTERS
  // ============================================================

  const getLocalDateString = (dateInput) => {
    if (!dateInput) return null;
    try {
      const d = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
      if (isNaN(d.getTime())) return null; 
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      return null;
    }
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
  };

  // --- NEW: CENTRALIZED UNIT LOGIC ---
  const getUnitConfig = (type) => {
    const prefs = userData?.preferences?.units || {};
    
    switch (type) {
      case 'weight':
        return prefs.weight === 'lbs' 
          ? { multiplier: 2.20462, unit: 'lbs', decimals: 0 }
          : { multiplier: 1, unit: 'kg', decimals: 0 };
          
      case 'height':
        return prefs.height === 'ft'
          ? { multiplier: 0.393701, unit: 'in', decimals: 1 } 
          : { multiplier: 1, unit: 'cm', decimals: 0 };

      case 'hydration':
      case 'volume':
        if (prefs.volume === 'oz') return { multiplier: 0.033814, unit: 'oz', decimals: 0 };
        if (prefs.volume === 'glasses') return { multiplier: 1/240, unit: 'glasses', decimals: 1 };
        return { multiplier: 1, unit: 'ml', decimals: 0 };

      case 'energy':
      case 'calories':
        return prefs.energy === 'kJ'
          ? { multiplier: 4.184, unit: 'kJ', decimals: 0 }
          : { multiplier: 1, unit: 'kcal', decimals: 0 };

      case 'steps':
      default:
        return { multiplier: 1, unit: '', decimals: 0 };
    }
  };

  // --- UNIT CONVERTERS (For UI Display) ---
  const converters = {
    getUnitConfig, // Expose for use in screens (History/Summary)

    // Weight (Stored in KG)
    displayWeight: (kgVal) => {
      const { multiplier, unit } = getUnitConfig('weight');
      if (!kgVal) return '--';
      return `${Math.round(kgVal * multiplier)} ${unit}`;
    },
    // Height (Stored in CM)
    displayHeight: (cmVal) => {
      const unit = userData?.preferences?.units?.height || 'cm';
      if (!cmVal) return '--';
      // Keep special formatting for Feet/Inches text string
      if (unit === 'ft') {
        const totalInches = cmVal / 2.54;
        const feet = Math.floor(totalInches / 12);
        const inches = Math.round(totalInches % 12);
        return `${feet}'${inches}"`;
      }
      return `${cmVal} cm`;
    },
    // Volume (Stored in ML)
    displayVolume: (mlVal) => {
      const { multiplier, unit, decimals } = getUnitConfig('hydration');
      if (!mlVal && mlVal !== 0) return '--';
      const val = mlVal * multiplier;
      return `${decimals === 0 ? Math.round(val) : val.toFixed(decimals).replace(/\.0$/, '')} ${unit}`;
    },
    // Energy (Stored in Kcal)
    displayEnergy: (kcalVal) => {
      const { multiplier, unit } = getUnitConfig('energy');
      if (!kcalVal && kcalVal !== 0) return '--';
      return `${Math.round(kcalVal * multiplier)} ${unit}`;
    }
  };

  // ============================================================
  // 2. HISTORY ARCHIVER (End of Day Logic)
  // ============================================================
  
  const checkAndMigrateDailyStats = async (uid, data) => {
    if (!data) return;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const lastActive = data.lastActiveDate || todayStr;

    // If it's a new day
    if (lastActive !== todayStr) {
      try {
        const userRef = doc(db, 'users', uid);
        const historyEntries = [];

        // Archive Steps
        if (data.stats && data.stats.steps > 0) {
          historyEntries.push({
            type: 'steps',
            count: data.stats.steps,
            date: lastActive // Tag it with yesterday's date
          });
        }

        const updates = { lastActiveDate: todayStr };
        updates['stats.steps'] = 0; 
        updates['stats.hydrationCurrent'] = 0; 
        updates['stats.caloriesBurnedToday'] = 0;
        updates['stats.workoutsCompletedToday'] = 0;

        if (historyEntries.length > 0) {
          updates.history = arrayUnion(...historyEntries);
        }

        await updateDoc(userRef, updates);
        
        // Reset local step counters for the new day
        sessionStartSteps.current = 0;
        currentSessionSteps.current = 0;
      } catch (error) {
        console.error("Failed to migrate daily stats:", error);
      }
    }
  };

  // ============================================================
  // 3. AUTHENTICATION & SETUP
  // ============================================================

  const login = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error) { 
      return { success: false, error: error.message }; 
    }
  };

  const register = async (email, password) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      const newUserData = { ...INITIAL_USER_DATA, email: email, createdAt: new Date().toISOString(), isSetupComplete: false };
      await setDoc(doc(db, 'users', uid), newUserData);
      setUserData(newUserData); 
      return { success: true };
    } catch (error) { 
      return { success: false, error: error.message }; 
    }
  };

  const loginWithGoogle = async (idToken) => {
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      
      const userRef = doc(db, 'users', result.user.uid);
      const docSnap = await getDoc(userRef);
      
      if (!docSnap.exists()) {
        const newUserData = { 
          ...INITIAL_USER_DATA, 
          email: result.user.email, 
          name: result.user.displayName || 'User',
          profileImage: result.user.photoURL,
          createdAt: new Date().toISOString(), 
          isSetupComplete: false 
        };
        await setDoc(userRef, newUserData);
        setUserData(newUserData);
      }
      return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserData(INITIAL_USER_DATA);
      sessionStartSteps.current = 0;
      currentSessionSteps.current = 0;
      return { success: true };
    } catch (error) { 
      return { success: false, error: error.message }; 
    }
  };

  // --- FULLY UPDATED COMPLETE SETUP ---
  const completeSetup = async (setupData) => {
    if (!user) return;
    try {
      const now = new Date().toISOString();
      const historyEntries = [];

      // Log initial weight/height to history if provided
      if (setupData.weight) {
        historyEntries.push({ type: 'weight', value: setupData.weight, date: now });
      }
      if (setupData.height) {
        historyEntries.push({ type: 'height', value: setupData.height, date: now });
      }

      // Merge incoming preferences with existing defaults
      const updatedPreferences = {
        ...(userData?.preferences || INITIAL_USER_DATA.preferences),
        isAutoSyncEnabled: setupData.preferences?.calendarSynced || false,
        units: {
          ...(userData?.preferences?.units || INITIAL_USER_DATA.preferences.units),
          weight: setupData.preferences?.weightUnit || 'kg',
          height: setupData.preferences?.heightUnit || 'cm',
          volume: setupData.preferences?.hydrationUnit || 'ml',
        }
      };

      // Construct Firestore dot-notation updates
      const firestoreUpdates = {
        name: setupData.name,
        age: setupData.age,
        dob: setupData.dob, // Properly formatted clean string
        weight: setupData.weight, // Flat numeric value
        height: setupData.height, // Flat numeric value
        "stats.stepGoal": setupData.stats?.stepGoal || 10000,
        "stats.hydrationGoal": setupData.stats?.hydrationGoal || 2500, // Standardized ML
        preferences: updatedPreferences,
        isSetupComplete: true
      };

      if (historyEntries.length > 0) {
        firestoreUpdates.history = arrayUnion(...historyEntries);
      }

      // Update the backend
      await updateDoc(doc(db, 'users', user.uid), firestoreUpdates);
      
      // Update local state cleanly (using nested objects rather than dot-notation strings)
      setUserData(prev => ({ 
        ...prev, 
        name: setupData.name,
        age: setupData.age,
        dob: setupData.dob,
        weight: setupData.weight,
        height: setupData.height,
        stats: {
          ...(prev?.stats || INITIAL_USER_DATA.stats),
          stepGoal: setupData.stats?.stepGoal || 10000,
          hydrationGoal: setupData.stats?.hydrationGoal || 2500,
        },
        history: [...(prev?.history || []), ...historyEntries],
        preferences: updatedPreferences,
        isSetupComplete: true 
      }));
    } catch (e) { 
      console.error("Setup Error:", e); 
    }
  };

  // ============================================================
  // 4. PROFILE & BODY STATS MANAGEMENT
  // ============================================================

  const updateName = async (newName) => {
    if (!user) return { success: false, error: "No user" };
    try {
      await updateProfile(user, { displayName: newName });
      await updateDoc(doc(db, 'users', user.uid), { name: newName });
      setUserData(prev => ({ ...prev, name: newName }));
      return { success: true };
    } catch (e) { 
      return { success: false, error: e.message }; 
    }
  };

  const updateDOB = async (dobString, age) => {
    if (!user) return { success: false, error: "No user" };
    try {
      await updateDoc(doc(db, 'users', user.uid), { dob: dobString, age: age });
      setUserData(prev => ({ ...prev, dob: dobString, age: age }));
      return { success: true };
    } catch (e) { 
      return { success: false, error: e.message }; 
    }
  };

  const updateBodyStats = async (newWeight, newHeight) => {
    if (!user) return { success: false, error: "No user" };
    try {
      const now = new Date().toISOString();
      const updates = {};
      const historyEntries = [];

      // Always save as Metric (int) to DB
      if (newWeight) {
        const val = parseInt(newWeight);
        updates.weight = val;
        historyEntries.push({ type: 'weight', value: val, date: now });
      }
      if (newHeight) {
        const val = parseInt(newHeight);
        updates.height = val;
        historyEntries.push({ type: 'height', value: val, date: now });
      }

      if (historyEntries.length > 0) {
        updates.history = arrayUnion(...historyEntries);
      }

      await updateDoc(doc(db, 'users', user.uid), updates);
      return { success: true };
    } catch (e) { 
      return { success: false, error: e.message }; 
    }
  };

  const updateUserPassword = async (currentPassword, newPassword) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return { success: false, error: "No user logged in" };
    try {
      await updatePassword(currentUser, newPassword);
      return { success: true };
    } catch (error) {
      if (error.code === 'auth/requires-recent-login') {
        try {
          const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
          await reauthenticateWithCredential(currentUser, credential);
          await updatePassword(currentUser, newPassword);
          return { success: true };
        } catch (reAuthError) { 
          return { success: false, error: "Current password was incorrect." }; 
        }
      }
      return { success: false, error: error.message };
    }
  };

  const uploadProfileImage = async (base64Image) => {
    if (!user) return { success: false, error: "No user logged in" };
    try {
      const imageString = `data:image/jpeg;base64,${base64Image}`;
      await updateDoc(doc(db, 'users', user.uid), { profileImage: imageString });
      setUserData(prev => ({ ...prev, profileImage: imageString }));
      return { success: true };
    } catch (error) { 
      return { success: false, error: error.message }; 
    }
  };

  const updatePreferences = async (newPrefs) => {
    if (!user) return;
    const currentUnits = userData.preferences?.units || INITIAL_USER_DATA.preferences.units;
    const incomingUnits = newPrefs.units || {};
    
    const updated = { 
      ...userData.preferences, 
      ...newPrefs, 
      units: { ...currentUnits, ...incomingUnits }
    };

    setUserData(prev => ({ ...prev, preferences: updated })); 
    await updateDoc(doc(db, 'users', user.uid), { preferences: updated });
  };

  const updateDailyGoals = async (newStepGoal, newHydrationGoal) => {
    if (!user) return;
    const updates = {};
    if (newStepGoal) updates["stats.stepGoal"] = parseInt(newStepGoal);
    if (newHydrationGoal) updates["stats.hydrationGoal"] = parseInt(newHydrationGoal);
    
    setUserData(prev => ({ ...prev, stats: { ...prev.stats, ...updates } }));
    await updateDoc(doc(db, 'users', user.uid), updates);
  };

  // ============================================================
  // 5. DATA & SYNC
  // ============================================================

  const fetchLeaderboard = async () => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy("stats.steps", "desc"), limit(50));
      const querySnapshot = await getDocs(q);
      const leaderboardData = [];
      querySnapshot.forEach((doc) => {
        const d = doc.data();
        leaderboardData.push({
          id: doc.id,
          name: d.name || 'Anonymous',
          steps: d.stats?.steps || 0,
          profileImage: d.profileImage || null
        });
      });
      return leaderboardData;
    } catch (e) { 
      console.log("Error fetching leaderboard:", e); 
      return []; 
    }
  };

  // --- CALENDAR & SMART GAPS ---
  const findSmartGaps = (busyEvents, startDate, daysToScan = 365) => {
    const gaps = [];
    const minGapMinutes = 20;
    
    const createGap = (startMs, endMs, dateKey, label) => {
      const diffMins = Math.floor((endMs - startMs) / 60000);
      let gapType = 'Bronze'; let suggestion = 'Free Time'; let color = '#FFCC00'; 
      if (diffMins >= 120) { gapType = 'Diamond'; suggestion = '⚡ FREE DAY: Long Workout'; color = '#0A84FF'; } 
      else if (diffMins >= 45) { gapType = 'Gold'; suggestion = '⚡ BEST TIME: Full Workout'; color = '#34C759'; } 
      else if (diffMins >= 20) { gapType = 'Silver'; suggestion = '🔥 Great for HIIT / Micro'; color = '#FF3B30'; }
      
      const startObj = new Date(startMs); 
      const endObj = new Date(endMs);
      
      return {
        id: `gap_${dateKey}_${startMs}_${Date.now()}`, 
        dateString: dateKey, day: new Date(startMs).getDate().toString(),
        title: label || 'Fitness Opportunity', 
        startTime: startObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        endTime: endObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), 
        rawStart: startMs, rawEnd: endMs, type: 'gap',
        gapQuality: gapType, duration: formatDuration(diffMins), suggestion: suggestion, color: color
      };
    };

    const eventsByDate = {};
    busyEvents.forEach(e => { 
      if (!eventsByDate[e.dateString]) eventsByDate[e.dateString] = []; 
      eventsByDate[e.dateString].push(e); 
    });

    for (let i = 0; i < daysToScan; i++) {
      const currentDate = new Date(startDate); 
      currentDate.setDate(currentDate.getDate() + i);
      const dateKey = getLocalDateString(currentDate);
      
      if (!eventsByDate[dateKey] || eventsByDate[dateKey].length === 0) {
        const freeStart = new Date(currentDate); freeStart.setHours(9, 0, 0, 0);
        const freeEnd = new Date(currentDate); freeEnd.setHours(18, 0, 0, 0);
        gaps.push(createGap(freeStart.getTime(), freeEnd.getTime(), dateKey, "Free Day Opportunity")); 
        continue; 
      }
      
      const dayEvents = eventsByDate[dateKey].sort((a, b) => a.rawStart - b.rawStart);
      const dayStart = new Date(dayEvents[0].rawStart); dayStart.setHours(7, 0, 0, 0); 
      if (dayEvents[0].rawStart > dayStart.getTime()) {
        const diff = Math.floor((dayEvents[0].rawStart - dayStart.getTime()) / 60000);
        if (diff >= minGapMinutes) gaps.push(createGap(dayStart.getTime(), dayEvents[0].rawStart, dateKey, "Morning Workout"));
      }
      for (let j = 0; j < dayEvents.length - 1; j++) {
        const currentEnd = dayEvents[j].rawEnd; const nextStart = dayEvents[j+1].rawStart;
        const diff = Math.floor((nextStart - currentEnd) / 60000);
        if (diff >= minGapMinutes) gaps.push(createGap(currentEnd, nextStart, dateKey));
      }
      const dayEnd = new Date(dayEvents[0].rawStart); dayEnd.setHours(22, 0, 0, 0);
      const lastEventEnd = dayEvents[dayEvents.length - 1].rawEnd;
      if (lastEventEnd < dayEnd.getTime()) {
        const diff = Math.floor((dayEnd.getTime() - lastEventEnd) / 60000);
        if (diff >= minGapMinutes) gaps.push(createGap(lastEventEnd, dayEnd.getTime(), dateKey, "Evening Workout"));
      }
    }
    return gaps;
  };

  const syncDefaultCalendar = async () => {
    if (!user) return false;
    try {
      let busyEvents = [];
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status === 'granted') {
        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        const calendarIds = calendars.map(c => c.id);
        const start = new Date(); start.setHours(0,0,0,0);
        const end = new Date(); end.setDate(end.getDate() + 365); end.setHours(23,59,59,999);
        const events = await Calendar.getEventsAsync(calendarIds, start, end);
        
        const deviceEvents = events.filter(e => {
            const note = e.notes || e.description || ''; return !note.includes('Added via UFitness Schedule');
          }).map((e, i) => {
            const s = new Date(e.startDate); const en = new Date(e.endDate); const durMins = Math.round((en - s) / 60000);
            return {
              id: `local_${i}_${e.id}`, dateString: getLocalDateString(s), day: s.getDate().toString(),
              title: e.title || 'Event', rawStart: s.getTime(), rawEnd: en.getTime(),
              startTime: s.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
              endTime: en.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
              type: 'class', duration: formatDuration(durMins), color: e.calendarColor || '#555' 
            };
          });
        busyEvents = [...busyEvents, ...deviceEvents];
      }
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const customData = userDoc.data().customEvents || [];
        const formattedCustom = customData.map(c => {
          const s = new Date(c.rawStart); const e = new Date(c.rawEnd);
          return {
            id: c.id, dateString: c.dateString, day: s.getDate().toString(), title: c.title,
            rawStart: c.rawStart, rawEnd: c.rawEnd,
            startTime: s.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
            endTime: e.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
            type: 'custom', duration: formatDuration(c.duration), color: '#FF9500' 
          };
        });
        busyEvents = [...busyEvents, ...formattedCustom];
      }
      
      const start = new Date(); start.setHours(0,0,0,0);
      const gaps = findSmartGaps(busyEvents, start, 365);
      const fullSchedule = [...busyEvents, ...gaps].sort((a, b) => a.rawStart - b.rawStart);
      
      await updateDoc(doc(db, 'users', user.uid), { schedule: fullSchedule });
      return true;
    } catch (e) { console.log(e); return false; }
  };

  const addCustomEvent = async (title, dateIsoString, timeString, durationMins) => {
    if (!user) return { success: false, error: "No user" };
    try {
      const [hours, mins] = timeString.split(':').map(Number);
      const startDate = new Date(dateIsoString);
      startDate.setHours(hours, mins, 0, 0);
      const rawStart = startDate.getTime();
      const rawEnd = rawStart + (durationMins * 60000);
      const endDate = new Date(rawEnd);

      // Native Calendar Sync
      try {
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        if (status === 'granted') {
          let calendarId = null;
          if (Platform.OS === 'ios') {
            const defaultCal = await Calendar.getDefaultCalendarAsync();
            calendarId = defaultCal.id;
          } else {
            const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
            const primary = calendars.find(c => c.isPrimary) || calendars.find(c => c.accessLevel === Calendar.CalendarAccessLevel.OWNER);
            calendarId = primary ? primary.id : null;
          }
          if (calendarId) {
            const deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            await Calendar.createEventAsync(calendarId, {
              title: title, startDate: startDate, endDate: endDate, timeZone: deviceTimeZone,
              location: 'UFitness App', notes: 'Added via UFitness Schedule' 
            });
          }
        }
      } catch (calErr) { console.warn("Native Sync Skipped:", calErr.message); }

      const newEvent = {
        id: `custom_${Date.now()}`, title: title || "Workout", dateString: dateIsoString,
        startTime: timeString, duration: parseInt(durationMins), rawStart, rawEnd, type: 'custom'
      };
      await updateDoc(doc(db, 'users', user.uid), { customEvents: arrayUnion(newEvent) });
      await refreshData();
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  };

  const deleteCustomEvent = async (eventId) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const currentEvents = userSnap.data().customEvents || [];
        const updatedEvents = currentEvents.filter(e => e.id !== eventId);
        await updateDoc(userRef, { customEvents: updatedEvents });
        await refreshData(); 
        return { success: true };
      }
    } catch (e) { return { success: false, error: e.message }; }
  };

  // ============================================================
  // 7. STATS & PEDOMETER LOGIC (Fixed for Android)
  // ============================================================

  const calculateStats = (history = [], currentStats) => {
    if (!history || !Array.isArray(history)) return currentStats;

    const todayStr = getLocalDateString(new Date());

    const caloriesBurnedTotal = history.reduce((sum, item) => {
      return item.type === 'workout' ? sum + (Number(item.calories) || 0) : sum;
    }, 0);

    const caloriesBurnedToday = history.reduce((sum, item) => {
      if (item.type === 'workout' && getLocalDateString(item.date) === todayStr) {
        return sum + (Number(item.calories) || 0);
      }
      return sum;
    }, 0);

    const workoutsCompletedTotal = history.filter(h => h.type === 'workout').length;
    
    const workoutsCompletedToday = history.filter(h => {
      return h.type === 'workout' && getLocalDateString(h.date) === todayStr;
    }).length;

    const hydrationCurrent = history.reduce((sum, item) => {
      if ((item.type === 'hydration' || item.type === 'water') && getLocalDateString(item.date) === todayStr) {
        return sum + (Number(item.amount) || 0);
      }
      return sum;
    }, 0);

    const minutes = history.reduce((sum, item) => sum + (Number(item.duration) || 0), 0);
    
    const now = new Date();
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0,0,0,0);
    const weeklyGoalCurrent = history.filter(item => {
      const itemDate = item.date && item.date.toDate ? item.date.toDate() : new Date(item.date);
      return itemDate >= startOfWeek && item.type === 'workout';
    }).length;

    const uniqueDates = [...new Set(history.filter(h => h.type === 'workout').map(item => {
      const dateObj = item.date && item.date.toDate ? item.date.toDate() : new Date(item.date);
      return getLocalDateString(dateObj);
    }))].filter(d => d).sort();

    const yesterdayDate = new Date(); yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterdayDate);

    let currentStreak = 0;
    if (uniqueDates.includes(todayStr) || uniqueDates.includes(yesterdayStr)) {
      let checkDate = new Date(uniqueDates.includes(todayStr) ? todayStr : yesterdayStr);
      currentStreak = 1;
      while (true) {
        checkDate.setDate(checkDate.getDate() - 1);
        if (uniqueDates.includes(getLocalDateString(checkDate))) currentStreak++;
        else break;
      }
    }
    const finalBestStreak = Math.max(currentStreak, currentStats.bestStreak || 0);

    return { 
      ...currentStats, 
      workoutsCompletedTotal, 
      workoutsCompletedToday, 
      caloriesBurnedTotal, 
      caloriesBurnedToday, 
      minutes, 
      weeklyGoalCurrent,
      streak: currentStreak, 
      bestStreak: finalBestStreak, 
      hydrationCurrent 
    };
  };

  // --- UPDATED REFRESH LOGIC ---
  const refreshData = async () => {
    try {
      const isAvailable = await Pedometer.isAvailableAsync();
      if (!isAvailable) {
        console.log("Pedometer not available on this device");
        return;
      }

      // iOS: We can fetch history for the whole day accurately
      if (Platform.OS === 'ios') {
        const start = new Date(); start.setHours(0,0,0,0);
        const end = new Date();
        const result = await Pedometer.getStepCountAsync(start, end);
        
        // Sync iOS result directly to state and DB (it's authoritative)
        const newSteps = result.steps;
        setUserData(prev => ({ ...prev, stats: { ...prev.stats, steps: newSteps } }));
        
        // Update our refs to match
        sessionStartSteps.current = newSteps; 
        currentSessionSteps.current = 0;
        
        if (user) await updateDoc(doc(db, 'users', user.uid), { "stats.steps": newSteps });
      }
      
      // Android: Steps are handled by the listener in startPedometer below,
      // because getStepCountAsync (history) is often not supported.
      
      if (userData?.preferences?.isAutoSyncEnabled) await syncDefaultCalendar();
    } catch (e) { console.log("Refresh Data Error:", e); }
  };

  // --- UPDATED TRACKER LOGIC (ANDROID FRIENDLY) ---
  const startPedometer = async () => {
    try {
      const { status } = await Pedometer.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn("Pedometer permission denied by user (or missing in app.json)");
        return;
      }

      
      sessionStartSteps.current = userData?.stats?.steps || 0;

     
      if (pedometerSubscription) pedometerSubscription.remove();

      
      const sub = Pedometer.watchStepCount((result) => {
      
        currentSessionSteps.current = result.steps;
        
        const totalSteps = sessionStartSteps.current + currentSessionSteps.current;

        setUserData(prev => ({ 
          ...prev, 
          stats: { ...prev.stats, steps: totalSteps } 
        }));
      });

      setPedometerSubscription(sub);
    } catch (e) { console.log("Pedometer Permission Error:", e); }
  };

  const completeWorkout = async (dur, cal) => {
    if (!user) return;
    const entry = { date: new Date().toISOString(), type: 'workout', duration: parseInt(dur), calories: parseInt(cal) };
    const newHistory = [...(userData.history || []), entry];
    const newStats = calculateStats(newHistory, userData.stats);
    
    setUserData(prev => ({ ...prev, history: newHistory, stats: newStats }));
    await updateDoc(doc(db, 'users', user.uid), { 
      history: arrayUnion(entry),
      "stats.streak": newStats.streak,
      "stats.bestStreak": newStats.bestStreak,
      "stats.caloriesBurnedTotal": newStats.caloriesBurnedTotal,
      "stats.caloriesBurnedToday": newStats.caloriesBurnedToday,
      "stats.minutes": newStats.minutes,
      "stats.workoutsCompletedTotal": newStats.workoutsCompletedTotal,
      "stats.workoutsCompletedToday": newStats.workoutsCompletedToday, 
      "stats.weeklyGoalCurrent": newStats.weeklyGoalCurrent
    });
  };

  const addWater = async () => {
    if (!user) return;
    const entry = { date: new Date().toISOString(), type: 'hydration', amount: 250 };
    const newHistory = [...(userData.history || []), entry];
    const newStats = calculateStats(newHistory, userData.stats);
    setUserData(prev => ({ ...prev, history: newHistory, stats: newStats }));
    await updateDoc(doc(db, 'users', user.uid), { 
      history: arrayUnion(entry),
      "stats.hydrationCurrent": newStats.hydrationCurrent 
    });
  };

  const updateSteps = async (steps) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { 'stats.steps': steps });
    } catch (e) { console.error("Error updating steps", e); }
  };

  const resetProgress = async () => { 
    if (!user) return;
    const resetState = {
      history: [], 
      customEvents: [], 
      "stats.hydrationCurrent": 0, "stats.streak": 0, "stats.bestStreak": 0,
      "stats.caloriesBurnedTotal": 0, "stats.caloriesBurnedToday": 0, 
      "stats.workoutsCompletedTotal": 0, "stats.workoutsCompletedToday": 0,
      "stats.minutes": 0, "stats.weeklyGoalCurrent": 0, "stats.steps": 0
    };
    setUserData(prev => ({ ...prev, ...resetState }));
    await updateDoc(doc(db, 'users', user.uid), resetState); 
    
    sessionStartSteps.current = 0;
    currentSessionSteps.current = 0;
  };

  // ============================================================
  // 8. EFFECTS & LISTENERS
  // ============================================================

  // Calendar Auto-Sync Effect
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (user && userData?.preferences?.isAutoSyncEnabled) syncDefaultCalendar();
      }
      appState.current = nextAppState;
    });
    const intervalId = setInterval(() => { 
      if (user && userData?.preferences?.isAutoSyncEnabled) syncDefaultCalendar(); 
    }, 60000); 
    return () => { subscription.remove(); clearInterval(intervalId); };
  }, [user, userData?.preferences?.isAutoSyncEnabled]);

  // NEW: Debounced Step Saver (Prevents Database Spamming)
  useEffect(() => {
    if (!user) return;

    const saveInterval = setInterval(async () => {
      const totalSteps = sessionStartSteps.current + currentSessionSteps.current;
      
     
      if (totalSteps > sessionStartSteps.current) {
         try {
           await updateDoc(doc(db, 'users', user.uid), { "stats.steps": totalSteps });
          
           sessionStartSteps.current = totalSteps;
           currentSessionSteps.current = 0; 
         } catch(e) { console.error("Step Auto-Save Error", e); }
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(saveInterval);
  }, [user]);

  // Auth State & Real-time Database Listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        startPedometer(); 
        const sub = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Check if we need to archive yesterday's steps/stats
            checkAndMigrateDailyStats(currentUser.uid, data);
            
            // Initialize the Android "Base" with what we found in the database
            // This ensures we don't start from 0 if steps already exist
            if (sessionStartSteps.current === 0 && (data.stats?.steps || 0) > 0) {
              sessionStartSteps.current = data.stats.steps;
            }

            // Merge defaults for new fields (units, etc.)
            const prefs = { ...INITIAL_USER_DATA.preferences, ...(data.preferences || {}) };
            
            const safeStats = calculateStats(data.history, data.stats || INITIAL_USER_DATA.stats);
            setUserData({ ...data, stats: safeStats, preferences: prefs });
          } else {
            // New user in Auth but no DB doc yet
            setDoc(doc(db, 'users', currentUser.uid), INITIAL_USER_DATA);
            setUserData(INITIAL_USER_DATA);
          }
          setLoading(false);
        });
        return () => { sub(); if (pedometerSubscription) pedometerSubscription.remove(); };
      } else { 
        setUserData(INITIAL_USER_DATA); 
        setLoading(false); 
      }
    });
    return unsubscribeAuth;
  }, []);

  // ============================================================
  // 9. EXPORT PROVIDER
  // ============================================================

  return (
    <UserContext.Provider value={{ 
      // State
      user, 
      userData, 
      loading, 
      
      // Auth Actions
      login, 
      register, 
      logout, 
      loginWithGoogle, 
      completeSetup,
      
      // Profile Actions
      uploadProfileImage, 
      updateName, 
      updateUserPassword, 
      updatePreferences, 
      updateDailyGoals, 
      updateBodyStats,
      updateDOB, 
      
      // Data Actions
      refreshData, 
      syncDefaultCalendar, 
      fetchLeaderboard, 
      addCustomEvent, 
      deleteCustomEvent, 
      
      // Stats Modifiers
      completeWorkout, 
      addWater, 
      updateSteps,
      resetProgress,

      // Helpers
      converters // Contains getUnitConfig & display helpers
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);