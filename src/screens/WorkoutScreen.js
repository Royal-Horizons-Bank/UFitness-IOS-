import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, useColorScheme, Modal, TextInput, 
  TouchableWithoutFeedback, Keyboard, RefreshControl 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PALETTE } from '../constants/theme';
import { useUser } from '../context/UserContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const CATEGORIES = ["All", "Micro", "HIIT", "Strength", "Cardio", "Flexibility"];


// DUMMY DATA REPLACE PAG MAY VIDEO NA
const INITIAL_WORKOUTS = [
  { id: 1, title: "Morning HIIT", category: "HIIT", tags: ["cardio", "sweat", "no equipment"], duration: "15 min", cal: "120", level: "Beginner", smallSpace: true, image: "https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=400&h=300&fit=crop" },
  { id: 2, title: "Core Crusher", category: "Strength", tags: ["abs", "core", "six pack", "mat"], duration: "10 min", cal: "80", level: "Intermediate", smallSpace: true, image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80" },
  { id: 3, title: "Dorm Yoga Flow", category: "Flexibility", tags: ["stretch", "recovery", "relax"], duration: "20 min", cal: "100", level: "All Levels", smallSpace: true, image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=300&fit=crop" },
  { id: 4, title: "Upper Body Blast", category: "Strength", tags: ["arms", "chest", "pushups"], duration: "25 min", cal: "180", level: "Advanced", smallSpace: false, image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80" },
  { id: 5, title: "Micro Cardio", category: "Micro", tags: ["quick", "energy", "jumping jacks"], duration: "5 min", cal: "40", level: "Beginner", smallSpace: true, image: "https://images.unsplash.com/photo-1538805060512-e249653459a9?w=800&q=80" },
  { id: 6, title: "Full Body Burn", category: "HIIT", tags: ["full body", "intense"], duration: "45 min", cal: "400", level: "Advanced", smallSpace: false, image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop" },
];

const WorkoutScreen = () => {
  const theme = useColorScheme() || 'dark';
  const colors = PALETTE[theme];
  const styles = getStyles(theme, colors);
  
  const { completeWorkout } = useUser();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [quickFilter, setQuickFilter] = useState('none'); 
  
  const [workouts, setWorkouts] = useState(INITIAL_WORKOUTS);
  const [refreshing, setRefreshing] = useState(false);

  // --- REFRESH LOGIC ---
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      // Shuffle workouts to simulate "New Recommendations"
      const shuffled = [...workouts].sort(() => Math.random() - 0.5);
      setWorkouts(shuffled);
      setRefreshing(false);
    }, 1500);
  }, [workouts]);

  const filteredWorkouts = workouts.filter(workout => {
    const query = searchQuery.toLowerCase();
    
    const matchesSearch = 
      query === "" || 
      workout.title.toLowerCase().includes(query) ||
      workout.duration.includes(query) || 
      workout.cal.includes(query) ||      
      workout.category.toLowerCase().includes(query) ||
      workout.tags.some(tag => tag.includes(query));

    const matchesCategory = 
      activeCategory === "All" || 
      (activeCategory === "Micro" ? workout.duration.includes("5 min") || workout.duration.includes("10 min") : workout.category === activeCategory);

    let matchesQuickFilter = true;
    if (quickFilter === 'under15') matchesQuickFilter = parseInt(workout.duration) <= 15;
    else if (quickFilter === 'smallSpace') matchesQuickFilter = workout.smallSpace === true;

    return matchesSearch && matchesCategory && matchesQuickFilter;
  });

  const handleStartWorkout = () => {
    if (selectedWorkout) {
      completeWorkout(selectedWorkout.duration, parseInt(selectedWorkout.cal));
      setSelectedWorkout(null);
      alert(`Great job! You completed ${selectedWorkout.title}.`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          
          <View style={styles.header}>
            <Text style={styles.pageTitle}>Workouts</Text>
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="notifications-outline" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={colors.textDim} style={{ marginLeft: 8 }} />
            <TextInput 
              placeholder="Search 'Core', '10 min', '100 cal'..." 
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
                <Text style={[styles.chipText, quickFilter === 'smallSpace' && styles.chipTextActive]}>Small Space</Text>
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
                  key={index} 
                  onPress={() => setActiveCategory(cat)}
                  style={[styles.categoryTab, activeCategory === cat && styles.categoryTabActive]}
                >
                  <Text style={[styles.categoryText, activeCategory === cat && styles.categoryTextActive]}>
                    {cat}
                  </Text>
                  {activeCategory === cat && <View style={styles.activeDot} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh} 
                tintColor={colors.primary} 
                title="Updating Recommendations..."
                titleColor={colors.textDim}
              />
            }
          >
            {filteredWorkouts.length > 0 ? (
              filteredWorkouts.map((workout) => (
                <TouchableOpacity 
                  key={workout.id} 
                  activeOpacity={0.9} 
                  onPress={() => setSelectedWorkout(workout)}
                  style={styles.card}
                >
                  <Image source={{ uri: workout.image }} style={styles.cardImage} />
                  <LinearGradient 
                    colors={['transparent', 'rgba(0,0,0,0.9)']} 
                    style={styles.cardGradient}
                  />
                  
                  {workout.smallSpace && (
                    <View style={styles.smallSpaceBadge}>
                      <Ionicons name="home" size={10} color="#FFF" />
                      <Text style={styles.smallSpaceText}>Dorm Friendly</Text>
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
                  
                  <View style={styles.playButton}>
                    <Ionicons name="play" size={20} color="#000" />
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="dumbbell-off" size={64} color={colors.textDim} />
                <Text style={styles.emptyText}>No workouts match your criteria.</Text>
                <Text style={styles.emptySub}>Try searching for "Core" or removing filters.</Text>
              </View>
            )}
            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Modal */}
          <Modal visible={!!selectedWorkout} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                {selectedWorkout && (
                  <>
                    <Image source={{ uri: selectedWorkout.image }} style={styles.modalImage} />
                    <LinearGradient 
                      colors={['transparent', colors.surface]} 
                      style={styles.modalGradient}
                    />
                    
                    <TouchableOpacity 
                      style={styles.closeModalBtn} 
                      onPress={() => setSelectedWorkout(null)}
                    >
                      <Ionicons name="chevron-down" size={28} color="#FFF" />
                    </TouchableOpacity>

                    <View style={styles.modalBody}>
                      <View style={styles.pillRow}>
                        <View style={styles.categoryPill}>
                          <Text style={styles.pillText}>{selectedWorkout.category}</Text>
                        </View>
                        {selectedWorkout.smallSpace && (
                          <View style={[styles.categoryPill, { backgroundColor: '#34C759' }]}>
                            <Text style={styles.pillText}>Small Space</Text>
                          </View>
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

                      <Text style={styles.desc}>
                        Perfect for fitting into your busy schedule. 
                        {selectedWorkout.smallSpace 
                          ? " This workout requires zero equipment and minimal space. Ideal for dorm rooms!" 
                          : " A high energy session to get your heart rate up."}
                      </Text>

                      <TouchableOpacity style={styles.startBtn} onPress={handleStartWorkout}>
                        <Text style={styles.startBtnText}>START SESSION</Text>
                        <Ionicons name="arrow-forward" size={20} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </View>
          </Modal>

        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const getStyles = (theme, colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  pageTitle: { fontSize: 32, fontWeight: '800', color: colors.text },
  iconBtn: { padding: 8, backgroundColor: colors.surface, borderRadius: 50, borderWidth: 1, borderColor: colors.border },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, marginHorizontal: 20, marginTop: 4, borderRadius: 16, paddingHorizontal: 12, height: 50, borderWidth: 1, borderColor: colors.border, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  searchInput: { flex: 1, color: colors.text, fontSize: 16, height: '100%', marginLeft: 8 },

  chipRow: { marginTop: 12, marginBottom: 4, height: 32 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.surface, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.text, marginLeft: 4, fontWeight: '600' },
  chipTextActive: { color: '#FFF' },

  categoryRow: { marginVertical: 16, height: 30 },
  categoryTab: { marginRight: 24, alignItems: 'center' },
  categoryText: { color: colors.textDim, fontWeight: '600', fontSize: 16 },
  categoryTextActive: { color: colors.primary, fontWeight: 'bold', fontSize: 16 },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 4 },

  scrollContent: { paddingHorizontal: 20 },
  card: { height: 200, borderRadius: 24, marginBottom: 20, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: theme === 'light' ? 1 : 0, borderColor: colors.border, shadowColor: "#000", shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.1, shadowRadius: 8 },
  cardImage: { width: '100%', height: '100%' },
  cardGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%' },
  
  smallSpaceBadge: { position: 'absolute', top: 16, left: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backdropFilter: 'blur(10px)' },
  smallSpaceText: { color: '#FFF', fontSize: 10, fontWeight: 'bold', marginLeft: 4 },

  cardOverlay: { position: 'absolute', bottom: 16, left: 16 },
  cardTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  cardMetaRow: { flexDirection: 'row' },
  metaBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 8 },
  metaText: { color: '#FFF', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  
  playButton: { position: 'absolute', right: 16, bottom: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 5 },

  emptyState: { alignItems: 'center', marginTop: 60, opacity: 0.6 },
  emptyText: { color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  emptySub: { color: colors.textDim, marginTop: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' },
  modalContent: { flex: 1, marginTop: 60, backgroundColor: colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
  modalImage: { width: '100%', height: 350, position: 'absolute', top: 0 },
  modalGradient: { width: '100%', height: 350, position: 'absolute', top: 0 },
  
  closeModalBtn: { position: 'absolute', top: 20, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  
  modalBody: { flex: 1, marginTop: 280, paddingHorizontal: 24, paddingBottom: 40 },
  pillRow: { flexDirection: 'row', marginBottom: 12 },
  categoryPill: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginRight: 8 },
  pillText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  
  modalTitle: { fontSize: 32, fontWeight: '800', color: colors.text, marginBottom: 24 },
  
  statGrid: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: colors.border },
  statBox: { flex: 1, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderLeftColor: colors.border, borderRightWidth: 1, borderRightColor: colors.border },
  statValue: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginTop: 6 },
  statLabel: { fontSize: 11, color: colors.textDim, textTransform: 'uppercase' },
  
  desc: { color: colors.textDim, fontSize: 15, lineHeight: 24, marginBottom: 30 },
  
  startBtn: { flexDirection: 'row', backgroundColor: colors.primary, borderRadius: 20, paddingVertical: 18, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 10 },
  startBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800', marginRight: 8, letterSpacing: 0.5 },
});

export default WorkoutScreen;