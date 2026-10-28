# EmoMusic - 基于人脸情绪识别的歌曲推荐系统

基于人脸情绪识别的歌曲推荐系统，使用 Vue3 + face-api.js + Web Audio API 实现。

## 功能特性

- **四种人脸获取方式**：图片上传 / 视频文件 / 实时摄像头 / 屏幕录制
- **人脸情绪识别**：face-api.js (TinyFaceDetector + FaceExpressionNet)，七分类情绪
- **歌曲情绪分析**：Web Audio API 提取 BPM、频谱质心、能量、节奏等特征
- **智能推荐**：基于 Valence-Arousal 情绪空间匹配，支持"情绪匹配"和"情绪提升"模式
- **曲库**：6 首本地合成演示曲 + iTunes 在线搜索 API
- **示例照片**：7 种情绪 × 3 张 = 21 张真实人脸示例

## 技术栈

- Vue 3 + Vite
- face-api.js (TensorFlow.js) - 本地人脸情绪识别
- Web Audio API - 音频特征提取与情绪分析
- GitHub Actions - 自动部署到 GitHub Pages

## 本地运行

```bash
npm install
npm run dev
```

## 部署

通过 GitHub Actions 自动构建并部署到 GitHub Pages。

## 算法说明

详见页面内"算法文档"标签页。
