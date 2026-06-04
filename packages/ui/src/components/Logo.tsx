import React from 'react'
import Svg, { Rect, Circle, Path, Text as SvgText } from 'react-native-svg'

export interface LogoProps {
  size?: number
  rounded?: boolean
}

export function Logo({ size = 60, rounded = true }: LogoProps) {
  const rx = rounded ? 1024 * 0.22 : 0

  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Rect width="1024" height="1024" rx={rx} fill="#D85A30" />
      <Circle cx="420" cy="410" r="240" fill="none" stroke="#FFFFFF" strokeWidth="40" />
      <SvgText
        x="420"
        y="505"
        textAnchor="middle"
        fontFamily="Arial Black, Arial, sans-serif"
        fontWeight="900"
        fontSize="240"
        fill="#FFFFFF"
      >
        S
      </SvgText>
      <Circle cx="618" cy="608" r="130" fill="#D85A30" />
      <Circle cx="618" cy="608" r="130" fill="none" stroke="#FFFFFF" strokeWidth="40" />
      <Path
        d="M526 526 A240 240 0 0 1 420 650"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="40"
        strokeLinecap="round"
      />
      <Circle cx="618" cy="608" r="52" fill="#D85A30" />
    </Svg>
  )
}
