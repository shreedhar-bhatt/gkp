import requests
import logging
import json
import re
import argparse
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import List, Dict
from urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter
from bs4 import BeautifulSoup

# ====================== CONFIG ======================
BASE_URL = "https://gorkhapatraonline.com"
CATEGORY_URL = f"{BASE_URL}/categories/loksewa"
OUTPUT_DIR = Path("questions_batch")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": "ne,en-US;q=0.9",
}

# ====================== DATA CLASSES ======================
@dataclass
class Question:
    id: int
    question: str
    answer: str
    study_point: str = ""


@dataclass
class ExtractedArticle:
    title: str
    date: str
    day: str
    source: str
    url: str
    total_questions: int
    questions: List[Question]


def create_session() -> requests.Session:
    session = requests.Session()
    session.headers.update(HEADERS)
    retry = Retry(total=5, backoff_factor=1.5, status_forcelist=[429, 500, 502, 503, 504])
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session


def download_category(session: requests.Session) -> str:
    logging.info("Downloading category page...")
    resp = session.get(CATEGORY_URL, timeout=30)
    resp.raise_for_status()
    return resp.text


def get_all_article_urls(html: str, limit: int = None) -> List[str]:
    logging.info("Finding Loksewa articles...")
    soup = BeautifulSoup(html, "lxml")
    urls = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        title = a.get_text(strip=True)
        if "/news/" in href and any(k in title for k in ["वस्तुगत प्रश्नोत्तर", "लोकसेवा तयारी"]):
            full_url = BASE_URL + href if href.startswith("/") else href
            if full_url not in urls:
                urls.append(full_url)
    if limit:
        urls = urls[:limit]
    return urls


def download_article(session: requests.Session, url: str) -> str:
    logging.info(f"Downloading article: {url}")
    resp = session.get(url, timeout=30)
    resp.raise_for_status()
    return resp.text


def extract_metadata(soup: BeautifulSoup, url: str) -> Dict[str, str]:
    title = soup.find("h1").get_text(strip=True) if soup.find("h1") else "Loksewa Preparation"

    date_str = ""
    date_candidates = []

    for node in soup.find_all(string=True):
        text = str(node).strip()
        if not text:
            continue
        clean_text = re.sub(r"\s+", " ", text).strip()
        if "बुधबार" in clean_text:
            if re.search(r"\d{1,2}\s+(?:असार|साउन|भदौ|आषाढ|श्रावण|भाद्रपद|असोज|कार्तिक|मंसिर|पौष|माघ|फागुन|चैत|वैशाख|जेठ|जेष्ठ)\s+२०८[०-९]", clean_text):
                date_candidates.insert(0, clean_text)
        elif re.search(r"\d{1,2}\s+(?:असार|साउन|भदौ|आषाढ|श्रावण|भाद्रपद|असोज|कार्तिक|मंसिर|पौष|माघ|फागुन|चैत|वैशाख|जेठ|जेष्ठ)\s+२०८[०-९]", clean_text):
            date_candidates.append(clean_text)
        elif re.search(r"\d{1,2}\s+[०-९a-zA-Z]+", clean_text) and len(clean_text) < 80:
            date_candidates.append(clean_text)

    if date_candidates:
        date_str = date_candidates[0]
    else:
        date_str = datetime.now().strftime("%d %B %Y")

    day_match = re.search(r",\s*([^\s,]+बार)", date_str)
    day = day_match.group(1) if day_match else ""

    return {
        "title": title,
        "date": date_str,
        "day": day,
        "source": "Gorkhapatra Online",
        "url": url,
    }


def extract_questions(soup: BeautifulSoup) -> List[Question]:
    logging.info("Extracting questions...")
    questions = []
    qid = 1

    content = soup.find("div", class_="single-blog-content") or soup.find("article") or soup.body
    paragraphs = content.find_all("p")

    for p in paragraphs:
        text = p.get_text(strip=True)
        if not text:
            continue

        if re.match(r'^\d+\.', text):
            q_text = text
            answer = ""
            study = ""

            idx = paragraphs.index(p)
            for next_p in paragraphs[idx+1:idx+8]:
                next_text = next_p.get_text(strip=True)
                if next_text.startswith(""):
                    answer = next_text[1:].strip()
                elif next_text:
                    study += next_text + "\n"

            questions.append(Question(
                id=qid,
                question=q_text,
                answer=answer or "N/A",
                study_point=study.strip()
            ))
            qid += 1

    return questions


