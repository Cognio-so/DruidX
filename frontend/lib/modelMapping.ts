/**
 * Model mapping between frontend format (underscore-separated) and backend format (OpenRouter model IDs)
 * 
 * Frontend uses: gemini_2_5_flash (for database storage and UI)
 * Backend expects: gemini-2.0-flash-exp (OpenRouter API model IDs)
 * Display shows: Gemini 2.5 Flash (user-friendly names)
 */

export interface ModelInfo {
  frontendValue: string;
  displayName: string;
  backendName: string;
}

export const MODEL_MAPPING: ModelInfo[] = [
  { frontendValue: "gemini_2_5_flash", displayName: "Gemini 2.5 Flash", backendName: "google/gemini-2.5-flash" },
  { frontendValue: "gemini_2_5_pro", displayName: "Gemini 2.5 Pro", backendName: "google/gemini-2.5-pro" },
  { frontendValue: "gemini_2_5_flash_lite", displayName: "Gemini 2.5 Flash-lite", backendName: "google/gemini-2.5-flash-lite" },
  { frontendValue: "gpt_4_1", displayName: "GPT 4.1", backendName: "openai/gpt-4.1" },
  { frontendValue: "gpt_5", displayName: "GPT 5", backendName: "openai/gpt-5" },
  { frontendValue: "gpt_5_thinking_high", displayName: "GPT 5 Thinking High", backendName: "openai/gpt-5-thinking-high" },
  { frontendValue: "gpt_5_mini", displayName: "GPT 5 mini", backendName: "openai/gpt-5-mini" },
  { frontendValue: "gpt_5_nano", displayName: "GPT 5 nano", backendName: "openai/gpt-5-nano" },
  { frontendValue: "gpt_4o", displayName: "GPT-4o", backendName: "openai/gpt-4o" },
  { frontendValue: "claude_sonnet_4_5", displayName: "Claude Sonnet 4.5", backendName: "claude-4.5-sonnet" },
  { frontendValue: "claude_opus_4_1", displayName: "Claude Opus 4.1", backendName: "claude-4.1-opus" },
  { frontendValue: "claude_haiku_3_5", displayName: "Claude Haiku 3.5", backendName: "claude-3.5-haiku" },
  { frontendValue: "grok_4_fast", displayName: "Grok 4 Fast", backendName: "grok-4-fast" },
  { frontendValue: "deepseek_v3_1", displayName: "DeepSeek V3.1", backendName: "deepseek-v3.1" },
  { frontendValue: "meta_llama_3_3_70b", displayName: "meta/llama 3.3 70b", backendName: "meta/llama-3.3-70b" },
  { frontendValue: "kimi_k2_0905", displayName: "Kimi K2 0905", backendName: "kimi-k2-0905" },
];

/**
 * Get model info by frontend value
 */
export function getModelByFrontendValue(frontendValue: string): ModelInfo | undefined {
  return MODEL_MAPPING.find(model => model.frontendValue === frontendValue);
}

/**
 * Get model info by backend name
 */
export function getModelByBackendName(backendName: string): ModelInfo | undefined {
  return MODEL_MAPPING.find(model => model.backendName === backendName);
}

/**
 * Convert frontend value to backend name
 */
export function frontendToBackend(frontendValue: string): string {
  const model = getModelByFrontendValue(frontendValue);
  return model ? model.backendName : frontendValue;
}

/**
 * Convert backend name to frontend value
 */
export function backendToFrontend(backendName: string): string {
  const model = getModelByBackendName(backendName);
  return model ? model.frontendValue : backendName;
}

/**
 * Get display name from frontend value
 */
export function getDisplayName(frontendValue: string): string {
  const model = getModelByFrontendValue(frontendValue);
  return model ? model.displayName : frontendValue;
}

/**
 * Get all models for frontend dropdown
 */
export function getModelsForFrontend() {
  return MODEL_MAPPING.map(model => ({
    name: model.displayName,
    value: model.frontendValue
  }));
}

/**
 * Get all backend model names
 */
export function getBackendModelNames(): string[] {
  return MODEL_MAPPING.map(model => model.backendName);
}
