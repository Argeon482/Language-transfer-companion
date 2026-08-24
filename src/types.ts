export interface Lesson {
  id: string;
  name: string;
  audioUrl: string;
  transcriptData: TranscriptData;
}

export interface Word {
  word: string;
  start: number;
  end: number;
  score: number;
  speaker: 'teacher' | 'student' | 'unknown';
  pause_after?: boolean;
}

export interface Segment {
  start: number;
  end: number;
  text: string;
  words: Word[];
  speaker: string;
}

export interface TranscriptData {
  segments: Segment[];
  word_segments?: Word[];
}

export interface GlobalWord extends Word {
  globalIndex: number;
}

export interface Bubble {
  id: string;
  speaker: string;
  words: GlobalWord[];
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  nextReview: number;
  interval: number;
  easeFactor: number;
  repetitions: number;
  lessonId?: string;
  createdAt: number;
}
