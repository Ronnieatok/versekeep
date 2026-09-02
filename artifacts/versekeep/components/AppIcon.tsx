import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { T } from '../constants/theme';

type AppIconProps = {
  name: string;
  size?: number;
  color?: string;
};

export function AppIcon({ name, size = 20, color = T.creamDim }: AppIconProps) {
  return <Ionicons name={name as never} size={size} color={color} />;
}