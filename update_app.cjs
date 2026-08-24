const fs = require('fs');

let appCode = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add activeCourse state and dbError state
appCode = appCode.replace(
    "const [activeLessonId, setActiveLessonId] = useState<string | null>(() => localStorage.getItem(\"lastLessonId\"));",
    `const [activeCourse, setActiveCourse] = useState<string | null>(() => localStorage.getItem("activeCourse"));
  const [dbError, setDbError] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(() => localStorage.getItem("lastLessonId"));`
);

// 2. Save activeCourse to localStorage
appCode = appCode.replace(
    "useEffect(() => {\n    if (activeLessonId) {",
    `useEffect(() => {
    if (activeCourse) {
      localStorage.setItem("activeCourse", activeCourse);
    }
  }, [activeCourse]);
  
  useEffect(() => {
    if (activeLessonId) {`
);

// 3. Update the lessonsQuery useEffect to depend on activeCourse
const oldUseEffect = `  useEffect(() => {
    const lessonsQuery = query(collection(db, 'lessons'), orderBy('order', 'asc'));
    const unsubscribeLessons = onSnapshot(lessonsQuery, (snapshot) => {
      const loadedLessons = snapshot.docs.map(d => d.data() as Lesson);
      setLessons(loadedLessons);
      if (loadedLessons.length > 0 && !activeLessonId) {
        setActiveLessonId(loadedLessons[0].id);
      }
      setIsLoadingDB(false);
    }, (error) => {
        console.error("Firestore Error (lessons):", error);
        setIsLoadingDB(false);
    });

    const unsubscribeFlashcards = onSnapshot(collection(db, 'flashcards'), (snapshot) => {
      const loadedFlashcards = snapshot.docs.map(d => d.data() as Flashcard);
      setFlashcards(loadedFlashcards);
    }, (error) => {
        console.error("Firestore Error (flashcards):", error);
    });

    return () => {
        unsubscribeLessons();
        unsubscribeFlashcards();
    };
  }, []); // activeLessonId is not included on purpose to prevent resetting`;

const newUseEffect = `  useEffect(() => {
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
        console.error("Firestore Error (lessons):", error);
        setDbError(error.message);
        setIsLoadingDB(false);
    });

    const unsubscribeFlashcards = onSnapshot(collection(db, 'flashcards'), (snapshot) => {
      const loadedFlashcards = snapshot.docs.map(d => d.data() as Flashcard);
      setFlashcards(loadedFlashcards);
    }, (error) => {
        console.error("Firestore Error (flashcards):", error);
    });

    return () => {
        unsubscribeLessons();
        unsubscribeFlashcards();
    };
  }, [activeCourse]); // activeLessonId is not included on purpose to prevent resetting`;

appCode = appCode.replace(oldUseEffect, newUseEffect);

// 4. Update the "if (lessons.length === 0 || showSetup)" logic
// Now we want:
// if (!activeCourse) -> Show Course Selection
// else if (dbError) -> Show Error
// else if (lessons.length === 0 || showSetup) -> Show Setup

const oldEmptyState = `  if (lessons.length === 0 || showSetup) {
    return (
      <div className="w-full h-[100dvh] bg-[#0f172a] overflow-hidden relative flex flex-col font-sans">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/30 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[120px]"></div>
          <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-purple-600/20 rounded-full blur-[100px]"></div>
        </div>
        <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
          <Setup onReady={handleLessonsReady} />
          {lessons.length > 0 && showSetup && (
              <button 
                  onClick={() => setShowSetup(false)}
                  className="absolute top-8 right-8 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
              >
                  Cancel
              </button>
          )}
        </div>
      </div>
    );
  }`;

const newEmptyState = `  if (!activeCourse) {
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

  if (dbError) {
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
  }`;

appCode = appCode.replace(oldEmptyState, newEmptyState);

// Replace handleLessonsReady
appCode = appCode.replace(
`  const handleLessonsReady = () => {
    setShowSetup(false);
  };`,
`  const handleLessonsReady = () => {
    setShowSetup(false);
    setActiveCourse('spanish');
  };`
)

fs.writeFileSync('src/App.tsx', appCode);
console.log("App updated with Course Selection and Error Handling!");
