import { featuresToMood } from './recommendation'

/**
 * ?????
 * ?????:??? + ???????? (?????????)
 * emotion: { valence, arousal } ??????
 * dominantMood: ?????? (? face-api ?????)
 */
export const localSongs = [
  {
    id: 'local-1',
    title: '???? (Happy Upbeat)',
    artist: '????',
    url: 'songs/happy_upbeat.wav',
    cover: '??',
    source: 'local',
    features: { tempo: 140, rms: 0.18, centroid: 3200, zcr: 0.08, spectralFlux: 1200, lowHighRatio: 0.8 },
    emotion: { valence: 0.72, arousal: 0.65 },
    dominantMood: 'happy'
  },
  {
    id: 'local-2',
    title: '???? (Sad Slow)',
    artist: '????',
    url: 'songs/sad_slow.wav',
    cover: '??',
    source: 'local',
    features: { tempo: 65, rms: 0.06, centroid: 900, zcr: 0.02, spectralFlux: 200, lowHighRatio: 4.5 },
    emotion: { valence: -0.68, arousal: -0.55 },
    dominantMood: 'sad'
  },
  {
    id: 'local-3',
    title: '???? (Energetic Rock)',
    artist: '????',
    url: 'songs/energetic_rock.wav',
    cover: '??',
    source: 'local',
    features: { tempo: 150, rms: 0.25, centroid: 2800, zcr: 0.12, spectralFlux: 1800, lowHighRatio: 1.2 },
    emotion: { valence: 0.55, arousal: 0.92 },
    dominantMood: 'angry'
  },
  {
    id: 'local-4',
    title: '???? (Calm Relaxing)',
    artist: '????',
    url: 'songs/calm_relaxing.wav',
    cover: '??',
    source: 'local',
    features: { tempo: 70, rms: 0.05, centroid: 1100, zcr: 0.025, spectralFlux: 150, lowHighRatio: 4.0 },
    emotion: { valence: -0.15, arousal: -0.62 },
    dominantMood: 'neutral'
  },
  {
    id: 'local-5',
    title: '???? (Mysterious)',
    artist: '????',
    url: 'songs/mysterious.wav',
    cover: '??',
    source: 'local',
    features: { tempo: 90, rms: 0.1, centroid: 1600, zcr: 0.04, spectralFlux: 500, lowHighRatio: 2.5 },
    emotion: { valence: -0.3, arousal: -0.1 },
    dominantMood: 'fearful'
  },
  {
    id: 'local-6',
    title: '???? (Angry Intense)',
    artist: '????',
    url: 'songs/angry_intense.wav',
    cover: '??',
    source: 'local',
    features: { tempo: 160, rms: 0.28, centroid: 2600, zcr: 0.15, spectralFlux: 2200, lowHighRatio: 1.5 },
    emotion: { valence: -0.45, arousal: 0.95 },
    dominantMood: 'angry'
  }
]

/**
 * iTunes Search API (?? CORS,?? 30 ???)
 * https://itunes.apple.com/search
 */
const ITUNES_API = 'https://itunes.apple.com/search'

// ?? -> iTunes ????? (??/??)
export const emotionToKeywords = {
  happy: ['happy pop', 'upbeat', 'dance', 'joyful'],
  sad: ['sad piano', 'melancholic', 'blues', 'slow ballad'],
  angry: ['heavy metal', 'hard rock', 'aggressive', 'rage'],
  fearful: ['ambient dark', 'suspense', 'cinematic tension'],
  disgusted: ['industrial', 'dark electronic'],
  surprised: ['electronic dance', 'experimental'],
  neutral: ['chill', 'lofi', 'ambient', 'relaxing']
}

export async function searchItunes(keyword, limit = 12) {
  const url = `${ITUNES_API}?term=${encodeURIComponent(keyword)}&media=music&limit=${limit}`
  const res = await fetch(url)
  const data = await res.json()
  return data.results.map(item => ({
    id: 'itunes-' + item.trackId,
    title: item.trackName,
    artist: item.artistName,
    url: item.previewUrl,
    cover: item.artworkUrl100 || item.artworkUrl60,
    source: 'itunes',
    collection: item.collectionName,
    // iTunes ???????,???????????
    emotion: inferEmotionFromKeyword(keyword),
    dominantMood: featuresToMood(inferEmotionFromKeyword(keyword))
  })).filter(s => s.url)
}

function inferEmotionFromKeyword(kw) {
  const k = kw.toLowerCase()
  if (k.includes('happy') || k.includes('dance') || k.includes('upbeat')) return { valence: 0.7, arousal: 0.6 }
  if (k.includes('sad') || k.includes('blues') || k.includes('ballad')) return { valence: -0.7, arousal: -0.3 }
  if (k.includes('metal') || k.includes('rock') || k.includes('rage')) return { valence: -0.3, arousal: 0.8 }
  if (k.includes('dark') || k.includes('suspense')) return { valence: -0.6, arousal: 0.3 }
  if (k.includes('chill') || k.includes('lofi') || k.includes('ambient')) return { valence: 0.1, arousal: -0.4 }
  if (k.includes('electronic')) return { valence: 0.3, arousal: 0.7 }
  return { valence: 0, arousal: 0 }
}

export function getAllLocalSongs() {
  return [...localSongs]
}
