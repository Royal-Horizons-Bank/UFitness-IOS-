import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PALETTE } from '../constants/theme';

const TimelineItem = ({ item, isLast }) => {
  const theme = useColorScheme() || 'dark';
  const colors = PALETTE[theme];
  const styles = getStyles(theme, colors);

  return (
    <View style={styles.timelineRow}>
      
    
      <View style={styles.timeColumn}>
        <Text style={styles.timeText}>{item.startTime}</Text>
        <Text style={styles.timeTextSub}>{item.endTime}</Text>
      </View>

      <View style={styles.lineColumn}>
        <View style={[
          styles.dot, 
          { 
            backgroundColor: item.type === 'gap' ? 'transparent' : (item.color || colors.primary),
            borderColor: item.type === 'gap' ? colors.textDim : (item.color || colors.primary),
            borderWidth: item.type === 'gap' ? 2 : 0 
          }
        ]} />
        
        {!isLast && (
          <View style={[
            styles.line, 
            item.type === 'gap' && styles.dashedLine
          ]} />
        )}
      </View>

      
      <View style={styles.cardColumn}>
        {item.type === 'gap' ? (
         
          <TouchableOpacity style={styles.gapCard}>
            <View style={{flex: 1}}>
              <Text style={styles.gapTitle}>Free Time ({item.duration})</Text>
              <Text style={styles.gapSubtitle}>Perfect Window Found!</Text>
            </View>
            <Ionicons name="flash" size={14} color="#FFD60A" />
          </TouchableOpacity>
        ) : (
         
          <View style={[styles.classCard, { borderLeftColor: item.color || colors.primary }]}>
            <View>
              <Text style={styles.classTitle}>{item.title}</Text>
              <Text style={styles.classDuration}>
                 {item.type === 'workout' ? 'Workout' : 'Class'} • {item.duration}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const getStyles = (theme, colors) => StyleSheet.create({
  timelineRow: {
    flexDirection: 'row',
    minHeight: 70, 
  },
  timeColumn: {
    width: 65,
    alignItems: 'flex-end',
    paddingRight: 10,
    paddingTop: 2, 
  },
  timeText: {
    fontSize: 11, 
    fontWeight: '700',
    color: colors.text, 
  },
  timeTextSub: {
    fontSize: 9, 
    color: colors.textDim,
    marginTop: 2,
  },
  lineColumn: {
    width: 20,
    alignItems: 'center',
  },
  dot: {
    width: 8, 
    height: 8,
    borderRadius: 4,
    marginTop: 6, 
  },
  line: {
    width: 1, 
    flex: 1,
    backgroundColor: colors.border, 
    marginVertical: 4,
  },
  dashedLine: {
    borderStyle: 'dashed',
    borderWidth: 0.5,
    borderColor: colors.textDim,
    backgroundColor: 'transparent',
  },
  cardColumn: {
    flex: 1,
    paddingBottom: 12, 
  },
  
 
  classCard: {
    backgroundColor: colors.surface, 
    borderRadius: 8, 
    paddingVertical: 10, 
    paddingHorizontal: 12,
    borderLeftWidth: 3, 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    
    
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: theme === 'light' ? 0.05 : 0,
    shadowRadius: 2,
    borderWidth: theme === 'light' ? 1 : 0,
    borderColor: colors.border,
  },
  classTitle: {
    fontSize: 14, 
    fontWeight: '600',
    color: colors.text, 
    marginBottom: 2,
  },
  classDuration: {
    fontSize: 11,
    color: colors.textDim,
  },
 
  gapCard: {
    backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)', 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border, 
    borderStyle: 'dashed',
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gapTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text, 
  },
  gapSubtitle: {
    fontSize: 10,
    color: '#FFD60A', 
    marginTop: 1,
  },
});

export default TimelineItem;