/**
 * ???????? (?? Web Audio API)
 *
 * ????:
 *  1. ???? -> ??? PCM (???? 22050Hz ???)
 *  2. ?? (frame=2048, hop=512)
 *  3. ????:
 *     - Tempo (BPM):?? onset envelope + ??? (autocorrelation) ????
 *     - Energy (RMS):????,????/??
 *     - Spectral Centroid:????,???????(????)
 *     - Spectral Flux:????,??????????
 *     - Zero Crossing Rate:???,??????/??
 *     - Low/High Energy Ratio:??????,??????
 *  4. ????????? (Valence-Arousal):
 *     - Arousal(???) ? f(Energy, Tempo, Flux)   ?->??/??  ?->??/??
 *     - Valence(??)   ? f(Centroid, ZCR, Tempo)   ?->??/??  ?->??/??
 */

export async function decodeAudio(url) {
  const res = await fetch(url)
  const buf = await res.arrayBuffer()
  const AC = window.AudioContext || window.webkitAudioContext
  const actx = new AC()
  const audioBuffer = await actx.decodeAudioData(buf.slice(0))
  actx.close()
  return audioBuffer
}

// ?????????
function resample(buffer, targetSr) {
  if (buffer.sampleRate === targetSr) return buffer
  const AC = window.AudioContext || window.webkitAudioContext
  const actx = new AC()
  const offline = new OfflineAudioContext(
    buffer.numberOfChannels,
    Math.ceil(buffer.length * targetSr / buffer.sampleRate),
    targetSr
  )
  const src = offline.createBufferSource()
  src.buffer = buffer
  src.connect(offline.destination)
  src.start()
  return offline.startRendering().then(r => { actx.close(); return r })
}

function toMono(buffer) {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0)
  const ch0 = buffer.getChannelData(0)
  const ch1 = buffer.getChannelData(1)
  const len = Math.min(ch0.length, ch1.length)
  const out = new Float32Array(len)
  for (let i = 0; i < len; i++) out[i] = (ch0[i] + ch1[i]) * 0.5
  return out
}

// ??????? (?? FFT,?? Web Audio ????? FFT,???)
// ???? FFT (Cooley-Tukey radix-2)
function fft(re, im) {
  const n = re.length
  // bit reversal
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]]
      [im[i], im[j]] = [im[j], im[i]]
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len
    const wlenRe = Math.cos(ang), wlenIm = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let wRe = 1, wIm = 0
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[i + k], uIm = im[i + k]
        const vRe = re[i + k + len / 2] * wRe - im[i + k + len / 2] * wIm
        const vIm = re[i + k + len / 2] * wIm + im[i + k + len / 2] * wRe
        re[i + k] = uRe + vRe
        im[i + k] = uIm + vIm
        re[i + k + len / 2] = uRe - vRe
        im[i + k + len / 2] = uIm - vIm
        const nwRe = wRe * wlenRe - wIm * wlenIm
        wIm = wRe * wlenIm + wIm * wlenRe
        wRe = nwRe
      }
    }
  }
}

/**
 * ??????,????????
 */
