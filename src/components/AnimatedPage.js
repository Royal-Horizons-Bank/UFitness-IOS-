import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const AnimatedPage = ({ children, style }) => {
  return (
    <Animated.View 
      style={[styles.container, style]}
      
      entering={FadeInDown.duration(600).springify().damping(12)}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AnimatedPage;