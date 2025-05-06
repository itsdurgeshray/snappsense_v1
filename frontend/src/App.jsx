import React, { useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import 'chart.js/auto'; // Required for Chart.js
import "./App.css";

// Improved Error Boundary
const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false);

  React.useEffect(() => {
    const handleError = (error) => {
      console.error("Error in component:", error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return <p>Something went wrong. Please try again.</p>;
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

  const sentimentData = analysisResult?.sentiment || {
    Delighted: 0,
    Happy: 0,
    Neutral: 0,
    Frustrated: 0,
    Angry: 0
  };

  const categoryData = analysisResult?.categories || {
    "Feature Requests": 0,
    "Bugs": 0,
    "UX/UI": 0,
    "Performance": 0,
    "Others": 0
  };

  const trendsData = analysisResult?.trends || {};
  const clusters = analysisResult?.clusters || {};
  const solutions = analysisResult?.solutions || {};

  // Prepare charts with default values
  const sentimentChartData = {
    labels: ["Delighted", "Happy", "Neutral", "Frustrated", "Angry"],
    datasets: [
      {
        label: "# of Reviews",
        data: [
          sentimentData.Delighted || 0,
          sentimentData.Happy || 0,
          sentimentData.Neutral || 0,
          sentimentData.Frustrated || 0,
          sentimentData.Angry || 0
        ],
        backgroundColor: ['#6c63ff', '#4ecdc4', '#f7dc6f', '#ff5733', '#e74c3c'],
        borderColor: ['#6c63ff', '#4ecdc4', '#f7dc6f', '#ff5733', '#e74c3c'],
        borderWidth: 1,
      }
    ]
  };

  const categoryChartData = {
    labels: Object.keys(categoryData),
    datasets: [
      {
        label: "# of Reviews",
        data: Object.values(categoryData).map(count => count || 0),
        backgroundColor: ['#ff6b6b', '#4ecdc4', '#f7dc6f', '#9b59b6', '#e74c3c'],
        borderColor: ['#ff6347', '#1e90ff', '#228b22', '#ff1493', '#6c63ff'],
        borderWidth: 1,
      }
    ]
  };

  const trendChartData = {
    labels: Object.keys(trendsData),
    datasets: [
      {
        label: "Delighted",
        data: Object.values(trendsData).map(day => day.Delighted || 0),
        borderColor: '#6c63ff',
        fill: false
      },
      {
        label: "Happy",
        data: Object.values(trendsData).map(day => day.Happy || 0),
        borderColor: '#4ecdc4',
        fill: false
      },
      {
        label: "Neutral",
        data: Object.values(trendsData).map(day => day.Neutral || 0),
        borderColor: '#f7dc6f',
        fill: false
      },
      {
        label: "Frustrated",
        data: Object.values(trendsData).map(day => day.Frustrated || 0),
        borderColor: '#ff5733',
        fill: false
      },
      {
        label: "Angry",
        data: Object.values(trendsData).map(day => day.Angry || 0),
        borderColor: '#e74c3c',
        fill: false
      },
    ]
  };

  return (
    <div className="App">
      <ErrorBoundary>
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

            {/* Sentiment Distribution */}
            <div className="chart-container">
              <Bar 
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
            </div>

            {/* Feedback Categories */}
            <div className="chart-container">
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
            </div>

            {/* Sentiment Trends */}
            <div className="chart-container">
              <Line 
                data={{
                  labels: Object.keys(trendsData),
                  datasets: [
                    {
                      label: "Delighted",
                      data: Object.values(trendsData).map(day => day.Delighted || 0),
                      borderColor: '#6c63ff',
                      fill: false
                    },
                    {
                      label: "Happy",
                      data: Object.values(trendsData).map(day => day.Happy || 0),
                      borderColor: '#4ecdc4',
                      fill: false
                    },
                    {
                      label: "Neutral",
                      data: Object.values(trendsData).map(day => day.Neutral || 0),
                      borderColor: '#f7dc6f',
                      fill: false
                    },
                    {
                      label: "Frustrated",
                      data: Object.values(trendsData).map(day => day.Frustrated || 0),
                      borderColor: '#ff5733',
                      fill: false
                    },
                    {
                      label: "Angry",
                      data: Object.values(trendsData).map(day => day.Angry || 0),
                      borderColor: '#e74c3c',
                      fill: false
                    },
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Sentiment Trends' }
                  }
                }}
              />
            </div>

            {/* Feedback Clusters */}
            <div className="feedback-analysis">
              <h3>Feedback Clusters</h3>
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Feedback Samples</th>
                    <th>Solution</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(clusters).map(([category, samples], index) => (
                    <tr key={index}>
                      <td>{category}</td>
                      <td>{samples.slice(0, 5).join("\n")}</td>
                      <td>{solutions[category] || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sample Feedback */}
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
      </ErrorBoundary>
    </div>
  );
}

export default App;