# Web Scraper Example

Build a Python web scraper that:

1. Scrapes the top stories from Hacker News (https://news.ycombinator.com)
2. Extracts:
   - Title
   - URL
   - Points
   - Number of comments
   - Submission time

3. Saves data to both:
   - JSON file (hn_stories.json)
   - CSV file (hn_stories.csv)

4. Implements rate limiting (1 request per second)
5. Includes error handling for network issues
6. Adds logging for debugging

Requirements:
- Use requests and BeautifulSoup
- Follow robots.txt guidelines
- Include a main() function
- Add command-line argument for number of stories to fetch

Save as hn_scraper.py

The orchestrator will continue iterations until the scraper is fully implemented