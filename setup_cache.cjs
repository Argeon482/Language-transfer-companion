const fs = require('fs');

// 1. Update App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(
    '<Player \n              key={activeLesson.id} \n              audioUrl={activeLesson.audioUrl} \n              lessonName={activeLesson.name}',
    '<Player \n              key={activeLesson.id} \n              lessonId={activeLesson.id}\n              audioUrl={activeLesson.audioUrl} \n              lessonName={activeLesson.name}'
);
appCode = appCode.replace(
    '<Player               key={activeLesson.id}               audioUrl={activeLesson.audioUrl}               lessonName={activeLesson.name}',
    '<Player               key={activeLesson.id}               lessonId={activeLesson.id}               audioUrl={activeLesson.audioUrl}               lessonName={activeLesson.name}'
);
fs.writeFileSync('src/App.tsx', appCode);

// 2. Update Player.tsx
let playerCode = fs.readFileSync('src/components/Player.tsx', 'utf8');

// Add localforage import
if (!playerCode.includes("import localforage")) {
    playerCode = playerCode.replace("import React, { useState, useRef, useEffect, useMemo } from 'react';", "import React, { useState, useRef, useEffect, useMemo } from 'react';\nimport localforage from 'localforage';\n");
}

// Update Props interface
playerCode = playerCode.replace(
    'audioUrl: string;\n    lessonName: string;',
    'audioUrl: string;\n    lessonId: string;\n    lessonName: string;'
);
playerCode = playerCode.replace(
    'audioUrl: string;    lessonName: string;',
    'audioUrl: string;    lessonId: string;    lessonName: string;'
);

// Update Component signature
playerCode = playerCode.replace(
    'export const Player = ({ audioUrl, lessonName',
    'export const Player = ({ audioUrl, lessonId, lessonName'
);

// Inject caching logic state and useEffect
const cacheLogic = `    const audioRef = useRef<HTMLAudioElement>(null);
    const [localAudioUrl, setLocalAudioUrl] = useState<string | null>(null);

    useEffect(() => {
        let isActive = true;
        let objectUrl: string | null = null;

        const loadAudio = async () => {
            if (!lessonId || !audioUrl) return;
            
            try {
                // 1. Check local cache
                const cachedBlob = await localforage.getItem<Blob>(\`audio-\${lessonId}\`);
                if (cachedBlob && isActive) {
                    objectUrl = URL.createObjectURL(cachedBlob);
                    setLocalAudioUrl(objectUrl);
                    return;
                }

                // 2. Not in cache, stream from cloud immediately
                if (isActive) {
                    setLocalAudioUrl(audioUrl);
                }

                // 3. Download in background for future use
                const response = await fetch(audioUrl);
                if (response.ok) {
                    const blob = await response.blob();
                    await localforage.setItem(\`audio-\${lessonId}\`, blob);
                }
            } catch (err) {
                console.warn("Failed to cache audio locally:", err);
                if (isActive && !localAudioUrl) {
                    setLocalAudioUrl(audioUrl);
                }
            }
        };

        loadAudio();

        return () => {
            isActive = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [audioUrl, lessonId]);`;

playerCode = playerCode.replace('    const audioRef = useRef<HTMLAudioElement>(null);', cacheLogic);

// Update audio src
playerCode = playerCode.replace(/src=\{audioUrl\}/g, 'src={localAudioUrl || ""}');

fs.writeFileSync('src/components/Player.tsx', playerCode);
console.log("Caching logic injected!");
