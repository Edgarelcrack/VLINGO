import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

function SkeletonBox({ width, height, style }: {
  width?: number | string;
  height?: number;
  style?: ViewStyle;
}) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1,   duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.box,
        { width: width as any, height: height ?? 16, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardRow}>
        <SkeletonBox width={44} height={44} style={{ borderRadius: 12 }} />
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonBox width="70%" height={14} style={{ borderRadius: 6 }} />
          <SkeletonBox width="45%" height={11} style={{ borderRadius: 6 }} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} style={{ marginBottom: 10 }} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  box:  { backgroundColor: '#D0D8E4', borderRadius: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 14,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
