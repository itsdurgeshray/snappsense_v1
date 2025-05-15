import React, { useState, useEffect, useRef } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';
import './App.css';

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
  const [appUrl, setAppUrl] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('1y');
  const resultsContainerRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent page reload

    setErrorMessage('');
    setAnalysisResult(null);
    setLoading(true);

    if (!appUrl) {
      setErrorMessage("Please enter a valid URL.");
      setLoading(false);
      return;
    }

    const scrollTop = resultsContainerRef.current?.scrollTop || 0;

    try {
      const response = await fetch('http://127.0.0.1:5000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: appUrl, period: selectedPeriod }),
      });

      if (!response.ok) {
        setAnalysisResult(null);
        const errorData = await response.json();
        setErrorMessage(errorData.error || 'Unknown error');
        setLoading(false);
        return;
      }

      const data = await response.json();
      setAnalysisResult(data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setAnalysisResult(null);
      setErrorMessage('Failed to analyze feedback. Check the URL or try again.');
    } finally {
      setLoading(false);
      if (resultsContainerRef.current) {
        resultsContainerRef.current.scrollTop = scrollTop;
      }
    }
  };

  const sentimentData = analysisResult?.sentiment || {
    Happy: 0,
    Neutral: 0,
    Frustrated: 0,
  };

  const categoryData = analysisResult?.categories || {
    "Feature Requests": 0,
    Bugs: 0,
    "UX/UI": 0,
    Performance: 0,
    Others: 0,
  };

  const filteredTrends = analysisResult?.trends || {};
  const trendLabels = Object.keys(filteredTrends).sort().slice(-50);
  const stackedData = {
    labels: trendLabels,
    datasets: [
      {
        label: 'Happy',
        data: trendLabels.map(d => filteredTrends[d]?.Happy || 0),
        backgroundColor: 'var(--dl-color-default-happy)',
        stack: 'sentiment',
      },
      {
        label: 'Neutral',
        data: trendLabels.map(d => filteredTrends[d]?.Neutral || 0),
        backgroundColor: 'var(--dl-color-default-neutral)',
        stack: 'sentiment',
      },
      {
        label: 'Frustrated',
        data: trendLabels.map(d => filteredTrends[d]?.Frustrated || 0),
        backgroundColor: 'var(--dl-color-default-frustated)',
        stack: 'sentiment',
      },
    ],
  };

  const doughnutData = {
    labels: ['Happy', 'Neutral', 'Frustrated'],
    datasets: [{
      data: [
        sentimentData.Happy,
        sentimentData.Neutral,
        sentimentData.Frustrated,
      ],
      backgroundColor: [
        'var(--dl-color-default-happy)',
        'var(--dl-color-default-neutral)',
        'var(--dl-color-default-frustated)',
      ],
    }],
  };

  const clusters = analysisResult?.clusters || {};
  const solutions = analysisResult?.solutions || {};

  const feedbackTable = Object.entries(clusters).map(([category, reviews]) => ({
    category,
    summary: reviews.slice(0, 3).join(', '),
    solution: solutions[category] || 'N/A',
    count: reviews.length,
  }));

  const getCategoryColor = (category) => {
    const colorMap = {
      "Feature Requests": 'var(--dl-color-default-primarybrand)',
      Bugs: 'var(--dl-color-default-angry)',
      "UX/UI": 'var(--dl-color-default-frustated)',
      Performance: 'var(--dl-color-default-delighted)',
      Others: 'var(--dl-color-default-happy)',
    };
    return colorMap[category] || 'var(--dl-color-default-secondarydark)';
  };

  return (
    <div className="App">
      <ErrorBoundary>
        {!analysisResult && (
          <div className="landing-page">
            {/* Navigation Bar */}
            <header className="nav-bar">
              <div className="logo-container">
                <img src="/snappsense-logo.png" alt="SnappSense Logo" className="logo" />
                <div className="brand-text">SnappSense</div>
              </div>
              <button className="feedback-button">Give Feedback</button>
            </header>

            {/* Hero Section */}
            <main className="hero-section">
              <div className="hero-bg"></div>
              <div className="hero-content">
                <h1>Capture sense of user feedback with snap</h1>
                <p>
                  Paste the link of the app you want to analyze and discover powerful insights into user feedback within seconds. See trends, understand feedback, and enhance your app experience effortlessly.
                </p>
                <form className="search-bar" onSubmit={handleSubmit}>
                  <input
                    type="text"
                    placeholder="Paste Play Store link for your app here"
                    value={appUrl}
                    onChange={(e) => setAppUrl(e.target.value)}
                    className="search-input"
                  />
                  <button type="submit" className="snap-sense-button">
                    Snap Sense
                  </button>
                </form>
              </div>
            </main>

            {/* Footer */}
            <footer className="footer">
              <div className="footer-text">
                GET INSIGHTS ✨ PASTE LINK ✨ SNAP SENSE ✨ GET INSIGHTS ✨ PASTE LINK
              </div>
            </footer>

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
              maxHeight: 'calc(100vh - 200px)',
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
                    legend: { display: false },
                    title: { display: true, text: 'Sentiment Distribution' },
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
                {Object.entries(categoryData).map(([category, percentage]) => (
                  <div key={category} className="progress-bar">
                    <div
                      className="bar"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: getCategoryColor(category),
                      }}
                    />
                    <span>{category}: {percentage}%</span>
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

export default App;