import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { 
  useSharedValue, 
  useAnimatedProps, 
  withTiming, 
  withDelay,
  Easing 
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const AnimatedCircularProgress = ({
  size = 120,
  strokeWidth = 10,
  progress = 0, 
  color = '#34C759',
  backgroundColor = '#E0E0E0',
  icon,
  label,
  subLabel
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressValue = useSharedValue(0);

  useEffect(() => {
    // Smoothly animate to the new progress value
    progressValue.value = withDelay(
      300, 
      withTiming(progress, { 
        duration: 1500, 
        easing: Easing.out(Easing.exp) 
      })
    );
  }, [progress]);

  const animatedProps = useAnimatedProps(() => {
    const clamped = Math.min(Math.max(progressValue.value, 0), 1);
    return {
      strokeDashoffset: circumference * (1 - clamped),
    };
  });

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={backgroundColor} strokeWidth={strokeWidth} fill="transparent"
        />
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={strokeWidth} fill="transparent"
          strokeDasharray={circumference}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
        {icon && <View style={{ marginBottom: 4 }}>{icon}</View>}
        {label && <Text style={{ fontSize: 22, fontWeight: 'bold', color: color }}>{label}</Text>}
        {subLabel && <Text style={{ fontSize: 10, color: '#888', fontWeight: '600' }}>{subLabel}</Text>}
      </View>
    </View>
  );
};

export default AnimatedCircularProgress;