import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import ai_generator


class AiGeneratorTests(unittest.TestCase):
    def test_process_file_sanitizes_invalid_date_for_filename(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            input_path = Path(tmpdir) / "input.json"
            output_dir = Path(tmpdir) / "out"
            input_path.write_text(
                json.dumps(
                    {
                        "title": "Demo",
                        "date": '<div class="text-center">यो समाचार पढेर त पाईलाई कस्तो लाग्यो?</div>',
                        "day": "बुधबार",
                        "source": "Gorkhapatra",
                        "questions": [
                            {
                                "question": "What is 2+2?",
                                "answer": "4",
                                "study_point": "Basic arithmetic",
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )

            with patch("ai_generator.generate_mcq", return_value={
                "options": ["A", "B", "C", "D"],
                "correctAnswer": 0,
            }):
                ai_generator.process_file(input_path, output_dir)

            created_files = sorted(p.name for p in output_dir.glob("quiz_*.json"))
            self.assertTrue(created_files, "Expected a quiz JSON file to be created")
            self.assertEqual(len(created_files), 1, "Expected one quiz JSON file in output dir")
            for name in created_files:
                self.assertNotIn("<", name)
                self.assertNotIn(">", name)
                self.assertNotIn("/", name)
                self.assertNotIn(":", name)
                self.assertTrue(name.startswith("quiz_"))


if __name__ == "__main__":
    unittest.main()
