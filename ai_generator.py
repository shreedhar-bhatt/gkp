import os
import json
import time
import random
import argparse
import re
import traceback
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from groq import Groq

# ==========================
# CONFIG
# ==========================

MODEL = "llama-3.3-70b-versatile"
PROMPT_FILE = "prompt.txt"
MAX_RETRIES = 3
TEMPERATURE = 0.3

NEPALI_DIGITS = str.maketrans('०१२३४५६७८९', '0123456789')
MONTH_MAP = {
    'जनवरी': 1, 'फेब्रुअरी': 2, 'मार्च': 3, 'अप्रिल': 4,
    'मे': 5, 'जुन': 6, 'जुलाई': 7, 'अगस्ट': 8,
    'सेप्टेम्बर': 9, 'अक्टोबर': 10, 'नोभेम्बर': 11, 'डिसेम्बर': 12,
    'बaisakh': 1, 'जेठ': 2, 'असार': 3, 'साउन': 4,
    'भदौ': 5, 'असोज': 6, 'कार्तिक': 7, 'मंसिर': 8,
    'पौष': 9, 'माघ': 10, 'फागुन': 11, 'चैत': 12,
    'वैशाख': 1, 'जेष्ठ': 2, 'आषाढ़': 3, 'श्रावण': 4,
    'भाद्रपद': 5, 'आश्विन': 6, 'कार्तिक': 7, 'मार्गशीर्ष': 8,
    'पौष': 9, 'माघ': 10, 'फाल्गुन': 11, 'चैत्र': 12,
}

load_dotenv()
print("Groq API Key loaded:", bool(os.getenv("GROQ_API_KEY")))
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

with open(PROMPT_FILE, "r", encoding="utf-8") as f:
    BASE_PROMPT = f.read().strip()


def generate_mcq(q):
    prompt = f"""
{BASE_PROMPT}

Question: {q.get('question')}
Correct Answer: {q.get('answer')}
Study Point: {q.get('study_point', '')}
"""
    response = client.chat.completions.create(
        model=MODEL,
        temperature=TEMPERATURE,
        response_format={"type": "json_object"},
        messages=[{"role": "user", "content": prompt}]
    )
    return json.loads(response.choices[0].message.content)


def parse_date_key(date_str: str):
    normalized = date_str.translate(NEPALI_DIGITS)
    match = re.search(r'(\d+)\s+(\S+)\s+(\d+)', normalized)
    if match:
        day = int(match.group(1))
        month_name = match.group(2)
        year = int(match.group(3))
        month = MONTH_MAP.get(month_name, 0)
        return (year, month, day)
    return (0, 0, 0)


def sanitize_filename_component(value: str, fallback: str = "unknown") -> str:
    text = value or fallback
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"[^\w\u0900-\u097F\-_. ]", " ", text)
    text = re.sub(r"\s+", "_", text.strip())
    text = re.sub(r"_+", "_", text).strip("._")
    return text[:120] or fallback


def normalize_date_for_filename(date_str: str) -> str:
    text = date_str or ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    match = re.search(r"(\d{1,2})\s+([A-Za-z\u0900-\u097F]+)\s+(\d{4})", text)
    if match:
        day = match.group(1)
        month_name = match.group(2).strip()
        year = match.group(3)
        return f"{day}_{month_name}_{year}"

    simple_match = re.search(r"(\d{1,2})\s+([A-Za-z\u0900-\u097F]+)", text)
    if simple_match:
        day = simple_match.group(1)
        month_name = simple_match.group(2).strip()
        return f"{day}_{month_name}"

    return datetime.now().strftime("%Y_%m_%d")


def process_file(input_path: Path, output_dir: Path):
    print(f"\n📄 Processing: {input_path.name}")
    with open(input_path, "r", encoding="utf-8") as f:
        source = json.load(f)

    questions = source.get("questions", [])
    raw_date = source.get("date", "")
    date_for_filename = normalize_date_for_filename(raw_date)
    if date_for_filename == "unknown_date":
        date_for_filename = datetime.now().strftime("%Y_%m_%d")

    print(f"Article Date: {raw_date}")
    print(f"Loaded {len(questions)} questions.")

    quiz_data = {
        "metadata": {
            "title": source.get("title"),
            "date": raw_date,
            "day": source.get("day"),
            "source": "Gorkhapatra",
            "totalQuestions": len(questions)
        },
        "questions": []
    }

    for i, q in enumerate(questions, 1):
        print(f"Generating MCQ {i}/{len(questions)}...")
        for attempt in range(MAX_RETRIES):
            try:
                mcq = generate_mcq(q)
                correct = mcq["options"][mcq["correctAnswer"]]
                random.shuffle(mcq["options"])
                mcq["correctAnswer"] = mcq["options"].index(correct)
                mcq["id"] = i
                mcq["studyPoint"] = q.get("study_point", "")
                quiz_data["questions"].append(mcq)
                print(f"✓ Done {i}")
                break
            import traceback

