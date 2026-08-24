import { useState, useMemo, useEffect } from 'react';
import { Setup } from './components/Setup';
import { Player } from './components/Player';
import { FlashcardsView } from './components/FlashcardsView';
import { Lesson, Flashcard } from './types';
import { Menu, BookOpen, Layers, Maximize } from 'lucide-react';
import { db } from './lib/firebase';
import { collection, onSnapshot, query, orderBy, setDoc, doc, deleteDoc } from 'firebase/firestore';

export default function App() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [activeCourse, setActiveCourse] = useState<string | null>(() => localStorage.getItem("activeCourse"));
  const [dbError, setDbError] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(() => localStorage.getItem("lastLessonId"));
  const [search, setSearch] = useState('');
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'lessons' | 'flashcards'>('lessons');
  const [autoPlay, setAutoPlay] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    if (activeCourse) {
      localStorage.setItem("activeCourse", activeCourse);
    }
  }, [activeCourse]);
  
  useEffect(() => {
    if (activeLessonId) {
      localStorage.setItem("lastLessonId", activeLessonId);
    }
  }, [activeLessonId]);

  useEffect(() => {
    if (!activeCourse) {
      setIsLoadingDB(false);
      return;
    }

    setIsLoadingDB(true);
    setDbError(null);

    const lessonsQuery = query(collection(db, 'lessons'), orderBy('order', 'asc'));
    const unsubscribeLessons = onSnapshot(lessonsQuery, (snapshot) => {
      const loadedLessons = snapshot.docs.map(d => d.data() as Lesson);
      setLessons(loadedLessons);
      if (loadedLessons.length > 0 && !activeLessonId) {
        setActiveLessonId(loadedLessons[0].id);
      }
      setIsLoadingDB(false);
      setDbError(null);
    }, (error) => {
        console.warn("Firestore Error (lessons):", error);
        setDbError(error.message);
        setIsLoadingDB(false);
    });

    const unsubscribeFlashcards = onSnapshot(collection(db, 'flashcards'), (snapshot) => {
      const loadedFlashcards = snapshot.docs.map(d => d.data() as Flashcard);
      setFlashcards(loadedFlashcards);
    }, (error) => {
        console.warn("Firestore Error (flashcards):", error);
    });

    return () => {
        unsubscribeLessons();
        unsubscribeFlashcards();
    };
  }, [activeCourse]); // activeLessonId is not included on purpose to prevent resetting

  const handleLessonsReady = () => {
    setShowSetup(false);
    setActiveCourse('spanish');
  };

  const handleAddFlashcard = async (front: string, back: string) => {
    const newCard: Flashcard = {
      id: crypto.randomUUID(),
      front,
      back,
      nextReview: Date.now(),
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      createdAt: Date.now(),
      lessonId: activeLessonId || undefined
    };
    try {
      await setDoc(doc(db, 'flashcards', newCard.id), newCard);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAutoFlashcard = async (front: string, back: string) => {
    if (!flashcards.some(c => c.front.toLowerCase() === front.toLowerCase() && c.back.toLowerCase() === back.toLowerCase())) {
        const newCard: Flashcard = {
          id: crypto.randomUUID(),
          front,
          back,
          nextReview: Date.now(),
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          createdAt: Date.now(),
          lessonId: activeLessonId || undefined
        };
        try {
            await setDoc(doc(db, 'flashcards', newCard.id), newCard);
        } catch (e) {
            console.error(e);
        }
    }
  };

  const handleLessonComplete = () => {
    const currentIndex = lessons.findIndex(l => l.id === activeLessonId);
    if (currentIndex !== -1 && currentIndex < lessons.length - 1) {
      setActiveLessonId(lessons[currentIndex + 1].id);
      setAutoPlay(true);
    }
  };

  const handleUpdateFlashcard = async (updated: Flashcard) => {
    try {
        await setDoc(doc(db, 'flashcards', updated.id), updated);
    } catch(e) {
        console.error(e);
    }
  };

  const handleDeleteFlashcard = async (id: string) => {
    try {
        await deleteDoc(doc(db, 'flashcards', id));
    } catch(e) {
        console.error(e);
    }
  };

  const filteredLessons = useMemo(() => {
    return lessons.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));
  }, [lessons, search]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(e => console.error(e));
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
  };

  if (isLoadingDB) {
    return (
      <div className="w-full h-[100dvh] bg-[#0f172a] text-white flex items-center justify-center font-sans">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!activeCourse) {
    return (
      <div className="w-full h-[100dvh] bg-[#0f172a] overflow-hidden relative flex flex-col font-sans items-center justify-center p-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/30 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[120px]"></div>
          <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-purple-600/20 rounded-full blur-[100px]"></div>
        </div>
        
        <div className="max-w-2xl w-full z-10">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2 text-center">Available Courses</h1>
          <p className="text-slate-400 text-center mb-12">Select a course to load lessons from the cloud.</p>
          
          <div className="grid gap-6">
            <button 
              onClick={() => setActiveCourse('spanish')}
              className="bg-slate-800/80 backdrop-blur-md border border-indigo-500/30 hover:border-indigo-500 p-8 rounded-3xl text-left transition-all hover:scale-[1.02] shadow-xl shadow-indigo-900/20 group"
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/50 group-hover:bg-indigo-500/30 transition-colors shrink-0">
                  <span className="text-2xl">🇪🇸</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Language Transfer: Complete Spanish</h3>
                  <p className="text-slate-300">Load the full set of 90 audios and transcripts from the cloud database.</p>
                </div>
              </div>
            </button>

            <button 
              onClick={() => setShowSetup(true)}
              className="bg-slate-800/40 backdrop-blur-md border border-white/10 hover:border-white/30 p-8 rounded-3xl text-left transition-all hover:bg-slate-800/60"
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shrink-0">
                  <BookOpen className="w-8 h-8 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Upload New Course</h3>
                  <p className="text-slate-400">Import your own audio and JSON transcript folders.</p>
                </div>
              </div>
            </button>
          </div>
        </div>
        
        {showSetup && (
          <div className="absolute inset-0 z-50 bg-[#0f172a]">
            <Setup onReady={() => setShowSetup(false)} />
            <button 
                onClick={() => setShowSetup(false)}
                className="absolute top-8 right-8 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-50"
            >
                Cancel
            </button>
          </div>
        )}
      </div>
    );
  }

  if (dbError && lessons.length === 0) {
    return (
      <div className="w-full h-[100dvh] bg-[#0f172a] text-white flex flex-col items-center justify-center font-sans p-6 text-center relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-red-600/20 rounded-full blur-[100px]"></div>
        </div>
        <div className="max-w-md bg-slate-800/80 p-8 rounded-3xl border border-red-500/30 z-10">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Cloud Quota Exceeded</h2>
            <p className="text-slate-300 mb-6 leading-relaxed">
              Firebase is in offline mode because the daily free tier read limit was reached. This happens occasionally when doing large batch uploads, but your cached lessons will still work! The quota automatically resets at midnight.
            </p>
            <div className="p-4 bg-black/40 rounded-xl text-xs font-mono text-red-300/70 mb-8 break-words text-left">
              {dbError}
            </div>
            <button 
              onClick={() => setActiveCourse(null)}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-colors"
            >
              Go Back
            </button>
        </div>
      </div>
    );
  }

  if (lessons.length === 0 || showSetup) {
    return (
      <div className="w-full h-[100dvh] bg-[#0f172a] overflow-hidden relative flex flex-col font-sans">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/30 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[120px]"></div>
          <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-purple-600/20 rounded-full blur-[100px]"></div>
        </div>
        <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
          <Setup onReady={handleLessonsReady} />
          <button 
              onClick={() => {
                setShowSetup(false);
                if (lessons.length === 0) setActiveCourse(null);
              }}
              className="absolute top-8 right-8 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-50"
          >
              Cancel
          </button>
        </div>
      </div>
    );
  }

  const activeLesson = lessons.find(l => l.id === activeLessonId) || lessons[0];
  const globalLessonIndex = lessons.findIndex(l => l.id === activeLesson?.id);
  const progressText = `${globalLessonIndex + 1} / ${lessons.length}`;
  const progressPercent = ((globalLessonIndex + 1) / lessons.length) * 100;

  return (
    <div className="w-full h-[100dvh] bg-[#0f172a] text-slate-100 font-sans overflow-hidden relative flex flex-col">
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/30 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-purple-600/20 rounded-full blur-[100px]"></div>
      </div>
      
      <header className="h-16 flex items-center justify-between px-4 sm:px-8 bg-white/5 backdrop-blur-md border-b border-white/10 z-20 shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20 shrink-0">LT</div>
          <h1 className="text-base sm:text-lg font-semibold tracking-tight truncate max-w-[150px] sm:max-w-none">Language Transfer <span className="text-slate-400 font-normal hidden sm:inline">| Complete Spanish</span></h1>
        </div>
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex-col items-end hidden sm:flex">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Global Progress</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)] transition-all" style={{ width: `${progressPercent}%` }}></div>
              </div>
              <span className="text-xs font-mono text-indigo-300 w-12 text-right">{progressText}</span>
            </div>
          </div>
          <button 
            onClick={toggleFullScreen}
            className="p-2 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
            title="Toggle Fullscreen"
          >
            <Maximize className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setShowSetup(true)} 
            className="px-4 py-2 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors text-sm font-medium text-slate-300 hover:text-white"
          >
            Add Folders
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden z-10 relative">
        {isSidebarOpen && (
          <aside className="w-64 md:w-80 bg-slate-900/95 md:bg-white/5 backdrop-blur-md border-r border-white/10 flex flex-col shrink-0 absolute md:relative z-50 h-full shadow-2xl md:shadow-none">
            <div className="flex bg-black/20 p-1 m-4 rounded-xl border border-white/5">
              <button 
                onClick={() => setSidebarTab('lessons')} 
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${sidebarTab === 'lessons' ? 'bg-indigo-500/20 text-indigo-300 shadow-inner border border-indigo-500/20' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <BookOpen className="w-4 h-4" /> Lessons
              </button>
              <button 
                onClick={() => setSidebarTab('flashcards')} 
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${sidebarTab === 'flashcards' ? 'bg-teal-500/20 text-teal-300 shadow-inner border border-teal-500/20' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Layers className="w-4 h-4" /> Flashcards
              </button>
            </div>
            
            {sidebarTab === 'lessons' ? (
              <>
                <div className="px-4 pb-4 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
                  <input 
                    type="text" 
                    placeholder="Search lessons..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder-slate-400 text-white transition-all" 
                  />
                </div>
                <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
                  {filteredLessons.map((lesson) => {
                    const isActive = lesson.id === activeLesson?.id;
                    const lessonNum = lessons.findIndex(l => l.id === lesson.id) + 1;
                    return (
                      <div 
                        key={lesson.id} 
                        onClick={() => {
                          setActiveLessonId(lesson.id);
                          setAutoPlay(true);
                          if (window.innerWidth < 768) setIsSidebarOpen(false);
                        }}
                        className={`p-3 rounded-lg flex flex-col gap-1 cursor-pointer transition-colors ${
                          isActive 
                            ? 'bg-indigo-500/20 border border-indigo-500/30 ring-1 ring-indigo-400/20 shadow-inner' 
                            : 'hover:bg-white/5 border border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold ${isActive ? 'text-indigo-300' : 'text-slate-500'}`}>LESSON {lessonNum}</span>
                          {isActive && <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>}
                        </div>
                        <span className={`text-sm truncate ${isActive ? 'font-bold text-white' : 'font-medium text-slate-300'}`}>
                          {lesson.name}
                        </span>
                      </div>
                    );
                  })}
                  {filteredLessons.length === 0 && (
                    <div className="text-center p-4 text-slate-500 text-sm">No lessons match search</div>
                  )}
                </div>
              </>
            ) : (
              <FlashcardsView 
                flashcards={flashcards}
                onAddFlashcard={handleAddFlashcard}
                onUpdateFlashcard={handleUpdateFlashcard}
                onDeleteFlashcard={handleDeleteFlashcard}
              />
            )}
          </aside>
        )}

        <section className="flex-1 flex flex-col relative overflow-hidden">
          {activeLesson && (
            <Player 
              key={activeLesson.id} 
              lessonId={activeLesson.id}
              audioUrl={activeLesson.audioUrl} 
              lessonName={activeLesson.name}
              transcriptData={activeLesson.transcriptData} 
              autoPlay={autoPlay}
              onAutoFlashcard={handleAutoFlashcard}
              onLessonComplete={handleLessonComplete}
            />
          )}
        </section>
      </main>
    </div>
  );
}
