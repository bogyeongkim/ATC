import { useState } from "react";
import "./App.css";

import visangLogo from "./visang_logo.png";

function App() {
  const [input, setInput] = useState("");
  const [keywords, setKeywords] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setKeywords([]);
    setImages([]);

    try {
      const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
      const res = await fetch(`${API_BASE}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      setKeywords(data.keywords);
      setImages(data.images);
    } catch (err) {
      alert("오류가 발생했습니다. 콘솔을 확인해주세요.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    
    <div className="app-container">
      <div className="logo-container">
        <img src={visangLogo} alt="Visang Logo" className="logo-large" />
      </div>

      <h1 className="title"> AI 이미지 검색 도우미 🖼️</h1>

      <form className="input-box" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ex) 노란 우산을 쓴 아이 이미지가 필요해"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "검색중..." : "검색"}
        </button>
      </form>

      {loading && !images.length && <p className="loading">🔍 이미지를 검색 중입니다...</p>}
      
      {keywords.length > 0 && (
        <div className="keywords">
          🔑 추출된 키워드: {keywords.join(", ")}
        </div>
      )}

      <div className="image-grid">
        {images.map((img) => (
          <div key={`${img.source}-${img.id}`} className="image-card">
            <img src={img.webformatURL} alt={img.tags} loading="lazy" />
            <div className="image-links">
              <a href={img.largeImageURL} target="_blank" rel="noopener noreferrer">
                원본 보기
              </a>
              <span> | </span>
              <a href={img.largeImageURL} download target="_blank" rel="noreferrer">
                다운로드
              </a>
            </div>
            <span className="image-source">{img.source}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;