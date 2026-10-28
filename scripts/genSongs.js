// ???????? (WAV),??????????????????
// ??: node scripts/genSongs.js
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'public', 'songs')
fs.mkdirSync(outDir, { recursive: true })

const SR = 22050

function writeWav(filename, samples) {
  const buf = Buffer.alloc(44 + samples.length * 2)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + samples.length * 2, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20) // PCM
  buf.writeUInt16LE(1, 22) // mono
  buf.writeUInt32LE(SR, 24)
  buf.writeUInt32LE(SR * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(samples.length * 2, 40)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2)
  }
  fs.writeFileSync(path.join(outDir, filename), buf)
  console.log('generated', filename, (samples.length / SR).toFixed(1) + 's')
}

// ?? (ADSR)
function env(t, dur, attack = 0.02, release = 0.3) {
  if (t < attack) return t / attack
  if (t > dur - release) return Math.max(0, (dur - t) / release)
  return 1
}

// ???? (?? + ??)
function tone(freq, t, type = 'sine') {
  if (type === 'sine') return Math.sin(2 * Math.PI * freq * t)
  if (type === 'square') return Math.sign(Math.sin(2 * Math.PI * freq * t))
  if (type === 'triangle') return 2 * Math.abs(2 * (freq * t % 1) - 1) - 1
  if (type === 'sawtooth') return 2 * (freq * t - Math.floor(0.5 + freq * t))
  // ??????
  return Math.sin(2 * Math.PI * freq * t) +
         0.3 * Math.sin(2 * Math.PI * freq * 2 * t) +
         0.15 * Math.sin(2 * Math.PI * freq * 3 * t)
}

// ????
function generateSong({ bpm, scale, type, energy, duration, name }) {
  const beatDur = 60 / bpm
  const totalSamples = Math.floor(duration * SR)
  const samples = new Float32Array(totalSamples)

  // ??????
  const noteDur = beatDur * 0.5
  const notesPerBeat = 2

  for (let i = 0; i < Math.floor(duration / noteDur); i++) {
    const noteStart = i * noteDur
    const freq = scale[i % scale.length]
    const startSample = Math.floor(noteStart * SR)
    const noteSamples = Math.floor(noteDur * SR)
    for (let s = 0; s < noteSamples && startSample + s < totalSamples; s++) {
      const t = s / SR
      const e = env(t, noteDur)
      const amp = 0.3 * energy * e
      samples[startSample + s] += amp * tone(freq, t, type)
    }
  }

  // ?? (?????)
  if (energy > 0.6) {
    for (let b = 0; b < duration * bpm / 60; b++) {
      const beatStart = b * beatDur
      const startSample = Math.floor(beatStart * SR)
      const kickDur = 0.15
      const kickSamples = Math.floor(kickDur * SR)
      for (let s = 0; s < kickSamples && startSample + s < totalSamples; s++) {
        const t = s / SR
        const envK = Math.exp(-t * 30)
        const freq = 120 * Math.exp(-t * 20) + 40
        samples[startSample + s] += 0.5 * energy * envK * Math.sin(2 * Math.PI * freq * t)
      }
      // ???
      if (b % 2 === 1) {
        for (let s = 0; s < 0.05 * SR && startSample + s < totalSamples; s++) {
          const t = s / SR
          samples[startSample + s] += 0.15 * energy * Math.exp(-t * 60) * (Math.random() * 2 - 1)
        }
      }
    }
  }

  // ???
  for (let i = 0; i < totalSamples; i++) {
    samples[i] = Math.tanh(samples[i])
  }

  writeWav(name, samples)
}

// ???? (??) C major
const major = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25]
// ???? (??) A minor
const minor = [220.00, 246.94, 261.63, 293.66, 329.63, 392.00, 440.00, 493.88]
// ?? (??)
const low = [110.00, 123.47, 130.81, 146.83, 164.81, 196.00, 220.00, 246.94]
// ?? (??)
const high = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51]

const songs = [
  { name: 'happy_upbeat.wav', bpm: 140, scale: high, type: 'harmonic', energy: 0.85, duration: 20 },
  { name: 'sad_slow.wav', bpm: 65, scale: low, type: 'sine', energy: 0.3, duration: 20 },
  { name: 'energetic_rock.wav', bpm: 150, scale: major, type: 'sawtooth', energy: 0.95, duration: 20 },
  { name: 'calm_relaxing.wav', bpm: 70, scale: minor, type: 'sine', energy: 0.25, duration: 20 },
  { name: 'mysterious.wav', bpm: 90, scale: minor, type: 'triangle', energy: 0.45, duration: 20 },
  { name: 'angry_intense.wav', bpm: 160, scale: major, type: 'square', energy: 1.0, duration: 20 }
]

songs.forEach(generateSong)
console.log('done')
