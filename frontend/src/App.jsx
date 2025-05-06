import { useState } from "react";
import "./App.css";

function App() {
  const [appUrl, setAppUrl] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAnalysisResult(null);
    setErrorMessage("");

    // Validate input
    if (!appUrl) {
      setErrorMessage("Please enter a valid URL.");
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
        return;
      }

      const data = await response.json();
      setAnalysisResult(data);
    } catch (error) {
      setErrorMessage("Network error. Check the backend logs.");
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
        </div>
      )}

      {analysisResult && (
        <div className="results-page">
          <h2>Analysis Results</h2>
          <p><strong>Sentiment:</strong></p>
          <ul>
            <li>Positive: {analysisResult.sentiment.positive}</li>
            <li>Negative: {analysisResult.sentiment.negative}</li>
            <li>Neutral: {analysisResult.sentiment.neutral}</li>
          </ul>
          <p><strong>Sample Feedback:</strong></p>
          <ul>
            {analysisResult.feedback.map((review, index) => (
              <li key={index}>{review}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;