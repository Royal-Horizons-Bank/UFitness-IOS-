import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, 
  useColorScheme, Modal, TextInput, TouchableWithoutFeedback, Keyboard, Alert 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../context/UserContext';
import { PALETTE } from '../constants/theme';
import { WorkoutEngine } from '../services/WorkoutEngine';

const CATEGORIES = ["All", "Micro", "HIIT", "Strength", "Cardio", "Core"];

const WorkoutScreen = () => {
  const theme = useColorScheme() || 'dark';
  const colors = PALETTE[theme];
  const styles = getStyles(theme, colors);
  const { completeWorkout } = useUser();

  const [dailyWorkouts, setDailyWorkouts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState('none'); 
  
  const [selectedWorkout, setSelectedWorkout] = useState(null); 
  const [activeSession, setActiveSession] = useState(null);     
  const [currentExIndex, setCurrentExIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const routines = WorkoutEngine.generateDailyWorkouts();
    setDailyWorkouts(routines);
  }, []);

  useEffect(() => {
    let interval = null;
    if (activeSession && isPlaying && timeLeft > 0 && activeSession.exercises[currentExIndex].type === 'time') {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && isPlaying && activeSession && activeSession.exercises[currentExIndex].type === 'time') {
      handleNextExercise(); 
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeLeft, activeSession, currentExIndex]);

  const startWorkoutSession = (workout) => {
    setSelectedWorkout(null);
    setActiveSession(workout);
    setCurrentExIndex(0);
    setupExercise(workout.exercises[0]);
    setIsPlaying(true);
  };

  const setupExercise = (exercise) => {
    if (exercise.type === 'time') setTimeLeft(exercise.value);
    else setTimeLeft(0); 
  };

  const handleNextExercise = () => {
    if (currentExIndex < activeSession.exercises.length - 1) {
      const nextIndex = currentExIndex + 1;
      setCurrentExIndex(nextIndex);
      setupExercise(activeSession.exercises[nextIndex]);
    } else {
      setIsPlaying(false);
      completeWorkout(activeSession.duration, parseInt(activeSession.cal));
      setActiveSession(null);
      Alert.alert("Workout Complete", `Incredible work. You crushed the ${activeSession.title} routine.`);
    }
  };

  const handlePrevExercise = () => {
    if (currentExIndex > 0) {
      const prevIndex = currentExIndex - 1;
      setCurrentExIndex(prevIndex);
      setupExercise(activeSession.exercises[prevIndex]);
    }
  };

  const filteredWorkouts = dailyWorkouts.filter(workout => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = query === "" || workout.title.toLowerCase().includes(query) || workout.tags.some(t => t.includes(query));
    const matchesCategory = activeCategory === "All" || workout.category === activeCategory || (activeCategory === "Micro" && parseInt(workout.duration) <= 10);
    const matchesQuick = quickFilter === 'none' || (quickFilter === 'smallSpace' && workout.smallSpace) || (quickFilter === 'under15' && parseInt(workout.duration) <= 15);
    return matchesSearch && matchesCategory && matchesQuick;
  });

  const renderPlayerModal = () => {
    if (!activeSession) return null;
    const currentEx = activeSession.exercises[currentExIndex];
    const isTime = currentEx.type === 'time';
    const progressPct = ((currentExIndex) / activeSession.exercises.length) * 100;

    return (
      <Modal visible={!!activeSession} animationType="slide" transparent={false}>
        <View style={styles.playerContainer}>
          <View style={styles.playerHeader}>
            <TouchableOpacity onPress={() => { setIsPlaying(false); setActiveSession(null); }} style={styles.playerCloseBtn}>
              <Ionicons name="close" size={32} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.progressTrack}>
               <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
            <Text style={styles.playerStepText}>Exercise {currentExIndex + 1} of {activeSession.exercises.length}</Text>
          </View>

          <View style={styles.playerVisualContainer}>
             <Text style={styles.playerExTitle} adjustsFontSizeToFit numberOfLines={2}>{currentEx.title}</Text>
             <Text style={styles.playerExTarget}>TARGET: {currentEx.target}</Text>
             <View style={styles.instructionBox}>
               <Text style={styles.instructionText}>{currentEx.instructions}</Text>
             </View>
          </View>

          <View style={styles.playerTimerContainer}>
            {isTime ? (
              <Text style={styles.hugeTimer}>
                00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
              </Text>
            ) : (
              <Text style={styles.hugeTimer}>{currentEx.value} <Text style={{fontSize: 32, color: '#8E8E93'}}>Reps</Text></Text>
            )}
            <Text style={styles.timerSubText}>
              {isTime ? (isPlaying ? "WORK" : "PAUSED") : "AT YOUR OWN PACE"}
            </Text>
          </View>

          <View style={styles.playerControls}>
            <TouchableOpacity style={styles.controlBtnSmall} onPress={handlePrevExercise}>
              <Ionicons name="play-skip-back" size={24} color="#FFF" />
            </TouchableOpacity>
            {isTime ? (
              <TouchableOpacity style={styles.controlBtnLarge} onPress={() => setIsPlaying(!isPlaying)}>
                <Ionicons name={isPlaying ? "pause" : "play"} size={40} color="#000" style={!isPlaying && {marginLeft: 6}} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.controlBtnLarge, {backgroundColor: '#34C759'}]} onPress={handleNextExercise}>
                <Ionicons name="checkmark-done" size={40} color="#FFF" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.controlBtnSmall} onPress={handleNextExercise}>
              <Ionicons name="play-skip-forward" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          
          <View style={styles.header}>
            <Text style={styles.pageTitle}>Workouts</Text>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="flame" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={colors.textDim} style={{ marginLeft: 8 }} />
            <TextInput 
              placeholder="Search 'Core', '10 min', 'sweat'..." 
              placeholderTextColor={colors.textDim}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textDim} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.chipRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 20}}>
              <TouchableOpacity 
                style={[styles.chip, quickFilter === 'smallSpace' && styles.chipActive]}
                onPress={() => setQuickFilter(quickFilter === 'smallSpace' ? 'none' : 'smallSpace')}
              >
                <Ionicons name="home-outline" size={14} color={quickFilter === 'smallSpace' ? '#FFF' : colors.text} />
                <Text style={[styles.chipText, quickFilter === 'smallSpace' && styles.chipTextActive]}>Dorm Friendly</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.chip, quickFilter === 'under15' && styles.chipActive]}
                onPress={() => setQuickFilter(quickFilter === 'under15' ? 'none' : 'under15')}
              >
                <Ionicons name="timer-outline" size={14} color={quickFilter === 'under15' ? '#FFF' : colors.text} />
                <Text style={[styles.chipText, quickFilter === 'under15' && styles.chipTextActive]}>&lt; 15 min</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          <View style={styles.categoryRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 20}}>
              {CATEGORIES.map((cat, index) => (
                <TouchableOpacity 
                  key={index} onPress={() => setActiveCategory(cat)}
                  style={[styles.categoryTab, activeCategory === cat && styles.categoryTabActive]}
                >
                  <Text style={[styles.categoryText, activeCategory === cat && styles.categoryTextActive]}>{cat}</Text>
                  {activeCategory === cat && <View style={styles.activeDot} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {activeCategory === "All" && searchQuery === "" && quickFilter === 'none' && (
              <Text style={styles.sectionHeading}>Workout of the Day</Text>
            )}

            {filteredWorkouts.length > 0 ? (
              filteredWorkouts.map((workout, idx) => (
                <View key={workout.id}>
                  <TouchableOpacity activeOpacity={0.9} onPress={() => setSelectedWorkout(workout)} style={styles.card}>
                    <View style={styles.cardImageContainer}>
                       <Image source={{ uri: workout.image }} style={styles.cardImage} resizeMode="cover" />
                    </View>
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.cardGradient} />
                    
                    {workout.smallSpace && (
                      <View style={styles.smallSpaceBadge}>
                        <Ionicons name="volume-mute" size={12} color="#FFF" />
                        <Text style={styles.smallSpaceText}>Silent • No Equipment</Text>
                      </View>
                    )}

                    <View style={styles.cardOverlay}>
                      <Text style={styles.cardTitle}>{workout.title}</Text>
                      <View style={styles.cardMetaRow}>
                        <View style={styles.metaBadge}>
                          <Ionicons name="time" size={12} color="#FFF" />
                          <Text style={styles.metaText}>{workout.duration}</Text>
                        </View>
                        <View style={[styles.metaBadge, { backgroundColor: 'rgba(255, 59, 48, 0.8)' }]}>
                          <Ionicons name="flame" size={12} color="#FFF" />
                          <Text style={styles.metaText}>{workout.cal}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.playButton}><Ionicons name="play" size={24} color="#000" style={{marginLeft: 4}} /></View>
                  </TouchableOpacity>
                  {idx === 0 && activeCategory === "All" && searchQuery === "" && quickFilter === 'none' && (
                     <Text style={[styles.sectionHeading, {marginTop: 10}]}>Explore Routines</Text>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="dumbbell-off" size={64} color={colors.textDim} />
                <Text style={styles.emptyText}>No routines found.</Text>
              </View>
            )}
            <View style={{ height: 100 }} />
          </ScrollView>

          <Modal visible={!!selectedWorkout} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                {selectedWorkout && (
                  <>
                    <View style={styles.modalImageContainer}>
                        <Image source={{ uri: selectedWorkout.image }} style={styles.modalImage} resizeMode="cover" />
                    </View>
                    <LinearGradient colors={['transparent', colors.surface]} style={styles.modalGradient} />
                    
                    <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedWorkout(null)}>
                      <Ionicons name="chevron-down" size={28} color="#FFF" />
                    </TouchableOpacity>

                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                      <View style={styles.pillRow}>
                        <View style={styles.categoryPill}><Text style={styles.pillText}>{selectedWorkout.category}</Text></View>
                        {selectedWorkout.smallSpace && (
                          <View style={[styles.categoryPill, { backgroundColor: '#34C759' }]}><Text style={styles.pillText}>Zero Equipment</Text></View>
                        )}
                      </View>
                      
                      <Text style={styles.modalTitle}>{selectedWorkout.title}</Text>
                      
                      <View style={styles.statGrid}>
                        <View style={styles.statBox}>
                          <Ionicons name="time-outline" size={24} color={colors.primary} />
                          <Text style={styles.statValue}>{selectedWorkout.duration}</Text>
                          <Text style={styles.statLabel}>Duration</Text>
                        </View>
                        <View style={[styles.statBox, styles.statBorder]}>
                          <Ionicons name="flame-outline" size={24} color={colors.primary} />
                          <Text style={styles.statValue}>{selectedWorkout.cal}</Text>
                          <Text style={styles.statLabel}>Calories</Text>
                        </View>
                        <View style={styles.statBox}>
                          <Ionicons name="barbell-outline" size={24} color={colors.primary} />
                          <Text style={styles.statValue}>{selectedWorkout.level}</Text>
                          <Text style={styles.statLabel}>Level</Text>
                        </View>
                      </View>

                      <Text style={styles.sectionHeading}>Routine Overview</Text>
                      <View style={styles.exerciseList}>
                        {selectedWorkout.exercises.map((ex, i) => (
                          <View key={i} style={styles.exerciseRow}>
                             <View style={styles.exerciseImageWrapper}>
                               <Ionicons name="fitness" size={28} color={colors.text} />
                             </View>
                             <View style={{flex: 1, marginLeft: 16}}>
                               <Text style={styles.exerciseName} numberOfLines={1}>{ex.title}</Text>
                               <Text style={styles.exerciseTarget}>{ex.target}</Text>
                             </View>
                             <Text style={styles.exerciseDuration}>{ex.type === 'time' ? `${ex.value}s` : `${ex.value}x`}</Text>
                          </View>
                        ))}
                      </View>

                      <TouchableOpacity style={styles.startBtn} onPress={() => startWorkoutSession(selectedWorkout)}>
                        <Text style={styles.startBtnText}>START WORKOUT</Text>
                        <Ionicons name="play" size={20} color="#FFF" />
                      </TouchableOpacity>
                      <View style={{ height: 60 }} />
                    </ScrollView>
                  </>
                )}
              </View>
            </View>
          </Modal>

          {renderPlayerModal()}

        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const getStyles = (theme, colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  pageTitle: { fontSize: 32, fontWeight: '800', color: colors.text },
  iconBtn: { padding: 10, backgroundColor: colors.surface, borderRadius: 50, borderWidth: 1, borderColor: colors.border },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, marginHorizontal: 20, marginTop: 4, borderRadius: 16, paddingHorizontal: 12, height: 50, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, color: colors.text, fontSize: 16, height: '100%', marginLeft: 8 },

  chipRow: { marginTop: 12, marginBottom: 4, height: 32 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.surface, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.text, marginLeft: 6, fontWeight: '600' },
  chipTextActive: { color: '#FFF' },

  categoryRow: { marginVertical: 16, height: 30 },
  categoryTab: { marginRight: 24, alignItems: 'center' },
  categoryText: { color: colors.textDim, fontWeight: '600', fontSize: 16 },
  categoryTextActive: { color: colors.primary, fontWeight: 'bold', fontSize: 16 },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 4 },

  scrollContent: { paddingHorizontal: 20 },
  sectionHeading: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 16, letterSpacing: 0.5 },
  
  card: { height: 240, borderRadius: 28, marginBottom: 24, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: theme === 'light' ? 1 : 0, borderColor: colors.border },
  cardImageContainer: { width: '100%', height: '100%', backgroundColor: '#FFF' },
  cardImage: { width: '100%', height: '100%' },
  cardGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '80%' },
  
  smallSpaceBadge: { position: 'absolute', top: 16, left: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  smallSpaceText: { color: '#FFF', fontSize: 11, fontWeight: '800', marginLeft: 6, textTransform: 'uppercase', letterSpacing: 0.5 },

  cardOverlay: { position: 'absolute', bottom: 20, left: 20 },
  cardTitle: { color: '#FFF', fontSize: 26, fontWeight: '800', marginBottom: 10 },
  cardMetaRow: { flexDirection: 'row' },
  metaBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, marginRight: 10 },
  metaText: { color: '#FFF', fontSize: 13, fontWeight: '700', marginLeft: 6 },
  
  playButton: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },

  emptyState: { alignItems: 'center', marginTop: 60, opacity: 0.6 },
  emptyText: { color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' },
  modalContent: { flex: 1, marginTop: 40, backgroundColor: colors.surface, borderTopLeftRadius: 36, borderTopRightRadius: 36, overflow: 'hidden' },
  modalImageContainer: { width: '100%', height: 350, position: 'absolute', top: 0, backgroundColor: '#FFF' },
  modalImage: { width: '100%', height: '100%' },
  modalGradient: { width: '100%', height: 350, position: 'absolute', top: 0 },
  closeModalBtn: { position: 'absolute', top: 20, left: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  
  modalBody: { flex: 1, marginTop: 280, paddingHorizontal: 24, paddingTop: 20 },
  pillRow: { flexDirection: 'row', marginBottom: 16 },
  categoryPill: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, marginRight: 10 },
  pillText: { color: '#FFF', fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  modalTitle: { fontSize: 34, fontWeight: '900', color: colors.text, marginBottom: 24 },
  
  statGrid: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 24, padding: 20, marginBottom: 30, borderWidth: 1, borderColor: colors.border },
  statBox: { flex: 1, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderLeftColor: colors.border, borderRightWidth: 1, borderRightColor: colors.border },
  statValue: { fontSize: 18, fontWeight: '900', color: colors.text, marginTop: 8 },
  statLabel: { fontSize: 11, color: colors.textDim, textTransform: 'uppercase', marginTop: 4, fontWeight: '600' },
  
  exerciseList: { marginBottom: 30, backgroundColor: colors.background, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: colors.border },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  exerciseImageWrapper: { width: 60, height: 60, borderRadius: 16, backgroundColor: theme === 'dark' ? '#2C2C2E' : '#F2F2F7', justifyContent: 'center', alignItems: 'center' },
  exerciseName: { color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 4 },
  exerciseTarget: { color: colors.textDim, fontSize: 13, textTransform: 'uppercase', fontWeight: '700' },
  exerciseDuration: { color: colors.primary, fontSize: 18, fontWeight: '900' },

  startBtn: { flexDirection: 'row', backgroundColor: colors.primary, borderRadius: 24, paddingVertical: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  startBtnText: { color: '#FFF', fontSize: 18, fontWeight: '900', marginRight: 10, letterSpacing: 1 },

  playerContainer: { flex: 1, backgroundColor: '#000' },
  playerHeader: { paddingTop: 60, paddingHorizontal: 24, marginBottom: 10 },
  playerCloseBtn: { alignSelf: 'flex-start', paddingBottom: 20 },
  progressTrack: { height: 8, backgroundColor: '#333', borderRadius: 4, overflow: 'hidden', width: '100%', marginBottom: 12 },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  playerStepText: { color: '#8E8E93', fontSize: 15, fontWeight: '800', textAlign: 'right', textTransform: 'uppercase', letterSpacing: 1 },
  
  playerVisualContainer: { flex: 1, paddingHorizontal: 30, justifyContent: 'center', alignItems: 'center' },
  playerExTitle: { color: '#FFF', fontSize: 44, fontWeight: '900', textAlign: 'center', marginBottom: 12, letterSpacing: 1 },
  playerExTarget: { color: colors.primary, fontSize: 18, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 40 },
  instructionBox: { backgroundColor: '#1C1C1E', padding: 24, borderRadius: 24, width: '100%', borderWidth: 1, borderColor: '#333' },
  instructionText: { color: '#D1D1D6', fontSize: 18, lineHeight: 28, textAlign: 'center', fontWeight: '500' },
  
  playerTimerContainer: { alignItems: 'center', justifyContent: 'center', height: 180 },
  hugeTimer: { color: '#FFF', fontSize: 90, fontWeight: '900', fontVariant: ['tabular-nums'] },
  timerSubText: { color: '#8E8E93', fontSize: 16, fontWeight: '800', letterSpacing: 3, marginTop: -10 },
  
  playerControls: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', paddingHorizontal: 40, paddingBottom: 60 },
  controlBtnSmall: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#2C2C2E', justifyContent: 'center', alignItems: 'center' },
  controlBtnLarge: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
});

export default WorkoutScreen;