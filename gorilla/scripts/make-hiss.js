// Generates assets/hiss.wav: "tssk" of a can opening + long fizz (procedural noise).
const fs = require('fs');
const rate = 22050;
const dur = 2.2;
const n = Math.floor(rate * dur);
const pcm = Buffer.alloc(n * 2);
let lp = 0;
for (let i = 0; i < n; i++) {
  const t = i / rate;
  const click = t < 0.05 ? Math.exp(-t * 90) * Math.sin(2 * Math.PI * 1800 * t) * 0.8 : 0;
  const env = t < 0.04 ? t / 0.04 : Math.exp(-(t - 0.04) * 1.5);
  const white = Math.random() * 2 - 1;
  lp += (white - lp) * 0.55; // soften
  const hiss = (white - lp * 0.5) * env * 0.55;
  const v = Math.max(-1, Math.min(1, click + hiss));
  pcm.writeInt16LE(Math.round(v * 32767), i * 2);
}
const h = Buffer.alloc(44);
h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8);
h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32);
h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
fs.writeFileSync(__dirname + '/../assets/hiss.wav', Buffer.concat([h, pcm]));
