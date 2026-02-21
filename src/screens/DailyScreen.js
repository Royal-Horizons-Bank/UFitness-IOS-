import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView,
  useColorScheme, TouchableOpacity, FlatList, RefreshControl, AppState, Modal, TextInput, Alert, Platform, ActionSheetIOS
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker'; 
import * as Haptics from 'expo-haptics'; 
import { PALETTE } from '../constants/theme';
import { useUser } from '../context/UserContext'; 

const DAY_ITEM_WIDTH = 58;
const TIME_COL_WIDTH = 85; 
const LINE_COL_WIDTH = 20;

const getLocalISODate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const generateDates = (startDate, count, direction = 'forward') => {
  const dates = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(startDate);
    const offset = direction === 'forward' ? i : -i;
    d.setDate(d.getDate() + offset);
    if (i === 0 && direction === 'forward') continue; 

    const localIso = getLocalISODate(d);

    dates.push({
      id: localIso, 
      dateObj: d,
      day: d.getDate(),
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      fullDate: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      monthYear: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      iso: localIso, 
      isToday: getLocalISODate(d) === getLocalISODate(new Date()),
    });
  }
  return direction === 'backward' ? dates.reverse() : dates;
};

const DailyScreen = () => {
  const theme = useColorScheme() || 'dark';
  const colors = PALETTE[theme];
  const styles = getStyles(theme, colors);
  const flatListRef = useRef(null);
  const navigation = useNavigation();

  const { userData, refreshData, addCustomEvent, deleteCustomEvent } = useUser(); 
  const { schedule = [] } = userData || {};

  const lastTodayStr = useRef(getLocalISODate(new Date()));

  const [allDates, setAllDates] = useState(() => {
    const today = new Date();
    const pastStart = new Date(today);
    pastStart.setDate(today.getDate() - 30);
    return generateDates(pastStart, 400, 'forward');
  });

  const todayIndex = allDates.findIndex(d => d.isToday);
  const [selectedDate, setSelectedDate] = useState(allDates[todayIndex] || allDates[0]);
  const [headerMonth, setHeaderMonth] = useState(allDates[todayIndex]?.monthYear || "");
  const [refreshing, setRefreshing] = useState(false);

  // --- MODAL STATE ---
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1); 
    return d;
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // --- DELETE HANDLER ---
  const handleLongPressEvent = (item) => {
    // Only allow deletion for CUSTOM events (id starts with 'custom_')
    if (!item.type === 'custom' && !item.id.startsWith('custom_')) {
      return; 
    }

    // Trigger Haptic Feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Delete Event'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          userInterfaceStyle: theme,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await deleteCustomEvent(item.id);
          }
        }
      );
    } else {
      Alert.alert(
        "Delete Event?",
        `Are you sure you want to delete "${item.title}"?`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Delete", 
            style: "destructive", 
            onPress: async () => await deleteCustomEvent(item.id) 
          }
        ]
      );
    }
  };

  // --- MODAL HANDLERS ---
  const onStartChange = (event, date) => {
    if (Platform.OS === 'android') setShowStartPicker(false);
    if (date) {
      setStartTime(date);
      if (endTime <= date) {
        const newEnd = new Date(date);
        newEnd.setHours(newEnd.getHours() + 1);
        setEndTime(newEnd);
      }
    }
  };

  const onEndChange = (event, date) => {
    if (Platform.OS === 'android') setShowEndPicker(false);
    if (date) setEndTime(date);
  };

  const handleSaveEvent = async () => {
    if (!newTitle) {
      Alert.alert("Missing Title", "Please enter an event title.");
      return;
    }
    const startMins = startTime.getHours() * 60 + startTime.getMinutes();
    const endMins = endTime.getHours() * 60 + endTime.getMinutes();
    const duration = endMins - startMins;

    if (duration <= 0) {
      Alert.alert("Invalid Time", "End time must be after start time.");
      return;
    }

    const timeString = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`;

    const res = await addCustomEvent(newTitle, selectedDate.iso, timeString, duration);
    if (res.success) {
      setModalVisible(false);
      setNewTitle('');
      const now = new Date();
      setStartTime(now);
      const nextHour = new Date(now); nextHour.setHours(now.getHours() + 1);
      setEndTime(nextHour);
      Alert.alert("Success", "Event added to schedule.");
    } else {
      Alert.alert("Error", res.error);
    }
  };

  const checkDayChange = useCallback(() => {
    const currentStr = getLocalISODate(new Date());
    if (currentStr !== lastTodayStr.current) {
      lastTodayStr.current = currentStr;
      const newToday = new Date();
      const pastStart = new Date(newToday);
      pastStart.setDate(newToday.getDate() - 30);
      const newDates = generateDates(pastStart, 400, 'forward');
      setAllDates(newDates);
      const newTodayIndex = newDates.findIndex(d => d.isToday);
      if (newTodayIndex !== -1) {
        setSelectedDate(newDates[newTodayIndex]);
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index: newTodayIndex > 2 ? newTodayIndex - 2 : 0, animated: true });
        }, 100);
      }
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(checkDayChange, 60000);
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') checkDayChange();
    });
    return () => { clearInterval(interval); subscription.remove(); };
  }, [checkDayChange]);

  const jumpToToday = useCallback(() => {
    const currentTodayIndex = allDates.findIndex(d => d.isToday);
    const target = currentTodayIndex > 2 ? currentTodayIndex - 2 : 0;
    flatListRef.current?.scrollToIndex({ index: target, animated: true, viewPosition: 0 });
    setSelectedDate(allDates[currentTodayIndex]);
  }, [allDates]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData(); 
    checkDayChange(); 
    jumpToToday();      
    setRefreshing(false);
  }, [jumpToToday, refreshData, checkDayChange]);

  const todaysEvents = schedule.filter(event => {
    if (event.dateString && selectedDate.iso) return event.dateString === selectedDate.iso;
    return false;
  });

  const classesCount = todaysEvents.filter(e => e.type === 'class' || e.type === 'custom').length;
  const workoutsCount = todaysEvents.filter(e => e.type === 'workout').length; 
  const gapCount = todaysEvents.filter(e => e.type === 'gap').length;
  const totalCount = classesCount + workoutsCount + gapCount;

  const handleEndReached = () => {
    const lastDate = allDates[allDates.length - 1].dateObj;
    const newDates = generateDates(lastDate, 31, 'forward');
    setAllDates(prev => [...prev, ...newDates]);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setHeaderMonth(viewableItems[0].item.monthYear);
    }
  }).current;

  const scrollByWeek = (direction) => {
    let newIndex = 0; 
    const currentIndex = flatListRef.current?.props?.data?.findIndex(d => d.id === selectedDate.id) || 0;
    newIndex = direction === 'next' ? currentIndex + 7 : currentIndex - 7;
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= allDates.length) handleEndReached(); 
    flatListRef.current?.scrollToIndex({ index: newIndex, animated: true, viewPosition: 0 });
  };

  const renderDayItem = ({ item }) => {
    const isSelected = item.iso === selectedDate.iso;
    const isToday = item.isToday;
    return (
      <TouchableOpacity 
        style={[styles.dayItem, isSelected && styles.dayItemActive, !isSelected && isToday && styles.dayItemToday]}
        onPress={() => setSelectedDate(item)}
      >
        <Text style={[styles.dayLabel, isSelected && styles.dayTextActive]}>{item.label}</Text>
        <Text style={[styles.dayNumber, isSelected && styles.dayTextActive]}>{item.day}</Text>
        {isToday && !isSelected && <View style={styles.todayDot} />}
      </TouchableOpacity>
    );
  };

  const EventRow = ({ item, isLast }) => {
    const isGap = item.type === 'gap';
    // Only custom events are deletable
    const isDeletable = item.type === 'custom' || (item.id && item.id.startsWith('custom_'));

    return (
      <View style={styles.timelineRow}>
        <View style={styles.timeColumn}>
          <Text style={styles.timeTextMain}>{item.startTime}</Text>
          <Text style={styles.timeTextSub}>{item.endTime}</Text>
        </View>
        <View style={styles.lineColumn}>
           <View style={[styles.dot, { backgroundColor: isGap ? colors.textDim : (item.color || colors.primary) }]} />
           {!isLast && <View style={[styles.verticalLine, { backgroundColor: theme === 'dark' ? '#333' : '#E5E5EA' }]} />}
        </View>
        <View style={{ flex: 1 }}>
          {isGap ? (
            <TouchableOpacity 
              style={styles.gapCardContainer}
              onPress={() => navigation.navigate('Workout')}
              activeOpacity={0.8}
            >
               <View style={styles.gapHeaderRow}>
                  <Text style={styles.gapTitleText}>Free Time</Text>
                  <Text style={styles.gapDurationText}>{item.duration}</Text>
               </View>
               <View style={styles.gapBadge}>
                  <Ionicons name="flash" size={14} color="#FFD60A" style={{marginRight: 6}} />
                  <View>
                     <Text style={styles.gapBadgeTitle}>Perfect Window!</Text>
                     <Text style={styles.gapBadgeSub}>Try a Micro-Workout</Text>
                  </View>
               </View>
            </TouchableOpacity>
          ) : (
            // WRAP WITH LONG PRESS FOR DELETION
            <TouchableOpacity 
              activeOpacity={isDeletable ? 0.7 : 1}
              onLongPress={() => handleLongPressEvent(item)}
              style={styles.classCardContainer}
            >
               <View style={[styles.classColorBar, { backgroundColor: item.color || colors.primary }]} />
               <View style={styles.classContent}>
                 <Text style={styles.classTitle}>{item.title}</Text>
                 <Text style={styles.classSub}>Class • {item.duration}</Text>
               </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Daily Schedule</Text>
          <Text style={styles.pageSubtitle}>Plan your workouts around classes</Text>
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.monthHeader}>
            <TouchableOpacity style={styles.arrowButton} onPress={() => scrollByWeek('prev')}>
              <Ionicons name="chevron-back" size={18} color={colors.textDim} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.monthTitle}>{headerMonth}</Text>
              {!selectedDate.isToday && <TouchableOpacity onPress={jumpToToday}><Text style={styles.todayBtn}>Jump to Today</Text></TouchableOpacity>}
            </View>
            <TouchableOpacity style={styles.arrowButton} onPress={() => scrollByWeek('next')}>
              <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
            </TouchableOpacity>
          </View>

          <FlatList
            ref={flatListRef}
            data={allDates}
            renderItem={renderDayItem}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daysList}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            getItemLayout={(data, index) => ({ length: DAY_ITEM_WIDTH, offset: DAY_ITEM_WIDTH * index, index })}
            initialScrollIndex={todayIndex > 2 ? todayIndex - 2 : 0} 
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          />
        </View>

        <View style={styles.dateRow}>
          <Text style={styles.dateHeaderTitle}>{selectedDate.isToday ? "Today, " : ""}{selectedDate.fullDate}</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.contentArea}>
          {todaysEvents.length > 0 ? (
            todaysEvents.map((item, index) => (
              <EventRow key={item.id || index} item={item} isLast={index === todaysEvents.length - 1} />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={48} color={colors.textDim} />
              <Text style={styles.emptyTitle}>No events scheduled</Text>
              <Text style={styles.emptySubtitle}>Sync your calendar in Settings</Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{classesCount}</Text>
            <Text style={styles.statLabel}>Classes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{workoutsCount + gapCount}</Text>
            <Text style={styles.statLabel}>Opportunities</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#FFCC00' }]}>{totalCount}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* --- ADD EVENT MODAL (Start & End Time) --- */}
      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Event</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color={colors.textDim} />
              </TouchableOpacity>
            </View>
            
            <View style={{ width: '100%' }}>
              <Text style={styles.label}>Event Title</Text>
              <TextInput 
                style={styles.input} value={newTitle} onChangeText={setNewTitle} placeholder="e.g. Gym, Study, Meeting" placeholderTextColor="#666" 
              />
              
              <Text style={styles.label}>Start Time</Text>
              <TouchableOpacity style={styles.timeButton} onPress={() => setShowStartPicker(true)}>
                <Text style={styles.timeButtonText}>
                  {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Ionicons name="time-outline" size={20} color={colors.text} />
              </TouchableOpacity>
              {showStartPicker && (
                <DateTimePicker
                  value={startTime}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onStartChange}
                  themeVariant={theme} 
                />
              )}

              <Text style={styles.label}>End Time</Text>
              <TouchableOpacity style={styles.timeButton} onPress={() => setShowEndPicker(true)}>
                <Text style={styles.timeButtonText}>
                  {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Ionicons name="time-outline" size={20} color={colors.text} />
              </TouchableOpacity>
              {showEndPicker && (
                <DateTimePicker
                  value={endTime}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onEndChange}
                  themeVariant={theme} 
                />
              )}
              
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEvent}>
                <Text style={styles.saveText}>Add to Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const getStyles = (theme, colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { padding: 20, paddingTop: 10 },
  titleSection: { marginBottom: 20 },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: colors.textDim },
  
  calendarCard: { backgroundColor: colors.surface, borderRadius: 24, paddingVertical: 20, marginBottom: 24, borderWidth: theme === 'light' ? 1 : 0, borderColor: colors.border },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  monthTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  todayBtn: { color: colors.primary, fontSize: 12, fontWeight: '600', marginTop: 2 },
  arrowButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme === 'dark' ? '#2C2C2E' : colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: theme === 'light' ? 1 : 0, borderColor: colors.border },
  daysList: { paddingHorizontal: 10 },
  dayItem: { width: 50, height: 70, justifyContent: 'center', alignItems: 'center', borderRadius: 16, marginHorizontal: 4, backgroundColor: theme === 'light' ? '#F2F2F7' : '#2C2C2E' },
  dayItemActive: { backgroundColor: colors.primary },
  dayItemToday: { borderWidth: 1, borderColor: colors.primary },
  dayLabel: { fontSize: 12, color: colors.textDim, marginBottom: 4 },
  dayNumber: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  dayTextActive: { color: '#FFF' },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, position: 'absolute', bottom: 6 },

  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  dateHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  addButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  contentArea: { marginBottom: 24, paddingRight: 20 },

  timelineRow: { flexDirection: 'row', marginBottom: 16, width: '100%', minHeight: 60 }, 
  timeColumn: { width: TIME_COL_WIDTH, alignItems: 'flex-end', paddingRight: 12, paddingTop: 0 },
  timeTextMain: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 2 },
  timeTextSub: { fontSize: 11, color: colors.textDim },
  lineColumn: { alignItems: 'center', width: LINE_COL_WIDTH, marginRight: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, zIndex: 2 },
  verticalLine: { width: 2, flex: 1, marginTop: -2, borderRadius: 1 },

  gapCardContainer: {
    flex: 1, borderWidth: 1, borderColor: colors.textDim, borderStyle: 'dashed', borderRadius: 16, padding: 10,
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
  },
  gapHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  gapTitleText: { fontSize: 14, fontWeight: '600', color: colors.textDim },
  gapDurationText: { fontSize: 12, color: colors.textDim },
  gapBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#BB2D2D', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10 },
  gapBadgeTitle: { fontSize: 13, fontWeight: 'bold', color: '#FFF', marginBottom: 1 },
  gapBadgeSub: { fontSize: 10, color: 'rgba(255, 255, 255, 0.8)' },

  classCardContainer: {
    flex: 1, flexDirection: 'row', backgroundColor: theme === 'dark' ? '#1C1C1E' : colors.surface,
    borderRadius: 16, padding: 0, overflow: 'hidden', height: 50, marginRight: 12, 
  },
  classColorBar: { width: 6, height: '100%' },
  classContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 14 },
  classTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 }, 
  classSub: { fontSize: 11, color: colors.textDim },

  emptyCard: { backgroundColor: colors.surface, borderRadius: 20, height: 150, justifyContent: 'center', alignItems: 'center', borderWidth: theme === 'light' ? 1 : 0, borderColor: colors.border, opacity: 0.8 },
  emptyTitle: { fontSize: 16, color: colors.textDim, marginBottom: 4, marginTop: 10, fontWeight: '600' },
  emptySubtitle: { fontSize: 14, color: colors.textDim },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statCard: { width: '31%', aspectRatio: 1.3, backgroundColor: colors.surface, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: theme === 'light' ? 1 : 0, borderColor: colors.border },
  statNumber: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { fontSize: 12, color: colors.textDim },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: theme === 'dark' ? '#1C1C1E' : '#FFF', borderRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  label: { color: colors.textDim, marginBottom: 6, fontSize: 12, fontWeight: '600', marginTop: 10 },
  input: { backgroundColor: theme === 'dark' ? '#2C2C2E' : '#F2F2F7', color: colors.text, fontSize: 16, padding: 14, borderRadius: 12 },
  timeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme === 'dark' ? '#2C2C2E' : '#F2F2F7', padding: 14, borderRadius: 12 },
  timeButtonText: { fontSize: 16, color: colors.text, fontWeight: '500' },
  saveBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  saveText: { color: '#FFF', fontWeight: 'bold' },
});

export default DailyScreen;