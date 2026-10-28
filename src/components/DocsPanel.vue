<template>
  <div class="card">
    <h2><span>📖 使用说明 & 算法文档</span></h2>
    <div class="doc-tabs">
      <div class="tab" :class="{active: tab==='usage'}" @click="tab='usage'">使用说明</div>
      <div class="tab" :class="{active: tab==='face'}" @click="tab='face'">人脸情绪算法</div>
      <div class="tab" :class="{active: tab==='song'}" @click="tab='song'">歌曲情绪算法</div>
      <div class="tab" :class="{active: tab==='rec'}" @click="tab='rec'">推荐算法</div>
    </div>

    <!-- 使用说明 -->
    <div class="doc-section" v-if="tab==='usage'">
      <h3>系统简介</h3>
      <p>EmoMusic 是一个基于人脸情绪识别的歌曲推荐系统。系统通过检测人脸表情推断当前情绪，再根据歌曲的声学情绪特征推荐匹配的音乐。</p>

      <h3>四种人脸获取方式</h3>
      <ul>
        <li><b>🖼️ 图片</b>：上传本地人脸图片，点击"识别情绪"分析。</li>
        <li><b>🎬 视频文件</b>：上传视频，播放时实时逐帧检测情绪。</li>
        <li><b>📷 实时摄像头</b>：调用摄像头，实时识别面部情绪（适合互动演示）。</li>
        <li><b>🖥️ 屏幕录制</b>：共享屏幕画面，检测画面中出现的人脸情绪。</li>
      </ul>

      <h3>操作步骤</h3>
      <ol>
        <li>等待页面右上角提示"模型加载完成"（首次加载约 2-5 秒）。</li>
        <li>选择一种输入方式获取人脸。</li>
        <li>系统自动识别情绪并在"情绪分析结果"面板展示。</li>
        <li>"情绪推荐歌曲"面板自动列出匹配歌曲，点击即可播放。</li>
        <li>可切换"情绪匹配/情绪提升"模式，或点击"加载在线歌曲"扩充曲库。</li>
      </ol>

      <h3>示例照片</h3>
      <p>页面内置了 7 种情绪 × 3 张 = 21 张真实人脸示例照片，点击即可快速演示识别效果。</p>
    </div>

    <!-- 人脸情绪识别算法 -->
    <div class="doc-section" v-if="tab==='face'">
      <h3>算法选型</h3>
      <p>采用 <code>face-api.js</code>（基于 TensorFlow.js），完全在浏览器本地运行，无需联网，保护隐私。</p>

      <h3>1. 人脸检测 — TinyFaceDetector</h3>
      <ul>
        <li><b>原理</b>：基于 SSD (Single Shot MultiBox Detector) 的轻量化版本，使用深度可分离卷积。</li>
        <li><b>输入尺寸</b>：320×320，scoreThreshold=0.5。</li>
        <li><b>速度</b>：单帧检测 < 30ms，满足实时 (>30fps) 要求。</li>
        <li><b>优势</b>：经典高效，是 face-api 中最快的检测器，适合摄像头/视频实时流。</li>
      </ul>

      <h3>2. 人脸关键点 — FaceLandmark68Net</h3>
      <ul>
        <li><b>原理</b>：回归 68 个面部关键点（轮廓、眉、眼、鼻、嘴），用于人脸对齐，提升表情识别精度。</li>
      </ul>

      <h3>3. 情绪分类 — FaceExpressionNet</h3>
      <ul>
        <li><b>原理</b>：卷积神经网络 (CNN) 七分类，输出每种情绪的概率。</li>
        <li><b>情绪类别</b>：<code>neutral 平静</code>、<code>happy 开心</code>、<code>sad 悲伤</code>、<code>angry 愤怒</code>、<code>fearful 恐惧</code>、<code>disgusted 厌恶</code>、<code>surprised 惊讶</code>。</li>
        <li><b>输出</b>：softmax 概率分布，取 argmax 为主导情绪。</li>
      </ul>

      <h3>4. 情绪二维映射 (Valence-Arousal)</h3>
      <p>将离散情绪标签映射到经典的二维情绪模型：</p>
      <ul>
        <li><b>Valence (效价)</b>：情绪的积极/消极程度 [-1, 1]</li>
        <li><b>Arousal (唤醒度)</b>：情绪的激动/平静程度 [-1, 1]</li>
      </ul>
      <p>例如 happy → (0.8, 0.5)，sad → (-0.8, -0.4)，angry → (-0.7, 0.8)。该向量用于与歌曲情绪向量匹配。</p>

      <h3>性能</h3>
      <p>模型总大小约 0.9MB（tinyFaceDetector 0.19MB + expression 0.33MB + landmark 0.36MB），本地推理无需 GPU。</p>
    </div>

    <!-- 歌曲情绪识别算法 -->
    <div class="doc-section" v-if="tab==='song'">
      <h3>算法选型</h3>
      <p>基于 <code>Web Audio API</code> 对音频进行离线 DSP 分析，纯前端运行，无需服务器。</p>

      <h3>处理流程</h3>
      <ol>
        <li><b>解码</b>：将音频解码为 PCM，重采样至 22050Hz、单声道以加速计算。</li>
        <li><b>分帧</b>：帧长 2048 (约 93ms)，帧移 512 (约 23ms)，加 Hann 窗。</li>
        <li><b>频域变换</b>：Cooley-Tukey 基-2 FFT，得到每帧幅度谱。</li>
      </ol>

      <h3>提取的声学特征</h3>
      <ul>
        <li><b>Tempo (BPM 节奏快慢)</b>：先计算 onset envelope（频谱通量的帧序列），再对其做<b>自相关 (Autocorrelation)</b>，在 60~200 BPM 区间找峰值 lag，换算 BPM。经典节拍检测方法。</li>
        <li><b>Energy 能量 (RMS)</b>：时域均方根，反映响度与力度。</li>
        <li><b>Spectral Centroid 频谱质心</b>：Σ(频率×幅度)/Σ幅度，反映音色明亮度/频率高低。值越高声音越"亮/尖"。</li>
        <li><b>Spectral Flux 频谱通量</b>：相邻帧幅度谱的正差之和，反映节奏变化激烈程度。</li>
        <li><b>Zero Crossing Rate 过零率</b>：信号过零次数比例，高频/噪声信号 ZCR 高。</li>
        <li><b>Low/High Energy Ratio 低高频能量比</b>：<500Hz 与 >2000Hz 能量比，反映情绪基调。</li>
      </ul>

      <h3>特征 → 情绪二维映射</h3>
      <ul>
        <li><b>Arousal 唤醒度</b> = 0.4×RMS_norm + 0.35×Tempo_norm + 0.25×Flux_norm，映射至 [-1, 1]</li>
        <li><b>Valence 效价</b> = 0.45×Centroid_norm + 0.30×ZCR_norm + 0.25×Tempo_norm，映射至 [-1, 1]</li>
      </ul>
      <p>直觉：快节奏+高能量+明亮高频 → 积极高唤醒（欢快/激昂）；慢节奏+低能量+低沉低频 → 消极低唤醒（悲伤/平静）。</p>
    </div>

    <!-- 推荐算法 -->
    <div class="doc-section" v-if="tab==='rec'">
      <h3>算法选型</h3>
      <p>基于<b>情绪向量相似度</b>的加权打分推荐，结合欧氏距离与余弦相似度。</p>

      <h3>推荐策略</h3>
      <ol>
        <li>人脸情绪 → VA 向量 V_face（来自 EMOTION_VA 映射表）。</li>
        <li>每首歌有预计算的 VA 向量 V_song（来自音频特征分析）。</li>
        <li>计算情绪匹配得分：
          <ul>
            <li>欧氏距离：d = √((Δv)² + (Δa)²)，归一化 d_norm = min(1, d/2)</li>
            <li>余弦相似度：cos = (V_face·V_song)/(|V_face||V_song|)，归一化至 [0,1]</li>
            <li><b>score = 0.55×(1-d_norm) + 0.45×cos</b></li>
          </ul>
        </li>
        <li>若歌曲主导情绪标签与人脸主导情绪<b>精确匹配</b>，额外 +0.15 加分。</li>
        <li>按 score 降序排列，取 Top-N (默认 15)。</li>
      </ol>

      <h3>两种推荐模式</h3>
      <ul>
        <li><b>🎯 情绪匹配 (match)</b>：推荐与当前情绪一致的歌曲，满足共情需求。例如悲伤时推荐低沉慢歌。</li>
        <li><b>🚀 情绪提升 (lift)</b>：将目标 Valence 向积极方向偏移 +0.5，推荐更欢快的歌曲，帮助从低落情绪中走出来。</li>
      </ul>

      <h3>曲库来源</h3>
      <ul>
        <li><b>本地歌曲</b>：内置 6 首合成演示曲，覆盖欢快/悲伤/激昂/宁静/神秘/紧张，情绪特征可被算法正确区分。</li>
        <li><b>在线歌曲</b>：调用 <code>iTunes Search API</code>（支持 CORS），按情绪关键词搜索，返回 30 秒试听片段。</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const tab = ref('usage')
</script>
