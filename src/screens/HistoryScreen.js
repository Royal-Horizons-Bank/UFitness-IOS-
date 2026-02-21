import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, useColorScheme 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Line, Rect, G, Text as SvgText } from 'react-native-svg';
import { useUser } from '../context/UserContext';
import { PALETTE } from '../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const SCREEN_PADDING = 40; 
const AVAILABLE_WIDTH = width - SCREEN_PADDING; 
const CHART_HEIGHT = 220;

// --- DATE HELPERS ---
const getLocalISODate = (date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
};

const formatDateRange = (start, end, filter) => {
  const options = { month: 'short', day: 'numeric' };
  if (filter === 'Y') return `${start.getFullYear()}`;
  if (filter === 'D') return start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  if (filter === '6M') {
    return `${start.toLocaleDateString('en-US', { month: 'short' })} – ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  }
  return `${start.toLocaleDateString('en-US', options)} – ${end.toLocaleDateString('en-US', options)}`;
};

const formatSelectedDate = (item, filter) => {
  if (!item || !item.dateRef) return '';
  const d = item.dateRef;
  if (filter === 'D') return `${d.getHours()}:00 - ${d.getHours() + 1}:00`;
  if (filter === 'W') return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  if (filter === 'M') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (filter === '6M' || filter === 'Y') return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return '';
};

// --- HELPER COMPONENT ---
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
      { 
        color: active ? colors.text : colors.textDim, 
        fontWeight: active ? '700' : '500' 
      }
    ]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const HistoryScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  const theme = useColorScheme() || 'dark';
  const colors = PALETTE[theme];
  const styles = getStyles(theme, colors);

  // Default metric params, replaced by user prefs logic below
  const { metric, color, label } = route.params || { 
    metric: 'calories', color: '#FF9500', label: 'Calories'
  };
  
  const { userData } = useUser();
  const history = userData?.history || [];
  const preferences = userData?.preferences?.units || {};

  const [filter, setFilter] = useState('W'); // D, W, M, 6M, Y
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    setSelectedItem(null);
  }, [filter]);

  // --- UNIT LOGIC ---
  // Determine display unit and multiplier based on metric type
  const { displayUnit, multiplier, decimals } = useMemo(() => {
    if (metric === 'calories') {
        const u = preferences.energy || 'kcal';
        return { displayUnit: u, multiplier: u === 'kJ' ? 4.184 : 1, decimals: 0 };
    }
    if (metric === 'hydration') {
        const u = preferences.volume || 'ml';
        if (u === 'oz') return { displayUnit: 'oz', multiplier: 0.033814, decimals: 0 };
        if (u === 'glasses') return { displayUnit: 'glasses', multiplier: 1/240, decimals: 1 };
        return { displayUnit: 'ml', multiplier: 1, decimals: 0 };
    }
    // Default (steps, minutes, workouts)
    return { displayUnit: route.params.unit, multiplier: 1, decimals: 0 };
  }, [metric, preferences]);
  
  // --- DATA ENGINE ---
  const { chartData, rangeLabel, totalSum, average, trend, barConfig } = useMemo(() => {
    const now = new Date();
    let buckets = [];
    let rangeStart = new Date();
    let rangeEnd = new Date();
    let numPoints = 0;

    // --- 1. SETUP BUCKETS ---
    if (filter === 'D') {
      rangeStart.setHours(0,0,0,0);
      numPoints = 24;
      for (let i = 0; i < 24; i++) {
        const d = new Date(rangeStart);
        d.setHours(i);
        buckets.push({ key: i, label: i % 4 === 0 ? `${i}:00` : '', value: 0, dateRef: d });
      }
    } else if (filter === 'W') {
      const day = now.getDay(); 
      rangeStart.setDate(now.getDate() - day);
      rangeStart.setHours(0,0,0,0);
      rangeEnd = new Date(rangeStart);
      rangeEnd.setDate(rangeStart.getDate() + 6);
      numPoints = 7;
      for (let i = 0; i < 7; i++) {
        const d = new Date(rangeStart);
        d.setDate(rangeStart.getDate() + i);
        buckets.push({ 
          key: getLocalISODate(d), 
          label: d.toLocaleDateString('en-US', { weekday: 'narrow' }), 
          value: 0,
          dateRef: d,
          isToday: getLocalISODate(d) === getLocalISODate(now)
        });
      }
    } else if (filter === 'M') {
      rangeStart.setDate(1); 
      rangeStart.setHours(0,0,0,0);
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      rangeEnd = new Date(now.getFullYear(), now.getMonth(), daysInMonth);
      numPoints = daysInMonth;
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), i);
        buckets.push({ 
          key: getLocalISODate(d), 
          label: i % 5 === 0 ? i.toString() : '', 
          value: 0,
          dateRef: d,
          isToday: getLocalISODate(d) === getLocalISODate(now)
        });
      }
    } else if (filter === '6M') {
      numPoints = 6;
      rangeStart.setMonth(now.getMonth() - 5);
      rangeStart.setDate(1);
      rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); 
      for (let i = 0; i < 6; i++) {
        const d = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + i, 1);
        const k = `${d.getFullYear()}-${d.getMonth()}`;
        buckets.push({ 
          key: k, 
          label: d.toLocaleDateString('en-US', { month: 'narrow' }), 
          value: 0,
          dateRef: d,
          isCurrentMonth: (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear())
        });
      }
    } else if (filter === 'Y') {
      numPoints = 12;
      rangeStart = new Date(now.getFullYear(), 0, 1);
      rangeEnd = new Date(now.getFullYear(), 11, 31);
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), i, 1);
        const k = `${d.getFullYear()}-${d.getMonth()}`;
        buckets.push({ 
          key: k, 
          label: d.toLocaleDateString('en-US', { month: 'narrow' }), 
          value: 0,
          dateRef: d,
          isCurrentMonth: i === now.getMonth()
        });
      }
    }

    // --- 2. BAR SIZING ---
    let minBarWidth = 10;
    let minGap = 8;
    if (filter === 'W') { const slot = AVAILABLE_WIDTH / 7; minBarWidth = slot * 0.65; minGap = slot * 0.35; } 
    else if (filter === '6M') { const slot = AVAILABLE_WIDTH / 6; minBarWidth = slot * 0.60; minGap = slot * 0.40; }
    else if (filter === 'Y') { const slot = AVAILABLE_WIDTH / 12; minBarWidth = slot * 0.65; minGap = slot * 0.35; }
    else if (filter === 'M') { minBarWidth = 12; minGap = 10; }
    else if (filter === 'D') { minBarWidth = 10; minGap = 8; }

    const totalMinContentWidth = numPoints * (minBarWidth + minGap);
    let finalBarWidth = minBarWidth;
    let finalGap = minGap;
    if (totalMinContentWidth < AVAILABLE_WIDTH) {
      const slotWidth = AVAILABLE_WIDTH / numPoints;
      finalBarWidth = slotWidth * 0.65;
      finalGap = slotWidth * 0.35;
    }

    // --- 3. AGGREGATE DATA ---
    history.forEach(item => {
      if (!item.date) return;
      const itemDate = new Date(item.date);
      let val = 0;
      
      // Extract raw metric value
      if (metric === 'workouts' && item.type === 'workout') val = 1;
      if (metric === 'calories' && item.type === 'workout') val = Number(item.calories) || 0;
      if (metric === 'minutes' && item.type === 'workout') val = Number(item.duration) || 0;
      if (metric === 'steps' && item.type === 'steps') val = Number(item.count) || 0;
      if (metric === 'hydration' && (item.type === 'water' || item.type === 'hydration')) val = Number(item.amount) || 0;
      
      // Convert to preferred unit IMMEDIATELY before adding to bucket
      val = val * multiplier; 

      if (val === 0) return;

      if (filter === 'D') {
        if (getLocalISODate(itemDate) === getLocalISODate(now)) {
           const hour = itemDate.getHours();
           if (buckets[hour]) buckets[hour].value += val;
        }
      } else if (filter === 'W' || filter === 'M') {
         const k = getLocalISODate(itemDate);
         const b = buckets.find(x => x.key === k);
         if (b) b.value += val;
      } else if (filter === '6M' || filter === 'Y') {
         const k = `${itemDate.getFullYear()}-${itemDate.getMonth()}`;
         const b = buckets.find(x => x.key === k);
         if (b) b.value += val;
      }
    });

    // --- 4. LIVE DATA INJECTION ---
    if (metric === 'steps' || metric === 'hydration') {
      let currentVal = 0;
      if (metric === 'steps') currentVal = userData.stats?.steps || 0;
      if (metric === 'hydration') currentVal = userData.stats?.hydrationCurrent || 0;

      // Convert current value
      currentVal = currentVal * multiplier;

      if (currentVal > 0) {
        if (filter === 'D') {
           const currentHour = now.getHours();
           // Distribute accumulated steps/water roughly for today view? 
           // Simpler: Just ensure the current bucket has at least something if we are tracking accumulated daily totals.
           // However, history usually contains the logs. If 'hydration', it's logged. Steps is Pedometer.
           if (metric === 'steps') {
             // For daily steps, we might not have hourly breakdown in history, just total. 
             // We'll skip complex distribution for now to keep UI safe.
             if (buckets[currentHour]) buckets[currentHour].value = Math.max(buckets[currentHour].value, currentVal / 12); 
           }
        } else if (filter === 'W' || filter === 'M') {
           const todayKey = getLocalISODate(now);
           const b = buckets.find(x => x.key === todayKey);
           // Hydration is additive in history, so we rely on history aggregation above.
           // Steps is a running total in stats.steps vs history. 
           if (metric === 'steps' && b) b.value = Math.max(b.value, currentVal);
           if (metric === 'hydration' && b) b.value = Math.max(b.value, currentVal);
        } else if (filter === 'Y' || filter === '6M') {
           const k = `${now.getFullYear()}-${now.getMonth()}`;
           const b = buckets.find(x => x.key === k);
           if (metric === 'steps' && b) b.value = Math.max(b.value, currentVal);
           if (metric === 'hydration' && b) b.value = Math.max(b.value, currentVal);
        }
      }
    }

    const total = buckets.reduce((a, b) => a + b.value, 0);
    const avg = buckets.length > 0 ? (total / buckets.length) : 0;
    
    // Trend logic
    const mid = Math.floor(buckets.length / 2);
    const firstHalfAvg = buckets.slice(0, mid).reduce((a,b)=>a+b.value,0) / mid;
    const secondHalfAvg = buckets.slice(mid).reduce((a,b)=>a+b.value,0) / (buckets.length - mid);
    const trendDir = secondHalfAvg >= firstHalfAvg ? 'up' : 'down';
    const trendPct = firstHalfAvg > 0 ? Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100) : 0;

    return {
      chartData: buckets,
      rangeLabel: formatDateRange(rangeStart, rangeEnd, filter),
      totalSum: total,
      average: avg,
      trend: { dir: trendDir, pct: Math.abs(trendPct) },
      barConfig: { width: finalBarWidth, gap: finalGap }
    };
  }, [filter, history, metric, userData.stats, multiplier]);

  const maxVal = Math.max(...chartData.map(d => d.value)) || 10;
  
  const contentWidth = chartData.length * (barConfig.width + barConfig.gap);
  const finalChartWidth = Math.max(AVAILABLE_WIDTH, contentWidth); 
  const isScrollable = contentWidth > AVAILABLE_WIDTH;

  const handleBarPress = (item) => {
    if (selectedItem && selectedItem.key === item.key) {
      setSelectedItem(null);
    } else {
      setSelectedItem(item);
    }
  };

  const fmt = (num) => {
      if (!num && num !== 0) return '0';
      // If decimals > 0, use fixed, else integer
      if (decimals > 0) return num.toFixed(decimals);
      return Math.round(num).toLocaleString();
  };

  const displayLabel = selectedItem ? formatSelectedDate(selectedItem, filter) : rangeLabel;
  const displayValue = selectedItem ? fmt(selectedItem.value) : (filter === 'D' ? fmt(totalSum) : fmt(average));
  const displayUnitLabel = selectedItem ? displayUnit : (filter === 'D' ? `total ${displayUnit}` : `avg ${displayUnit}`);

  return (
    <SafeAreaView style={styles.container}>
      
      {/* HEADER */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={color} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.text }]}>{label}</Text>
        <View style={{ width: 28 }} /> 
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* FILTERS */}
        <View style={[styles.segmentContainer, { backgroundColor: colors.surface }]}>
          {['D', 'W', 'M', '6M', 'Y'].map((f) => (
            <FilterPill 
              key={f} label={f} active={filter === f} 
              colors={colors} styles={styles} onPress={() => setFilter(f)} 
            />
          ))}
        </View>

        {/* SUMMARY */}
        <View style={styles.summaryBlock}>
          <Text style={styles.rangeLabel}>{displayLabel}</Text>
          <Text style={[styles.averageBig, { color: colors.text }]}>
             {displayValue} <Text style={styles.unitSmall}>{displayUnitLabel}</Text>
          </Text>
        </View>

        {/* CHART */}
        <View style={styles.chartWrapper}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            scrollEnabled={isScrollable} 
            contentContainerStyle={{ paddingHorizontal: 0 }}
          >
            <Svg height={CHART_HEIGHT} width={finalChartWidth}>
              {/* Grid Lines */}
              {[0, 0.33, 0.66, 1].map((pos, i) => (
                <Line
                  key={i} x1="0" y1={pos * (CHART_HEIGHT - 30)} x2={finalChartWidth} y2={pos * (CHART_HEIGHT - 30)}
                  stroke={theme === 'dark' ? '#333' : '#E5E5EA'} strokeDasharray="4, 4" strokeWidth="1"
                />
              ))}

              {/* Bars */}
              {chartData.map((item, index) => {
                const barHeight = item.value > 0 
                  ? Math.max((item.value / maxVal) * (CHART_HEIGHT - 50), 6) 
                  : 0;
                
                let xPos;
                if (isScrollable) {
                  xPos = index * (barConfig.width + barConfig.gap);
                } else {
                  const totalBarBlock = chartData.length * (barConfig.width + barConfig.gap);
                  const startOffset = (finalChartWidth - totalBarBlock) / 2;
                  xPos = startOffset + (index * (barConfig.width + barConfig.gap));
                }

                const isSelected = selectedItem && selectedItem.key === item.key;
                const isDimmed = selectedItem && !isSelected;

                return (
                  <G key={index} onPress={() => handleBarPress(item)}>
                    <Rect
                       x={xPos - (barConfig.gap / 2)} y={0}
                       width={barConfig.width + barConfig.gap} height={CHART_HEIGHT}
                       fill="transparent"
                    />
                    
                    <Rect
                      x={xPos} y={CHART_HEIGHT - barHeight - 30}
                      width={barConfig.width} height={barHeight}
                      rx={barConfig.width / 4} 
                      fill={item.value > 0 ? color : (theme === 'dark' ? "#2C2C2E" : "#E5E5EA")} 
                      opacity={isDimmed ? 0.3 : (item.value > 0 ? 1 : 0.7)}
                    />

                    {item.label ? (
                      <SvgText
                        x={xPos + (barConfig.width / 2)} y={CHART_HEIGHT - 5}
                        fontSize="10" fill={isSelected ? color : colors.textDim}
                        textAnchor="middle" fontWeight={isSelected ? "bold" : "600"}
                      >
                        {item.label}
                      </SvgText>
                    ) : null}
                  </G>
                );
              })}
            </Svg>
          </ScrollView>
        </View>

        {/* TREND CARD */}
        <View style={styles.cardContainer}>
           <Text style={[styles.sectionTitle, { color: colors.text }]}>Trend</Text>
           <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
             <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
               <Text style={styles.cardLabel}>vs Previous Period</Text>
               <Text style={[styles.trendValue, { color: trend.dir === 'up' ? '#4CAF50' : '#FF3B30' }]}>
                 {trend.dir === 'up' ? '▲' : '▼'} {trend.pct}%
               </Text>
             </View>
             <View style={[styles.divider, { backgroundColor: colors.border }]} />
             <Text style={[styles.cardBody, { color: colors.text }]}>
                {trend.dir === 'up' 
                  ? `Your activity is trending up! Great consistency.` 
                  : `Your average is slightly lower. Consistency is key!`}
             </Text>
           </View>
        </View>

        {/* HIGHLIGHTS CARD */}
        <View style={styles.cardContainer}>
           <Text style={[styles.sectionTitle, { color: colors.text }]}>Highlights</Text>
           <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
             <View style={{flexDirection:'row', alignItems:'center', marginBottom:10}}>
                <Ionicons name="stats-chart" size={18} color={color} />
                <Text style={[styles.cardHeaderTitle, { color }]}>{label} Summary</Text>
             </View>
             <Text style={[styles.cardBody, { color: colors.text }]}>
               In {rangeLabel}, your total accumulation was <Text style={{fontWeight:'bold', color: colors.text}}>{fmt(totalSum)} {displayUnit}</Text>.
             </Text>
           </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const getStyles = (theme, colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  
  navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { padding: 4 },
  navTitle: { fontSize: 17, fontWeight: '600' },
  
  segmentContainer: { flexDirection: 'row', marginHorizontal: 20, borderRadius: 10, padding: 3, marginBottom: 20 },
  filterPill: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 8 },
  filterText: { fontSize: 13 },

  summaryBlock: { paddingHorizontal: 20, marginBottom: 10 },
  rangeLabel: { color: colors.textDim, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  averageBig: { fontSize: 28, fontWeight: '700' },
  unitSmall: { fontSize: 16, color: colors.textDim, fontWeight: '500' },

  chartWrapper: { height: CHART_HEIGHT, marginBottom: 30, paddingHorizontal: 20 },

  cardContainer: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 10 },
  infoCard: { borderRadius: 16, padding: 16 },
  
  cardLabel: { color: colors.textDim, fontSize: 14 },
  trendValue: { fontSize: 14, fontWeight: 'bold' },
  divider: { height: 1, marginVertical: 10 },
  cardBody: { fontSize: 15, lineHeight: 22 },
  cardHeaderTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginLeft: 6 },
});

export default HistoryScreen;