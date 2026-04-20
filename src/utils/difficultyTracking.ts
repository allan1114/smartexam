import {
  QuestionPerformance,
  DifficultyLevel,
  DifficultyMetrics,
  UserPerformanceProfile,
  ExamResult,
  Question
} from '../types';
import { logger } from './logger';

const PERFORMANCE_STORAGE_PREFIX = 'smart_exam_performance_';
const MAX_PROFILES = 50; // Store performance for up to 50 different documents

/**
 * Calculate difficulty level based on success rate
 * EASY: >= 75% correct
 * MEDIUM: 50-74% correct
 * HARD: < 50% correct
 */
const calculateDifficultyLevel = (correctCount: number, totalAttempts: number): DifficultyLevel => {
  if (totalAttempts === 0) return 'MEDIUM';
  const successRate = (correctCount / totalAttempts) * 100;
  if (successRate >= 75) return 'EASY';
  if (successRate >= 50) return 'MEDIUM';
  return 'HARD';
};

/**
 * Create or update question performance record
 */
const updateQuestionPerformance = (
  current: QuestionPerformance | undefined,
  question: Question,
  isCorrect: boolean,
  isSkipped: boolean
): QuestionPerformance => {
  const now = Date.now();
  return {
    questionId: question.id,
    topic: question.topic,
    correctCount: (current?.correctCount || 0) + (isCorrect ? 1 : 0),
    totalAttempts: (current?.totalAttempts || 0) + 1,
    skippedCount: (current?.skippedCount || 0) + (isSkipped ? 1 : 0),
    lastAttemptDate: now,
    difficulty: 'MEDIUM' // Will be recalculated below
  };
};

/**
 * Finalize performance record with calculated difficulty
 */
const finalizePerformance = (perf: QuestionPerformance): QuestionPerformance => ({
  ...perf,
  difficulty: calculateDifficultyLevel(perf.correctCount, perf.totalAttempts)
});

/**
 * Build difficulty metrics from performance map
 */
export const buildDifficultyMetrics = (questionMetrics: Map<number, QuestionPerformance>): DifficultyMetrics => {
  const easy: QuestionPerformance[] = [];
  const medium: QuestionPerformance[] = [];
  const hard: QuestionPerformance[] = [];

  for (const perf of questionMetrics.values()) {
    if (perf.difficulty === 'EASY') easy.push(perf);
    else if (perf.difficulty === 'MEDIUM') medium.push(perf);
    else hard.push(perf);
  }

  return {
    easyQuestions: easy,
    mediumQuestions: medium,
    hardQuestions: hard
  };
};

/**
 * Load performance profile for a document
 */
export const loadPerformanceProfile = (documentHash: string): UserPerformanceProfile | null => {
  try {
    const key = PERFORMANCE_STORAGE_PREFIX + documentHash;
    const data = localStorage.getItem(key);
    if (!data) return null;

    const stored = JSON.parse(data);
    // Convert Map back from JSON
    const questionMetrics = new Map(Object.entries(stored.questionMetrics).map(([k, v]) => [Number(k), v]));

    return {
      documentHash: stored.documentHash,
      questionMetrics,
      totalAttempts: stored.totalAttempts,
      averageScore: stored.averageScore,
      lastUpdated: stored.lastUpdated,
      difficultyDistribution: stored.difficultyDistribution
    };
  } catch (e) {
    logger.warn(`Failed to load performance profile: ${documentHash}`, 'difficultyTracking.loadPerformanceProfile', e);
    return null;
  }
};

/**
 * Save performance profile to localStorage
 */
const savePerformanceProfile = (profile: UserPerformanceProfile): void => {
  try {
    const key = PERFORMANCE_STORAGE_PREFIX + profile.documentHash;
    // Convert Map to object for JSON serialization
    const serialized = {
      documentHash: profile.documentHash,
      questionMetrics: Object.fromEntries(profile.questionMetrics),
      totalAttempts: profile.totalAttempts,
      averageScore: profile.averageScore,
      lastUpdated: profile.lastUpdated,
      difficultyDistribution: profile.difficultyDistribution
    };
    localStorage.setItem(key, JSON.stringify(serialized));
    logger.info(`Performance profile saved: ${profile.documentHash}`, 'difficultyTracking.savePerformanceProfile');
  } catch (e) {
    logger.error(`Failed to save performance profile: ${profile.documentHash}`, 'difficultyTracking.savePerformanceProfile', e);
  }
};

/**
 * Update performance profile with exam results
 * Level 3: Track which questions user struggles with
 */
