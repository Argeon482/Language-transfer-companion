sed -i '/\/\/ Clean up object URL safely in strict mode/,/}, \[audioFile\]);/d' src/components/Player.tsx
sed -i 's/audioFile.name.replace(\/\\\\.\[^\/.\]+\$\/, "")/"Lesson"/g' src/components/Player.tsx
sed -i 's/audioFile.name/audioUrl/g' src/components/Player.tsx
