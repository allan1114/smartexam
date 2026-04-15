/**
 * Gemini API 客户端工厂
 *
 * 支持两种模式：
 * 1. 直接模式：直接调用 Gemini API（开发模式）
 * 2. 代理模式：通过后端代理调用（生产模式 - 更安全）
 */

import { GoogleGenAI } from "@google/genai";
import { logger } from "../utils/logger";

export interface GeminiClientOptions {
  useProxy?: boolean;
  proxyUrl?: string;
}

export interface ProxyRequest {
  model: string;
  contents: any;
  config?: any;
}

/**
 * 通过后端代理调用 Gemini API
 * 优点：
 * - API key 不暴露给客户端
 * - 可以实施速率限制和审计
 * - 更安全的环境
 */
export async function callGeminiViaProxy(
  request: ProxyRequest,
  proxyUrl: string = '/api/proxy-gemini'
): Promise<any> {
  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `API error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    logger.error(
      'Proxy request failed',
      'geminiProxyClient.callGeminiViaProxy',
      error
    );
    throw error;
  }
}

/**
 * 创建 Gemini 客户端
 * 自动选择直接或代理模式
 */
export function createGeminiClient(options: GeminiClientOptions = {}) {
  const useProxy =
    options.useProxy ??
    (import.meta.env.MODE === 'production' ||
      import.meta.env.VITE_USE_GEMINI_PROXY === 'true');

  const proxyUrl = options.proxyUrl || import.meta.env.VITE_GEMINI_PROXY_URL || '/api/proxy-gemini';

  if (useProxy) {
    logger.info(
      'Using Gemini API proxy mode',
      'geminiProxyClient.createGeminiClient'
    );
    return {
      useProxy: true,
      proxyUrl,
      callApi: (request: ProxyRequest) => callGeminiViaProxy(request, proxyUrl),
    };
  } else {
    logger.info(
      'Using direct Gemini API mode',
      'geminiProxyClient.createGeminiClient'
    );
    return {
      useProxy: false,
      client: new GoogleGenAI({
        apiKey: import.meta.env.VITE_GEMINI_API_KEY,
      }),
    };
  }
}

/**
 * 获取 Gemini 客户端模式（用于调试/日志）
 */
export function getGeminiClientMode(): string {
  const useProxy =
    import.meta.env.MODE === 'production' ||
    import.meta.env.VITE_USE_GEMINI_PROXY === 'true';
  return useProxy ? 'PROXY' : 'DIRECT';
}
