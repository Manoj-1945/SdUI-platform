import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, fonts } from '../theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface PowerGaugeProps {
  watts: number;
  maxWatts?: number; // ring is "full" at this value - matches backend's high-usage alert threshold
  size?: number;
}

export default function PowerGauge({ watts, maxWatts = 5000, size = 220 }: PowerGaugeProps) {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = useSharedValue(0);

  useEffect(() => {
    const clamped = Math.max(0, Math.min(watts / maxWatts, 1));
    progress.value = withTiming(clamped, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [watts, maxWatts]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.copper} />
            <Stop offset="100%" stopColor={colors.signal} />
          </LinearGradient>
        </Defs>

        {/* Track (the dim full circle behind the progress arc) */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.circuitLight}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Live progress arc */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      <View style={styles.center}>
        <Text style={styles.value}>{Math.round(watts)}</Text>
        <Text style={styles.unit}>WATTS</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
  },
  value: {
    fontFamily: fonts.displayBold,
    fontSize: 44,
    color: colors.white,
  },
  unit: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 3,
    color: colors.mist,
    marginTop: 2,
  },
});