import React, { useState, useEffect, useRef } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import 'chart.js/auto'; // Required for Chart.js
import "./App.css";

// Improved Error Boundary
const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
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
  const [selectedPeriod, setSelectedPeriod] = useState("1y"); // Default to 1 year

  const resultsContainerRef = useRef(null); // Track scroll position

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

    // Save current scroll position
    const scrollTop = resultsContainerRef.current?.scrollTop || 0;

    try {
      const response = await fetch("http://127.0.0.1:5000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: appUrl, period: selectedPeriod }),
      });

      if (!response.ok) {
        setAnalysisResult(null);
        const errorData = await response.json();
        setErrorMessage(errorData.error || "Unknown error");
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log("Analysis Result:", data); // Debugging
      setAnalysisResult(data);
    } catch (error) {
      console.error("Error fetching data:", error);
      setAnalysisResult(null);
      setErrorMessage("Failed to analyze feedback. Check the URL or try again.");
    } finally {
      setLoading(false);
      // Restore scroll position
      if (resultsContainerRef.current) {
        resultsContainerRef.current.scrollTop = scrollTop;
      }
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

  const filteredTrends = analysisResult?.trends || {};
  const trendLabels = Object.keys(filteredTrends).sort().slice(-50); // Limit to last 50 days
  const stackedData = {
    labels: trendLabels,
    datasets: [
      {
        label: "Delighted",
        data: trendLabels.map(d => filteredTrends[d]?.Delighted || 0),
        backgroundColor: '#6c63ff',
        stack: 'sentiment'
      },
      {
        label: "Happy",
        data: trendLabels.map(d => filteredTrends[d]?.Happy || 0),
        backgroundColor: '#4ecdc4',
        stack: 'sentiment'
      },
      {
        label: "Neutral",
        data: trendLabels.map(d => filteredTrends[d]?.Neutral || 0),
        backgroundColor: '#f7dc6f',
        stack: 'sentiment'
      },
      {
        label: "Frustrated",
        data: trendLabels.map(d => filteredTrends[d]?.Frustrated || 0),
        backgroundColor: '#ff5733',
        stack: 'sentiment'
      },
      {
        label: "Angry",
        data: trendLabels.map(d => filteredTrends[d]?.Angry || 0),
        backgroundColor: '#e74c3c',
        stack: 'sentiment'
      },
    ]
  };

  const doughnutData = {
    labels: ["Delighted", "Happy", "Neutral", "Frustrated", "Angry"],
    datasets: [{
      data: [
        sentimentData.Delighted,
        sentimentData.Happy,
        sentimentData.Neutral,
        sentimentData.Frustrated,
        sentimentData.Angry
      ],
      backgroundColor: ['#6c63ff', '#4ecdc4', '#f7dc6f', '#ff5733', '#e74c3c'],
    }]
  };

  const clusters = analysisResult?.clusters || {};
  const solutions = analysisResult?.solutions || {};

  // Generalized feedback table
  const feedbackTable = Object.entries(clusters).map(([category, reviews]) => ({
    category,
    summary: reviews.slice(0, 3).join(", "),
    solution: solutions[category] || "N/A",
    count: reviews.length
  }));

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
          <div 
            className="results-page" 
            ref={resultsContainerRef}
            style={{
              overflowY: 'auto',
              maxHeight: 'calc(100vh - 200px)'
            }}
          >
            <h2>Analysis Results</h2>

            {/* All-Time Sentiment (Semi-circle Doughnut) */}
            <div className="chart-container">
              <Doughnut 
                data={doughnutData}
                options={{
                  cutout: '70%',
                  rotation: Math.PI,
                  circumference: Math.PI,
                  plugins: {
                    legend: { position: 'right' }
                  },
                  maintainAspectRatio: false,
                }}
                height={400}
              />
            </div>

            {/* Periodic Sentiment Trends (Stacked Bar) */}
            <div className="chart-container">
              <Bar 
                data={stackedData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: { stacked: true, maxBarThickness: 40 },
                    y: { stacked: true }
                  },
                  plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Sentiment Trends' }
                  },
                  aspectRatio: 2.5
                }}
                height={400}
              />
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="period-selector"
              >
                <option value="1y">1 Year</option>
                <option value="6m">6 Months</option>
                <option value="3m">3 Months</option>
                <option value="1m">1 Month</option>
                <option value="1w">1 Week</option>
              </select>
            </div>

            {/* Feedback Categories (Segmented Progress Bar) */}
            <div className="segmented-progress">
              <h3>Feedback Categories</h3>
              <div className="progress-container">
                {Object.entries(categoryData).map(([category, count]) => (
                  <div key={category} className="progress-bar">
                    <div
                      className="bar"
                      style={{
                        width: `${(count / Object.values(categoryData).reduce((a, b) => a + b, 0)) * 100}%`,
                        backgroundColor: getCategoryColor(category)
                      }}
                    ></div>
                    <span>{category}: {count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Generalized Feedback Table */}
            <div className="feedback-table">
              <h3>Generalized Feedback</h3>
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Feedback Summary</th>
                    <th>Solution</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbackTable.map((item, index) => (
                    <tr key={index}>
                      <td>{item.category}</td>
                      <td>{item.summary}</td>
                      <td>{item.solution}</td>
                      <td>{item.count}</td>
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

// Helper function to map category to color
const getCategoryColor = (category) => {
  const colorMap = {
    "Feature Requests": '#ff6b6b',
    "Bugs": '#4ecdc4',
    "UX/UI": '#f7dc6f',
    "Performance": '#9b59b6',
    "Others": '#e74c3c'
  };
  return colorMap[category] || '#6c63ff';
};

export default App;