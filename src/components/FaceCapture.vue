<template>
  <div class="card">
    <h2>
      <span>?? ??????</span>
      <span class="badge" v-if="loaded">?????</span>
      <span class="badge" style="background:var(--warning)" v-else-if="loading">???...</span>
    </h2>

    <!-- ?????? -->
    <div class="input-tabs">
      <div class="tab" :class="{active: mode==='image'}" @click="switchMode('image')">??? ??</div>
      <div class="tab" :class="{active: mode==='video'}" @click="switchMode('video')">?? ????</div>
      <div class="tab" :class="{active: mode==='camera'}" @click="switchMode('camera')">?? ?????</div>
      <div class="tab" :class="{active: mode==='screen'}" @click="switchMode('screen')">??? ????</div>
    </div>

    <!-- ???? -->
    <div v-if="mode==='image'">
      <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="onImageFile">
      <div class="row" style="margin-bottom:10px">
        <button class="btn primary" @click="$refs.fileInput.click()">?? ????</button>
        <button class="btn" @click="detectImage" :disabled="!imgLoaded">?? ????</button>
      </div>
      <div class="media-box">
        <img v-if="imgSrc" :src="imgSrc" ref="imgEl" @load="imgLoaded=true">
        <canvas ref="overlay" class="overlay-canvas"></canvas>
        <div class="placeholder" v-if="!imgSrc">??????????????,?????????</div>
      </div>
    </div>

    <!-- ?????? -->
    <div v-if="mode==='video'">
      <input ref="videoInput" type="file" accept="video/*" style="display:none" @change="onVideoFile">
      <div class="row" style="margin-bottom:10px">
        <button class="btn primary" @click="$refs.videoInput.click()">?? ????</button>
        <button class="btn success" @click="toggleVideoDetect" :disabled="!videoLoaded">
          {{ videoDetecting ? '? ????' : '? ????' }}
        </button>
      </div>
      <div class="media-box">
        <video ref="videoEl" v-if="videoSrc" :src="videoSrc" controls playsinline @loadedmetadata="videoLoaded=true" @play="onVideoPlay"></video>
        <canvas ref="overlay" class="overlay-canvas"></canvas>
        <div class="placeholder" v-if="!videoSrc">?????????????</div>
      </div>
    </div>

    <!-- ????? -->
    <div v-if="mode==='camera'">
      <div class="row" style="margin-bottom:10px">
        <button class="btn primary" @click="startCamera" :disabled="cameraOn">?? ?????</button>
        <button class="btn danger" @click="stopCamera" :disabled="!cameraOn">? ??</button>
        <button class="btn success" @click="toggleCameraDetect" :disabled="!cameraOn">
          {{ cameraDetecting ? '? ????' : '? ????' }}
        </button>
      </div>
      <div class="media-box">
        <video ref="cameraEl" autoplay playsinline muted></video>
        <canvas ref="overlay" class="overlay-canvas"></canvas>
        <div class="placeholder" v-if="!cameraOn">??"?????"??????????</div>
      </div>
    </div>

    <!-- ?????? -->
    <div v-if="mode==='screen'">
      <div class="row" style="margin-bottom:10px">
        <button class="btn primary" @click="startScreen" :disabled="screenOn">??? ??????</button>
        <button class="btn danger" @click="stopScreen" :disabled="!screenOn">? ??</button>
        <button class="btn success" @click="toggleScreenDetect" :disabled="!screenOn">
          {{ screenDetecting ? '? ??' : '? ????' }}
        </button>
      </div>
      <div class="media-box">
        <video ref="screenEl" autoplay playsinline muted></video>
        <canvas ref="overlay" class="overlay-canvas"></canvas>
        <div class="placeholder" v-if="!screenOn">????,?????????????</div>
      </div>
    </div>

    <div class="status-line">
      <span class="status-dot" :class="statusClass"></span>
      <span>{{ statusText }}</span>
    </div>

    <!-- ???? -->
    <div class="mt-16">
      <div class="muted" style="font-size:12px;margin-bottom:8px">?? ????(??????):</div>
      <div class="sample-faces">
        <div class="sample-face" v-for="s in samples" :key="s.src" @click="useSample(s)">
          <img :src="s.src" :alt="s.label">
          <span class="emo-tag">{{ s.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useFaceApi, EMOTION_LABELS, EMOTION_EMOJI } from '../composables/useFaceApi'

const props = defineProps({
  samples: { type: Array, default: () => [] }
})
const emit = defineEmits(['emotion'])

const { loaded, loading, loadModels, detectEmotion, detectAllEmotions, drawEmotion } = useFaceApi()

const mode = ref('image')
const imgSrc = ref('')
const imgLoaded = ref(false)
const videoSrc = ref('')
const videoLoaded = ref(false)
const cameraOn = ref(false)
const screenOn = ref(false)
const videoDetecting = ref(false)
const cameraDetecting = ref(false)
const screenDetecting = ref(false)

const statusText = ref('????')
const statusClass = ref('')

const imgEl = ref(null)
const videoEl = ref(null)
const cameraEl = ref(null)
const screenEl = ref(null)
const overlay = ref(null)
const fileInput = ref(null)
const videoInput = ref(null)

let rafId = null
let videoRafId = null

onMounted(() => {
  loadModels().then(() => {
    statusText.value = '??????,?????'
    statusClass.value = 'ok'
  }).catch(() => {
    statusText.value = '??????,?????'
    statusClass.value = 'err'
  })
})

onBeforeUnmount(() => {
  stopCamera()
  stopScreen()
  if (rafId) cancelAnimationFrame(rafId)
  if (videoRafId) cancelAnimationFrame(videoRafId)
})

function getActiveMedia() {
  if (mode.value === 'image') return imgEl.value
  if (mode.value === 'video') return videoEl.value
  if (mode.value === 'camera') return cameraEl.value
  if (mode.value === 'screen') return screenEl.value
  return null
}

function emitResult(result) {
  if (!result) {
    emit('emotion', null)
    return
  }
  emit('emotion', {
    dominant: result.dominant,
    expressions: result.expressions,
    label: EMOTION_LABELS[result.dominant],
    emoji: EMOTION_EMOJI[result.dominant]
  })
}

async function runDetection(media, multi = false) {
  if (!media) return
  try {
    const results = multi ? await detectAllEmotions(media) : [await detectEmotion(media)].filter(Boolean)
    if (overlay.value && results.length) {
      drawEmotion(overlay.value, media, results)
    }
    if (results.length) {
      // ???????????????
      const best = results.reduce((a, b) =>
        a.expressions[a.dominant] > b.expressions[b.dominant] ? a : b
      )
      emitResult(best)
      return best
    } else {
      emitResult(null)
      return null
    }
  } catch (e) {
    console.error(e)
  }
}

// ??
function onImageFile(e) {
  const f = e.target.files[0]
  if (!f) return
  imgSrc.value = URL.createObjectURL(f)
  imgLoaded.value = false
}

async function detectImage() {
  const media = getActiveMedia()
  if (!media) return
  statusText.value = '????...'
  statusClass.value = 'warn'
  const r = await runDetection(media, true)
  if (r) {
    statusText.value = `???:${EMOTION_LABELS[r.dominant]}`
    statusClass.value = 'ok'
  } else {
    statusText.value = '??????'
    statusClass.value = 'err'
  }
}

function useSample(s) {
  mode.value = 'image'
  imgSrc.value = s.src
  imgLoaded.value = true
  nextTick(() => {
    // ???????
    const el = imgEl.value
    if (el && el.complete) detectImage()
    else el.onload = detectImage
  })
}

// ????
function onVideoFile(e) {
  const f = e.target.files[0]
  if (!f) return
  videoSrc.value = URL.createObjectURL(f)
  videoLoaded.value = false
  stopVideoLoop()
}

function onVideoPlay() {
  if (videoDetecting.value) startVideoLoop()
}

function toggleVideoDetect() {
  videoDetecting.value = !videoDetecting.value
  if (videoDetecting.value) startVideoLoop()
  else stopVideoLoop()
}

function startVideoLoop() {
  const media = videoEl.value
  if (!media) return
  const loop = async () => {
    if (!videoDetecting.value) return
    if (!media.paused) {
      await runDetection(media, true)
    }
    videoRafId = requestAnimationFrame(loop)
  }
  loop()
}

function stopVideoLoop() {
  if (videoRafId) cancelAnimationFrame(videoRafId)
}

// ???
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
    cameraEl.value.srcObject = stream
    cameraOn.value = true
    statusText.value = '??????'
    statusClass.value = 'ok'
  } catch (e) {
    statusText.value = '???????: ' + e.message
    statusClass.value = 'err'
  }
}

