import unittest
from features.f15_calendar_events.extractor import calendar_extractor

class TestCalendarEvents(unittest.TestCase):
    def test_extract_numeric_date(self):
        text = "The last date for Semester 5 exam form submission is 25/11/2026."
        events = calendar_extractor.extract_dates_from_text(text, doc_name="exam_notice.pdf", page=1)
        self.assertEqual(len(events), 1)
        ev = events[0]
        self.assertEqual(ev["start"], "2026-11-25")
        self.assertEqual(ev["category"], "exam")
        self.assertIn("Sem 5", ev["title"])
        self.assertFalse(ev["needs_review"])

    def test_extract_date_range(self):
        text = "Mid-sem examinations for B.Tech will be held from 10 to 20 Dec 2026."
        events = calendar_extractor.extract_dates_from_text(text, doc_name="timetable.pdf", page=2)
        self.assertEqual(len(events), 1)
        ev = events[0]
        self.assertEqual(ev["start"], "2026-12-10")
        self.assertEqual(ev["end"], "2026-12-20")
        self.assertEqual(ev["category"], "exam")
        self.assertIn("B.TECH", ev["title"])

    def test_extract_hindi_date(self):
        text = "सेमेस्टर 3 की फीस भरने की अंतिम तिथि 15 नवंबर 2026 है।"
        events = calendar_extractor.extract_dates_from_text(text)
        self.assertEqual(len(events), 1)
        ev = events[0]
        self.assertEqual(ev["start"], "2026-11-15")
        self.assertEqual(ev["category"], "fee")
        self.assertTrue("शुल्क" in ev["titles"]["hi"] or "फीस" in ev["titles"]["hi"] or "अंतिम तिथि" in ev["titles"]["hi"])

    def test_extract_gujarati_date(self):
        text = "પરીક્ષા ફોર્મ ભરવાની છેલ્લી તારીખ 10 ડિસેમ્બર 2026 છે."
        events = calendar_extractor.extract_dates_from_text(text)
        self.assertEqual(len(events), 1)
        ev = events[0]
        self.assertEqual(ev["start"], "2026-12-10")
        self.assertEqual(ev["category"], "exam")
        self.assertIn("પરીક્ષા", ev["titles"]["gu"])

    def test_ignore_relative_dates(self):
        text = "Exam form registration will open tomorrow and close next week."
        events = calendar_extractor.extract_dates_from_text(text)
        self.assertEqual(len(events), 0)

    def test_infer_missing_year(self):
        text = "Students must clear hostel dues by 20th August."
        events = calendar_extractor.extract_dates_from_text(text, effective_date="2027-01-01")
        self.assertEqual(len(events), 1)
        ev = events[0]
        self.assertEqual(ev["start"], "2027-08-20")
        self.assertTrue(ev["needs_review"])

if __name__ == '__main__':
    unittest.main()