export const updatePerformanceProfile = (
  documentHash: string,
  examResult: ExamResult
): UserPerformanceProfile => {
  try {
    let profile = loadPerformanceProfile(documentHash);

    if (!profile) {
      // Create new profile
      profile = {
        documentHash,
        questionMetrics: new Map(),
        totalAttempts: 0,
        averageScore: 0,
        lastUpdated: Date.now(),
        difficultyDistribution: {
          easyQuestions: [],
          mediumQuestions: [],
          hardQuestions: []
        }
      };
    }

    // Update metrics with current exam results
    for (const answer of examResult.answers) {
      const question = examResult.questions.find(q => q.id === answer.questionId);
      if (!question) continue;

      const isSkipped = !answer.selectedOption; // Empty selection means skipped
      const current = profile.questionMetrics.get(answer.questionId);
      let updated = updateQuestionPerformance(current, question, answer.isCorrect, isSkipped);
      updated = finalizePerformance(updated);
      profile.questionMetrics.set(answer.questionId, updated);
    }

    // Recalculate aggregate metrics
    profile.totalAttempts += 1;
    profile.averageScore = (profile.averageScore * (profile.totalAttempts - 1) + examResult.score) / profile.totalAttempts;
    profile.lastUpdated = Date.now();
    profile.difficultyDistribution = buildDifficultyMetrics(profile.questionMetrics);

    savePerformanceProfile(profile);
    logger.info(`Performance profile updated for document: ${documentHash}`, 'difficultyTracking.updatePerformanceProfile');
    return profile;
  } catch (e) {
    logger.error(`Failed to update performance profile: ${documentHash}`, 'difficultyTracking.updatePerformanceProfile', e);
    throw new Error('PROFILE_UPDATE_FAILED: Could not update performance profile');
  }
};

/**
 * Get questions sorted by difficulty level (hardest first)
 * Level 3: For smart retakes - prioritize struggling questions
 */
export const getQuestionsByDifficulty = (
  profile: UserPerformanceProfile,
  allQuestions: Question[]
): { hard: Question[]; medium: Question[]; easy: Question[] } => {
  const result = { hard: [] as Question[], medium: [] as Question[], easy: [] as Question[] };

  const metricsMap = profile.difficultyDistribution;

  // Group questions by difficulty
  const hardIds = new Set(metricsMap.hardQuestions.map(q => q.questionId));
  const mediumIds = new Set(metricsMap.mediumQuestions.map(q => q.questionId));
  const easyIds = new Set(metricsMap.easyQuestions.map(q => q.questionId));

  for (const question of allQuestions) {
    if (hardIds.has(question.id)) result.hard.push(question);
    else if (mediumIds.has(question.id)) result.medium.push(question);
    else if (easyIds.has(question.id)) result.easy.push(question);
    else {
      // First attempt - treat as medium
      result.medium.push(question);
    }
  }

  return result;
};

/**
 * Create smart retake question order
 * Level 3: Prioritize hard questions (< 50%), then medium, then easy
 * This helps users focus on their weak areas
 */
export const createSmartRetakeOrder = (
  profile: UserPerformanceProfile,
  allQuestions: Question[],
  maxQuestions?: number
): Question[] => {
  const { hard, medium, easy } = getQuestionsByDifficulty(profile, allQuestions);

  // Prioritize hard, then medium, then easy
  let ordered = [...hard, ...medium, ...easy];

  // If maxQuestions specified, limit and ensure mixed difficulty
  if (maxQuestions && ordered.length > maxQuestions) {
    // Take some from each difficulty level for balanced practice
    const hardCount = Math.ceil(maxQuestions * 0.5);
    const mediumCount = Math.ceil(maxQuestions * 0.3);
    const easyCount = maxQuestions - hardCount - mediumCount;

    ordered = [
      ...hard.slice(0, hardCount),
      ...medium.slice(0, mediumCount),
      ...easy.slice(0, easyCount)
    ];
  }

  return ordered;
};

/**
 * Get performance summary for a specific question
 */
export const getQuestionPerformance = (
  profile: UserPerformanceProfile,
  questionId: number
): QuestionPerformance | null => {
  return profile.questionMetrics.get(questionId) || null;
};

/**
 * Calculate estimated mastery of a topic
 */
export const getTopicMastery = (profile: UserPerformanceProfile, topic: string): number => {
  const questionsInTopic: QuestionPerformance[] = [];

  for (const perf of profile.questionMetrics.values()) {
    if (perf.topic === topic) {
      questionsInTopic.push(perf);
    }
  }

  if (questionsInTopic.length === 0) return 0;

  const totalCorrect = questionsInTopic.reduce((sum, q) => sum + q.correctCount, 0);
  const totalAttempts = questionsInTopic.reduce((sum, q) => sum + q.totalAttempts, 0);

  if (totalAttempts === 0) return 0;
  return (totalCorrect / totalAttempts) * 100;
};

/**
 * Get all unique topics and their mastery levels
 */
export const getTopicMasteryMap = (profile: UserPerformanceProfile): Map<string, number> => {
  const topics = new Set<string>();

  for (const perf of profile.questionMetrics.values()) {
    if (perf.topic) topics.add(perf.topic);
  }

  const masteryMap = new Map<string, number>();
  for (const topic of topics) {
    masteryMap.set(topic, getTopicMastery(profile, topic));
  }

  return masteryMap;
};

/**
 * Clear all performance profiles (for cleanup)
 */
export const clearAllPerformanceProfiles = (): void => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(PERFORMANCE_STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    logger.info('All performance profiles cleared', 'difficultyTracking.clearAllPerformanceProfiles');
  } catch (e) {
    logger.error('Failed to clear all performance profiles', 'difficultyTracking.clearAllPerformanceProfiles', e);
  }
};
