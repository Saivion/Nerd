const STORAGE_PREFIX = 'math_mentor_';

export interface UserProgress {
  stars: number;
  streak: number;
  lastPracticeDate: string;
  completedProblems: string[];
  achievements: string[];
}

export const defaultProgress: UserProgress = {
  stars: 0,
  streak: 0,
  lastPracticeDate: '',
  completedProblems: [],
  achievements: [],
};

// Check if code is running on the client
const isClient = typeof window !== 'undefined';

// Custom event for progress updates
const createProgressUpdatedEvent = () => {
  if (isClient) {
    return new Event('progressUpdated');
  }
  return null;
};

export const getProgress = (): UserProgress => {
  if (!isClient) return defaultProgress;
  
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}progress`);
    if (!stored) return defaultProgress;
    
    return JSON.parse(stored);
  } catch {
    return defaultProgress;
  }
};

export const updateProgress = (progress: Partial<UserProgress>) => {
  if (!isClient) return;
  
  try {
    const current = getProgress();
    const updated = { ...current, ...progress };
    
    localStorage.setItem(`${STORAGE_PREFIX}progress`, JSON.stringify(updated));
    
    // Dispatch event to notify components of the change
    const event = createProgressUpdatedEvent();
    if (event) {
      window.dispatchEvent(event);
    }
  } catch (error) {
    console.error('Failed to update progress:', error);
  }
};

export const addStars = (amount: number) => {
  if (!isClient) return;
  
  try {
    const progress = getProgress();
    updateProgress({ stars: progress.stars + amount });
  } catch (error) {
    console.error('Failed to add stars:', error);
  }
};

export const updateStreak = () => {
  if (!isClient) return;
  
  try {
    const progress = getProgress();
    const today = new Date().toISOString().split('T')[0];
    
    if (progress.lastPracticeDate === today) return;
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const newStreak = progress.lastPracticeDate === yesterdayStr
      ? progress.streak + 1
      : 1;
    
    updateProgress({
      streak: newStreak,
      lastPracticeDate: today,
    });
  } catch (error) {
    console.error('Failed to update streak:', error);
  }
};