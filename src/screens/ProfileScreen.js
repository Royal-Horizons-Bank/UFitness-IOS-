import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, 
  useColorScheme, Alert, RefreshControl, ActivityIndicator, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import Svg, { Circle, G } from 'react-native-svg';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { PALETTE } from '../constants/theme';
import { useUser } from '../context/UserContext';

const { width } = Dimensions.get('window');

// --- HELPER COMPONENTS ---

const CircularProgress = ({ current, target, color, size = 80, theme }) => {
  const safeTarget = target || 1; 
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(current / safeTarget, 1);
  const strokeDashoffset = circumference * (1 - progress);
  const trackColor = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

  return (
    <View style={{ justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle stroke={trackColor} cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} fill="transparent" />
          <Circle stroke={color} cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" fill="transparent" />
        </G>
      </Svg>
      <View style={StyleSheet.absoluteFillObject} justifyContent="center" alignItems="center">
        <Text style={{ color: color, fontSize: 18, fontWeight: '800' }}>{Math.round(progress * 100)}%</Text>
      </View>
    </View>
  );
};

const QuickStat = ({ label, value, icon, color, library = "Ionicons", onPress, styles, colors }) => {
  const IconTag = library === "MaterialCommunityIcons" ? MaterialCommunityIcons : Ionicons;
  return (
    <TouchableOpacity style={[styles.miniCard, { backgroundColor: colors.surface }]} onPress={onPress}>
      <View style={[styles.miniIcon, { backgroundColor: color + '15' }]}>
        <IconTag name={icon} size={20} color={color} />
      </View>
      <View style={{flex: 1, marginLeft: 14}}>
        <Text style={[styles.miniValue, { color: colors.text }]}>{value}</Text>
        <Text style={styles.miniLabel}>{label}</Text>
      </View>
      <View style={styles.miniArrow}>
        <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
      </View>
    </TouchableOpacity>
  );
};

const BodyCard = ({ label, value, unit, icon, color, onPress, styles, colors }) => (
  <TouchableOpacity style={[styles.bodyCard, { backgroundColor: colors.surface }]} onPress={onPress}>
    <View style={styles.bodyHeader}>
      <View style={[styles.bodyIconBox, { backgroundColor: color + '15' }]}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>
      <Ionicons name="create-outline" size={16} color={colors.textDim} opacity={0.6} />
    </View>
    <View style={styles.bodyContent}>
      <Text style={[styles.bodyValue, { color: colors.text }]}>
        {value} <Text style={styles.bodyUnit}>{unit}</Text>
      </Text>
      <Text style={styles.bodyLabel}>{label}</Text>
    </View>
  </TouchableOpacity>
);

// --- MAIN SCREEN ---

const ProfileScreen = () => {
  const theme = useColorScheme() || 'dark';
  const colors = PALETTE[theme];
  const styles = getStyles(theme, colors);
  const navigation = useNavigation();
  
  const { userData, uploadProfileImage, refreshData, converters } = useUser();
  const { 
    name = 'Student', email = '', stats, profileImage, createdAt,
    weight, height, age 
  } = userData || {};
  
  const [refreshing, setRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const joinDate = createdAt ? new Date(createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown';

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert("Permission needed", "We need access to photos.");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8, 
    });
    if (!result.canceled) {
      setIsUploading(true);
      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri, [{ resize: { width: 400 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        await uploadProfileImage(manipResult.base64);
      } catch (e) { Alert.alert("Error", "Failed to upload image."); } finally { setIsUploading(false); }
    }
  };

  // --- Display Helpers to split Value and Unit ---
  const parseDisplay = (str) => {
    if (!str || str === '--') return { val: '--', unit: '' };
    // Splits "70 kg" into ["70", "kg"] or "5'10"" into ["5'10"", ""]
    const parts = str.match(/^([\d\.\,\'\"]+)\s*(.*)$/); 
    if (parts) return { val: parts[1], unit: parts[2] };
    return { val: str, unit: '' };
  };

  const wData = parseDisplay(converters.displayWeight(weight));
  const hData = parseDisplay(converters.displayHeight(height));
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        
        {/* TOP NAV */}
        <View style={styles.navRow}>
          <Text style={styles.screenTitle}>My Profile</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Settings')}
            style={[styles.iconBtn, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="settings-sharp" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* PROFILE IDENTITY */}
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={pickImage} disabled={isUploading} style={styles.avatarContainer}>
            {isUploading ? (
              <View style={[styles.avatar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : profileImage ? (
              <Image source={{ uri: profileImage }} style={[styles.avatar, { borderColor: colors.surface }]} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.avatarInitial, { color: colors.text }]}>{name ? name.charAt(0).toUpperCase() : 'U'}</Text>
              </View>
            )}
            <View style={[styles.editBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
              <Ionicons name="camera" size={12} color="#FFF" />
            </View>
          </TouchableOpacity>
          
          <Text style={[styles.userName, { color: colors.text }]}>{name}</Text>
          <Text style={styles.userEmail}>{email}</Text>
          
          <View style={styles.badgeRow}>
            {age ? (
              <View style={[styles.infoBadge, { backgroundColor: colors.surface, marginRight: 8 }]}>
                <Text style={[styles.badgeText, { color: colors.textDim }]}>{age} Years Old</Text>
              </View>
            ) : null}
            <View style={[styles.infoBadge, { backgroundColor: colors.surface }]}>
              <Text style={[styles.badgeText, { color: colors.textDim }]}>Joined {joinDate}</Text>
            </View>
          </View>
        </View>

        {/* HERO: WEEKLY GOAL */}
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.heroInfo}>
            <View style={styles.heroHeader}>
              <Text style={[styles.heroTitle, { color: colors.text }]}>Weekly Goal</Text>
              <View style={[styles.tag, {backgroundColor: colors.primary + '15'}]}>
                <Text style={[styles.tagText, {color: colors.primary}]}>TARGET</Text>
              </View>
            </View>
            <Text style={styles.heroSubtitle}>Workouts this week</Text>
            <View style={styles.goalStats}>
              <Text style={[styles.goalCurrent, { color: colors.primary }]}>{stats?.weeklyGoalCurrent || 0}</Text>
              <Text style={styles.goalTarget}>/ {stats?.weeklyGoalTarget || 5}</Text>
            </View>
          </View>
          <CircularProgress 
            current={stats?.weeklyGoalCurrent || 0} 
            target={stats?.weeklyGoalTarget || 5} 
            color={colors.primary} 
            size={76} 
            theme={theme} 
          />
        </View>

        {/* STREAKS */}
        <View style={styles.streakRow}>
          <View style={[styles.streakCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.streakIcon, { backgroundColor: '#FF950015' }]}>
              <Ionicons name="flame" size={20} color="#FF9500" />
            </View>
            <View style={{marginLeft: 10}}>
              <Text style={[styles.streakNum, { color: colors.text }]}>{stats?.streak || 0}</Text>
              <Text style={styles.streakTxt}>Current Streak</Text>
            </View>
          </View>
          <View style={{width: 12}} />
          <View style={[styles.streakCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.streakIcon, { backgroundColor: '#FFD60A15' }]}>
              <Ionicons name="trophy" size={20} color="#FFD60A" />
            </View>
            <View style={{marginLeft: 10}}>
              <Text style={[styles.streakNum, { color: colors.text }]}>{stats?.bestStreak || 0}</Text>
              <Text style={styles.streakTxt}>Best Record</Text>
            </View>
          </View>
        </View>

        {/* BODY MEASUREMENTS */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionHeader, { color: colors.text }]}>Body Measurements</Text>
          <View style={styles.bodyRow}>
            <BodyCard 
              label="Current Weight" 
              value={wData.val} unit={wData.unit}
              icon="scale-bathroom" color="#30D158" 
              colors={colors} styles={styles}
              onPress={() => navigation.navigate('BodyStats', { metric: 'weight', label: 'Weight History', color: '#30D158' })}
            />
            <View style={{width: 12}} />
            <BodyCard 
              label="Current Height" 
              value={hData.val} unit={hData.unit}
              icon="human-male-height" color="#BF5AF2" 
              colors={colors} styles={styles}
              onPress={() => navigation.navigate('BodyStats', { metric: 'height', label: 'Height History', color: '#BF5AF2' })}
            />
          </View>
        </View>

        {/* ACTIVITY HISTORY */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionHeader, { color: colors.text }]}>Activity History</Text>
          <View style={styles.statsList}>
            <QuickStat 
              label="Workouts Completed" 
              value={stats?.workoutsCompletedTotal || 0} 
              icon="dumbbell" color="#FF2D55" library="MaterialCommunityIcons"
              colors={colors} styles={styles}
              onPress={() => navigation.navigate('History', { metric: 'workouts', label: 'Workouts', color: '#FF2D55', unit: 'workouts' })}
            />
            <QuickStat 
              label="Total Steps" 
              value={(stats?.steps || 0).toLocaleString()} 
              icon="footsteps" color={colors.danger} 
              colors={colors} styles={styles}
              onPress={() => navigation.navigate('History', { metric: 'steps', label: 'Steps', color: colors.danger, unit: 'steps' })}
            />
            <QuickStat 
              label="Calories Burned" 
              value={converters.displayEnergy(stats?.caloriesBurnedTotal || 0)} 
              icon="fire" color="#FF9500" library="MaterialCommunityIcons"
              colors={colors} styles={styles}
              onPress={() => navigation.navigate('History', { metric: 'calories', label: 'Active Energy', color: '#FF9500' })}
            />
            <QuickStat 
              label="Active Minutes" 
              value={stats?.minutes || 0} 
              icon="timer-outline" color="#5856D6" 
              colors={colors} styles={styles}
              onPress={() => navigation.navigate('History', { metric: 'minutes', label: 'Active Minutes', color: '#5856D6', unit: 'mins' })}
            />
            <QuickStat 
              label="Hydration" 
              value={converters.displayVolume(stats?.hydrationCurrent || 0)} 
              icon="water" color="#0A84FF" library="MaterialCommunityIcons"
              colors={colors} styles={styles}
              onPress={() => navigation.navigate('History', { metric: 'hydration', label: 'Hydration', color: '#0A84FF' })}
            />
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const getStyles = (theme, colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 24 },
  
  // NAV
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  screenTitle: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  iconBtn: { padding: 10, borderRadius: 20 },

  // PROFILE HEADER
  profileHeader: { alignItems: 'center', marginBottom: 30 },
  avatarContainer: { position: 'relative', marginBottom: 15 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 4, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 36, fontWeight: '800' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, padding: 8, borderRadius: 20, borderWidth: 4 },
  userName: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  userEmail: { fontSize: 13, color: colors.textDim, marginBottom: 12 },
  
  badgeRow: { flexDirection: 'row', alignItems: 'center' },
  infoBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600' },

  // HERO CARD
  heroCard: { flexDirection: 'row', alignItems: 'center', padding: 22, borderRadius: 26, marginBottom: 24, borderWidth: 1, shadowColor: "#000", shadowOffset: {width:0, height:4}, shadowOpacity: 0.05, shadowRadius: 8 },
  heroInfo: { flex: 1 },
  heroHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  heroTitle: { fontSize: 18, fontWeight: '700' },
  tag: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, marginLeft: 8 },
  tagText: { fontSize: 10, fontWeight: '800' },
  heroSubtitle: { fontSize: 13, color: colors.textDim, marginBottom: 8 },
  goalStats: { flexDirection: 'row', alignItems: 'baseline' },
  goalCurrent: { fontSize: 28, fontWeight: '800' },
  goalTarget: { fontSize: 16, color: colors.textDim, fontWeight: '600', marginLeft: 2 },

  // STREAKS
  streakRow: { flexDirection: 'row', marginBottom: 30 },
  streakCard: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, paddingVertical: 16 },
  streakIcon: { padding: 8, borderRadius: 10 },
  streakNum: { fontSize: 18, fontWeight: '800' },
  streakTxt: { fontSize: 11, color: colors.textDim, fontWeight: '600' },

  // SECTIONS
  sectionContainer: { marginBottom: 30 },
  sectionHeader: { fontSize: 18, fontWeight: '700', marginBottom: 15 },
  
  // BODY CARDS
  bodyRow: { flexDirection: 'row' },
  bodyCard: { flex: 1, padding: 18, borderRadius: 22, height: 110, justifyContent: 'space-between' },
  bodyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bodyIconBox: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  bodyValue: { fontSize: 22, fontWeight: '800' },
  bodyUnit: { fontSize: 14, color: colors.textDim, fontWeight: '600' },
  bodyLabel: { fontSize: 11, color: colors.textDim, fontWeight: '700', textTransform: 'uppercase', marginTop: 4 },

  // ACTIVITY LIST
  statsList: { gap: 12 },
  miniCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20 },
  miniIcon: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  miniValue: { fontSize: 17, fontWeight: '700' },
  miniLabel: { fontSize: 13, color: colors.textDim, marginTop: 2 },
  miniArrow: { padding: 4 },
});

export default ProfileScreen;