
from datetime import date
import re
from .local_llm import Ollama

SCHEMA = {
    "type": "object",
    "properties": {
        "is_birthday": {"type": "boolean"},
        "month": {"type": "integer"},
        "day": {"type": "integer"}
    },
    "required": ["is_birthday", "month", "day"],
    "additionalProperties": False
}


def detect_birthday(message):
    
    # Only consider an explicitly stated personal birthday.
    if not isinstance(message, str):
        return None

    
    pattern = (
        r"\bmy birthday\s+(?:is|falls)\s+(?:on\s+)?"
        r"(\d{1,2})\s+([A-Za-z]+)"
    )

    match = re.search(pattern, message, re.IGNORECASE)

    if not match:
        return None

    birthday_text = match.group(0)


    instructions = (
        "You help FirstHello identify possible friendship memories. "
        "The message is written by a fictional friend. "
        "Only identify the birthday if the friend clearly states "
        "their OWN birthday. Do not guess dates. "
        "If the date is unclear or belongs to someone else, "
        "return is_birthday=false, month=0, day=0. "
        "Return structured JSON only."
    )

    result = Ollama().chat_json([
        {"role": "system", "content": instructions},
        {"role": "user", "content": birthday_text}
    ], SCHEMA)

    if result.get("is_birthday") is not True:
        return None

    month = result.get("month")
    day = result.get("day")

    if type(month) is not int or type(day) is not int:
        return None

    try:
        date(2024, month, day)
    except ValueError:
        return None

    return {"month": month, "day": day}


if __name__ == "__main__":
    message = "My birthday is on 8 November!"
    suggestion = detect_birthday(message)
    print("Suggested memory:", suggestion)
    print("Nothing has been saved.")