export async function analyzeAudio(url) {
  const buffer = await decodeAudio(url)
  const targetSr = 22050
  const resampled = buffer.sampleRate === targetSr ? buffer : await resample(buffer, targetSr)
  const mono = toMono(resampled)
  const sr = targetSr
  const frameSize = 2048
  const hop = 512
  const numFrames = Math.floor((mono.length - frameSize) / hop)

  let rmsSum = 0
  let zcrSum = 0
  let centroidSum = 0
  let fluxSum = 0
  let lowEnergySum = 0
  let highEnergySum = 0
  const onsetEnv = new Float32Array(numFrames)
  let prevMag = null

  const re = new Float32Array(frameSize)
  const im = new Float32Array(frameSize)

  for (let f = 0; f < numFrames; f++) {
    const start = f * hop
    // RMS & ZCR
    let sumSq = 0, zc = 0
    for (let i = 0; i < frameSize; i++) {
      const s = mono[start + i]
      sumSq += s * s
      re[i] = s
      im[i] = 0
      if (i > 0 && ((s >= 0) !== (mono[start + i - 1] >= 0))) zc++
    }
    const rms = Math.sqrt(sumSq / frameSize)
    rmsSum += rms
    zcrSum += zc / frameSize

    // windowing (Hann)
    for (let i = 0; i < frameSize; i++) {
      const w = 0.5 * (1 - Math.cos(2 * Math.PI * i / (frameSize - 1)))
      re[i] = re[i] * w
    }
    fft(re, im)

    const mag = new Float32Array(frameSize / 2)
    let totalMag = 0, weightedFreq = 0, lowE = 0, highE = 0
    const binHz = sr / frameSize
    for (let i = 0; i < frameSize / 2; i++) {
      mag[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i])
      totalMag += mag[i]
      weightedFreq += mag[i] * i * binHz
      if (i * binHz < 500) lowE += mag[i]
      else if (i * binHz > 2000) highE += mag[i]
    }
    centroidSum += totalMag > 0 ? weightedFreq / totalMag : 0
    lowEnergySum += lowE
    highEnergySum += highE

    // spectral flux
    let flux = 0
    if (prevMag) {
      for (let i = 0; i < frameSize / 2; i++) {
        const d = mag[i] - prevMag[i]
        if (d > 0) flux += d
      }
    }
    fluxSum += flux
    onsetEnv[f] = flux
    prevMag = mag
  }

  const n = numFrames
  const rms = rmsSum / n
  const zcr = zcrSum / n
  const centroid = centroidSum / n
  const flux = fluxSum / n
  const lowHighRatio = highEnergySum > 0 ? lowEnergySum / highEnergySum : 1

  // Tempo estimation via autocorrelation of onset envelope
  const tempo = estimateTempo(onsetEnv, sr / hop)

  // ???? [0,1]
  const normRMS = Math.min(1, rms / 0.3)
  const normCentroid = Math.min(1, centroid / 4000)
  const normZCR = Math.min(1, zcr * 10)
  const normTempo = Math.min(1, tempo / 180)
  const normFlux = Math.min(1, flux / 2000)

  // ??? Valence-Arousal ([-1, 1])
  // Arousal: ?? + ?? + ????
  const arousal = -1 + 2 * (0.4 * normRMS + 0.35 * normTempo + 0.25 * normFlux)
  // Valence: ??? + ??? + ?? (?+??=??)
  const valence = -1 + 2 * (0.45 * normCentroid + 0.3 * normZCR + 0.25 * normTempo)

  return {
    tempo: Math.round(tempo),
    rms: +rms.toFixed(4),
    centroid: Math.round(centroid),
    zcr: +zcr.toFixed(4),
    spectralFlux: +flux.toFixed(2),
    lowHighRatio: +lowHighRatio.toFixed(3),
    arousal: clamp(arousal, -1, 1),
    valence: clamp(valence, -1, 1)
  }
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

function estimateTempo(onset, sr) {
  const len = onset.length
  let mean = 0
  for (let i = 0; i < len; i++) mean += onset[i]
  mean /= len
  // ???
  const env = new Float32Array(len)
  for (let i = 0; i < len; i++) env[i] = onset[i] - mean

  // ???,?? 60~200 BPM ?????
  const minLag = Math.floor(sr * 60 / 200)  // 200 BPM
  const maxLag = Math.floor(sr * 60 / 60)   // 60 BPM
  let bestLag = minLag, bestCorr = -Infinity
  for (let lag = minLag; lag <= Math.min(maxLag, len - 1); lag++) {
    let corr = 0
    for (let i = 0; i < len - lag; i++) corr += env[i] * env[i + lag]
    if (corr > bestCorr) { bestCorr = corr; bestLag = lag }
  }
  const bpm = 60 * sr / bestLag
  return clamp(bpm, 40, 220)
}
