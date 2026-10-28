<template>
  <div class="card">
    <h2>
      <span>?? ??????</span>
    </h2>
    <div v-if="!emotion" class="placeholder center" style="padding:30px">
      ????????...
    </div>
    <div v-else class="emotion-display">
      <div style="font-size:60px">{{ emotion.emoji }}</div>
      <div class="emotion-main">{{ emotion.label }}</div>
      <div class="muted" style="font-size:12px;margin-bottom:14px">
        ???????: {{ ((emotion.expressions[emotion.dominant]||0)*100).toFixed(1) }}%
      </div>
      <div style="text-align:left">
        <div class="emotion-bar" v-for="exp in sortedExpressions" :key="exp.key">
          <span class="label">{{ exp.label }}</span>
          <div class="track"><div class="fill" :style="{width: (exp.value*100)+'%'}"></div></div>
          <span class="val">{{ (exp.value*100).toFixed(1) }}%</span>
        </div>
      </div>

      <!-- VA ?????? -->
      <div class="mt-16">
        <div class="muted" style="font-size:12px;margin-bottom:6px">Valence-Arousal ??????</div>
        <div style="position:relative;width:100%;aspect-ratio:2;padding:10px;background:rgba(0,0,0,0.2);border-radius:10px">
          <svg viewBox="-100 -100 200 200" style="width:100%;height:100%">
            <line x1="-100" y1="0" x2="100" y2="0" stroke="rgba(255,255,255,0.2)" stroke-width="0.5"/>
            <line x1="0" y1="-100" x2="0" y2="100" stroke="rgba(255,255,255,0.2)" stroke-width="0.5"/>
            <text x="-98" y="5" fill="#94a3b8" font-size="8">??</text>
            <text x="90" y="5" fill="#94a3b8" font-size="8">??</text>
            <text x="2" y="-92" fill="#94a3b8" font-size="8">???</text>
            <text x="2" y="98" fill="#94a3b8" font-size="8">???</text>
            <circle :cx="va.valence*90" :cy="-va.arousal*90" r="6" fill="#ec4899"/>
            <circle :cx="va.valence*90" :cy="-va.arousal*90" r="10" fill="none" stroke="#ec4899" stroke-width="1" opacity="0.5"/>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { EMOTION_LABELS, EMOTION_VA } from '../composables/useFaceApi'

const props = defineProps({
  emotion: { type: Object, default: null }
})

const sortedExpressions = computed(() => {
  if (!props.emotion) return []
  const exp = props.emotion.expressions
  return Object.keys(exp)
    .filter(k => k !== 'asSortedArray')
    .map(k => ({ key: k, label: EMOTION_LABELS[k] || k, value: exp[k] }))
    .sort((a, b) => b.value - a.value)
})

const va = computed(() => {
  if (!props.emotion) return { valence: 0, arousal: 0 }
  return EMOTION_VA[props.emotion.dominant] || { valence: 0, arousal: 0 }
})
</script>
