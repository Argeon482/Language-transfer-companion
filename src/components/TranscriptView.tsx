import React, { memo, useRef, useEffect } from 'react';
import { Bubble } from '../types';

interface Props {
    bubbles: Bubble[];
    activeWordIndex: number;
    activeBubbleIndex: number;
    onWordClick: (time: number) => void;
}

export const TranscriptView = memo(({ bubbles, activeWordIndex, activeBubbleIndex, onWordClick }: Props) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const activeWordRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (activeWordRef.current && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const wordElement = activeWordRef.current;
            
            const containerRect = container.getBoundingClientRect();
            const wordRect = wordElement.getBoundingClientRect();
            
            // Calculate distance from top and bottom of the scrolling container
            const offsetTop = wordRect.top - containerRect.top;
            const offsetBottom = containerRect.bottom - wordRect.bottom;
            
            // Scroll if the word is outside the middle portion of the container
            if (offsetTop < containerRect.height * 0.2 || offsetBottom < containerRect.height * 0.2) {
                wordElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [activeWordIndex]);

    return (
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 scroll-smooth pb-48">
            {bubbles.map((bubble, idx) => {
                const isActiveBubble = idx === activeBubbleIndex;
                const isTeacher = bubble.speaker === 'teacher';
                
                return (
                    <div 
                        key={bubble.id} 
                        className={`flex gap-6 items-start w-full max-w-3xl ${isTeacher ? 'mr-auto' : 'ml-auto flex-row-reverse'} ${isActiveBubble ? 'opacity-100' : 'opacity-60 hover:opacity-80 transition-opacity'}`}
                    >
                        <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold shadow-lg ${isTeacher ? 'bg-indigo-500 shadow-indigo-500/20' : 'bg-teal-500 shadow-teal-500/20'}`}>
                            {isTeacher ? 'T' : 'S'}
                        </div>
                        
                        <div className={`flex-1 flex flex-col ${isTeacher ? 'items-start' : 'items-end'}`}>
                            <div className={`p-6 rounded-3xl text-[1.1rem] leading-relaxed transition-all duration-300 relative ${
                                isTeacher 
                                    ? 'bg-white/5 border border-white/10 text-slate-300' 
                                    : 'bg-teal-500/10 border border-teal-500/30 text-teal-300'
                            } ${isActiveBubble ? 'shadow-2xl' : ''}`}>
                                {isActiveBubble && isTeacher && (
                                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-12 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
                                )}
                                {isActiveBubble && !isTeacher && (
                                    <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-1 h-12 bg-teal-500 rounded-full shadow-[0_0_15px_rgba(20,184,166,0.5)]"></div>
                                )}
                                {bubble.words.map((word) => {
                                    const isActiveWord = activeWordIndex === word.globalIndex;
                                    return (
                                        <React.Fragment key={word.globalIndex}>
                                            <span 
                                                ref={isActiveWord ? activeWordRef : null}
                                                onClick={() => onWordClick(word.start)}
                                                className={`cursor-pointer transition-colors duration-150 ${
                                                    isActiveWord 
                                                        ? 'text-white bg-indigo-500/50 rounded px-1' 
                                                        : (isTeacher ? 'hover:text-white' : 'hover:text-teal-100')
                                                }`}
                                            >
                                                {word.word}
                                            </span>
                                            {' '}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
});
