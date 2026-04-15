import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Gemini API 代理端點 - 保護 API key
 *
 * 用途：
 * - 隱藏服務器端的 API key，避免暴露給客戶端
 * - 限制 API 使用量
 * - 審計 API 調用日誌
 *
 * 安全性：
 * - 只允許 POST 請求
 * - 驗證請求來源（可選）
 * - 記錄所有調用
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// 速率限制配置（簡單的內存式實現，生產環境應使用 Redis）
const rateLimitStore: Record<string, { count: number; resetTime: number }> = {};
const RATE_LIMIT = 100; // 每小時最多 100 個請求
const RATE_LIMIT_WINDOW = 3600 * 1000; // 1 小時

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const record = rateLimitStore[clientId];

  if (!record || now > record.resetTime) {
    rateLimitStore[clientId] = { count: 1, resetTime: now + RATE_LIMIT_WINDOW };
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export default async (req: VercelRequest, res: VercelResponse) => {
  // 只允許 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 檢查 API key 是否已設置
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // 獲取客戶端 ID（IP 地址或用戶 ID）
  const clientId = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
                   req.headers['x-real-ip'] as string ||
                   'unknown';

  // 檢查速率限制
  if (!checkRateLimit(clientId)) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.'
    });
  }

  try {
    const { model, contents, config } = req.body;

    // 驗證必需的欄位
    if (!model || !contents) {
      return res.status(400).json({
        error: 'Missing required fields: model, contents'
      });
    }

    // 限制模型選擇（可選的安全措施）
    const allowedModels = [
      'gemini-3-flash-preview',
      'gemini-pro',
      'gemini-pro-vision'
    ];

    if (!allowedModels.includes(model)) {
      return res.status(400).json({
        error: `Model '${model}' not allowed. Allowed models: ${allowedModels.join(', ')}`
      });
    }

    // 轉發請求到 Google Gemini API
    const response = await fetch(
      `${GEMINI_API_BASE}/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          ...(config && { generationConfig: config }),
        }),
      }
    );

    // 檢查響應狀態
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API error:', response.status, errorData);

      // 返回有意義的錯誤信息給客戶端
      if (response.status === 429) {
        return res.status(429).json({
          error: 'API_LIMIT',
          message: 'The server is busy. Please wait a few moments.'
        });
      }

      if (response.status === 400) {
        return res.status(400).json({
          error: 'INVALID_REQUEST',
          message: errorData.error?.message || 'Invalid request'
        });
      }

      return res.status(response.status).json({
        error: 'API_ERROR',
        message: 'Failed to process your request'
      });
    }

    const data = await response.json();

    // 記錄成功的請求（不記錄敏感信息）
    console.log(`✓ Gemini API call successful - Model: ${model}, Client: ${clientId}`);

    return res.status(200).json(data);

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'An unexpected error occurred'
    });
  }
};
