export const WAVEFORM_BAR_COUNT = 18;

export const buildDefaultWaveformLevels = () =>
  Array.from({ length: WAVEFORM_BAR_COUNT }, () => 0.08);

export const normalizeMetering = (metering: number) => {
  const clampedMetering = Math.max(-60, Math.min(0, metering));

  return 0.08 + ((clampedMetering + 60) / 60) * 0.92;
};
