import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { TranscriptData, GlobalWord, Bubble } from '../types';
import { TranscriptView } from './TranscriptView';

interface Props {
    audioFile: File;
    transcriptData: TranscriptData;
}

export const Player = ({ audioFile, transcriptData }: Props) => {
    const [audioUrl, setAudioUrl] = useState<string>('');
    const audioRef = useRef<HTMLAudioElement>(null);
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [autoPause, setAutoPause] = useState(true);
    const [isWaitingForUser, setIsWaitingForUser] = useState(false);
    const [activeWordIndex, setActiveWordIndex] = useState(-1);

    const lastTimeRef = useRef<number>(0);
    const activeWordIndexRef = useRef<number>(-1);
    const lastPausedPointRef = useRef<number>(-1);

    // Clean up object URL safely in strict mode
    useEffect(() => {
        const url = URL.createObjectURL(audioFile);
        setAudioUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [audioFile]);

    const allWords = useMemo(() => {
        let index = 0;
        const words: GlobalWord[] = [];
        transcriptData.segments.forEach(segment => {
            segment.words?.forEach(w => {
                words.push({ ...w, globalIndex: index++ });
            });
        });
        return words;
    }, [transcriptData]);

    const bubbles = useMemo(() => {
        const bbs: Bubble[] = [];
        let current: Bubble | null = null;
        allWords.forEach(w => {
            if (!current || current.speaker !== w.speaker) {
                current = { id: `b-${w.globalIndex}`, speaker: w.speaker, words: [] };
                bbs.push(current);
            }
            current.words.push(w);
        });
        return bbs;
    }, [allWords]);

    useEffect(() => {
        // Setup Media Session for lockscreen/headphone controls
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: audioFile.name.replace(/\.[^/.]+$/, ""),
                artist: 'Interactive Practice',
                album: 'Language Transfer'
            });

            navigator.mediaSession.setActionHandler('play', () => {
                audioRef.current?.play();
            });
            navigator.mediaSession.setActionHandler('pause', () => {
                audioRef.current?.pause();
            });
            navigator.mediaSession.setActionHandler('seekbackward', (details) => {
                if (audioRef.current) {
                    const skipTime = details.seekOffset || 5;
                    const newTime = Math.max(0, audioRef.current.currentTime - skipTime);
                    audioRef.current.currentTime = newTime;
                    lastTimeRef.current = newTime;
                    lastPausedPointRef.current = -1;
                    setCurrentTime(newTime);
                }
            });
            navigator.mediaSession.setActionHandler('seekforward', (details) => {
                if (audioRef.current) {
                    const skipTime = details.seekOffset || 5;
                    const newTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + skipTime);
                    audioRef.current.currentTime = newTime;
                    lastTimeRef.current = newTime;
                    lastPausedPointRef.current = -1;
                    setCurrentTime(newTime);
                }
            });
            
            const handleSkipToPreviousTeacher = () => {
                if (!audioRef.current) return;
                const currentTime = audioRef.current.currentTime;
                let targetTime = Math.max(0, currentTime - 5); 
                
                for (let i = bubbles.length - 1; i >= 0; i--) {
                    const bubble = bubbles[i];
                    if (bubble.speaker !== 'student' && bubble.words.length > 0) {
                        const bubbleStart = bubble.words[0].start;
                        // Give a 1 second buffer so we don't just jump to the start of the current bubble if we're only 0.5s into it
                        if (bubbleStart < currentTime - 1) {
                            targetTime = bubbleStart;
                            break;
                        }
                    }
                }
                
                audioRef.current.currentTime = targetTime;
                lastTimeRef.current = targetTime;
                lastPausedPointRef.current = -1;
                setCurrentTime(targetTime);
                audioRef.current.play().catch(() => {});
            };

            // Map previous/next track buttons on headphones to skip backward to the previous teacher prompt
            // Since double-click (nexttrack) is the easiest shortcut on headphones, we map both to this primary action.
            navigator.mediaSession.setActionHandler('previoustrack', handleSkipToPreviousTeacher);
            navigator.mediaSession.setActionHandler('nexttrack', handleSkipToPreviousTeacher);
        }

        return () => {
            if ('mediaSession' in navigator) {
                navigator.mediaSession.setActionHandler('play', null);
                navigator.mediaSession.setActionHandler('pause', null);
                navigator.mediaSession.setActionHandler('seekbackward', null);
                navigator.mediaSession.setActionHandler('seekforward', null);
                navigator.mediaSession.setActionHandler('previoustrack', null);
                navigator.mediaSession.setActionHandler('nexttrack', null);
            }
        };
    }, [audioFile.name, bubbles]);

    const pausePoints = useMemo(() => {
        const points: number[] = [];
        for (let i = 0; i < allWords.length; i++) {
            const current = allWords[i];
            const next = allWords[i + 1];
            
            // Check if transition is into a student block
            const isTeacherToStudent = current.speaker !== 'student' && next && next.speaker === 'student';
            
            if (current.pause_after || isTeacherToStudent) {
                let potentialPoint;
                if (isTeacherToStudent && next) {
                    // Split the difference between teacher's end and student's start
                    potentialPoint = (current.end + Math.max(current.end, next.start)) / 2;
                } else {
                    // Fallback for pause_after without student transition
                    potentialPoint = next ? Math.max(current.end, next.start - 0.1) : current.end + 0.1;
                }
                
                // Only add if we haven't just added a point very close to this one
                if (points.length === 0 || potentialPoint - points[points.length - 1] > 1.0) {
                    points.push(potentialPoint);
                }
            }
        }
        return points.sort((a, b) => a - b);
    }, [allWords]);

    useEffect(() => {
        let animationFrameId: number;
        const updateTime = () => {
            animationFrameId = requestAnimationFrame(updateTime);
            
            const audio = audioRef.current;
            if (!audio) return;
            
            const time = audio.currentTime;
            setCurrentTime(time);
            
            // Auto pause logic
            if (autoPause && !audio.paused) {
                const passedPoint = pausePoints.find(p => time >= p && lastTimeRef.current < p);
                if (passedPoint !== undefined && Math.abs(passedPoint - lastPausedPointRef.current) > 0.5) {
                    audio.pause();
                    audio.currentTime = passedPoint;
                    lastPausedPointRef.current = passedPoint;
                    setIsWaitingForUser(true);
                }
            }
            
            lastTimeRef.current = time;
            
            // Active word highlight logic
            const newIndex = allWords.findIndex((w, i) => {
                const nextWord = allWords[i + 1];
                return time >= w.start && (!nextWord || time < nextWord.start);
            });
            
            if (newIndex !== activeWordIndexRef.current) {
                activeWordIndexRef.current = newIndex;
                setActiveWordIndex(newIndex);
            }
        };
        
        animationFrameId = requestAnimationFrame(updateTime);
        return () => cancelAnimationFrame(animationFrameId);
    }, [autoPause, pausePoints, allWords]);

    const activeBubbleIndex = useMemo(() => {
        return bubbles.findIndex(b => b.words.some(w => w.globalIndex === activeWordIndex));
    }, [activeWordIndex, bubbles]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            lastTimeRef.current = time; // Prevent false auto-pause triggers
            lastPausedPointRef.current = -1; // Reset pause memory
            setCurrentTime(time);
        }
    };

    const handleWordClick = (start: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = start;
            lastTimeRef.current = start;
            lastPausedPointRef.current = -1; // Reset pause memory
            setCurrentTime(start);
            audioRef.current.play();
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col h-full overflow-hidden relative">
            {/* Transcript Area */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
                {isWaitingForUser && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 animate-pulse">
                        <div className="bg-orange-500/20 border border-orange-500/50 backdrop-blur-md text-orange-300 px-6 py-3 rounded-full shadow-[0_0_20px_rgba(249,115,22,0.4)] font-medium flex flex-col items-center whitespace-nowrap">
                            <span className="text-sm font-bold uppercase tracking-widest text-orange-400">Paused for Your Response</span>
                            <span className="text-xs text-orange-200">Teacher is waiting for you... Press Play to continue.</span>
                        </div>
                    </div>
                )}
                <TranscriptView 
                    bubbles={bubbles} 
                    activeWordIndex={activeWordIndex} 
                    activeBubbleIndex={activeBubbleIndex}
                    onWordClick={handleWordClick}
                />
            </div>

            {/* Controls */}
            <div className="h-24 bg-white/5 backdrop-blur-xl border-t border-white/10 flex items-center px-4 sm:px-8 gap-4 sm:gap-8 shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => handleWordClick(Math.max(0, currentTime - 5))} className="text-slate-400 hover:text-white transition-colors">
                        <SkipBack className="w-6 h-6" />
                    </button>
                    <button 
                        onClick={togglePlay} 
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-slate-900 transition-all ${
                            isWaitingForUser 
                                ? 'bg-orange-400 hover:bg-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.5)] scale-110' 
                                : 'bg-white hover:bg-slate-200 shadow-xl shadow-white/10'
                        }`}
                    >
                        {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                    </button>
                    <button onClick={() => handleWordClick(Math.min(duration, currentTime + 5))} className="text-slate-400 hover:text-white transition-colors">
                        <SkipForward className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="flex-1 flex flex-col gap-2">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                    <div className="relative h-1.5 w-full bg-white/10 rounded-full group flex items-center">
                        <div 
                            className="absolute top-0 left-0 h-full bg-indigo-400 rounded-full z-10 shadow-[0_0_10px_rgba(129,140,248,0.4)] pointer-events-none" 
                            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                        ></div>
                        <input 
                            type="range" 
                            min={0} 
                            max={duration || 100} 
                            step={0.01}
                            value={currentTime} 
                            onChange={handleSeek}
                            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-40"
                        />
                        <div 
                            className="absolute w-3.5 h-3.5 bg-white border-2 border-indigo-500 rounded-full z-20 shadow-lg transform -translate-x-1/2 pointer-events-none transition-transform group-hover:scale-125"
                            style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                        ></div>
                        
                        {/* Interactive Pause Points */}
                        {pausePoints.map((pt, i) => (
                            <div 
                                key={i}
                                className="absolute top-0 h-full w-[2px] bg-orange-400/50 z-30 pointer-events-none" 
                                style={{ left: `${duration ? (pt / duration) * 100 : 0}%` }}
                                title="Interactive Pause Point"
                            ></div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-black/20 p-2 rounded-2xl border border-white/5">
                    <div 
                        className="flex flex-col items-center px-3 cursor-pointer group"
                        onClick={() => setAutoPause(!autoPause)}
                    >
                        <span className={`text-[9px] font-bold tracking-wider transition-colors ${autoPause ? 'text-orange-400' : 'text-slate-500 group-hover:text-slate-400'}`}>
                            INTERACTIVE
                        </span>
                        <div className={`w-10 h-5 border rounded-full relative p-0.5 mt-1 transition-colors ${autoPause ? 'bg-orange-500/20 border-orange-500/40' : 'bg-white/5 border-white/10'}`}>
                            <div className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${autoPause ? 'bg-orange-500 translate-x-5 shadow-[0_0_8px_#f97316]' : 'bg-slate-500'}`}></div>
                        </div>
                    </div>
                </div>
            </div>
            
            {audioUrl && (
                <audio 
                    ref={audioRef} 
                    src={audioUrl} 
                    onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                    onPlay={() => { 
                        setIsPlaying(true); 
                        setIsWaitingForUser(false); 
                        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
                    }}
                    onPause={() => {
                        setIsPlaying(false);
                        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
                    }}
                    onEnded={() => {
                        setIsPlaying(false);
                        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
                    }}
                />
            )}
        </div>
    );
};
