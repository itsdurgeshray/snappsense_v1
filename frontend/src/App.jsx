import { useState } from "react";
import "./App.css";

function App() {
  const [appUrl, setAppUrl] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setAnalysisResult(null);
    setLoading(true);

    // Validate input
    if (!appUrl) {
      setErrorMessage("Please enter a valid URL.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:5000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: appUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setErrorMessage(errorData.error || "Unknown error");
        setLoading(false);
        return;
      }

      const data = await response.json();
      setAnalysisResult(data);
    } catch (error) {
      console.error("Error fetching data:", error);
      setErrorMessage("Failed to analyze feedback. Please check the URL or try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      {!analysisResult && (
        <div className="landing-page">
          <h1>Capture user feedback with SnappSense</h1>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Paste Google Play Store URL..."
              value={appUrl}
              onChange={(e) => setAppUrl(e.target.value)}
              className="input-field"
            />
            <button type="submit" className="analyze-button">
              Analyze
            </button>
          </form>
          {errorMessage && <p className="error-message">{errorMessage}</p>}
          {loading && <div className="loading-spinner"></div>}
        </div>
      )}

      {analysisResult && (
        <div className="results-page">
          <h2>Analysis Results</h2>

          {/* Sentiment Section */}
          <div className="sentiment-section">
            <p><strong>Sentiment:</strong></p>
            <ul>
              <li>Positive: {analysisResult.sentiment.positive}</li>
              <li>Negative: {analysisResult.sentiment.negative}</li>
              <li>Neutral: {analysisResult.sentiment.neutral}</li>
            </ul>
          </div>

          {/* Feedback Section */}
          <div className="feedback-section">
            <p><strong>Sample Feedback:</strong></p>
            <ul>
              {analysisResult.feedback.map((review, index) => (
                <li key={index}>{review}</li>
              ))}
            </ul>
          </div>

          {/* Categories Section */}
          <div className="category-section">
            <p><strong>Categories:</strong></p>
            <ul>
              {Object.entries(analysisResult.categories).map(([category, count]) => (
                <li key={category}>{category}: {count}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;