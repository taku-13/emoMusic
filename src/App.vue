<template>
  <div class="app-shell">
    <header class="app-header">
      <div>
        <h1>🎵 EmoMusic — 人脸情绪识别歌曲推荐系统</h1>
        <div class="sub">Vue3 + face-api.js + Web Audio API · 纯前端本地运行</div>
      </div>
      <div class="header-actions">
        <button class="btn" @click="showDocs = !showDocs">
          {{ showDocs ? '收起文档' : '📖 算法文档' }}
        </button>
      </div>
    </header>

    <div class="grid grid-2">
      <FaceCapture :samples="sampleFaces" @emotion="onEmotion" />
      <EmotionPanel :emotion="emotion" />
    </div>

    <div class="grid grid-2 mt-16">
      <SongPanel :emotion="emotion" />
      <div v-if="showDocs">
        <DocsPanel />
      </div>
      <div v-else class="card center" style="display:flex;align-items:center;justify-content:center;min-height:300px">
        <div>
          <div style="font-size:40px">🤖</div>
          <div class="muted mt-10">点击右上角"算法文档"查看<br>人脸情绪识别、歌曲情绪分析、推荐算法的详细说明</div>
        </div>
      </div>
    </div>

    <footer style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">
      EmoMusic © 2026 · 人脸情绪识别 + 音乐情绪匹配推荐
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import FaceCapture from './components/FaceCapture.vue'
import EmotionPanel from './components/EmotionPanel.vue'
import SongPanel from './components/SongPanel.vue'
import DocsPanel from './components/DocsPanel.vue'
import { EMOTION_LABELS } from './composables/useFaceApi'

const emotion = ref(null)
const showDocs = ref(true)

const emotions = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised']
const sampleFaces = ref([])

onMounted(() => {
  // 构建 7 种情绪 × 3 张示例
  const list = []
  emotions.forEach(e => {
    for (let i = 1; i <= 3; i++) {
      list.push({
        src: `faces/${e}_${i}.jpg`,
        label: EMOTION_LABELS[e],
        emotion: e
      })
    }
  })
  sampleFaces.value = list
})

function onEmotion(e) {
  emotion.value = e
}
</script>
