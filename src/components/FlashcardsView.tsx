import React, { useState, useMemo } from 'react';
import { Flashcard } from '../types';
import { sm2 } from '../lib/sm2';
import { Plus, BrainCircuit, Check, X } from 'lucide-react';

interface Props {
  flashcards: Flashcard[];
  onAddFlashcard: (front: string, back: string) => void;
  onUpdateFlashcard: (updated: Flashcard) => void;
  onDeleteFlashcard: (id: string) => void;
}

export const FlashcardsView = ({ flashcards, onAddFlashcard, onUpdateFlashcard, onDeleteFlashcard }: Props) => {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  const now = Date.now();
  const dueCards = useMemo(() => flashcards.filter(c => c.nextReview <= now), [flashcards, now]);
  
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const currentCard = dueCards[currentReviewIndex];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    onAddFlashcard(front.trim(), back.trim());
    setFront('');
    setBack('');
  };

  const handleScore = (quality: number) => {
    if (!currentCard) return;
    const { interval, repetitions, easeFactor } = sm2(quality, currentCard.interval, currentCard.repetitions, currentCard.easeFactor);
    const nextReview = Date.now() + interval * 24 * 60 * 60 * 1000;
    
    onUpdateFlashcard({
      ...currentCard,
      interval,
      repetitions,
      easeFactor,
      nextReview
    });
    
    setShowAnswer(false);
    if (currentReviewIndex + 1 < dueCards.length) {
      setCurrentReviewIndex(currentReviewIndex + 1);
    } else {
      setIsReviewing(false);
      setCurrentReviewIndex(0);
    }
  };

  if (isReviewing && currentCard) {
    return (
      <div className="flex flex-col h-full bg-slate-900/50 p-6 relative">
        <div className="absolute inset-0 bg-indigo-900/10 pointer-events-none"></div>
        <div className="flex items-center justify-between mb-8 z-10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><BrainCircuit className="w-5 h-5 text-indigo-400" /> Review Session</h2>
          <span className="text-sm text-slate-400">{currentReviewIndex + 1} / {dueCards.length}</span>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center z-10">
          <div className="w-full max-w-md aspect-[4/3] perspective-1000">
            <div className={`w-full h-full transition-all duration-500 transform-style-preserve-3d relative ${showAnswer ? 'rotate-y-180' : ''}`}>
              {/* Front */}
              <div className="absolute inset-0 backface-hidden bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center p-8 shadow-2xl backdrop-blur-md">
                <h3 className="text-3xl font-bold text-white text-center">{currentCard.front}</h3>
              </div>
              
              {/* Back */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl flex flex-col items-center justify-center p-8 shadow-2xl backdrop-blur-md">
                <span className="text-sm font-bold text-indigo-300 uppercase tracking-widest mb-4">Answer</span>
                <h3 className="text-3xl font-bold text-white text-center">{currentCard.back}</h3>
              </div>
            </div>
          </div>
          
          <div className="mt-12 w-full max-w-md h-24 flex items-center justify-center">
            {!showAnswer ? (
              <button 
                onClick={() => setShowAnswer(true)}
                className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-semibold transition-colors"
              >
                Show Answer
              </button>
            ) : (
              <div className="flex gap-2 w-full">
                <button onClick={() => handleScore(1)} className="flex-1 py-3 bg-red-500/20 hover:bg-red-500/40 text-red-100 rounded-xl font-semibold transition-colors">Hard</button>
                <button onClick={() => handleScore(3)} className="flex-1 py-3 bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-100 rounded-xl font-semibold transition-colors">Good</button>
                <button onClick={() => handleScore(5)} className="flex-1 py-3 bg-teal-500/20 hover:bg-teal-500/40 text-teal-100 rounded-xl font-semibold transition-colors">Easy</button>
              </div>
            )}
          </div>
        </div>
        
        <button onClick={() => setIsReviewing(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white z-20">
          <X className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900/50">
      <div className="p-4 border-b border-white/10 shrink-0">
        <form onSubmit={handleAdd} className="space-y-3">
          <input 
            type="text" 
            placeholder="Spanish (e.g. Hablar)" 
            value={front}
            onChange={(e) => setFront(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder-slate-400 text-white transition-all"
          />
          <input 
            type="text" 
            placeholder="English (e.g. To speak)" 
            value={back}
            onChange={(e) => setBack(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder-slate-400 text-white transition-all"
          />
          <button 
            type="submit"
            disabled={!front.trim() || !back.trim()}
            className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Flashcard
          </button>
        </form>
      </div>
      
      <div className="p-4 shrink-0 border-b border-white/10 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">Your Vocabulary</h3>
          <p className="text-xs text-slate-400">{flashcards.length} cards total</p>
        </div>
        {dueCards.length > 0 && (
          <button 
            onClick={() => { setShowAnswer(false); setCurrentReviewIndex(0); setIsReviewing(true); }}
            className="px-4 py-2 bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
          >
            <BrainCircuit className="w-4 h-4" /> Review {dueCards.length} Due
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {flashcards.length === 0 ? (
          <div className="text-center text-slate-500 text-sm mt-8">No flashcards yet.<br/>Add vocabulary above as you listen!</div>
        ) : (
          [...flashcards].sort((a, b) => b.createdAt - a.createdAt).map(card => (
            <div key={card.id} className="p-3 bg-white/5 border border-white/10 rounded-lg relative group">
              <div className="font-semibold text-indigo-100">{card.front}</div>
              <div className="text-sm text-slate-400">{card.back}</div>
              <button 
                onClick={() => onDeleteFlashcard(card.id)}
                className="absolute top-2 right-2 p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
