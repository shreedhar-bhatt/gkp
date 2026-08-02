# समसामायिक - Loksewa Quiz

AI-powered Loksewa preparation quiz platform hosted on GitHub Pages.

## Features

- Dashboard layout with sidebar navigation
- Weekly updated quizzes from Gorkhapatra Online
- Multiple choice questions with instant feedback
- 1 mark per question, 20% negative marking
- Explanation and study points after each answer
- Bookmark questions for later review
- Exam history and statistics
- Dark mode support
- Category-wise quizzes
- Date-wise quiz archive

## Tech Stack

- **Frontend**: Vanilla JS + CSS (Dashboard SPA)
- **Scraper**: Python + BeautifulSoup
- **AI Generator**: Groq API + LLaMA 3.3 70B
- **Hosting**: GitHub Pages

## Local Development

### Frontend

The frontend is a static site in the `docs/` folder. To serve locally:

```bash
# Using Python
python -m http.server 8080 --directory docs

# Or using Node.js
npx serve docs
```

Then open `http://localhost:8080`

### Backend Pipeline

Install dependencies:

```bash
pip install -r requirements.txt
```

Set up environment:

```bash
cp .env.example .env
# Add your GROQ_API_KEY to .env
```

Run the full pipeline (scrape + AI generation):

```bash
# Scrape latest article
python scraper.py --latest 1

# Generate MCQs from scraped data
python ai_generator.py --input-dir questions_batch --output-dir docs/data
```

## GitHub Pages Deployment

1. Push this repository to GitHub
2. Go to **Settings → Pages**
3. Set **Source** to `main` branch, `/docs` folder
4. The site will be live at `https://<username>.github.io/<repo-name>/`

## Project Structure

```
.
├── docs/                      # GitHub Pages static site
│   ├── index.html            # Main SPA entry
│   ├── css/                  # Stylesheets
│   ├── js/                   # JavaScript modules
│   ├── data/                 # Quiz JSON data
│   │   ├── latest.json       # Current quiz
│   │   ├── archive/          # Past quizzes by date
│   │   └── archive_index.json
│   └── manifest.json         # PWA manifest
├── scraper.py                # Scrapes Gorkhapatra articles
├── ai_generator.py           # Generates MCQs using AI
├── requirements.txt          # Python dependencies
└── .env.example              # Environment template
```

## License

MIT
