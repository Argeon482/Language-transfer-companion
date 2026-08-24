import React, { useState } from 'react';
import { BookOpen, Headphones, Play, FolderArchive } from 'lucide-react';
import { TranscriptData, Lesson } from '../types';
import { db, storage } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

interface Props {
    onReady: () => void;
}

export const Setup = ({ onReady }: Props) => {
    const [audioFiles, setAudioFiles] = useState<File[]>([]);
    const [transcriptFiles, setTranscriptFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const handleAudioFolder = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []) as File[];
        const valid = files.filter(f => f.type.startsWith('audio/') || f.name.endsWith('.mp3'));
        setAudioFiles(valid);
    };

    const handleTranscriptFolder = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []) as File[];
        const valid = files.filter(f => f.type === 'application/json' || f.name.endsWith('.json'));
        setTranscriptFiles(valid);
    };

    const handleStart = async () => {
        if (!audioFiles.length || !transcriptFiles.length) return;
        setIsProcessing(true);
        setError(null);
        setUploadProgress(0);
        
        try {
            await new Promise(r => setTimeout(r, 50));
            
            const unmatchedAudio = [...audioFiles];
            const tasks: any[] = [];
            
            for (const tFile of transcriptFiles) {
                const tBase = tFile.name.replace(/\.[^/.]+$/, "");
                const tNorm = tBase.toLowerCase().replace(/[^a-z0-9]/g, '');
                const tNumMatch = tBase.match(/\d+/);
                const tNum = tNumMatch ? parseInt(tNumMatch[0], 10) : null;

                let aIndex = unmatchedAudio.findIndex(a => {
                    const aBase = a.name.replace(/\.[^/.]+$/, "");
                    return aBase.toLowerCase().replace(/[^a-z0-9]/g, '') === tNorm;
                });

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
                    tasks.push({ tFile, aFile, tNum, tBase, tNorm });
                }
            }

            if (tasks.length === 0) {
                setError("No matching pairs found.");
                setIsProcessing(false);
                return;
            }

            const totalBytes = tasks.reduce((sum, task) => sum + task.aFile.size, 0);
            let uploadedBytes = 0;
            const progressMap = new Map();

            // Process sequentially to not overload network
            for (const task of tasks) {
                const { tFile, aFile, tNum, tBase, tNorm } = task;
                
                try {
                    const text = await tFile.text();
                    const data = JSON.parse(text) as TranscriptData;
                    
                    if (data.segments && Array.isArray(data.segments)) {
                        const title = tNum !== null ? `Lesson ${tNum}` : tBase;
                        const id = `lesson-${tNum !== null ? tNum : tNorm}`;
                        
                        // Upload audio
                        const audioRef = ref(storage, `audio/${id}/${aFile.name}`);
                        const uploadTask = uploadBytesResumable(audioRef, aFile);
                        
                        await new Promise<void>((resolve, reject) => {
                            uploadTask.on('state_changed', 
                                (snapshot) => {
                                    progressMap.set(aFile.name, snapshot.bytesTransferred);
                                    let currentTotal = 0;
                                    progressMap.forEach(bytes => { currentTotal += bytes; });
                                    setUploadProgress(Math.min(99, Math.round((currentTotal / totalBytes) * 100)));
                                },
                                (error) => {
                                    console.error("Upload error:", error);
                                    reject(error);
                                },
                                async () => {
                                    try {
                                        const audioUrl = await getDownloadURL(uploadTask.snapshot.ref);
                                        await setDoc(doc(db, 'lessons', id), {
                                            id,
                                            name: title,
                                            audioUrl,
                                            transcriptData: data,
                                            order: tNum !== null ? tNum : 999
                                        });
                                        resolve();
                                    } catch (e) {
                                        reject(e);
                                    }
                                }
                            );
                        });
                    }
                } catch (e) {
                    console.warn(`Failed to parse or upload ${tFile.name}`, e);
                    setError(`Error on ${tFile.name}: ${(e as any).message}`);
                }
            }

            setUploadProgress(100);
            await new Promise(r => setTimeout(r, 500));
            onReady();
        } catch (e: any) {
            console.error(e);
            setError('An error occurred while uploading: ' + e.message);
        }
        
        setIsProcessing(false);
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-6">
            <div className="max-w-md w-full bg-slate-800/80 backdrop-blur-md rounded-3xl p-8 border border-white/10 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                    <FolderArchive className="w-8 h-8 text-indigo-400" />
                    <h2 className="text-3xl font-bold text-white tracking-tight">Lesson Folders</h2>
                </div>
                
                <p className="text-slate-300 mb-8 leading-relaxed">
                    Upload folders containing your language audios and their matching JSON transcripts. 
                    They will be paired automatically by filename and uploaded to the cloud.
                </p>

                <div className="space-y-6">
                    <div className="relative group">
                        <input 
                            type="file" 
                            // @ts-ignore
                            webkitdirectory="" 
                            directory="" 
                            multiple 
                            onChange={handleAudioFolder}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition-colors ${audioFiles.length > 0 ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-slate-600 bg-slate-900/50 group-hover:border-indigo-500/30 group-hover:bg-slate-800/50'}`}>
                            <Headphones className={`w-8 h-8 mb-3 ${audioFiles.length > 0 ? 'text-indigo-400' : 'text-slate-500'}`} />
                            <span className="font-semibold text-slate-200">
                                {audioFiles.length > 0 ? 'Audio Folder Selected' : 'Select Audio Folder'}
                            </span>
                            {audioFiles.length > 0 && (
                                <span className="text-sm text-slate-400 mt-1">{audioFiles.length} valid audio files found</span>
                            )}
                        </div>
                    </div>

                    <div className="relative group">
                        <input 
                            type="file" 
                            // @ts-ignore
                            webkitdirectory="" 
                            directory="" 
                            multiple 
                            onChange={handleTranscriptFolder}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition-colors ${transcriptFiles.length > 0 ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-slate-600 bg-slate-900/50 group-hover:border-indigo-500/30 group-hover:bg-slate-800/50'}`}>
                            <BookOpen className={`w-8 h-8 mb-3 ${transcriptFiles.length > 0 ? 'text-indigo-400' : 'text-slate-500'}`} />
                            <span className="font-semibold text-slate-200">
                                {transcriptFiles.length > 0 ? 'Transcript Folder Selected' : 'Select Transcripts Folder'}
                            </span>
                            {transcriptFiles.length > 0 && (
                                <span className="text-sm text-slate-400 mt-1">{transcriptFiles.length} valid JSON files found</span>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm overflow-hidden break-words">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleStart}
                        disabled={!audioFiles.length || !transcriptFiles.length || isProcessing}
                        className="w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all relative overflow-hidden flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30"
                    >
                        {isProcessing && (
                            <div className="absolute inset-0 bg-indigo-400/20" style={{ width: `${uploadProgress}%`, transition: 'width 0.3s ease' }} />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                            {isProcessing ? `Processing... ${uploadProgress}%` : 'Upload & Build Course'}
                            {!isProcessing && <Play className="w-5 h-5 fill-current" />}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};
