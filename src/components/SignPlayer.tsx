import React, { useState } from "react";
import {
  FlatList,
  Image,
  ListRenderItemInfo,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { ResizeMode, Video } from "expo-av";

import { useAppTheme } from "../theme";
import { SignAsset } from "../types";

interface SignPlayerProps {
  signs: SignAsset[];
}

interface SignCardProps {
  item: SignAsset;
  onPress: (sign: SignAsset) => void;
}

const SignCard = ({ item, onPress }: SignCardProps) => {
  const { colors } = useAppTheme();
  const isImage = item.type === "image";

  return (
    <Pressable
      accessibilityHint={
        isImage
          ? "Opens the sign image in full screen with zoom"
          : "Opens the sign media in full screen"
      }
      accessibilityRole="button"
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        pressed && styles.cardPressed,
      ]}
    >
      {item.type === "video" ? (
        <Video
          isLooping
          isMuted
          resizeMode={ResizeMode.COVER}
          shouldPlay
          source={{ uri: item.uri }}
          style={styles.media}
        />
      ) : (
        <Image
          resizeMode="cover"
          source={{ uri: item.thumbnailUri || item.uri }}
          style={styles.media}
        />
      )}

      <View style={styles.content}>
        <Text numberOfLines={2} style={[styles.label, { color: colors.text }]}>
          {item.label}
        </Text>
        <Text style={[styles.type, { color: colors.textMuted }]}>
          {item.type.toUpperCase()}
        </Text>
        <Text style={[styles.hintText, { color: colors.primary }]}>
          {isImage ? "Tap to enlarge and zoom" : "Tap to view full screen"}
        </Text>
      </View>
    </Pressable>
  );
};

interface SignPreviewModalProps {
  sign: SignAsset | null;
  visible: boolean;
  onClose: () => void;
}

const SignPreviewModal = ({
  sign,
  visible,
  onClose,
}: SignPreviewModalProps) => {
  const { colors } = useAppTheme();
  const { height, width } = useWindowDimensions();

  if (!sign) {
    return null;
  }

  const previewWidth = Math.min(width - 32, 920);
  const previewHeight = Math.min(height - 180, 720);
  const previewUri = sign.thumbnailUri || sign.uri;

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
        <View style={styles.modalHeader}>
          <View style={styles.modalTitleContainer}>
            <Text numberOfLines={1} style={[styles.modalTitle, { color: colors.white }]}>
              {sign.label}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              {sign.type === "image"
                ? "Pinch to zoom or drag to inspect details."
                : "Previewing the sign media in full screen."}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              { backgroundColor: colors.surface },
              pressed && styles.closeButtonPressed,
            ]}
          >
            <Text style={[styles.closeButtonText, { color: colors.text }]}>
              Close
            </Text>
          </Pressable>
        </View>

        <View style={styles.modalBody}>
          {sign.type === "image" ? (
            <View
              style={[
                styles.previewFrame,
                { backgroundColor: colors.surface },
              ]}
            >
              <ScrollView
                bounces={false}
                centerContent
                contentContainerStyle={styles.zoomContainer}
                maximumZoomScale={4}
                minimumZoomScale={1}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
              >
                <Image
                  resizeMode="contain"
                  source={{ uri: previewUri }}
                  style={[
                    styles.previewImage,
                    {
                      height: previewHeight,
                      width: previewWidth,
                    },
                  ]}
                />
              </ScrollView>
            </View>
          ) : (
            <Video
              isLooping
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              source={{ uri: sign.uri }}
              style={[
                styles.previewVideo,
                {
                  height: previewHeight,
                  width: previewWidth,
                },
              ]}
              useNativeControls
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

export const SignPlayer = ({ signs }: SignPlayerProps) => {
  const [selectedSign, setSelectedSign] = useState<SignAsset | null>(null);

  const renderItem = ({ item }: ListRenderItemInfo<SignAsset>) => {
    return <SignCard item={item} onPress={setSelectedSign} />;
  };

  return (
    <>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={signs}
        horizontal
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
      />

      <SignPreviewModal
        onClose={() => setSelectedSign(null)}
        sign={selectedSign}
        visible={selectedSign !== null}
      />
    </>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingRight: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 22,
    borderWidth: 1,
    marginRight: 14,
    overflow: "hidden",
    width: 212,
  },
  cardPressed: {
    opacity: 0.92,
  },
  media: {
    backgroundColor: "#CBD5E1",
    height: 168,
    width: "100%",
  },
  content: {
    padding: 14,
  },
  label: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "700",
  },
  type: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.1,
    marginTop: 8,
  },
  hintText: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
  },
  modalOverlay: {
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 56,
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalTitleContainer: {
    flex: 1,
    marginRight: 16,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  modalSubtitle: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  closeButtonPressed: {
    opacity: 0.84,
  },
  closeButtonText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
  },
  modalBody: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    marginTop: 16,
  },
  zoomContainer: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
  },
  previewFrame: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    justifyContent: "center",
    overflow: "hidden",
  },
  previewImage: {
    borderRadius: 22,
  },
  previewVideo: {
    borderRadius: 22,
  },
});
