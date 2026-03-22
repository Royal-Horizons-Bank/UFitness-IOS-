const EXERCISES = [
  { id: 'e1', title: 'Silent Squats', category: 'lower', target: 'Glutes & Quads', type: 'reps', value: 20, instructions: 'Keep your chest up and push your hips back. Drive through your heels to stand. Keep the entire movement controlled and completely silent.' },
  { id: 'e2', title: 'Forearm Plank', category: 'core', target: 'Abs', type: 'time', value: 45, instructions: 'Rest your forearms on the floor or a sturdy desk. Keep your back completely straight and your core deeply engaged.' },
  { id: 'e3', title: 'Shadow Boxing', category: 'cardio', target: 'Full Body', type: 'time', value: 60, instructions: 'Stay light on your feet. Throw light, controlled punches into the air. Pivot your hips but do not jump heavily to avoid noise.' },
  { id: 'e4', title: 'Desk Push-ups', category: 'upper', target: 'Chest & Arms', type: 'reps', value: 15, instructions: 'Place your hands firmly on a sturdy desk or bed frame. Lower your chest to the edge and press forcefully back up.' },
  { id: 'e5', title: 'Bicycle Crunches', category: 'core', target: 'Obliques', type: 'time', value: 40, instructions: 'Lie flat on your back. Alternate bringing your elbow to the opposite knee smoothly without yanking your neck.' },
  { id: 'e6', title: 'Step Jacks', category: 'cardio', target: 'Full Body', type: 'time', value: 45, instructions: 'A silent alternative to jumping jacks. Step one foot out wide while raising your arms, then alternate sides rapidly.' },
  { id: 'e7', title: 'Wall Sit', category: 'lower', target: 'Quads', type: 'time', value: 60, instructions: 'Find a clear wall. Slide down until your knees are bent at exactly 90 degrees. Hold the position and breathe.' },
  { id: 'e8', title: 'Pike Push-ups', category: 'upper', target: 'Shoulders', type: 'reps', value: 12, instructions: 'Start in a downward dog position with your hips high. Lower the top of your head toward the floor between your hands.' },
  { id: 'e9', title: 'Glute Bridges', category: 'lower', target: 'Glutes', type: 'reps', value: 20, instructions: 'Lie on your back with knees bent and feet flat. Squeeze your glutes and lift your hips high toward the ceiling.' },
  { id: 'e10', title: 'High Knee Marches', category: 'cardio', target: 'Legs & Core', type: 'time', value: 60, instructions: 'March aggressively in place, bringing your knees up to your chest level. Step down softly to keep it silent.' },
  { id: 'e11', title: 'Bird Dog', category: 'core', target: 'Lower Back', type: 'reps', value: 16, instructions: 'Get on all fours. Extend your opposite arm and leg simultaneously. Hold for one second, then switch sides.' },
  { id: 'e12', title: 'Tricep Dips', category: 'upper', target: 'Triceps', type: 'reps', value: 15, instructions: 'Sit on the edge of a sturdy chair or bed. Walk your feet out and lower your hips toward the floor by bending your elbows.' },
  { id: 'e13', title: 'Dead Bugs', category: 'core', target: 'Deep Abs', type: 'time', value: 45, instructions: 'Lie on your back with arms extended up and knees bent. Lower the opposite arm and leg toward the floor slowly.' },
  { id: 'e14', title: 'Reverse Lunges', category: 'lower', target: 'Legs', type: 'reps', value: 16, instructions: 'Step backward smoothly into a lunge. Push off the back foot to return to the start. Keep your knee hovering just above the floor.' },
  { id: 'e15', title: 'Plank Shoulder Taps', category: 'core', target: 'Core & Shoulders', type: 'time', value: 40, instructions: 'From a high push-up position, lift one hand to tap your opposite shoulder. Keep your hips completely still.' }
];

export const WorkoutEngine = {
  generateDailyWorkouts: () => {
    const today = new Date();
    const seed = today.getFullYear() + today.getMonth() + today.getDate();

    const shuffle = (array) => {
      let currentIndex = array.length, randomIndex;
      const seededRandom = () => {
        let x = Math.sin(seed + currentIndex) * 10000;
        return x - Math.floor(x);
      };
      const arrCopy = [...array];
      while (currentIndex !== 0) {
        randomIndex = Math.floor(seededRandom() * currentIndex);
        currentIndex--;
        [arrCopy[currentIndex], arrCopy[randomIndex]] = [arrCopy[randomIndex], arrCopy[currentIndex]];
      }
      return arrCopy;
    };

    const cardio = EXERCISES.filter(e => e.category === 'cardio');
    const core = EXERCISES.filter(e => e.category === 'core');
    const upper = EXERCISES.filter(e => e.category === 'upper');
    const lower = EXERCISES.filter(e => e.category === 'lower');

    const routines = [];

    const hiitEx = shuffle([...cardio, ...lower, ...core]).slice(0, 4);
    routines.push({
      id: `w_hiit_${seed}`,
      title: "Dorm HIIT Burn",
      category: "HIIT",
      duration: "15 min",
      cal: "150",
      level: "Intermediate",
      smallSpace: true,
      image: "https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=800",
      tags: ["sweat", "silent"],
      exercises: hiitEx
    });

    const coreEx = shuffle([...core]).slice(0, 4);
    routines.push({
      id: `w_core_${seed}`,
      title: "Silent Desk Core",
      category: "Core",
      duration: "10 min",
      cal: "80",
      level: "All Levels",
      smallSpace: true,
      image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800",
      tags: ["abs", "mat"],
      exercises: coreEx
    });

    const strEx = shuffle([...upper, ...lower]).slice(0, 4);
    routines.push({
      id: `w_str_${seed}`,
      title: "Full Body Strength",
      category: "Strength",
      duration: "20 min",
      cal: "180",
      level: "Advanced",
      smallSpace: true,
      image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800",
      tags: ["muscle", "bodyweight"],
      exercises: strEx
    });

    const microEx = shuffle(EXERCISES).slice(0, 3);
    routines.push({
      id: `w_mic_${seed}`,
      title: "5-Min Study Break",
      category: "Micro",
      duration: "5 min",
      cal: "40",
      level: "Beginner",
      smallSpace: true,
      image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800",
      tags: ["quick", "energy"],
      exercises: microEx
    });

    const cardioEx = shuffle([...cardio]).slice(0, 3);
    routines.push({
      id: `w_car_${seed}`,
      title: "Endurance Builder",
      category: "Cardio",
      duration: "12 min",
      cal: "110",
      level: "Intermediate",
      smallSpace: true,
      image: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800",
      tags: ["heart", "stamina"],
      exercises: cardioEx
    });

    return routines;
  }
};