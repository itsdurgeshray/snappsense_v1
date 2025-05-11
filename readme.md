# SnappSense

**SnappSense** is a web application designed to help app developers and product managers capture and analyze user feedback from mobile apps on the Google Play Store. It provides sentiment analysis, feedback categorization, and valuable insights into user reviews, enabling better decision-making for app improvement.

### 🚀 **Features**
- **Sentiment Analysis**: Categorizes user reviews into five sentiment categories: Delighted, Happy, Neutral, Angry, and Frustrated.
- **Sentiment Trends**: Track sentiment trends over different time periods: 1 week, 1 month, 3 months, 6 months, and 1 year.
- **All-Time Sentiment Distribution**: Visualize the overall sentiment distribution of all reviews.
- **Categorized Feedback**: Group feedback into categories like feature requests and bug reports with potential solutions.
- **Review Translation**: Translate reviews in different languages to the user’s preferred language using **LibreTranslate**.
- **CSV Export**: Export categorized feedback and sentiment data to CSV for further analysis.
- **Interactive Visuals**: Hover over charts for detailed insights, including percentage breakdowns of sentiments.

### 💻 **Tech Stack**
- **Frontend**:
  - **HTML**: For webpage structuring.
  - **CSS3**: For fast styling with utility-first CSS classes.
  - **React.js**: For building interactive, dynamic and responsive user interfaces.
  - **Chart.js**: For visualizing sentiment trends and feedback data.
  - **Vite**: For templating frontend structure.

- **Backend**:
  - **Python**: Core language for backend logic, handling scrapping, processing & analysis.
  - **Flask**: Python web framework for handling backend logic.
  - **Flask-CORS**: For Cross-Origin Resource Sharing (CORS) support for frontend-backend communication
  - **Google-Play-Scraper**: For scrape reviews and metadata from Google Play Store.
  - **TextBlob**: For review parsing  sentiment analysis on translated reviews.
  - **Python's "dict"**: For caching processed data in memory for faster access.
  - **Pandas**: For data manipulation and processing, especially for handling tabular data.


### 🌍 **Platform Capabilities**
- **Sentiment Analysis**: Categorizes reviews into different sentiments and tracks how sentiment evolves over time.
- **Review Breakdown**: Categorizes reviews into useful feedback (e.g., bug reports, feature requests) with actionable suggestions.
- **Language Support**: Reviews are translated for users who speak different languages, improving accessibility.
- **Interactive Charts**: Users can interact with charts to see detailed sentiment distributions and trends.

### 🧰 **Issues**
If you encounter any issues or bugs, please feel free to open an issue in the repository, and it will be addressed.

---

**SnappSense** is your go-to tool for understanding and analyzing user sentiment for mobile apps. Capture user feedback, make data-driven decisions, and improve your app’s experience. 🚀