def normalize_date_for_filename(date_str: str) -> str:
    NEPALI_DIGITS = str.maketrans('०१२३४५६७८९', '0123456789')
    text = date_str or ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = text.translate(NEPALI_DIGITS)

    match = re.search(r"(\d{1,2})\s+([A-Za-z\u0900-\u097F]+)\s+(\d{4})", text)
    if match:
        day = match.group(1)
        month_name = match.group(2).strip()
        year = match.group(3)
        month_map = {
            "जनवरी": "jan", "फेब्रुअरी": "feb", "मार्च": "mar", "अप्रिल": "apr",
            "मे": "may", "जुन": "jun", "जुलाई": "jul", "अगस्ट": "aug",
            "सेप्टेम्बर": "sep", "अक्टोबर": "oct", "नोभेम्बर": "nov", "डिसेम्बर": "dec",
            "वैशाख": "baisakh", "जेठ": "jestha", "असार": "asar", "साउन": "shrawan",
            "भदौ": "bhadau", "असोज": "ashoj", "कार्तिक": "kartik", "मंसिर": "mangsir",
            "पौष": "poush", "माघ": "magh", "फागुन": "falgun", "चैत": "chaitra",
            "जेष्ठ": "jestha", "आषाढ": "ashadh", "श्रावण": "shrawan", "भाद्रपद": "bhadra",
            "आश्विन": "ashwin", "मार्गशीर्ष": "marg", "चैत्र": "chaitra",
            "Baisakh": "baisakh", "Jestha": "jestha", "Ashadh": "ashadh", "Shravan": "shrawan",
            "Bhadra": "bhadra", "Ashwin": "ashwin", "Kartik": "kartik", "Mangsir": "mangsir",
            "Poush": "poush", "Magh": "magh", "Falgun": "falgun", "Chaitra": "chaitra"
        }
        month_code = month_map.get(month_name, month_name.lower())
        return f"{day}_{month_code}_{year}"

    simple_match = re.search(r"(\d{1,2})\s+([A-Za-z\u0900-\u097F]+)", text)
    if simple_match:
        day = simple_match.group(1)
        month_name = simple_match.group(2).strip()
        month_map = {
            "जनवरी": "jan", "फेब्रुअरी": "feb", "मार्च": "mar", "अप्रिल": "apr",
            "मे": "may", "जुन": "jun", "जुलाई": "jul", "अगस्ट": "aug",
            "सेप्टेम्बर": "sep", "अक्टोबर": "oct", "नोभेम्बर": "nov", "डिसेम्बर": "dec",
            "वैशाख": "baisakh", "जेठ": "jestha", "असार": "asar", "साउन": "shrawan",
            "भदौ": "bhadau", "असोज": "ashoj", "कार्तिक": "kartik", "मंसिर": "mangsir",
            "पौष": "poush", "माघ": "magh", "फागुन": "falgun", "चैत": "chaitra",
            "जेष्ठ": "jestha", "आषाढ": "ashadh", "श्रावण": "shrawan", "भाद्रपद": "bhadra",
            "आश्विन": "ashwin", "मार्गशीर्ष": "marg", "चैत्र": "chaitra"
        }
        month_code = month_map.get(month_name, month_name.lower())
        return f"{day}_{month_code}"

    return datetime.now().strftime("%Y_%m_%d")


def scrape_article(session: requests.Session, url: str, output_path: Path) -> ExtractedArticle:
    html = download_article(session, url)
    soup = BeautifulSoup(html, "lxml")
    meta = extract_metadata(soup, url)
    questions = extract_questions(soup)

    article = ExtractedArticle(
        title=meta["title"],
        date=meta["date"],
        day=meta["day"],
        source=meta["source"],
        url=meta["url"],
        total_questions=len(questions),
        questions=questions
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(asdict(article), f, ensure_ascii=False, indent=2)

    logging.info(f"✅ Saved {len(questions)} questions to {output_path}")
    return article


def main():
    parser = argparse.ArgumentParser(description="Scrape Gorkhapatra Loksewa articles")
    parser.add_argument("--urls", nargs="+", help="Specific article URLs to scrape")
    parser.add_argument("--latest", type=int, help="Scrape N latest articles from category page")
    parser.add_argument("--output-dir", default="questions_batch", help="Output directory")
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    session = create_session()
    articles = []

    try:
        if args.urls:
            for idx, url in enumerate(args.urls, 1):
                raw_date = datetime.now().strftime("%d_%B_%Y")
                output_path = output_dir / f"questions_{idx}_{raw_date}.json"
                article = scrape_article(session, url, output_path)
                date_for_filename = normalize_date_for_filename(article.date)
                new_path = output_dir / f"questions_{idx}_{date_for_filename}.json"
                if output_path != new_path:
                    output_path.rename(new_path)
                    logging.info(f"Renamed {output_path} -> {new_path}")
                articles.append(article)
        elif args.latest:
            category_html = download_category(session)
            urls = get_all_article_urls(category_html, limit=args.latest)
            logging.info(f"Found {len(urls)} articles to scrape")

            for idx, url in enumerate(urls, 1):
                try:
                    output_path = output_dir / f"questions_{idx}.json"
                    article = scrape_article(session, url, output_path)
                    date_for_filename = normalize_date_for_filename(article.date)
                    new_path = output_dir / f"questions_{idx}_{date_for_filename}.json"
                    if output_path != new_path:
                        output_path.rename(new_path)
                        logging.info(f"Renamed {output_path} -> {new_path}")
                    articles.append(article)
                except Exception as e:
                    logging.error(f"Failed to scrape {url}: {e}")
        else:
            category_html = download_category(session)
            url = get_all_article_urls(category_html, limit=1)[0]
            output_path = output_dir / "questions_latest.json"
            article = scrape_article(session, url, output_path)
            date_for_filename = normalize_date_for_filename(article.date)
            new_path = output_dir / f"questions_{date_for_filename}.json"
            if output_path != new_path:
                output_path.rename(new_path)
                logging.info(f"Renamed {output_path} -> {new_path}")
            articles.append(article)

        print(f"\n🎉 Scraping complete! {len(articles)} articles saved to {output_dir}")

    except Exception as e:
        logging.error(f"Error: {e}")


if __name__ == "__main__":
    main()