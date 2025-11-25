import React, { useState, useEffect, useRef } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';
import axios from 'axios';
import './App.css';

function App() {
  const [appUrl, setAppUrl] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('1y');
  const [lastAnalyzedUrl, setLastAnalyzedUrl] = useState('');
  const resultsContainerRef = useRef(null);

  // Refetch data when period changes
  useEffect(() => {
    if (lastAnalyzedUrl && analysisResult) {
      fetchAnalysis(lastAnalyzedUrl, selectedPeriod);
    }
  }, [selectedPeriod]);

  const fetchAnalysis = async (url, period) => {
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await axios.post('http://127.0.0.1:5001/analyze', {
        url: url,
        period: period,
      });

      if (response.status !== 200) {
        setAnalysisResult(null);
        const errorData = response.data;
        setErrorMessage(errorData.error || 'Unknown error');
        setLoading(false);
        return;
      }

      const data = response.data;
      setAnalysisResult(data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setAnalysisResult(null);
      setErrorMessage('Failed to analyze feedback. Check the URL or try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setAnalysisResult(null);

    if (!appUrl) {
      setErrorMessage("Please enter a valid URL.");
      return;
    }

    setLastAnalyzedUrl(appUrl);
    await fetchAnalysis(appUrl, selectedPeriod);
  };

  const sentimentData = analysisResult?.sentiment || {
    Delighted: 0,
    Happy: 0,
    Neutral: 0,
    Frustrated: 0,
    Angry: 0,
  };

  const categoryData = analysisResult?.categories || {
    "Feature Requests": 0,
    Bugs: 0,
    "UX/UI": 0,
    "Navigation Issues": 0,
    Performance: 0,
    Others: 0,
  };

  const filteredTrends = analysisResult?.trends || {};
  // Sort labels chronologically and use all data points (not limited to 50)
  const trendLabels = Object.keys(filteredTrends).sort();
  const stackedData = {
    labels: trendLabels,
    datasets: [
      {
        label: "Delighted",
        data: trendLabels.map(d => filteredTrends[d]?.Delighted || 0),
        backgroundColor: '#ff6b6b',
        stack: 'sentiment',
      },
      {
        label: "Happy",
        data: trendLabels.map(d => filteredTrends[d]?.Happy || 0),
        backgroundColor: '#ffc0cb',
        stack: 'sentiment',
      },
      {
        label: "Neutral",
        data: trendLabels.map(d => filteredTrends[d]?.Neutral || 0),
        backgroundColor: '#f7dc6f',
        stack: 'sentiment',
      },
      {
        label: "Frustrated",
        data: trendLabels.map(d => filteredTrends[d]?.Frustrated || 0),
        backgroundColor: '#9b59b6',
        stack: 'sentiment',
      },
      {
        label: "Angry",
        data: trendLabels.map(d => filteredTrends[d]?.Angry || 0),
        backgroundColor: '#e74c3c',
        stack: 'sentiment',
      },
    ],
  };

  const doughnutData = {
    labels: ["Delighted", "Happy", "Neutral", "Frustrated", "Angry"],
    datasets: [
      {
        data: [
          sentimentData.Delighted || 0,
          sentimentData.Happy || 0,
          sentimentData.Neutral || 0,
          sentimentData.Frustrated || 0,
          sentimentData.Angry || 0,
        ],
        backgroundColor: [
          '#ff6b6b',
          '#ffc0cb',
          '#f7dc6f',
          '#9b59b6',
          '#e74c3c',
        ],
      },
    ],
  };

  const feedbackTable = analysisResult?.feedback?.filter(
    (item) => item.sentiment !== "Delighted" && item.sentiment !== "Happy"
  ) || [];

  const getCategoryColor = (category) => {
    const colorMap = {
      "Feature Requests": 'var(--primary-brand)',
      Bugs: 'var(--angry)',
      "UX/UI": 'var(--frustated)',
      "Navigation Issues": 'var(--frustated)',
      Performance: 'var(--delighted)',
      Others: 'var(--happy)',
    };
    return colorMap[category] || 'var(--secondary-dark)';
  };

  return (
    <div className="App">
      {!analysisResult && (
        <div className="landing-page">
          {/* Navigation Bar */}
          <header className="nav-bar" role="banner">
            <div className="logo-container">
              <img src="/snappsense-logo.png" alt="SnappSense Logo" className="logo" />
              <div className="brand-text">SnappSense</div>
            </div>
            <button className="feedback-button" aria-label="Give Feedback">
              Give Feedback
            </button>
          </header>

          {/* Hero Section */}
          <main className="hero-section" aria-labelledby="hero-heading hero-description">
            <div className="hero-bg"></div>
            <div className="hero-content">
              <h1 id="hero-heading">Capture sense of user feedback with snap</h1>
              <p id="hero-description">
                Paste the link of the app you want to analyze and discover powerful insights into user feedback within seconds. See trends, understand feedback, and enhance your app experience effortlessly.
              </p>
              <form className="search-bar" onSubmit={handleSubmit}>
                <input
                  type="text"
                  placeholder="paste playstore link for your app here"
                  value={appUrl}
                  onChange={(e) => setAppUrl(e.target.value)}
                  className="search-input"
                  id="app-url"
                  aria-labelledby="search-input-label"
                  aria-required="true"
                />
                <label htmlFor="app-url" className="visually-hidden" id="search-input-label">
                  Play Store URL
                </label>
                <button type="submit" className="snap-sense-button">
                  Snap Sense
                </button>
              </form>
            </div>
          </main>

          <footer className="footer" role="contentinfo">
            <div className="footer-text" aria-label="Footer Text">
              GET INSIGHTS ✨ PASTE LINK ✨ SNAP SENSE ✨ GET INSIGHTS ✨ PASTE LINK ✨ SNAP SENSE ✨ GET INSIGHTS ✨ PASTE LINK ✨ SNAP SENSE ✨
            </div>
          </footer>

          {errorMessage && <p className="error-message" role="alert">{errorMessage}</p>}
          {loading && <div className="loading-spinner" aria-busy="true" aria-label="Loading..."></div>}
        </div>
      )}

      {analysisResult && (
        <div
          className="results-page"
          ref={resultsContainerRef}
          aria-labelledby="results-heading"
        >
          {/* App Info Header */}
          <div className="app-header">
            <img
              src={analysisResult.icon || "https://via.placeholder.com/80"}
              alt={`${analysisResult.app_name} Icon`}
              className="app-icon"
            />
            <div className="app-details">
              <h1>{analysisResult.app_name || "App Name"}</h1>
              <div className="app-tags">
                <span className="app-tag">{analysisResult.category || "Category"}</span>
                <span className="app-tag">#4 top free shopping</span>
              </div>
            </div>
          </div>

          <div className="results-grid">
            {/* Row 1 Left: Sentiment Trends */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>Periodic Sentiment Trends</h3>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="period-selector"
                  aria-label="Select Time Period"
                  disabled={loading}
                >
                  <option value="1y">1y</option>
                  <option value="6m">6m</option>
                  <option value="3m">3m</option>
                  <option value="1m">1m</option>
                  <option value="1w">1w</option>
                </select>
              </div>
              <div className="chart-wrapper">
                {loading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <div className="loading-spinner"></div>
                  </div>
                ) : (
                  <Bar
                    data={stackedData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        x: { stacked: true, grid: { display: false } },
                        y: { stacked: true, display: false, beginAtZero: true }
                      },
                      plugins: {
                        legend: { display: false },
                      },
                      barPercentage: 0.6,
                      categoryPercentage: 0.8
                    }}
                    role="img"
                    aria-label="Sentiment Trends Chart"
                  />
                )}
              </div>
            </div>

            {/* Row 1 Right: All Time Sentiments (Semi-Circle) */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>All Time Sentiments</h3>
              </div>
              <div className="doughnut-container">
                <div style={{ position: 'relative', height: '200px', width: '100%' }}>
                  <Doughnut
                    data={doughnutData}
                    options={{
                      rotation: -90,
                      circumference: 180,
                      cutout: '70%',
                      plugins: {
                        legend: { display: false },
                        tooltip: { enabled: true }
                      },
                      maintainAspectRatio: false,
                    }}
                  />
                </div>
                <div className="total-reviews">
                  {Object.values(sentimentData).reduce((a, b) => a + b, 0)} Reviews
                </div>
                <div className="legend-container">
                  {['Delighted', 'Happy', 'Neutral', 'Angry', 'Frustrated'].map((label, i) => (
                    <div key={label} className="legend-item">
                      <div
                        className="legend-color"
                        style={{ backgroundColor: doughnutData.datasets[0].backgroundColor[i] }}
                      />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 2 Left: Feedback Analysis Table */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>Feedback Analysis Table</h3>
              </div>
              <div className="feedback-table-container">
                <table className="feedback-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Generalized Feedback</th>
                      <th>AI Solution</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbackTable.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <span className={`tag ${item.category.toLowerCase().replace(' ', '')}`}>
                            {item.category}
                          </span>
                        </td>
                        <td>{item.content}</td>
                        <td>{item.solution}</td>
                        <td>{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Row 2 Right: Feedback Category */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>Feedback Category</h3>
              </div>
              <div className="category-list">
                {Object.entries(categoryData).map(([category, percentage]) => (
                  <div key={category} className="category-item">
                    <div className="category-header">
                      <span>{category}</span>
                      <span>{percentage}%</span>
                    </div>
                    <div className="progress-bg">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: getCategoryColor(category)
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;