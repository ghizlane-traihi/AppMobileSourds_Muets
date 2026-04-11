export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  VoiceRecorder: undefined;
  SpeechToSign:
    | {
        initialMode?: "standard" | "live";
      }
    | undefined;
  SignToSpeech:
    | {
        initialMode?: "translate" | "practice";
      }
    | undefined;
  DemoSigns: undefined;
  Settings: undefined;
};

export type SignAssetType = "image" | "video";

export interface UploadAsset {
  uri: string;
  name: string;
  type: string;
}

export interface SignAsset {
  id: string;
  label: string;
  uri: string;
  type: SignAssetType;
  thumbnailUri?: string;
}

export interface SpeechToTextResponse {
  text: string;
  signs: SignAsset[];
  confidence?: number;
  feedbackTips?: string[];
  unclearWords?: string[];
}

export interface SignRecognitionResponse {
  text: string;
  audio_url: string;
  confidence?: number;
}

export interface TextToSpeechResponse {
  text?: string;
  audio_url: string;
}

export interface ApiErrorShape {
  message: string;
  status?: number;
  details?: string;
}

export interface AudioRecorderResult extends UploadAsset {
  durationMs: number;
}
