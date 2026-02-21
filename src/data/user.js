// src/data/user.js dummy
export const USER_PROFILE = {
  name: 'Riley',
  email: 'student@s.university.edu',
  avatar: 'https://scontent.fcrk4-2.fna.fbcdn.net/v/t39.30808-1/590226674_25396200133343759_1945875653089554874_n.jpg?stp=cp6_dst-jpg_s200x200_tt6&_nc_cat=109&ccb=1-7&_nc_sid=1d2534&_nc_eui2=AeHBjYAzUElGgycW9boEj4CfV2zvch7mVy1XbO9yHuZXLYihCHKY8Sp_IjJkYc3OQwAeIbc9GZSV-0SZcfA3yRXE&_nc_ohc=pnGf2g0XGK8Q7kNvwGmku4g&_nc_oc=AdnD2nBkx6DLNdS-pmtAlPCLEs9Cs4NKJeeP42yIQF2TdLOOpyU-2pkGafMfz4xF1ag&_nc_zt=24&_nc_ht=scontent.fcrk4-2.fna&_nc_gid=9Zwbizm_yPOJP0LB-hqFVw&oh=00_AfrJ4FEFfErX24EiynEAQNFktj6KwzNNX98KoHcJWW2z8A&oe=697CD0FA',
  stats: {
    streak: 7,
    bestStreak: 12,
    totalWorkouts: 15,
    minutes: 685,
    calories: 2150,
  },
  weeklyGoal: {
    current: 3,
    target: 5,
  },
  achievements: [
    { id: 1, icon: 'barbell', date: '8/12/2025', color: '#FF9500' }, // Orange
    { id: 2, icon: 'body', date: '1/15/2026', color: '#34C759' },    // Green (Dance/Move)
    { id: 3, icon: 'fitness', date: '8/9/2025', color: '#FF3B30' },  // Red (Muscle)
  ]
};