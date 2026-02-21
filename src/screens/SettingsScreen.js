import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Switch, 
  useColorScheme, Modal, FlatList, TextInput, ScrollView, Alert, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import { PALETTE } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';

// --- CONSTANTS ---
const STEP_OPTIONS = [ 
  { label: 'Sedentary', value: 3000 }, 
  { label: 'Light Active', value: 5000 }, 
  { label: 'Moderate', value: 7500 }, 
  { label: 'Active', value: 10000 }, 
  { label: 'Very Active', value: 12500 }, 
  { label: 'Athlete', value: 20000 } 
];

const WATER_OPTIONS = [ 
  { label: 'Minimum', value: 1500 }, 
  { label: 'Standard', value: 2000 }, 
  { label: 'Recommended', value: 2500 }, 
  { label: 'High Active', value: 3000 }, 
  { label: 'Gallon Mode', value: 4000 } 
];

const UNIT_OPTIONS = {
  weight: [ { label: 'Kilograms (kg)', value: 'kg' }, { label: 'Pounds (lbs)', value: 'lbs' } ],
  height: [ { label: 'Centimeters (cm)', value: 'cm' }, { label: 'Feet & Inches (ft)', value: 'ft' } ],
  volume: [ { label: 'Milliliters (ml)', value: 'ml' }, { label: 'Ounces (oz)', value: 'oz' }, { label: 'Glasses (240ml)', value: 'glasses' } ],
  energy: [ { label: 'Calories (kcal)', value: 'kcal' }, { label: 'Kilojoules (kJ)', value: 'kJ' } ]
};

// --- COMPONENTS ---
const SettingRow = ({ icon, color, label, value, onPress, isLast, showChevron = true, theme, colors, styles }) => (
  <TouchableOpacity 
    style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]} 
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
    <View style={styles.rowRight}>
      {value && <Text style={styles.rowValue}>{value}</Text>}
      {showChevron && <Ionicons name="chevron-forward" size={16} color={colors.textDim} style={{marginLeft: 4}} />}
    </View>
  </TouchableOpacity>
);

const SectionHeader = ({ title, colors, styles }) => (
  <Text style={[styles.sectionHeader, { color: colors.textDim }]}>{title}</Text>
);

