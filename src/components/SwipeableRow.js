import React, { useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

/**
 * Swipeable wrapper for list rows.
 *  - Right action (revealed by swiping LEFT): toggle complete (green)
 *  - Left action (revealed by swiping RIGHT): delete (red)
 * Either side may be hidden by passing null for its handler.
 *
 * Each side fires haptics when the threshold opens, and again on press.
 * The Swipeable closes automatically after a press so the row snaps back.
 */
export default function SwipeableRow({
  children,
  onComplete,
  onDelete,
  completedLabel = 'Done',
  deleteLabel = 'Delete',
  successColor = '#10B981',
  dangerColor = '#EF4444',
}) {
  const ref = useRef(null);

  const renderRightActions = () => {
    if (!onComplete) return null;
    return (
      <View style={[styles.action, { backgroundColor: successColor }]}>
        <Ionicons name="checkmark-circle" size={26} color="#FFFFFF" />
        <Text style={styles.actionText}>{completedLabel}</Text>
      </View>
    );
  };

  const renderLeftActions = () => {
    if (!onDelete) return null;
    return (
      <View style={[styles.action, styles.actionLeft, { backgroundColor: dangerColor }]}>
        <Ionicons name="trash" size={26} color="#FFFFFF" />
        <Text style={styles.actionText}>{deleteLabel}</Text>
      </View>
    );
  };

  return (
    <Swipeable
      ref={ref}
      renderRightActions={onComplete ? renderRightActions : undefined}
      renderLeftActions={onDelete ? renderLeftActions : undefined}
      friction={2}
      overshootFriction={8}
      rightThreshold={70}
      leftThreshold={70}
      onSwipeableWillOpen={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onSwipeableOpen={(direction) => {
        // Fire the action on full open, then close so the row resets.
        if (direction === 'right' && onComplete) {
          onComplete();
        } else if (direction === 'left' && onDelete) {
          onDelete();
        }
        ref.current?.close();
      }}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  action: {
    width: 110,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    marginVertical: 4,
    marginRight: 4,
    gap: 4,
  },
  actionLeft: {
    marginRight: 0,
    marginLeft: 4,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