except Exception as e:
    print(f"\n❌ Retry {attempt + 1}")
    print(f"Exception type: {type(e).__name__}")
    print(f"Exception: {repr(e)}")
    traceback.print_exc()
    time.sleep(1.5)

    quiz_filename = f"quiz_{date_for_filename}.json"
    output_dir.mkdir(parents=True, exist_ok=True)

    with open(output_dir / quiz_filename, "w", encoding="utf-8") as f:
        json.dump(quiz_data, f, ensure_ascii=False, indent=2)

    with open(output_dir / "latest.json", "w", encoding="utf-8") as f:
        json.dump(quiz_data, f, ensure_ascii=False, indent=2)

    archive_dir = output_dir / "archive"
    archive_dir.mkdir(parents=True, exist_ok=True)
    with open(archive_dir / quiz_filename, "w", encoding="utf-8") as f:
        json.dump(quiz_data, f, ensure_ascii=False, indent=2)

    print(f"✅ Saved: {quiz_filename}")


def rebuild_archive_index(archive_dir: Path, output_path: Path):
    registry = {"archives": []}
    archive_files = list(archive_dir.glob("quiz_*.json"))

    parsed = []
    for file_path in archive_files:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                archived_quiz = json.load(f)
                meta = archived_quiz.get("metadata", {})
                date_str = meta.get("date", "")
                key = parse_date_key(date_str)
                parsed.append((key, file_path, date_str))
        except Exception as ex:
            print(f"Failed parsing {file_path.name}: {ex}")

    parsed.sort(key=lambda x: x[0], reverse=True)

    for key, file_path, date_str in parsed:
        registry["archives"].append({
            "date": date_str,
            "filePath": f"data/archive/{file_path.name}"
        })

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(registry, f, ensure_ascii=False, indent=2)
    print(f"Rebuilt archive index with {len(registry['archives'])} entries")


def set_latest_by_date(output_dir: Path):
    archive_dir = output_dir / "archive"
    latest_path = output_dir / "latest.json"

    best_file = None
    best_key = None

    for file_path in archive_dir.glob("quiz_*.json"):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            date_str = data.get("metadata", {}).get("date", "")
            key = parse_date_key(date_str)
            if best_key is None or key > best_key:
                best_key = key
                best_file = file_path
        except Exception:
            continue

    if best_file:
        with open(best_file, "r", encoding="utf-8") as f:
            latest_data = f.read()
        with open(latest_path, "w", encoding="utf-8") as f:
            f.write(latest_data)
        print(f"✅ Set latest.json to most recent: {best_file.name} ({best_key})")
    else:
        print("⚠️ No archive files found to set as latest")


def main():
    parser = argparse.ArgumentParser(description="Generate MCQs from scraped articles")
    parser.add_argument("--input", nargs="+", help="Input JSON files to process")
    parser.add_argument("--input-dir", default="questions_batch", help="Directory containing scraped JSON files")
    parser.add_argument("--output-dir", default="docs/data", help="Output directory for quiz data")
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    input_files = []
    if args.input:
        input_files = [Path(f) for f in args.input]
    else:
        input_dir = Path(args.input_dir)
        input_files = sorted(input_dir.glob("questions_*.json"))

    if not input_files:
        print("No input files found!")
        return

    print(f"Found {len(input_files)} files to process")

    for input_file in input_files:
        try:
            process_file(input_file, output_dir)
            set_latest_by_date(output_dir)
        except Exception as e:
            print(f"❌ Failed to process {input_file.name}: {e}")

    rebuild_archive_index(output_dir / "archive", output_dir / "archive_index.json")
    print("\n🎉 All done!")


if __name__ == "__main__":
    main()
