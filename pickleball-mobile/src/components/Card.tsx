import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { COLORS } from '../theme/colors';

export const Card = ({ children, style, ...props }: ViewProps) => (
  <View style={[styles.card, style]} {...props}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20, // Bo góc lớn đặc trưng của MatchPoint
    padding: 20,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, // Đổ bóng cực êm
    shadowRadius: 12,
    elevation: 2,
  },
});
