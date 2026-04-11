type HapticsModule = typeof import("expo-haptics");

type ImpactStyle = "light" | "medium" | "heavy";
type NotificationType = "success" | "warning" | "error";

let cachedModule: HapticsModule | null | undefined;

const getHapticsModule = () => {
  if (cachedModule !== undefined) {
    return cachedModule;
  }

  try {
    cachedModule = require("expo-haptics") as HapticsModule;
  } catch (error) {
    console.log("expo-haptics unavailable", error);
    cachedModule = null;
  }

  return cachedModule;
};

const impactStyleMap: Record<ImpactStyle, keyof HapticsModule["ImpactFeedbackStyle"]> = {
  light: "Light",
  medium: "Medium",
  heavy: "Heavy",
};

const notificationTypeMap: Record<
  NotificationType,
  keyof HapticsModule["NotificationFeedbackType"]
> = {
  success: "Success",
  warning: "Warning",
  error: "Error",
};

export const triggerImpactAsync = async (style: ImpactStyle) => {
  const haptics = getHapticsModule();

  if (!haptics) {
    return;
  }

  await haptics.impactAsync(haptics.ImpactFeedbackStyle[impactStyleMap[style]]);
};

export const triggerNotificationAsync = async (type: NotificationType) => {
  const haptics = getHapticsModule();

  if (!haptics) {
    return;
  }

  await haptics.notificationAsync(
    haptics.NotificationFeedbackType[notificationTypeMap[type]],
  );
};
