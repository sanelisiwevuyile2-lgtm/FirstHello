
import json
from datetime import date
from pathlib import Path

MEMORY_FILE = Path(__file__).resolve().parent.parent / "demo_birthdays.json"


def load_birthdays():
    if not MEMORY_FILE.exists():
        return {}

    return json.loads(MEMORY_FILE.read_text(encoding="utf-8"))


def save_birthday(friend, month, day, consent=False):
    if not consent:
        return "Permission required. Birthday not saved."

    date(2024, month, day)

    birthdays = load_birthdays()
    birthdays[friend] = {"month": month, "day": day}

    MEMORY_FILE.write_text(
        json.dumps(birthdays, indent=2),
        encoding="utf-8"
    )

    return f"Birthday saved for {friend}."


def check_birthdays(today):
    birthdays = load_birthdays()
    reminders = []

    for friend, birthday in birthdays.items():
        if birthday["month"] == today.month and birthday["day"] == today.day:
            reminders.append(
                f"Today is {friend}'s birthday! You could wish them well."
            )

    return reminders

def edit_birthday(friend, month, day, consent=False):
    birthdays = load_birthdays()

    if friend not in birthdays:
        return f"No saved birthday found for {friend}."

    if not consent:
        return "Permission required to change this memory."

    return save_birthday(friend, month, day, consent=True)


def delete_birthday(friend, confirmed=False):
    if not confirmed:
        return "Deletion not confirmed."

    birthdays = load_birthdays()

    if friend not in birthdays:
        return f"No saved birthday found for {friend}."

    del birthdays[friend]

    MEMORY_FILE.write_text(
        json.dumps(birthdays, indent=2),
        encoding="utf-8"
    )

    return f"Birthday deleted for {friend}."



if __name__ == "__main__":
    print(save_birthday("Nia", 11, 8, consent=True))
    print(check_birthdays(date(2026, 11, 8)))
