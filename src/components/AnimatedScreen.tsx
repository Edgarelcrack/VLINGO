import React, { useCallback, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function AnimatedScreen({ children, style }: Props) {
  const translateY = useRef(new Animated.Value(10)).current;

  useFocusEffect(
    useCallback(() => {
      translateY.setValue(10);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }, [translateY]),
  );

  return (
    <Animated.View
      style={[
        { flex: 1, transform: [{ translateY }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
