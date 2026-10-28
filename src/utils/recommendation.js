import { EMOTION_VA } from '../composables/useFaceApi'

/**
 * ???? (???? + ????)
 *
 * ??:
 *  1. ???????? Valence-Arousal ???? (?? EMOTION_VA)
 *  2. ???????? VA ?? (??????)
 *  3. ???????:
 *     - ???? d = sqrt((?v)^2 + (?a)^2)  -> ???? [0,1] ??????
 *     - cosineSim = cos(theta) ???????
 *     - ????? score = 0.6 * (1 - d_norm) + 0.4 * cosineSim
 *  4. ????:? dominant ???????? +0.15 (????)
 *  5. ???????,? Top-N
 *
 * ??????????:
 *  - 'match'  ????:???????????? (??)
 *  - 'lift'   ????:?? Valence ????? (????????)
 */

export function euclideanDist(a, b) {
  const dv = a.valence - b.valence
  const da = a.arousal - b.arousal
  return Math.sqrt(dv * dv + da * da)
}

export function cosineSim(a, b) {
  const dot = a.valence * b.valence + a.arousal * b.arousal
  const na = Math.sqrt(a.valence ** 2 + a.arousal ** 2)
  const nb = Math.sqrt(b.valence ** 2 + b.arousal ** 2)
  if (na === 0 || nb === 0) return 0
  return dot / (na * nb)
}

/**
 * ???????????????? [0,1]
 */
export function computeScore(song, targetVA, dominantEmotion, mode = 'match') {
  const sv = song.emotion || { valence: 0, arousal: 0 }

  // ??????:??????????
  let goal = targetVA
  if (mode === 'lift') {
    goal = {
      valence: clamp(targetVA.valence + 0.5, -1, 1),
      arousal: targetVA.arousal
    }
  }

  const dist = euclideanDist(sv, goal)
  const dNorm = Math.min(1, dist / 2) // VA ??????? 2*sqrt(2)?2.83,? 2 ???
  const cos = (cosineSim(sv, goal) + 1) / 2 // [-1,1] -> [0,1]

  let score = 0.55 * (1 - dNorm) + 0.45 * cos

  // ??????????
  if (song.dominantMood === dominantEmotion) score += 0.15

  return clamp(score, 0, 1)
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

/**
 * ?????????? Top-N
 */
export function recommend(songs, faceEmotion, faceExpressions, options = {}) {
  const { topN = 12, mode = 'match' } = options
  const targetVA = EMOTION_VA[faceEmotion] || { valence: 0, arousal: 0 }

  const scored = songs.map(song => {
    const score = computeScore(song, targetVA, faceEmotion, mode)
    return { ...song, matchScore: score }
  })

  scored.sort((a, b) => b.matchScore - a.matchScore)
  return scored.slice(0, topN)
}

/**
 * ??????????????? (????)
 */
export function featuresToMood(features) {
  const { valence, arousal } = features
  if (arousal > 0.3 && valence > 0.2) return 'happy'
  if (arousal > 0.3 && valence < -0.2) return 'angry'
  if (arousal < -0.2 && valence < -0.2) return 'sad'
  if (arousal > 0.5 && Math.abs(valence) < 0.3) return 'surprised'
  if (arousal < -0.2 && valence > 0.1) return 'neutral'
  if (valence < -0.3) return 'disgusted'
  if (arousal > 0.2 && valence < 0) return 'fearful'
  return 'neutral'
}
