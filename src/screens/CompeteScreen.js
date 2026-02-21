import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  useColorScheme, TouchableOpacity, Image, ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import { PALETTE } from '../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

const CompeteScreen = ({ navigation }) => {
  const theme = useColorScheme() || 'dark';
  const colors = PALETTE[theme];
  const { userData, fetchLeaderboard } = useUser();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Leaderboard'); 
  const [filter, setFilter] = useState('Week'); 

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);
    const data = await fetchLeaderboard();
    setLeaderboard(data);
    setLoading(false);
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.topRow}>
        <Ionicons name="trophy-outline" size={28} color="#FFD60A" />
        <Text style={[styles.screenTitle, { color: colors.text }]}>Compete</Text>
      </View>
      <Text style={[styles.subtitle, { color: colors.textDim }]}>Challenge yourself and others</Text>

      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'Leaderboard' && styles.activeTabBtn]} 
          onPress={() => setActiveTab('Leaderboard')}
        >
          <Text style={[
            styles.tabText, 
            { color: colors.textDim },
            activeTab === 'Leaderboard' && { color: colors.text }
          ]}>
            Leaderboard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'Challenges' && styles.activeTabBtn]} 
          onPress={() => setActiveTab('Challenges')}
        >
          <Text style={[
            styles.tabText, 
            { color: colors.textDim }, 
            activeTab === 'Challenges' && { color: colors.text }
          ]}>
            Challenges
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPodium = () => {
    if (leaderboard.length < 3) return null;
    const [first, second, third] = leaderboard;

    const borderColor = theme === 'dark' ? '#333' : '#E5E5EA';

    return (
      <View style={styles.podiumContainer}>
        {/* 2nd Place */}
        <View style={[styles.podiumStep, { marginTop: 40 }]}>
          <View style={styles.avatarContainer}>
            {second.profileImage ? (
              <Image source={{ uri: second.profileImage }} style={[styles.podiumAvatar, { borderColor }]} />
            ) : (
              <View style={[styles.podiumAvatarPlaceholder, { backgroundColor: '#A0A0A0', borderColor }]}>
                <Text style={styles.avatarInitial}>{second.name[0]}</Text>
              </View>
            )}
            <View style={[styles.rankBadge, { backgroundColor: '#C0C0C0', borderColor }]}>
              <Text style={styles.rankText}>2</Text>
            </View>
          </View>
          <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>{second.name}</Text>
          <Text style={styles.podiumScore}>{second.steps.toLocaleString()}</Text>
        </View>

   
        <View style={styles.podiumStep}>
          <View style={[styles.avatarContainer, styles.firstPlaceContainer]}>
            {first.profileImage ? (
              <Image source={{ uri: first.profileImage }} style={[styles.podiumAvatarLarge, { borderColor: '#FFD700' }]} />
            ) : (
              <View style={[styles.podiumAvatarPlaceholderLarge, { backgroundColor: '#FFD700', borderColor }]}>
                <Text style={[styles.avatarInitialLarge, { color: '#000' }]}>{first.name[0]}</Text>
              </View>
            )}
            <View style={[styles.rankBadge, { backgroundColor: '#FFD700', borderColor, bottom: -5 }]}>
              <Ionicons name="trophy" size={12} color="#000" />
            </View>
          </View>
          <Text style={[styles.podiumNameLarge, { color: colors.text }]} numberOfLines={1}>{first.name}</Text>
          <Text style={styles.podiumScoreLarge}>{first.steps.toLocaleString()}</Text>
        </View>

    
        <View style={[styles.podiumStep, { marginTop: 40 }]}>
          <View style={styles.avatarContainer}>
            {third.profileImage ? (
              <Image source={{ uri: third.profileImage }} style={[styles.podiumAvatar, { borderColor }]} />
            ) : (
              <View style={[styles.podiumAvatarPlaceholder, { backgroundColor: '#CD7F32', borderColor }]}>
                <Text style={styles.avatarInitial}>{third.name[0]}</Text>
              </View>
            )}
            <View style={[styles.rankBadge, { backgroundColor: '#CD7F32', borderColor }]}>
              <Text style={styles.rankText}>3</Text>
            </View>
          </View>
          <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>{third.name}</Text>
          <Text style={styles.podiumScore}>{third.steps.toLocaleString()}</Text>
        </View>
      </View>
    );
  };

  const renderItem = ({ item, index }) => {
   
    if (index < 3) return null;
    const isMe = item.id === userData.id;

    return (
      <View style={[
        styles.listItem, 
        { 
          
          backgroundColor: isMe 
            ? (theme === 'dark' ? 'rgba(255, 59, 48, 0.15)' : '#FFE5E5') 
            : colors.surface,
          borderColor: isMe ? colors.primary : 'transparent',
          borderWidth: isMe ? 1 : 0
        }
      ]}>
        <Text style={[styles.listRank, { color: colors.textDim }]}>#{index + 1}</Text>
        
        {item.profileImage ? (
          <Image source={{ uri: item.profileImage }} style={styles.listAvatar} />
        ) : (
          <View style={[styles.listAvatarPlaceholder, { backgroundColor: colors.border }]}>
            <Text style={[styles.listInitial, { color: colors.text }]}>{item.name[0]}</Text>
          </View>
        )}

        <View style={styles.listInfo}>
          <Text style={[styles.listName, { color: colors.text }]}>{isMe ? 'You' : item.name}</Text>
          <Text style={[styles.listSteps, { color: colors.textDim }]}>{item.steps.toLocaleString()} steps</Text>
        </View>

        {isMe && <Ionicons name="bookmark" size={18} color={colors.primary} />}
      </View>
    );
  };

  if (activeTab === 'Challenges') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <View style={styles.emptyState}>
          <Ionicons name="rocket-outline" size={64} color={colors.textDim} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Events Coming Soon</Text>
          <Text style={styles.emptySub}>Join global challenges to earn badges.</Text>
        </View>
      </SafeAreaView>
    );
  }


  const inactiveChipBg = theme === 'dark' ? '#2C2C2E' : '#E5E5EA';
  const inactiveChipText = theme === 'dark' ? '#888' : '#666';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      
      {/* Time Filters */}
      <View style={styles.filterRow}>
        {['Week', 'Month', 'All Time'].map((f) => (
          <TouchableOpacity 
            key={f} 
            style={[
              styles.filterChip, 
              { backgroundColor: filter === f ? '#BB2D2D' : inactiveChipBg }
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={[
              styles.filterText, 
              { color: filter === f ? '#FFF' : inactiveChipText }
            ]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={item => item.id}
          ListHeaderComponent={renderPodium}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
          onRefresh={loadLeaderboard}
          refreshing={loading}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { paddingHorizontal: 20, paddingTop: 10, marginBottom: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  screenTitle: { fontSize: 28, fontWeight: 'bold', marginLeft: 10 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  
  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn: { paddingVertical: 10, marginRight: 20 },
  activeTabBtn: { borderBottomWidth: 2, borderBottomColor: '#FF3B30' },
  tabText: { fontSize: 16, fontWeight: '600' },

  filterRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, marginTop: 10 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, marginRight: 10 },
  filterText: { fontSize: 13, fontWeight: '600' },

  // Podium
  podiumContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', marginBottom: 30, marginTop: 10 },
  podiumStep: { alignItems: 'center', width: 90 },
  avatarContainer: { marginBottom: 10, position: 'relative' },
  podiumAvatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2 },
  podiumAvatarPlaceholder: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  avatarInitial: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  
  firstPlaceContainer: { transform: [{ scale: 1.2 }] },
  podiumAvatarLarge: { width: 80, height: 80, borderRadius: 40, borderWidth: 3 },
  podiumAvatarPlaceholderLarge: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 3 },
  avatarInitialLarge: { fontSize: 32, fontWeight: 'bold' },

  rankBadge: { position: 'absolute', bottom: -10, alignSelf: 'center', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  rankText: { fontSize: 10, fontWeight: 'bold', color: '#FFF' },
  
  podiumName: { fontSize: 12, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  podiumScore: { fontSize: 11, color: '#888', marginTop: 2 },
  podiumNameLarge: { fontSize: 14, fontWeight: 'bold', marginTop: 8, textAlign: 'center' },
  podiumScoreLarge: { fontSize: 12, color: '#FFD700', fontWeight: 'bold', marginTop: 2 },

  // List
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 10 },
  listRank: { width: 30, fontSize: 14, fontWeight: 'bold' },
  listAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  listAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  listInitial: { fontSize: 16, fontWeight: 'bold' },
  listInfo: { flex: 1 },
  listName: { fontSize: 16, fontWeight: '600' },
  listSteps: { fontSize: 13 },

  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#888', marginTop: 8 },
});

export default CompeteScreen;