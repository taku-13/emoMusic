import * as faceapi from 'face-api.js'
import { ref } from 'vue'

/**
 * ?????? composable
 * ??:face-api.js (?? TensorFlow.js)
 *  - ????:TinyFaceDetector (??? SSD ??,???,????)
 *  - ????:FaceExpressionNet (CNN ???)
 *    ????:neutral(??), happy(??), sad(??), angry(??),
 *              fearful(??), disgusted(??), surprised(??)
 */

const MODEL_URL = 'models'
const loaded = ref(false)
const loading = ref(false)
const loadError = ref('')

export const EMOTION_LABELS = {
  neutral: '??',
  happy: '??',
  sad: '??',
  angry: '??',
  fearful: '??',
  disgusted: '??',
  surprised: '??'
}

export const EMOTION_EMOJI = {
  neutral: '??',
  happy: '??',
  sad: '??',
  angry: '??',
  fearful: '??',
  disgusted: '??',
  surprised: '??'
}

// ?? -> ?????? (valence ??, arousal ???) ?? [-1, 1]
// ???????????
export const EMOTION_VA = {
  neutral:   { valence: 0.0, arousal: 0.0 },
  happy:     { valence: 0.8, arousal: 0.5 },
  sad:       { valence: -0.8, arousal: -0.4 },
  angry:     { valence: -0.7, arousal: 0.8 },
  fearful:   { valence: -0.6, arousal: 0.6 },
  disgusted: { valence: -0.7, arousal: 0.1 },
  surprised: { valence: 0.2, arousal: 0.9 }
}

let loadPromise = null

export function loadModels() {
  if (loadPromise) return loadPromise
  if (loaded.value) return Promise.resolve()
  loading.value = true
  loadError.value = ''
  loadPromise = Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
  ]).then(() => {
    loaded.value = true
    loading.value = false
  }).catch((err) => {
    loadError.value = '??????: ' + err.message
    loading.value = false
    loadPromise = null
    throw err
  })
  return loadPromise
}

/**
 * ???/????????????
 * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement} input
 * @returns {Promise<{expressions: object, dominant: string, box: object}|null>}
 */
export async function detectEmotion(input) {
  if (!loaded.value) await loadModels()
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.3
  })
  const result = await faceapi
    .detectSingleFace(input, options)
    .withFaceLandmarks()
    .withFaceExpressions()
  if (!result) return null
  return {
    expressions: result.expressions,
    dominant: result.expressions.asSortedArray()[0].expression,
    box: result.detection.box
  }
}

/**
 * ???????(???????)
 */
export async function detectAllEmotions(input) {
  if (!loaded.value) await loadModels()
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.3
  })
  const results = await faceapi
    .detectAllFaces(input, options)
    .withFaceLandmarks()
    .withFaceExpressions()
  return results.map(r => ({
    expressions: r.expressions,
    dominant: r.expressions.asSortedArray()[0].expression,
    box: r.detection.box
  }))
}

/**
 * ? canvas ???????????
 */
export function drawEmotion(canvas, input, results) {
  const dims = faceapi.matchDimensions(canvas, input, true)
  const resized = faceapi.resizeResults(results, dims)
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  resized.forEach(r => {
    const { x, y, width, height } = r.box
    ctx.strokeStyle = '#8b5cf6'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, width, height)
    ctx.fillStyle = 'rgba(139, 92, 246, 0.85)'
    const label = `${EMOTION_LABELS[r.dominant]} ${EMOTION_EMOJI[r.dominant]}`
    ctx.font = '14px sans-serif'
    const tw = ctx.measureText(label).width + 12
    ctx.fillRect(x, y - 22, tw, 20)
    ctx.fillStyle = '#fff'
    ctx.fillText(label, x + 6, y - 7)
  })
}

export function useFaceApi() {
  return {
    loaded,
    loading,
    loadError,
    loadModels,
    detectEmotion,
    detectAllEmotions,
    drawEmotion,
    EMOTION_LABELS,
    EMOTION_EMOJI,
    EMOTION_VA
  }
}
