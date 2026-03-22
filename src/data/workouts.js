// src/data/workouts.js
export const WORKOUT_DATA = [
  {
    id: '1',
    title: 'Dorm Room Strength',
    duration: 15,
    calories: 120,
    type: 'Strength',
    image: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=400&h=300&fit=crop', // Real placeholder
    tags: [
      { text: 'No Equipment', color: '#2ecc71' }, // Green
      { text: 'Dorm Friendly', color: '#f1c40f' }, // Yellow
      { text: 'Small Space', color: '#3498db' }    // Blue
    ]
  },
  {
    id: '2',
    title: 'Morning Yoga Flow',
    duration: 10,
    calories: 80,
    type: 'Flexibility',
    image: 'https://images.unsplash.com/photo-1544367563-12123d896889?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    tags: [
      { text: 'Stress Relief', color: '#9b59b6' },
      { text: 'Morning', color: '#e67e22' }
    ]
  },
  {
    id: '3',
    title: 'HIIT Cardio Blast',
    duration: 20,
    calories: 250,
    type: 'Cardio',
    image: 'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    tags: [
      { text: 'High Intensity', color: '#e74c3c' },
      { text: 'No Jumping', color: '#3498db' }
    ]
  },
  {
    id: '4',
    title: 'Quick Core Burn',
    duration: 10,
    calories: 100,
    type: 'Core',
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    tags: [
      { text: 'Abs', color: '#e74c3c' },
      { text: '5 Mins', color: '#2ecc71' }
    ]
  }
];