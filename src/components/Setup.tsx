import React, { useState } from 'react';
import { BookOpen, Headphones, Play, FolderArchive } from 'lucide-react';
import { TranscriptData, Lesson } from '../types';

interface Props {
    onReady: (lessons: Lesson[]) => void;
}

export const Setup = ({ onReady }: Props) => {
    const [audioFiles, setAudioFiles] = useState<File[]>([]);
    const [transcriptFiles, setTranscriptFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAudioFolder = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setAudioFiles(files.filter(f => f.type.startsWith('audio/') || f.name.match(/\.(mp3|wav|ogg|m4a)$/i)));
    };

    const handleTranscriptFolder = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setTranscriptFiles(files.filter(f => f.type === 'application/json' || f.name.endsWith('.json')));
    };

    const handleStart = async () => {
        if (!audioFiles.length || !transcriptFiles.length) return;
        setIsProcessing(true);
        setError(null);
        
        try {
            // Let the UI update to "Processing..."
            await new Promise(r => setTimeout(r, 50));

            const matchedLessons: Lesson[] = [];
            const unmatchedAudio = [...audioFiles];

            for (const tFile of transcriptFiles) {
                const tBase = tFile.name.replace(/\.[^/.]+$/, "");
                const tNorm = tBase.toLowerCase().replace(/[^a-z0-9]/g, '');
                const tNumMatch = tBase.match(/\d+/);
                const tNum = tNumMatch ? parseInt(tNumMatch[0], 10) : null;

                // Attempt 1: Exact normalized name match
                let aIndex = unmatchedAudio.findIndex(a => {
                    const aBase = a.name.replace(/\.[^/.]+$/, "");
                    return aBase.toLowerCase().replace(/[^a-z0-9]/g, '') === tNorm;
                });

                // Attempt 2: Number match
                if (aIndex === -1 && tNum !== null) {
                    aIndex = unmatchedAudio.findIndex(a => {
                        const aBase = a.name.replace(/\.[^/.]+$/, "");
                        const aNumMatch = aBase.match(/\d+/);
                        return aNumMatch && parseInt(aNumMatch[0], 10) === tNum;
                    });
                }

                if (aIndex !== -1) {
                    const aFile = unmatchedAudio[aIndex];
                    unmatchedAudio.splice(aIndex, 1);
                    
                    try {
                        const text = await tFile.text();
                        const data = JSON.parse(text) as TranscriptData;
                        
                        if (data.segments && Array.isArray(data.segments)) {
                            // Format lesson name smoothly
                            const title = tNum !== null ? `Lesson ${tNum}` : tBase;
                            matchedLessons.push({
                                id: `lesson-${tNum !== null ? tNum : tNorm}`,
                                name: title,
                                audioFile: aFile,
                                transcriptData: data
                            });
                        }
                    } catch (e) {
                        console.warn(`Failed to parse ${tFile.name}`, e);
                    }
                }
            }

            matchedLessons.sort((a, b) => {
                const aNumMatch = a.name.match(/\d+/);
                const bNumMatch = b.name.match(/\d+/);
                if (aNumMatch && bNumMatch) {
                    return parseInt(aNumMatch[0], 10) - parseInt(bNumMatch[0], 10);
                }
                return a.name.localeCompare(b.name, undefined, { numeric: true });
            });

            if (matchedLessons.length === 0) {
                setError('No matching pairs found. Please make sure the audio and transcript files share the same numbers (e.g. "01") or names.');
                setIsProcessing(false);
                return;
            }

            onReady(matchedLessons);
        } catch (e) {
            console.error(e);
            setError('An error occurred while processing files.');
        }
        
        setIsProcessing(false);
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-6">
            <div className="max-w-md w-full bg-white/5 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-white/10 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-3xl pointer-events-none"></div>
                <div className="relative z-10">
                    <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                        <FolderArchive className="text-indigo-400" /> Lesson Folders
                    </h1>
                    <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                        Upload folders containing your language audios and their matching JSON transcripts. They will be paired automatically by filename.
                    </p>

                    <div className="space-y-4 mb-8">
                        <label className={`flex flex-col items-center justify-center w-full h-32 border border-dashed rounded-xl cursor-pointer transition-colors ${audioFiles.length > 0 ? 'border-indigo-400/50 bg-indigo-500/10' : 'border-white/20 bg-white/5 hover:bg-white/10'}`}>
                            <Headphones className={`w-8 h-8 mb-2 ${audioFiles.length > 0 ? 'text-indigo-400' : 'text-slate-500'}`} />
                            <span className="text-sm font-medium text-slate-300">
                                {audioFiles.length > 0 ? 'Audio Folder Selected' : 'Select Audio Folder'}
                            </span>
                            {audioFiles.length > 0 && <span className="text-xs text-slate-400 mt-1">{audioFiles.length} valid audio files found</span>}
                            <input type="file" {...{ webkitdirectory: "", directory: "" }} multiple className="hidden" onChange={handleAudioFolder} />
                        </label>

                        <label className={`flex flex-col items-center justify-center w-full h-32 border border-dashed rounded-xl cursor-pointer transition-colors ${transcriptFiles.length > 0 ? 'border-indigo-400/50 bg-indigo-500/10' : 'border-white/20 bg-white/5 hover:bg-white/10'}`}>
                            <BookOpen className={`w-8 h-8 mb-2 ${transcriptFiles.length > 0 ? 'text-indigo-400' : 'text-slate-500'}`} />
                            <span className="text-sm font-medium text-slate-300">
                                {transcriptFiles.length > 0 ? 'Transcript Folder Selected' : 'Select Transcripts Folder'}
                            </span>
                            {transcriptFiles.length > 0 && <span className="text-xs text-slate-400 mt-1">{transcriptFiles.length} valid JSON files found</span>}
                            <input type="file" {...{ webkitdirectory: "", directory: "" }} multiple className="hidden" onChange={handleTranscriptFolder} />
                        </label>
                    </div>

                    {error && <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

                    <button 
                        onClick={handleStart}
                        disabled={audioFiles.length === 0 || transcriptFiles.length === 0 || isProcessing}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/5 disabled:text-slate-500 disabled:border disabled:border-white/10 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        {isProcessing ? 'Processing...' : <><Play className="w-5 h-5 fill-current" /> Build Course Layout</>}
                    </button>
                </div>
            </div>
        </div>
    );
};
