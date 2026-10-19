// Compresses the start page video from the WordPress export (uploads/2026/04/Strike-a-4.mp4, 53 MB)
// into web versions in public/video/, plus a poster frame shown while it loads.
// The picture is unchanged (the "WILSON DANCE FACTORY" wordmark is part of the video); sound is removed,
// as the video always plays muted.
// Usage: npm run compress-video

import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import ffmpeg from 'ffmpeg-static';

const SRC = 'uploads/2026/04/Strike-a-4.mp4';
const OUT = 'public/video';
mkdirSync(OUT, { recursive: true });

const run = (args) => execFileSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });
const mb = (f) => (statSync(f).size / 1e6).toFixed(1) + ' MB';

const versions = [
  { name: 'startsida-1920.mp4', width: 1920, crf: 32 },
  { name: 'startsida-1280.mp4', width: 1280, crf: 31 },
];

for (const v of versions) {
  const dest = `${OUT}/${v.name}`;
  run([
    '-i', SRC,
    '-an',
    '-vf', `scale=${v.width}:-2`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(v.crf),
    '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-movflags', '+faststart',
    dest,
  ]);
  console.log(`${dest}  ${mb(dest)}`);
}

const poster = `${OUT}/startsida-poster.jpg`;
run(['-ss', '1', '-i', SRC, '-frames:v', '1', '-vf', 'scale=1920:-2', '-q:v', '4', poster]);
console.log(`${poster}  ${mb(poster)}`);
