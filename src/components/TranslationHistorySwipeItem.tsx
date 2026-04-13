import { Feather } from "@expo/vector-icons";
import React, { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
  Easing,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useAppTheme } from "../theme";

type TranslationHistorySwipeItemProps = {
  createdAtLabel: string;
  durationLabel: string;
  confidencePercent: number;
  isFavorite: boolean;
  onDelete: () => void;
  onOpen: () => void;
  onToggleFavorite: () => void;
  signCount: number;
  text: string;
};

type SwipeActionProps = {
  backgroundColor: string;
  direction: "left" | "right";
  icon: keyof typeof Feather.glyphMap;
  label: string;
  progress: SharedValue<number>;
  textColor: string;
};

const SwipeAction = ({
  backgroundColor,
  direction,
  icon,
  label,
  progress,
  textColor,
}: SwipeActionProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    const translateX =
      direction === "left"
        ? interpolate(progress.value, [0, 1], [24, 0])
        : interpolate(progress.value, [0, 1], [-24, 0]);

    return {
      opacity: progress.value,
      transform: [{ translateX }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.swipeAction,
        { backgroundColor },
        direction === "left" ? styles.swipeActionLeft : styles.swipeActionRight,
        animatedStyle,
      ]}
    >
      <Feather color={textColor} name={icon} size={18} />
      <Text style={[styles.swipeActionText, { color: textColor }]}>{label}</Text>
    </Animated.View>
  );
};

export const TranslationHistorySwipeItem = ({
  createdAtLabel,
  durationLabel,
  confidencePercent,
  isFavorite,
  onDelete,
  onOpen,
  onToggleFavorite,
  signCount,
  text,
}: TranslationHistorySwipeItemProps) => {
  const { colors, isDark } = useAppTheme();
  const swipeableRef = useRef<React.ElementRef<typeof Swipeable> | null>(null);
  const replayGlow = useSharedValue(0);
  const replayScale = useSharedValue(1);
  const replayRotate = useSharedValue(0);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    borderColor:
      replayGlow.value > 0.01 ? colors.primarySoft : colors.border,
    shadowOpacity: interpolate(replayGlow.value, [0, 1], [0, isDark ? 0 : 0.12]),
    transform: [{ scale: replayScale.value }],
  }));

  const replayBadgeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(replayGlow.value, [0, 1], [0.7, 1]),
    transform: [
      { scale: interpolate(replayGlow.value, [0, 1], [1, 1.05]) },
      { rotateZ: `${replayRotate.value}deg` },
    ],
  }));

  const handleReplay = () => {
    replayGlow.value = withSequence(
      withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 260, easing: Easing.inOut(Easing.quad) }),
    );
    replayScale.value = withSequence(
      withTiming(0.985, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(1.01, { duration: 160, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 180, easing: Easing.inOut(Easing.quad) }),
    );
    replayRotate.value = withSequence(
      withTiming(-7, { duration: 100, easing: Easing.out(Easing.quad) }),
      withTiming(7, { duration: 140, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: 140, easing: Easing.inOut(Easing.quad) }),
    );

    onOpen();
  };

  return (
    <Swipeable
      ref={swipeableRef}
      friction={1.8}
      leftThreshold={56}
      onSwipeableOpen={(direction) => {
        swipeableRef.current?.close();

        if (direction === "left") {
          onDelete();
          return;
        }

        onToggleFavorite();
      }}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={(progress) => (
        <SwipeAction
          backgroundColor={colors.warningSoft}
          direction="right"
          icon="star"
          label={isFavorite ? "Unfavorite" : "Favorite"}
          progress={progress}
          textColor={colors.warning}
        />
      )}
      renderRightActions={(progress) => (
        <SwipeAction
          backgroundColor={colors.dangerSoft}
          direction="left"
          icon="trash-2"
          label="Delete"
          progress={progress}
          textColor={colors.danger}
        />
      )}
    >
      <Animated.View
        style={[
          styles.cardWrap,
          {
            shadowColor: colors.shadow,
          },
          cardAnimatedStyle,
        ]}
      >
        <Pressable
          accessibilityHint="Replays this saved translation and restores its signs"
          accessibilityLabel={`Open saved translation ${text}`}
          accessibilityRole="button"
          onPress={handleReplay}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
            pressed && styles.cardPressed,
          ]}
        >
          <View style={styles.headerRow}>
            <View style={styles.copy}>
              <Text numberOfLines={2} style={[styles.title, { color: colors.text }]}>
                {text}
              </Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {createdAtLabel} · {confidencePercent}% accuracy
              </Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {signCount} sign{signCount > 1 ? "s" : ""} · {durationLabel}
              </Text>
            </View>

            {isFavorite ? (
              <View
                style={[
                  styles.favoriteBadge,
                  { backgroundColor: colors.warningSoft },
                ]}
              >
                <Text style={[styles.favoriteBadgeText, { color: colors.warning }]}>
                  Favorite
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.footerRow}>
            <Animated.View
              style={[
                styles.replayBadge,
                {
                  backgroundColor: colors.primarySofter,
                  borderColor: colors.primarySoft,
                },
                replayBadgeAnimatedStyle,
              ]}
            >
              <Feather color={colors.primary} name="rotate-ccw" size={14} />
              <Text style={[styles.replayBadgeText, { color: colors.primary }]}>
                Tap to replay
              </Text>
            </Animated.View>

            <Text style={[styles.swipeHint, { color: colors.textMuted }]}>
              Swipe right to favorite · Swipe left to delete
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  swipeAction: {
    alignItems: "center",
    borderRadius: 22,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginVertical: 6,
    minWidth: 118,
    paddingHorizontal: 18,
  },
  swipeActionLeft: {
    marginLeft: 10,
  },
  swipeActionRight: {
    marginRight: 10,
  },
  swipeActionText: {
    fontSize: 13,
    fontWeight: "800",
  },
  cardWrap: {
    borderRadius: 22,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowRadius: 18,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  cardPressed: {
    opacity: 0.94,
  },
  headerRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
  },
  meta: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  favoriteBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  favoriteBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  footerRow: {
    gap: 10,
    marginTop: 14,
  },
  replayBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  replayBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  swipeHint: {
    fontSize: 12,
    lineHeight: 18,
  },
});
