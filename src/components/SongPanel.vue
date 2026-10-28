<template>
  <div class="card">
    <h2>
      <span>🎵 情绪推荐歌曲</span>
      <span class="badge" v-if="emotion">{{ emotion.emoji }} {{ emotion.label }}</span>
    </h2>

    <!-- 推荐模式 -->
    <div class="row" style="margin-bottom:12px">
      <div class="tab" :class="{active: recMode==='match'}" @click="recMode='match'; runRecommend">🎯 情绪匹配</div>
      <div class="tab" :class="{active: recMode==='lift'}" @click="recMode='lift'; runRecommend">🚀 情绪提升</div>
      <button class="btn" @click="loadOnline" :disabled="loadingOnline || !emotion">
        {{ loadingOnline ? '搜索中...' : '🌐 加载在线歌曲' }}
      </button>
    </div>

    <div v-if="!emotion" class="placeholder center" style="padding:40px">
      请先在左侧识别人脸情绪，系统将自动推荐匹配歌曲
    </div>

    <div v-else class="scroll-y" style="max-height:420px">
      <div v-if="!recommendations.length" class="placeholder">暂无推荐歌曲</div>
      <div
        class="song-item"
        v-for="(song, i) in recommendations"
        :key="song.id"
        :class="{active: currentSong && currentSong.id===song.id}"
        @click="playSong(song)"
      >
        <div class="song-cover">
          <img v-if="song.cover && song.cover.startsWith('http')" :src="song.cover">
          <span v-else>{{ song.cover || '🎵' }}</span>
        </div>
        <div class="song-info">
          <div class="song-title">{{ i+1 }}. {{ song.title }}</div>
          <div class="song-artist">
            {{ song.artist }}
            <span class="chip" v-if="song.source==='local'">本地</span>
            <span class="chip" v-else style="background:rgba(16,185,129,0.15);color:var(--success)">在线</span>
          </div>
          <div class="muted" style="font-size:11px">
            <span v-if="song.features">
              BPM {{ song.features.tempo }} · 质心 {{ song.features.centroid }}Hz
            </span>
            <span v-else>在线试听 30s</span>
          </div>
        </div>
        <div class="song-score">{{ (song.matchScore*100).toFixed(0) }}%</div>
      </div>
    </div>

    <!-- 当前播放 -->
    <div class="now-playing" v-if="currentSong" style="margin-top:16px">
      <div class="song-cover" style="width:48px;height:48px;font-size:22px">
        <img v-if="currentSong.cover && currentSong.cover.startsWith('http')" :src="currentSong.cover">
        <span v-else>{{ currentSong.cover || '🎵' }}</span>
      </div>
      <div class="np-info">
        <div class="np-title">{{ currentSong.title }}</div>
        <div class="np-artist">{{ currentSong.artist }}</div>
      </div>
      <audio ref="audioEl" :src="currentSong.url" controls autoplay @ended="onEnded"></audio>
    </div>

    <div class="status-line">
      <span class="status-dot" :class="recommendations.length ? 'ok' : ''"></span>
      <span>共 {{ recommendations.length }} 首推荐 · 匹配模式: {{ recMode==='match' ? '情绪匹配' : '情绪提升' }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { recommend } from '../utils/recommendation'
import { getAllLocalSongs, searchItunes, emotionToKeywords } from '../utils/songLibrary'

const props = defineProps({
  emotion: { type: Object, default: null }
})

const recMode = ref('match')
const recommendations = ref([])
const currentSong = ref(null)
const loadingOnline = ref(false)
const songPool = ref([...getAllLocalSongs()])
const audioEl = ref(null)

watch(() => props.emotion, (e) => {
  if (e) runRecommend()
  else { recommendations.value = []; currentSong.value = null }
})

function runRecommend() {
  if (!props.emotion) return
  const r = recommend(songPool.value, props.emotion.dominant, props.emotion.expressions, {
    topN: 15,
    mode: recMode.value
  })
  recommendations.value = r
}

watch(recMode, () => { if (props.emotion) runRecommend() })

async function loadOnline() {
  if (!props.emotion) return
  loadingOnline.value = true
  try {
    const kws = emotionToKeywords[props.emotion.dominant] || ['music']
    const results = await searchItunes(kws[0], 12)
    // 合并去重
    const existing = new Set(songPool.value.map(s => s.id))
    results.forEach(s => { if (!existing.has(s.id)) songPool.value.push(s) })
    runRecommend()
  } catch (e) {
    console.error('online search failed', e)
  } finally {
    loadingOnline.value = false
  }
}

function playSong(song) {
  currentSong.value = song
  setTimeout(() => { if (audioEl.value) audioEl.value.play().catch(()=>{}) }, 100)
}

function onEnded() {
  // 自动播放下一首
  const idx = recommendations.value.findIndex(s => s.id === currentSong.value.id)
  if (idx >= 0 && idx < recommendations.value.length - 1) {
    playSong(recommendations.value[idx + 1])
  }
}
</script>
