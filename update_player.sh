sed -i 's/audioFile: File;/audioUrl: string;/g' src/components/Player.tsx
sed -i 's/export const Player = ({ audioFile,/export const Player = ({ audioUrl,/g' src/components/Player.tsx
sed -i 's/const \[audioUrl, setAudioUrl\] = useState<string>('"''"');//g' src/components/Player.tsx
