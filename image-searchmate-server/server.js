const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors"); // 1. cors 불러오기

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors()); // 2. cors 미들웨어 사용 (모든 출처 허용)

// --- (이하 나머지 코드는 이전과 동일합니다) ---

// API 키 로드
const PIXABAY_KEY = process.env.PIXABAY_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;

// ⭐ Gemini API를 통해 키워드 생성
async function generateKeywordsWithGemini(userInput) {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro-002:generateContent?key=${GEMINI_API_KEY}`;
  const prompt = `
다음 문장을 Pixabay나 Unsplash에서 이미지 검색할 수 있도록 시각적 키워드 중심의 영어 키워드 배열로 변환해줘.
문장: ${userInput}
조건:
1. 시각적으로 명확한 개념만 포함 (예: yellow umbrella, child, rainy day)
2. 스타일을 암시하는 키워드도 포함 (예: illustration, drawing, vector)
3. 너무 추상적인 단어는 제외할 것
4. 영어로 된 키워드를 4~6개 정도 포함할 것
5. 반드시 **JSON 배열 형태로만 출력할 것**. 다른 말은 하지 마.
6. 출력은 예시 없이, 결과만 출력. 예: ["yellow umbrella", "child", "rain", "illustration"]
`;
  const body = { contents: [{ parts: [{ text: prompt }] }] };
  const response = await axios.post(url, body, { headers: { "Content-Type": "application/json" } });
  const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return JSON.parse(text);
}

// ✨ Unsplash 이미지 검색 함수
async function searchUnsplash(query) {
  const unsplashURL = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=30&client_id=${UNSPLASH_KEY}`;
  const response = await axios.get(unsplashURL);
  return response.data.results.map(img => ({
    id: img.id,
    previewURL: img.urls.thumb,
    webformatURL: img.urls.regular,
    largeImageURL: img.urls.full,
    tags: Array.isArray(img.tags) ? img.tags.map(tag => tag.title).join(", ") : '',
    user: img.user.name,
    source: 'Unsplash'
  }));
}

// 🔀 배열을 무작위로 섞는 함수
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// 🔍 최종 이미지 검색 엔드포인트
app.post("/search", async (req, res) => {
  const userInput = req.body.input;
  try {
    const keywordArray = await generateKeywordsWithGemini(userInput);
    const searchQuery = keywordArray.join(" ");
    const pixabayURL = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(searchQuery)}&image_type=photo&license=cc0&per_page=100`;
    const [pixabayResult, unsplashResult] = await Promise.allSettled([
      axios.get(pixabayURL),
      searchUnsplash(searchQuery)
    ]);
    let allImages = [];
    if (pixabayResult.status === 'fulfilled') {
      const pixabayImages = pixabayResult.value.data.hits.map(img => ({ ...img, source: 'Pixabay' }));
      allImages = allImages.concat(pixabayImages);
    } else {
      console.error("❌ Pixabay API 오류:", pixabayResult.reason?.response?.data || pixabayResult.reason.message);
    }
    if (unsplashResult.status === 'fulfilled') {
      allImages = allImages.concat(unsplashResult.value);
    } else {
      console.error("❌ Unsplash API 오류:", unsplashResult.reason?.response?.data || unsplashResult.reason.message);
    }
    const shuffledImages = shuffleArray(allImages);
    res.json({ keywords: keywordArray, images: shuffledImages });
  } catch (err) {
    console.error("❌ 서버 오류:", err?.response?.data || err.message);
    res.status(500).send("서버 오류 발생");
  }
});

// ✅ 서버 시작
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Gemini 기반 서버 실행 중 👉 http://localhost:${PORT}`);
});