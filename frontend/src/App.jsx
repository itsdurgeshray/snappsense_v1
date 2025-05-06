import React, { useState } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import 'chart.js/auto'; // Required for Chart.js
import "./App.css";

// Functional Error Boundary
const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const handleError = (error) => {
      console.error("Error in component:", error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return <p>Something went wrong.</p>;
  }

  return children;
};

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
      setErrorMessage("Failed to analyze feedback. Check the URL or try again.");
    } finally {
      setLoading(false);
    }
  };

  const sentimentData = analysisResult?.sentiment;
  const categoryData = analysisResult?.categories;

  // Prepare chart data safely
  const sentimentChartData = {
    labels: ["Delighted", "Happy", "Neutral", "Frustrated", "Angry"],
    datasets: [
      {
        label: "# of Reviews",
        data: sentimentData 
          ? [sentimentData.Delighted || 0, sentimentData.Happy || 0, sentimentData.Neutral || 0, sentimentData.Frustrated || 0, sentimentData.Angry || 0]
          : [0, 0, 0, 0, 0],
        backgroundColor: ['#6c63ff', '#4ecdc4', '#f7dc6f', '#ff5733', '#e74c3c'],
        borderColor: ['#6c63ff', '#4ecdc4', '#f7dc6f', '#ff5733', '#e74c3c'],
        borderWidth: 1,
      }
    ]
  };

  const categoryChartData = {
    labels: Object.keys(categoryData || {}),
    datasets: [
      {
        label: "# of Reviews",
        data: Object.values(categoryData || []).map(count => count || 0),
        backgroundColor: ['#ff6b6b', '#4ecdc4', '#f7dc6f', '#9b59b6', '#e74c3c'],
        borderColor: ['#ff6347', '#1e90ff', '#228b22', '#ff1493', '#6c63ff'],
        borderWidth: 1,
      }
    ]
  };

  return (
    <div className="App">
      {/* Landing Page */}
      {!analysisResult && (
        <div className="landing-page">
          <h1>Capture user feedback with SnappSense</h1>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Paste Google Play Store link for your app"
              value={appUrl}
              onChange={(e) => setAppUrl(e.target.value)}
              className="input-field"
            />
            <button type="submit" className="analyze-button">
              SnappSense
            </button>
          </form>
          {errorMessage && <p className="error-message">{errorMessage}</p>}
          {loading && <div className="loading-spinner"></div>}
        </div>
      )}

      {analysisResult && (
        <div className="results-page">
          <h2>Analysis Results</h2>

          {/* Sentiment Chart */}
          {Object.keys(sentimentData || {}).length > 0 && (
            <div className="chart-container">
              <ErrorBoundary>
                <Pie 
                  data={sentimentChartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'top' },
                      title: { display: true, text: 'Sentiment Distribution' }
                    }
                  }}
                />
              </ErrorBoundary>
            </div>
          )}

          {/* Category Chart */}
          {Object.keys(categoryData || {}).length > 0 && (
            <div className="chart-container">
              <ErrorBoundary>
                <Bar 
                  data={categoryChartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'right' },
                      title: { display: true, text: 'Feedback Categories' }
                    }
                  }}
                />
              </ErrorBoundary>
            </div>
          )}

          {/* Feedback Table */}
          <div className="feedback-table">
            <h3>Sample Feedback</h3>
            <table>
              <thead>
                <tr>
                  <th>Review</th>
                  <th>Category</th>
                  <th>Solution</th>
                </tr>
              </thead>
              <tbody>
                {(analysisResult.feedback || []).map((item, index) => (
                  <tr key={index}>
                    <td>{item.content}</td>
                    <td>{item.category}</td>
                    <td>{item.solution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;