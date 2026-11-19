declare module "mespeak" {
  export interface MeSpeakOptions {
    rawdata?: "array" | "buffer" | "arraybuffer" | "base64" | "data-url";
    speed?: number;
    pitch?: number;
    amplitude?: number;
    wordgap?: number;
    voice?: string;
  }
  const meSpeak: {
    speak: (text: string, args?: MeSpeakOptions) => ArrayBuffer | number | null;
    loadConfig: (data: unknown) => void;
    loadVoice: (data: unknown) => void;
    isConfigLoaded: () => boolean;
    isVoiceLoaded: (voice: string) => boolean;
  };
  export default meSpeak;
}

declare module "mespeak/src/mespeak_config.json" {
  const config: unknown;
  export default config;
}

declare module "mespeak/voices/en/en-us.json" {
  const voice: unknown;
  export default voice;
}
