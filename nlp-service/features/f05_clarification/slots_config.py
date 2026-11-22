"""
Feature 05: Slot configuration and entity requirements per intent.
"""
from typing import Dict, List

# Mapping of intent to required or recommended entity slots
INTENT_REQUIRED_SLOTS: Dict[str, List[str]] = {
    "exam_timetable": ["SEMESTER"],
    "syllabus_structure": ["COURSE_NAME"],
    "hostel_admission": ["CATEGORY"]
}

# Mapping of intent to responsible college office/cell in data/contacts.json
INTENT_DEPARTMENT_ROUTING: Dict[str, str] = {
    "exam_timetable": "exam_cell",
    "exam_form_deadline": "exam_cell",
    "exam_hall_ticket": "exam_cell",
    "exam_results": "exam_cell",
    "re-evaluation": "exam_cell",
    "fee_payment_dates": "accounts_office",
    "scholarship_eligibility": "accounts_office",
    "hostel_admission": "hostel_warden",
    "hostel_rules": "hostel_warden",
    "library_hours": "library_desk",
    "bus_pass_application": "transport_cell",
    "syllabus_structure": "academic_registrar",
    "admission_cutoff": "academic_registrar",
    "faculty_contacts": "academic_registrar",
    "placement_stats": "placement_cell",
    "wifi_network_access": "general_helpdesk",
    "out_of_scope": "general_helpdesk"
}