function stopCamera() {
  if (cameraEl.value && cameraEl.value.srcObject) {
    cameraEl.value.srcObject.getTracks().forEach(t => t.stop())
    cameraEl.value.srcObject = null
  }
  cameraOn.value = false
  cameraDetecting.value = false
}

function toggleCameraDetect() {
  cameraDetecting.value = !cameraDetecting.value
  if (cameraDetecting.value) startCameraLoop()
}

function startCameraLoop() {
  const media = cameraEl.value
  const loop = async () => {
    if (!cameraDetecting.value || !cameraOn.value) return
    await runDetection(media, true)
    rafId = requestAnimationFrame(loop)
  }
  loop()
}

// ????
async function startScreen() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
    screenEl.value.srcObject = stream
    screenOn.value = true
    stream.getVideoTracks()[0].onended = () => { screenOn.value = false; screenDetecting.value = false }
    statusText.value = '???????'
    statusClass.value = 'ok'
  } catch (e) {
    statusText.value = '??????: ' + e.message
    statusClass.value = 'err'
  }
}

function stopScreen() {
  if (screenEl.value && screenEl.value.srcObject) {
    screenEl.value.srcObject.getTracks().forEach(t => t.stop())
    screenEl.value.srcObject = null
  }
  screenOn.value = false
  screenDetecting.value = false
}

function toggleScreenDetect() {
  screenDetecting.value = !screenDetecting.value
  if (screenDetecting.value) startScreenLoop()
}

function startScreenLoop() {
  const media = screenEl.value
  const loop = async () => {
    if (!screenDetecting.value || !screenOn.value) return
    await runDetection(media, true)
    rafId = requestAnimationFrame(loop)
  }
  loop()
}

function switchMode(m) {
  // ????????
  if (mode.value === 'camera') stopCamera()
  if (mode.value === 'screen') stopScreen()
  stopVideoLoop()
  mode.value = m
  statusText.value = `????${ {image:'??',video:'??',camera:'???',screen:'??'}[m] }??`
  statusClass.value = ''
}
</script>
