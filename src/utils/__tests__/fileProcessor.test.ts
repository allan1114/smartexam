import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractGoogleDocId,
  generateUniqueId,
  shuffleArray,
  cleanJsonResponse,
  fileToBase64,
  readFileAsText,
} from '../fileProcessor';

describe('fileProcessor utilities', () => {
  describe('extractGoogleDocId', () => {
    it('should extract Google Doc ID from valid URL', () => {
      const url = 'https://docs.google.com/document/d/1ABC123XYZ/edit?usp=sharing';
      const result = extractGoogleDocId(url);
      expect(result).toBe('1ABC123XYZ');
    });

    it('should return null for invalid URL', () => {
      const result = extractGoogleDocId('https://example.com/document');
      expect(result).toBeNull();
    });

    it('should handle URL without /edit', () => {
      const url = 'https://docs.google.com/document/d/1ABC123XYZ';
      const result = extractGoogleDocId(url);
      expect(result).toBe('1ABC123XYZ');
    });

    it('should return null for empty string', () => {
      const result = extractGoogleDocId('');
      expect(result).toBeNull();
    });
  });

  describe('generateUniqueId', () => {
    it('should generate a non-empty string', () => {
      const id = generateUniqueId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should generate different IDs on successive calls', () => {
      const id1 = generateUniqueId();
      const id2 = generateUniqueId();
      expect(id1).not.toBe(id2);
    });

    it('should generate alphanumeric IDs', () => {
      const id = generateUniqueId();
      expect(/^[a-z0-9]+$/.test(id)).toBe(true);
    });
  });

  describe('shuffleArray', () => {
    it('should return array with same elements', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(arr);
      expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]);
    });

    it('should not mutate original array', () => {
      const arr = [1, 2, 3, 4, 5];
      const original = [...arr];
      shuffleArray(arr);
      expect(arr).toEqual(original);
    });

    it('should handle single element array', () => {
      const arr = [1];
      const shuffled = shuffleArray(arr);
      expect(shuffled).toEqual([1]);
    });

    it('should handle empty array', () => {
      const arr: number[] = [];
      const shuffled = shuffleArray(arr);
      expect(shuffled).toEqual([]);
    });

    it('should work with string arrays', () => {
      const arr = ['a', 'b', 'c'];
      const shuffled = shuffleArray(arr);
      expect(shuffled.sort()).toEqual(['a', 'b', 'c']);
    });
  });

  describe('cleanJsonResponse', () => {
    it('should remove markdown code blocks', () => {
      const text = '```json\n{"key": "value"}\n```';
      const result = cleanJsonResponse(text);
      expect(result).toBe('{"key": "value"}');
    });

    it('should handle plain JSON', () => {
      const text = '{"key": "value"}';
      const result = cleanJsonResponse(text);
      expect(result).toBe('{"key": "value"}');
    });

    it('should remove extra whitespace', () => {
      const text = '```\n  {"key": "value"}  \n```';
      const result = cleanJsonResponse(text);
      expect(result).toBe('{"key": "value"}');
    });

    it('should handle JSON with newlines', () => {
      const text = `{
        "key": "value",
        "number": 123
      }`;
      const result = cleanJsonResponse(text);
      expect(result).includes('"key"');
      expect(result).includes('"value"');
    });

    it('should handle multiline JSON in code block', () => {
      const text = `\`\`\`json
      {
        "items": [1, 2, 3],
        "name": "test"
      }
      \`\`\``;
      const result = cleanJsonResponse(text);
      expect(result).includes('"items"');
      expect(result).includes('"name"');
    });

    it('should handle empty input', () => {
      const result = cleanJsonResponse('');
      expect(result).toBe('');
    });
  });

  describe('fileToBase64', () => {
    it('should convert text file to base64', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const result = await fileToBase64(file);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return valid base64 string', async () => {
      const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
      const result = await fileToBase64(file);
      // Base64 should only contain valid characters
      expect(/^[A-Za-z0-9+/=]+$/.test(result)).toBe(true);
    });

    it('should handle different file types', async () => {
      const jsonFile = new File(['{"key":"value"}'], 'test.json', { type: 'application/json' });
      const pdfFile = new File(['PDF content'], 'test.pdf', { type: 'application/pdf' });

      const jsonBase64 = await fileToBase64(jsonFile);
      const pdfBase64 = await fileToBase64(pdfFile);

      expect(jsonBase64.length).toBeGreaterThan(0);
      expect(pdfBase64.length).toBeGreaterThan(0);
    });

    it('should handle empty file', async () => {
      const file = new File([], 'empty.txt', { type: 'text/plain' });
      const result = await fileToBase64(file);
      expect(typeof result).toBe('string');
    });
  });

  describe('readFileAsText', () => {
    it('should read text file content', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const result = await readFileAsText(file);
      expect(result).toBe('test content');
    });

    it('should handle multiline content', async () => {
      const content = 'line 1\nline 2\nline 3';
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      const result = await readFileAsText(file);
      expect(result).toBe(content);
    });

    it('should handle UTF-8 content', async () => {
      const content = 'Hello 世界 🌍';
      const file = new File([content], 'test.txt', { type: 'text/plain;charset=utf-8' });
      const result = await readFileAsText(file);
      expect(result).toBe(content);
    });

    it('should handle large text files', async () => {
      const content = 'a'.repeat(10000);
      const file = new File([content], 'large.txt', { type: 'text/plain' });
      const result = await readFileAsText(file);
      expect(result.length).toBe(10000);
      expect(result).toBe(content);
    });

    it('should handle JSON text content', async () => {
      const content = '{"key":"value"}';
      const file = new File([content], 'test.json', { type: 'application/json' });
      const result = await readFileAsText(file);
      expect(result).toBe(content);
    });

    it('should throw error on file read failure', async () => {
      const file = new File(['content'], 'test.txt');
      // Mock FileReader error
      const originalFileReader = global.FileReader;
      // @ts-ignore
      global.FileReader = class {
        readAsText() {
          setTimeout(() => {
            this.onerror?.(new Error('Read failed'));
          }, 0);
        }
      };

      try {
        await expect(readFileAsText(file)).rejects.toThrow();
      } finally {
        global.FileReader = originalFileReader;
      }
    });
  });
});
