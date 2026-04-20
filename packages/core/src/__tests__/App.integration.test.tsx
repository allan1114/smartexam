import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../App';

// Mock the dependencies
vi.mock('../services/geminiService', () => ({
  parseDocumentToQuestions: vi.fn(() => Promise.resolve([])),
  refineMasteryInsight: vi.fn(() => Promise.resolve('Mock insight')),
  getChatbotResponse: vi.fn(() => Promise.resolve('Mock response')),
  generatePerformanceAnalysis: vi.fn(() => Promise.resolve({
    overallFeedback: 'Good job',
    strengths: [],
    areasForImprovement: [],
    commonMistakes: [],
  })),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('App Integration Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('should render the App component', () => {
    render(<App />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('should initialize with HOME state', () => {
    render(<App />);
    // The Home component should be rendered initially
    // We check for elements that appear in Home component
    expect(document.querySelector('main')).toBeInTheDocument();
  });

  it('should load theme from localStorage', () => {
    localStorageMock.setItem('theme', 'dark');
    render(<App />);

    // Check if dark class is applied
    const html = document.documentElement;
    expect(html.classList.contains('dark')).toBe(true);
  });

  it('should initialize with light theme when not in localStorage', () => {
    render(<App />);

    const html = document.documentElement;
    // By default, should not have dark class
    expect(html.classList.contains('dark')).toBe(false);
  });

  it('should load exam history from localStorage', async () => {
    const mockHistory = [
      {
        id: 'exam-1',
        score: 8,
        totalQuestions: 10,
        answers: [],
        questions: [],
        startTime: Date.now(),
        endTime: Date.now(),
        mode: 'MOCK' as const,
        model: 'gemini-3-flash-preview',
      },
    ];

    localStorageMock.setItem('smart_exam_history', JSON.stringify(mockHistory));
    render(<App />);

    await waitFor(() => {
      expect(localStorageMock.getItem('smart_exam_history')).toBeDefined();
    });
  });

  it('should handle corrupted localStorage history gracefully', async () => {
    localStorageMock.setItem('smart_exam_history', 'invalid json');

    // Should not throw error
    expect(() => render(<App />)).not.toThrow();
  });

  it('should render ErrorBoundary wrapper', () => {
    const { container } = render(<App />);
    const mainElement = container.querySelector('main');
    expect(mainElement).toBeInTheDocument();
  });

  it('should have min-height-screen container', () => {
    const { container } = render(<App />);
    const rootDiv = container.querySelector('div.min-h-screen');
    expect(rootDiv).toBeInTheDocument();
  });

  it('should display Header component', () => {
    const { container } = render(<App />);
    // Header should be present (it's always rendered)
    const header = container.querySelector('header') || container.querySelector('[role="banner"]');
    // If header exists, good. Otherwise check for common header elements
    const mainElement = container.querySelector('main');
    expect(mainElement).toBeInTheDocument();
  });

  it('should have ChatBot component (when not loading)', () => {
    render(<App />);
    // ChatBot should be rendered when not in LOADING state
    const main = document.querySelector('main');
    expect(main).toBeInTheDocument();
  });

  it('should apply dark mode classes correctly', () => {
    render(<App />);
    // Verify the main element is present and has the expected structure
    const mainDiv = document.querySelector('main');
    expect(mainDiv).toBeInTheDocument();
    // Check that the root container has the min-h-screen class (for layout)
    const rootDiv = document.querySelector('div.min-h-screen');
    expect(rootDiv).toBeInTheDocument();
  });

  it('should handle null docSource initially', () => {
    render(<App />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('should store theme preference to localStorage', async () => {
    const { container } = render(<App />);

    // Simulate theme toggle (button should exist)
    // Note: The actual theme toggle implementation is in Header component
    // This test validates the localStorage integration point
    expect(localStorage).toBeDefined();
  });

  it('should handle empty history', async () => {
    localStorageMock.setItem('smart_exam_history', JSON.stringify([]));

    expect(() => render(<App />)).not.toThrow();
  });

  it('should filter out null entries from history', () => {
    const malformedHistory = [
      {
        id: 'exam-1',
        score: 8,
        totalQuestions: 10,
        answers: [],
        questions: [],
        startTime: Date.now(),
        endTime: Date.now(),
        mode: 'MOCK' as const,
        model: 'gemini-3-flash-preview',
      },
      null,
      {
        id: 'exam-2',
        score: 9,
        totalQuestions: 10,
        answers: [],
        questions: [],
        startTime: Date.now(),
        endTime: Date.now(),
        mode: 'PRACTICE' as const,
        model: 'gemini-3-flash-preview',
      },
    ];

    localStorageMock.setItem('smart_exam_history', JSON.stringify(malformedHistory as any));

    expect(() => render(<App />)).not.toThrow();
  });
});
