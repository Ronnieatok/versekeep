import React, { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';

type ResponsiveContentProps = PropsWithChildren<{
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
}>;

export function ResponsiveContent({
  children,
  maxWidth = 760,
  style,
}: ResponsiveContentProps) {
  const { width } = useWindowDimensions();
  const horizontalPadding = width >= 1024 ? 32 : width >= 640 ? 24 : 20;

  return (
    <View
      style={[
        styles.content,
        { maxWidth, paddingHorizontal: horizontalPadding },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    alignSelf: 'center',
  },
});