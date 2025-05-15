import React, { useState, useEffect, useRef } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';
import './App.css';

function App() {
  const [appUrl, setAppUrl] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('1y');
  const resultsContainerRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    Performance: 0,
    Others: 0,
  };

  const filteredTrends = analysisResult?.trends || {};
  const trendLabels = Object.keys(filteredTrends).sort().slice(-50);
  const stackedData = {
    labels: trendLabels,
    datasets: [
      {
        label: "Delighted",
        data: trendLabels.map(d => filteredTrends[d]?.Delighted || 0),
        backgroundColor: 'var(--dl-color-default-delighted)',
        stack: 'sentiment',
      },
      {
        label: "Happy",
        data: trendLabels.map(d => filteredTrends[d]?.Happy || 0),
        backgroundColor: 'var(--dl-color-default-happy)',
        stack: 'sentiment',
      },
      {
        label: "Neutral",
        data: trendLabels.map(d => filteredTrends[d]?.Neutral || 0),
        backgroundColor: 'var(--dl-color-default-neutral)',
        stack: 'sentiment',
      },
      {
        label: "Frustrated",
        data: trendLabels.map(d => filteredTrends[d]?.Frustrated || 0),
        backgroundColor: 'var(--dl-color-default-frustated)',
        stack: 'sentiment',
      },
      {
        label: "Angry",
        data: trendLabels.map(d => filteredTrends[d]?.Angry || 0),
        backgroundColor: 'var(--dl-color-default-angry)',
        stack: 'sentiment',
      },
    ],
  };

  const doughnutData = {
    labels: ["Delighted", "Happy", "Neutral", "Frustrated", "Angry"],
    datasets: [{
      data: [
        sentimentData.Delighted,
        sentimentData.Happy,
        sentimentData.Neutral,
        sentimentData.Frustrated,
        sentimentData.Angry,
      ],
      backgroundColor: [
        'var(--dl-color-default-delighted)',
        'var(--dl-color-default-happy)',
        'var(--dl-color-default-neutral)',
        'var(--dl-color-default-frustated)',
        'var(--dl-color-default-angry)',
      ],
    }],
  };

  const feedbackTable = analysisResult?.feedback || [];

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
                Paste the link of the app you want to analyze and discover powerful insights into user feedback within seconds.
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

          {/* Sentiment Distribution (Doughnut Chart) */}
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

          {/* Sentiment Trends (Stacked Bar Chart) */}
          <div className="chart-container">
            <Bar 
              data={stackedData}
              options={{
                responsive: true,
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

          {/* Feedback Table */}
          <div className="feedback-table">
            <h3>Feedback Samples</h3>
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Feedback</th>
                  <th>Solution</th>
                </tr>
              </thead>
              <tbody>
                {feedbackTable.map((item, index) => (
                  <tr key={index}>
                    <td>{item.category}</td>
                    <td>{item.content}</td>
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