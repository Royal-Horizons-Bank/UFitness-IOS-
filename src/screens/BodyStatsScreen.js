import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Dimensions, KeyboardAvoidingView, 
  Platform, ScrollView, Alert, useColorScheme, TouchableWithoutFeedback, TextInput
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop, Text as SvgText, G, Rect } from 'react-native-svg';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { useUser } from '../context/UserContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PALETTE } from '../constants/theme';

const { width } = Dimensions.get('window');
const SCREEN_PADDING = 40; 
const AVAILABLE_WIDTH = width - SCREEN_PADDING; 
const CHART_HEIGHT = 220;
const CHART_PADDING_TOP = 20;
const CHART_PADDING_BOTTOM = 30;

const formatDateLabel = (date, filter) => {
  if (filter === 'D') return `${date.getHours()}:00`;
  if (filter === 'W') return date.toLocaleDateString('en-US', { weekday: 'narrow' });
  if (filter === 'M') return date.getDate().toString();
  if (filter === '6M' || filter === 'Y') return date.toLocaleDateString('en-US', { month: 'narrow' });
  return '';
};

const formatFullDate = (date) => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const FilterPill = ({ label, active, onPress, colors, styles }) => (
  <TouchableOpacity 
    style={[
      styles.filterPill, 
      { backgroundColor: active ? (colors.text === '#000000' ? '#E5E5EA' : '#3A3A3C') : 'transparent' } 
    ]} 
    onPress={onPress}
  >
    <Text style={[
      styles.filterText, 
      { color: active ? colors.text : colors.textDim, fontWeight: active ? '700' : '500' }
    ]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const BodyStatsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const theme = useColorScheme() || 'dark';
  const colors = PALETTE[theme];
  const styles = getStyles(theme, colors);

  const { userData, updateBodyStats } = useUser();
  const { metric, label, color } = route.params; 

  const units = userData.preferences?.units || { weight: 'kg', height: 'cm' };
  const displayUnit = metric === 'weight' ? units.weight : units.height;

  // State Management
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('6M');
  const [selectedPoint, setSelectedPoint] = useState(null);

  // Android Input State
  const [androidInputValue, setAndroidInputValue] = useState('');

  // iOS Picker Values
  const [tempWeight, setTempWeight] = useState('70');
  const [tempHeightCm, setTempHeightCm] = useState('170');
  const [tempHeightFt, setTempHeightFt] = useState('5');
  const [tempHeightIn, setTempHeightIn] = useState('7');

  useEffect(() => {
    if (userData) {
      if (metric === 'weight' && userData.weight) {
        const val = units.weight === 'lbs' ? Math.round(userData.weight * 2.20462) : Math.round(userData.weight);
        setTempWeight(val.toString());
      } else if (metric === 'height' && userData.height) {
        if (units.height === 'ft') {
          const totalInches = userData.height / 2.54;
          setTempHeightFt(Math.floor(totalInches / 12).toString());
          setTempHeightIn(Math.round(totalInches % 12).toString());
        } else {
          setTempHeightCm(Math.round(userData.height).toString());
        }
      }
    }
  }, [userData, metric, units.weight, units.height]);

  useEffect(() => setSelectedPoint(null), [filter]);

  const convertValue = (val) => {
    if (val === null || val === undefined) return 0;
    if (metric === 'weight' && displayUnit === 'lbs') return val * 2.20462;
    if (metric === 'height' && displayUnit === 'ft') return val / 30.48; 
    return val;
  };

  const { graphPoints, stats, chartConfig } = useMemo(() => {
    const history = userData?.history || [];
    const now = new Date();
    let cutoffDate = new Date();
    let gap = 50;

    if (filter === 'W') { cutoffDate.setDate(now.getDate() - 7); gap = AVAILABLE_WIDTH / 7; }
    else if (filter === 'M') { cutoffDate.setMonth(now.getMonth() - 1); gap = 40; }
    else if (filter === '6M') { cutoffDate.setMonth(now.getMonth() - 6); gap = 60; }
    else if (filter === 'Y') { cutoffDate.setFullYear(now.getFullYear() - 1); gap = 40; }

    let rawData = history
      .filter(item => item.type === metric)
      .map(item => ({
        value: convertValue(Number(item.value)), 
        date: new Date(item.date),
        timestamp: new Date(item.date).getTime()
      }))
      .filter(item => item.date >= cutoffDate)
      .sort((a, b) => a.timestamp - b.timestamp);

    const currentMetricVal = metric === 'weight' ? userData.weight : userData.height;
    if (currentMetricVal && (rawData.length === 0 || rawData[rawData.length - 1].timestamp < now.getTime() - 86400000)) {
       rawData.push({ value: convertValue(Number(currentMetricVal)), date: now, timestamp: now.getTime() });
    }

    const values = rawData.map(d => d.value);
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);
    
    if (minVal === maxVal) { minVal -= 5; maxVal += 5; }
    else {
        const spread = maxVal - minVal;
        minVal -= spread * 0.2; 
        maxVal += spread * 0.1; 
    }

    const points = rawData.map((d, i) => {
        const x = (i * gap) + (gap / 2); 
        const y = CHART_HEIGHT - CHART_PADDING_BOTTOM - ((d.value - minVal) / (maxVal - minVal)) * (CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM);
        return { x, y, value: d.value, date: d.date, label: formatDateLabel(d.date, filter) };
    });

    const latest = points.length > 0 ? points[points.length - 1].value : 0;
    const start = points.length > 0 ? points[0].value : 0;
    const change = latest - start;
    const best = metric === 'weight' ? Math.min(...values) : Math.max(...values); 

    return {
        graphPoints: points,
        stats: { latest, change, best },
        chartConfig: { width: Math.max(AVAILABLE_WIDTH, points.length * gap), gap }
    };
  }, [userData, metric, filter, displayUnit]);

  const linePath = useMemo(() => {
    if (graphPoints.length === 0) return '';
    return graphPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
  }, [graphPoints]);

  const handleUpdate = async () => {
    setLoading(true);
    let finalWeight = null;
    let finalHeight = null;

    if (Platform.OS === 'android') {
      const val = parseFloat(androidInputValue);
      if (isNaN(val)) {
        setLoading(false);
        return Alert.alert("Invalid Input", "Please enter a valid number.");
      }
      if (metric === 'weight') {
        finalWeight = units.weight === 'lbs' ? val * 0.453592 : val;
      } else {
        finalHeight = units.height === 'ft' ? val * 30.48 : val;
      }
    } else {
      // iOS Picker Logic
      if (metric === 'weight') {
        finalWeight = parseFloat(tempWeight);
        if (units.weight === 'lbs') finalWeight = finalWeight * 0.453592;
      } else {
        if (units.height === 'cm') {
          finalHeight = parseFloat(tempHeightCm);
        } else {
          const totalInches = (parseInt(tempHeightFt) * 12) + parseInt(tempHeightIn);
          finalHeight = totalInches * 2.54;
        }
      }
    }
    
    const res = await updateBodyStats(finalWeight, finalHeight);
    setLoading(false);
    setShowPicker(false);
    if (res.success) {
      setAndroidInputValue('');
      Alert.alert("Success", `${label} updated!`);
    } else {
      Alert.alert("Error", "Could not update.");
    }
  };

  const fmt = (val) => {
     if (metric === 'height' && displayUnit === 'ft') {
         const totalInches = val * 12;
         const f = Math.floor(totalInches / 12);
         const i = Math.round(totalInches % 12);
         return `${f}'${i}"`;
     }
     return val.toFixed(1);
  };

  const weightOptions = Array.from({ length: units.weight === 'kg' ? 221 : 441 }, (_, i) => String(i + (units.weight === 'kg' ? 30 : 60)));
  const cmOptions = Array.from({ length: 161 }, (_, i) => String(i + 90));
  const ftOptions = ['3', '4', '5', '6', '7', '8'];
  const inOptions = Array.from({ length: 12 }, (_, i) => String(i));

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={() => setShowPicker(false)}>
        <View style={{ flex: 1 }}>
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={28} color={color} />
            </TouchableOpacity>
            <Text style={[styles.navTitle, { color: colors.text }]}>{label}</Text>
            <View style={{ width: 28 }} /> 
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={[styles.segmentContainer, { backgroundColor: colors.surface }]}>
              {['W', 'M', '6M', 'Y'].map((f) => (
                <FilterPill key={f} label={f} active={filter === f} colors={colors} styles={styles} onPress={() => setFilter(f)} />
              ))}
            </View>

            <View style={styles.summaryBlock}>
              <Text style={styles.rangeLabel}>{selectedPoint ? "Recorded on" : "Latest Reading"} <Text style={{fontWeight:'400'}}>{selectedPoint ? formatFullDate(selectedPoint.date) : "Current"}</Text></Text>
              <Text style={[styles.averageBig, { color: colors.text }]}>
                {fmt(selectedPoint ? selectedPoint.value : stats.latest)} <Text style={styles.unitSmall}>{displayUnit}</Text>
              </Text>
            </View>

            <View style={styles.chartWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Svg height={CHART_HEIGHT} width={chartConfig.width}>
                  <Defs>
                    <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor={color} stopOpacity="0.5" /><Stop offset="1" stopColor={color} stopOpacity="0" />
                    </LinearGradient>
                  </Defs>
                  {[0, 0.33, 0.66, 1].map((pos, i) => (
                    <Line key={i} x1="0" y1={pos * (CHART_HEIGHT - 30)} x2={chartConfig.width} y2={pos * (CHART_HEIGHT - 30)} stroke={colors.border} strokeDasharray="4, 4" strokeWidth="1" />
                  ))}
                  <Path d={linePath} stroke={color} strokeWidth="3" fill="none" />
                  {graphPoints.length > 1 && (
                      <Path d={`${linePath} L ${graphPoints[graphPoints.length-1].x} ${CHART_HEIGHT} L ${graphPoints[0].x} ${CHART_HEIGHT} Z`} fill="url(#gradient)" />
                  )}
                  {graphPoints.map((p, i) => (
                    <G key={i} onPress={() => setSelectedPoint(p)}>
                      <Rect x={p.x - 15} y={0} width={30} height={CHART_HEIGHT} fill="transparent" />
                      <Circle cx={p.x} cy={p.y} r={selectedPoint === p ? 6 : 4} fill={colors.background} stroke={color} strokeWidth={selectedPoint === p ? 3 : 2} />
                      {p.label && (i % 2 === 0 || filter !== 'Y') && (
                        <SvgText x={p.x} y={CHART_HEIGHT - 5} fontSize="10" fill={colors.textDim} textAnchor="middle">{p.label}</SvgText>
                      )}
                    </G>
                  ))}
                </Svg>
              </ScrollView>
            </View>

            <View style={styles.cardContainer}>
              <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                  <View>
                    <Text style={styles.cardLabel}>Total Change</Text>
                    <Text style={[styles.cardBody, { color: colors.text, marginTop: 4 }]}>{Math.abs(stats.change).toFixed(1)} {displayUnit}</Text>
                  </View>
                  <View style={{alignItems: 'flex-end'}}>
                    <Text style={[styles.trendValue, { color: stats.change <= 0 ? (metric === 'weight' ? '#4CAF50' : '#FF3B30') : (metric === 'weight' ? '#FF3B30' : '#4CAF50') }]}>
                      {stats.change > 0 ? '+' : ''}{stats.change.toFixed(1)}
                    </Text>
                    <Text style={styles.cardLabelSmall}>since start of period</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* CONDITIONAL UPDATE UI BASED ON PLATFORM */}
            <View style={styles.cardContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Update {label}</Text>
              
              {Platform.OS === 'android' ? (
                // ANDROID: Original Text Input logic
                <View style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                   <TextInput 
                      style={[styles.input, { color: colors.text }]}
                      placeholder={`Enter new ${displayUnit} ${displayUnit === 'ft' ? '(e.g. 5.5)' : '...'}`}
                      placeholderTextColor={colors.textDim}
                      keyboardType="numeric"
                      value={androidInputValue}
                      onChangeText={setAndroidInputValue}
                   />
                   <Text style={styles.inputUnit}>{displayUnit}</Text>
                   <TouchableOpacity 
                     style={[styles.addBtn, { backgroundColor: color }]} 
                     onPress={handleUpdate}
                     disabled={loading || !androidInputValue}
                   >
                     {loading ? <MaterialCommunityIcons name="dots-horizontal" size={24} color="#FFF" /> : <Ionicons name="arrow-up" size={24} color="#FFF" />}
                   </TouchableOpacity>
                </View>
              ) : (
                // IOS: Native Picker card
                <TouchableOpacity 
                  style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setShowPicker(true)}
                >
                   <MaterialCommunityIcons name={metric === 'weight' ? "scale-bathroom" : "human-male-height"} size={24} color={color} style={{ marginRight: 15 }} />
                   <Text style={[styles.pickerValueText, { color: colors.text }]}>
                     {metric === 'weight' ? `${tempWeight} ${units.weight}` : (units.height === 'cm' ? `${tempHeightCm} cm` : `${tempHeightFt}'${tempHeightIn}"`)}
                   </Text>
                   <Ionicons name="chevron-down" size={20} color={colors.textDim} />
                </TouchableOpacity>
              )}
            </View>

          </ScrollView>
        </View>
      </TouchableWithoutFeedback>

      {/* IOS ONLY PICKER SHEET */}
      {Platform.OS === 'ios' && showPicker && (
        <View style={styles.pickerSheet}>
          <View style={styles.pickerToolbar}>
            <TouchableOpacity onPress={handleUpdate} disabled={loading}>
              <Text style={styles.pickerDoneBtn}>{loading ? "Saving..." : "Save"}</Text>
            </TouchableOpacity>
          </View>
          <View>
            {metric === 'weight' ? (
              <Picker selectedValue={tempWeight} onValueChange={(v) => setTempWeight(v)} itemStyle={{ color: colors.text }}>
                {weightOptions.map(val => <Picker.Item key={val} label={`${val} ${units.weight}`} value={val} />)}
              </Picker>
            ) : units.height === 'cm' ? (
              <Picker selectedValue={tempHeightCm} onValueChange={(v) => setTempHeightCm(v)} itemStyle={{ color: colors.text }}>
                {cmOptions.map(val => <Picker.Item key={val} label={`${val} cm`} value={val} />)}
              </Picker>
            ) : (
              <View style={{ flexDirection: 'row' }}>
                <Picker style={{ flex: 1 }} selectedValue={tempHeightFt} onValueChange={(v) => setTempHeightFt(v)} itemStyle={{ color: colors.text }}>
                  {ftOptions.map(val => <Picker.Item key={val} label={`${val} ft`} value={val} />)}
                </Picker>
                <Picker style={{ flex: 1 }} selectedValue={tempHeightIn} onValueChange={(v) => setTempHeightIn(v)} itemStyle={{ color: colors.text }}>
                  {inOptions.map(val => <Picker.Item key={val} label={`${val} in`} value={val} />)}
                </Picker>
              </View>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const getStyles = (theme, colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  navTitle: { fontSize: 17, fontWeight: '600' },
  segmentContainer: { flexDirection: 'row', marginHorizontal: 20, borderRadius: 10, padding: 3, marginBottom: 20 },
  filterPill: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 8 },
  filterText: { fontSize: 13 },
  summaryBlock: { paddingHorizontal: 20, marginBottom: 10 },
  rangeLabel: { color: colors.textDim, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  averageBig: { fontSize: 28, fontWeight: '700' },
  unitSmall: { fontSize: 16, color: colors.textDim, fontWeight: '500' },
  chartWrapper: { height: CHART_HEIGHT, marginBottom: 20, paddingHorizontal: 20 },
  cardContainer: { paddingHorizontal: 20, marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  infoCard: { borderRadius: 16, padding: 16 },
  cardLabel: { color: colors.textDim, fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  cardLabelSmall: { color: colors.textDim, fontSize: 11 },
  trendValue: { fontSize: 18, fontWeight: '800' },
  cardBody: { fontSize: 15, lineHeight: 22 },
  inputCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 16, height: 64, borderWidth: 1 },
  input: { flex: 1, fontSize: 18, fontWeight: '600', paddingVertical: 12 },
  inputUnit: { fontSize: 16, color: colors.textDim, marginRight: 15, fontWeight: '600' },
  addBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  pickerValueText: { flex: 1, fontSize: 18, fontWeight: '600' },
  pickerSheet: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: 30 },
  pickerToolbar: { flexDirection: 'row', justifyContent: 'flex-end', padding: 15, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background },
  pickerDoneBtn: { color: '#0A84FF', fontSize: 17, fontWeight: '700' },
});

export default BodyStatsScreen;