const SettingsScreen = () => {
  const navigation = useNavigation();
  const theme = useColorScheme() || 'dark';
  const colors = PALETTE[theme];
  const styles = getStyles(theme, colors);
  
  const { 
    userData, logout, syncDefaultCalendar, updateDailyGoals, 
    updatePreferences, updateName, updateUserPassword, resetProgress, updateDOB,
    converters // <--- IMPORTED FOR UNIT CONVERSION
  } = useUser();
  
  const { name, dob, stats, preferences } = userData || {};
  const units = preferences?.units || { weight: 'kg', height: 'cm', volume: 'ml', energy: 'kcal' };

  // --- STATE ---
  const [modalVisible, setModalVisible] = useState(false);
  const [editType, setEditType] = useState(null); 
  
  // Input State
  const [textInput, setTextInput] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');

  // --- ACTIONS ---
  const handleDeviceToggle = async (val) => {
    if (val) { 
      const success = await syncDefaultCalendar(); 
      updatePreferences({ isAutoSyncEnabled: success }); 
    } else { 
      updatePreferences({ isAutoSyncEnabled: false }); 
    }
  };

  const openModal = (type) => {
    setEditType(type);
    setTextInput('');
    setCurrentPass('');
    setNewPass('');
    
    if (type === 'dob' && dob) {
        const parts = dob.split('-'); 
        if (parts.length === 3) { 
          setDobYear(parts[0]); setDobMonth(parts[1]); setDobDay(parts[2]); 
        }
    } else if (type === 'dob') {
        setDobYear(''); setDobMonth(''); setDobDay('');
    }
    setModalVisible(true);
  };

  const handleSelectUnit = (type, value) => {
    const newUnits = { ...units, [type]: value };
    updatePreferences({ units: newUnits });
    setModalVisible(false);
  };

  const handleSelectGoal = (value) => {
    if (editType === 'steps') updateDailyGoals(value, null);
    if (editType === 'hydration') updateDailyGoals(null, value);
    setModalVisible(false);
  };

  const handleSaveText = async () => {
    if (editType === 'name' && textInput) await updateName(textInput);
    if (editType === 'dob') {
      if (!dobYear || !dobMonth || !dobDay) return;
      const dateStr = `${dobYear}-${dobMonth.padStart(2,'0')}-${dobDay.padStart(2,'0')}`;
      const age = new Date().getFullYear() - parseInt(dobYear);
      await updateDOB(dateStr, age);
    }
    if (editType === 'password') {
      if (currentPass && newPass) {
        const res = await updateUserPassword(currentPass, newPass);
        if (!res.success) Alert.alert("Error", res.error);
        else Alert.alert("Success", "Password updated");
      }
    }
    setModalVisible(false);
  };

  // --- MODAL RENDERER ---
  const renderModalContent = () => {
    // 1. UNITS LIST
    if (['weight', 'height', 'volume', 'energy'].includes(editType)) {
      return (
        <FlatList 
          data={UNIT_OPTIONS[editType]}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.optionItem} onPress={() => handleSelectUnit(editType, item.value)}>
              <Text style={styles.optionLabel}>{item.label}</Text>
              {units[editType] === item.value && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
            </TouchableOpacity>
          )}
        />
      );
    }
    // 2. GOALS LIST (UPDATED FOR UNIT CONVERSION)
    if (editType === 'steps' || editType === 'hydration') {
       return <FlatList 
         data={editType === 'steps' ? STEP_OPTIONS : WATER_OPTIONS} 
         keyExtractor={(item) => item.value.toString()}
         renderItem={({item}) => {
            // Determine display text based on type
            const displayText = editType === 'steps' 
              ? `${item.value.toLocaleString()} steps` 
              : converters.displayVolume(item.value); // <--- Auto-converts (e.g. 68 oz)

            return (
              <TouchableOpacity style={styles.optionItem} onPress={() => handleSelectGoal(item.value)}>
                  <View>
                    <Text style={styles.optionLabel}>{item.label}</Text>
                    <Text style={styles.optionSubLabel}>{displayText}</Text>
                  </View>
                  {(editType === 'steps' ? stats.stepGoal : stats.hydrationGoal) === item.value && 
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  }
              </TouchableOpacity>
            );
       }} />;
    }
    // 3. DOB INPUT
    if (editType === 'dob') {
        return (
            <View>
                <Text style={styles.modalSub}>MM / DD / YYYY</Text>
                <View style={{flexDirection:'row', gap:12, marginBottom:24}}>
                    <TextInput style={[styles.input, {flex:1, textAlign:'center'}]} placeholder="MM" value={dobMonth} onChangeText={setDobMonth} maxLength={2} keyboardType="numeric" placeholderTextColor={colors.textDim}/>
                    <TextInput style={[styles.input, {flex:1, textAlign:'center'}]} placeholder="DD" value={dobDay} onChangeText={setDobDay} maxLength={2} keyboardType="numeric" placeholderTextColor={colors.textDim}/>
                    <TextInput style={[styles.input, {flex:1.5, textAlign:'center'}]} placeholder="YYYY" value={dobYear} onChangeText={setDobYear} maxLength={4} keyboardType="numeric" placeholderTextColor={colors.textDim}/>
                </View>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveText}><Text style={styles.saveBtnText}>Save Date</Text></TouchableOpacity>
            </View>
        );
    }
    // 4. PASSWORD INPUT
    if (editType === 'password') {
        return (
            <View>
                <TextInput style={styles.input} placeholder="Current Password" value={currentPass} onChangeText={setCurrentPass} secureTextEntry placeholderTextColor={colors.textDim}/>
                <View style={{height:12}}/>
                <TextInput style={styles.input} placeholder="New Password" value={newPass} onChangeText={setNewPass} secureTextEntry placeholderTextColor={colors.textDim}/>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveText}><Text style={styles.saveBtnText}>Update Password</Text></TouchableOpacity>
            </View>
        );
    }
    // 5. NAME INPUT
    return (
        <View>
            <TextInput style={styles.input} placeholder="Enter Name" value={textInput} onChangeText={setTextInput} autoCapitalize="words" placeholderTextColor={colors.textDim}/>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveText}><Text style={styles.saveBtnText}>Save Changes</Text></TouchableOpacity>
        </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{width: 40}} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ACCOUNT GROUP */}
        <SectionHeader title="ACCOUNT" colors={colors} styles={styles} />
        <View style={styles.group}>
          <SettingRow icon="person" color="#007AFF" label="Name" value={name} onPress={() => openModal('name')} theme={theme} colors={colors} styles={styles} />
          <SettingRow icon="calendar" color="#FF9500" label="Birthday" value={dob || "Set Date"} onPress={() => openModal('dob')} theme={theme} colors={colors} styles={styles} />
          <SettingRow icon="lock-closed" color="#FF2D55" label="Password" value="••••••" onPress={() => openModal('password')} isLast theme={theme} colors={colors} styles={styles} />
        </View>

        {/* PREFERENCES GROUP */}
        <SectionHeader title="PREFERENCES" colors={colors} styles={styles} />
        <View style={styles.group}>
          {/* Custom Row for Switch */}
          <View style={styles.row}>
             <View style={[styles.iconContainer, { backgroundColor: '#34C75915' }]}>
                <Ionicons name="sync" size={20} color="#34C759" />
             </View>
             <View style={{ flex: 1 }}>
               <Text style={[styles.rowLabel, { color: colors.text }]}>Calendar Sync</Text>
               <Text style={styles.rowSubLabel}>Auto-import scheduled events</Text>
             </View>
             <Switch 
               value={preferences?.isAutoSyncEnabled} 
               onValueChange={handleDeviceToggle} 
               trackColor={{true: colors.primary}}
             />
          </View>
        </View>

        {/* GOALS GROUP */}
        <SectionHeader title="DAILY GOALS" colors={colors} styles={styles} />
        <View style={styles.group}>
          <SettingRow icon="walk" color="#5856D6" label="Step Goal" value={stats?.stepGoal?.toLocaleString()} onPress={() => openModal('steps')} theme={theme} colors={colors} styles={styles} />
          {/* UPDATED: Uses converter for Hydration Display */}
          <SettingRow 
             icon="water" 
             color="#0A84FF" 
             label="Hydration Goal" 
             value={converters.displayVolume(stats?.hydrationGoal)} 
             onPress={() => openModal('hydration')} 
             isLast 
             theme={theme} colors={colors} styles={styles} 
          />
        </View>

        {/* UNITS GROUP */}
        <SectionHeader title="UNITS OF MEASUREMENT" colors={colors} styles={styles} />
        <View style={styles.group}>
          <SettingRow icon="scale" color="#AF52DE" label="Weight" value={units.weight.toUpperCase()} onPress={() => openModal('weight')} theme={theme} colors={colors} styles={styles} />
          <SettingRow icon="resize" color="#FF3B30" label="Height" value={units.height.toUpperCase()} onPress={() => openModal('height')} theme={theme} colors={colors} styles={styles} />
          <SettingRow icon="flask" color="#00C7BE" label="Liquids" value={units.volume.toUpperCase()} onPress={() => openModal('volume')} theme={theme} colors={colors} styles={styles} />
          <SettingRow icon="flash" color="#FFCC00" label="Energy" value={units.energy.toUpperCase()} onPress={() => openModal('energy')} isLast theme={theme} colors={colors} styles={styles} />
        </View>

        {/* DANGER ZONE */}
        <SectionHeader title="DATA & PRIVACY" colors={colors} styles={styles} />
        <View style={styles.group}>
          <TouchableOpacity 
            style={styles.row} 
            onPress={() => Alert.alert("Reset Progress?", "This action cannot be undone.", [{ text: "Cancel", style: 'cancel' }, { text: "Reset", style: 'destructive', onPress: resetProgress }])}
          >
             <View style={[styles.iconContainer, { backgroundColor: '#FF3B3015' }]}>
                <Ionicons name="trash-bin" size={20} color="#FF3B30" />
             </View>
             <Text style={[styles.rowLabel, { color: '#FF3B30' }]}>Reset All Progress</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
        
        <Text style={styles.versionText}>v1.0.2 • UFitness</Text>
        <View style={{height: 40}} />

      </ScrollView>

      {/* GLOBAL MODAL */}
      <Modal transparent visible={modalVisible} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                      {['weight','height','volume','energy'].includes(editType) ? `Select ${editType}` : `Edit ${editType}`}
                    </Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                      <Ionicons name="close" size={20} color={colors.textDim} />
                    </TouchableOpacity>
                </View>
                {renderModalContent()}
            </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
};

