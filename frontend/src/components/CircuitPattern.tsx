import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../theme/tokens';

interface CircuitPatternProps {
  width: number;
  height: number;
  opacity?: number;
}

// A handful of right-angled traces and via-dots, like a glimpse of a PCB.
// Purely decorative texture behind hero sections - kept very low opacity
// so it reads as atmosphere, not noise.
export default function CircuitPattern({ width, height, opacity = 0.08 }: CircuitPatternProps) {
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
      <Path
        d={`M0,${height * 0.2} L${width * 0.25},${height * 0.2} L${width * 0.25},${height * 0.05}`}
        stroke={colors.current}
        strokeWidth={1.5}
        fill="none"
        opacity={opacity}
      />
      <Path
        d={`M${width},${height * 0.35} L${width * 0.7},${height * 0.35} L${width * 0.7},${height * 0.6} L${width * 0.5},${height * 0.6}`}
        stroke={colors.copper}
        strokeWidth={1.5}
        fill="none"
        opacity={opacity}
      />
      <Path
        d={`M0,${height * 0.75} L${width * 0.18},${height * 0.75}`}
        stroke={colors.current}
        strokeWidth={1.5}
        fill="none"
        opacity={opacity}
      />
      <Circle cx={width * 0.25} cy={height * 0.05} r={3} fill={colors.current} opacity={opacity * 1.5} />
      <Circle cx={width * 0.5} cy={height * 0.6} r={3} fill={colors.copper} opacity={opacity * 1.5} />
      <Circle cx={width * 0.18} cy={height * 0.75} r={3} fill={colors.current} opacity={opacity * 1.5} />
    </Svg>
  );
}