const getStyles = (theme, colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },

  scrollContent: { padding: 20 },
  
  // Sections
  sectionHeader: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 12, marginTop: 24, letterSpacing: 0.5 },
  group: { backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' },
  
  // Rows
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.surface },
  iconContainer: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: '500' },
  rowSubLabel: { fontSize: 12, color: colors.textDim, marginTop: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center' },
  rowValue: { fontSize: 15, color: colors.textDim, marginRight: 4 },

  // Buttons
  logoutBtn: { marginTop: 30, backgroundColor: colors.surface, paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  logoutText: { color: '#FF3B30', fontSize: 16, fontWeight: '700' },
  versionText: { textAlign: 'center', color: colors.textDim, marginTop: 20, fontSize: 12 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: theme === 'dark' ? '#1C1C1E' : '#FFF', borderRadius: 24, padding: 24, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, textTransform: 'capitalize' },
  closeBtn: { padding: 4, backgroundColor: colors.background, borderRadius: 12 },
  modalSub: { fontSize: 13, color: colors.textDim, marginBottom: 12, textAlign: 'center' },

  // Modal Options
  optionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionLabel: { fontSize: 16, fontWeight: '500', color: colors.text },
  optionSubLabel: { fontSize: 12, color: colors.textDim },
  
  // Inputs
  input: { backgroundColor: colors.background, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});

export default SettingsScreen;