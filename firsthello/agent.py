"""Offline conversation-coach agent. No model, accounts or paid APIs are required.

Architecture: inspect input -> choose an appropriate tool -> use shared-interest
context -> return user-editable suggestions and a visible decision trace.
No tool sends a message, makes a match, or reveals someone's identity.
"""
from __future__ import annotations

import re
from typing import Any

PROFILES: dict[str, dict[str, Any]] = {
    "nia": {
        "id": "nia", "name": "Nia", "age": 23, "gender": "woman", "palette": "blush",
        "bio": "A little quiet at first. I love slow conversations and unexpectedly funny people.",
        "interests": ["Books", "Music", "Art", "Coffee", "Nature"],
        "pace": "No rush", "connection": "Deep chats & easy company", "symbol": "✿",
        "starter": "Hey! I saw that you like books too. What have you been reading?",
        "facts": [
            ("What kind of shops does Nia enjoy exploring?", ["bookstore", "bookshop", "book store"]),
            ("What weather does Nia say she enjoys?", ["rain", "rainy"]),
            ("What craft has Nia started learning?", ["crochet"]),
            ("What is the name of Nia's cat?", ["miso"]),
            ("What market does Nia like visiting on weekends?", ["farmers", "farmer", "farmers market"]),
        ],
        "history": [
            ("friend", "Hi! I get lost in little second-hand bookstores whenever I can."),
            ("me", "That sounds so peaceful!"),
            ("friend", "Rainy afternoons are my favourite. I'm learning crochet lately too."),
            ("me", "That's so cool. Do you have pets?"),
            ("friend", "A cat named Miso. He steals my yarn every time!"),
            ("friend", "I also love the farmers market on weekends. It's my happy place."),
        ],
    },
    "sam": {
        "id": "sam", "name": "Sam", "age": 24, "gender": "man", "palette": "charcoal",
        "bio": "Big on music, small adventures and not needing to talk all the time.",
        "interests": ["Music", "Gaming", "Nature", "Movies", "Cooking"],
        "pace": "No rush", "connection": "Someone to share everyday moments with", "symbol": "◈",
        "starter": "Hey! I noticed we both like music. What's always on your playlist?",
        "facts": [
            ("What genre of music does Sam play on Sunday mornings?", ["jazz"]),
            ("What activity does Sam enjoy on Sundays?", ["hiking", "hike"]),
            ("What cake flavour does Sam like?", ["lemon"]),
            ("What animated movie does Sam call a comfort film?", ["spirited away"]),
            ("What does Sam collect?", ["postcard", "postcards"]),
        ],
        "history": [
            ("friend", "I play slow jazz on Sunday mornings. It makes the whole house calmer."),
            ("me", "That sounds like such a relaxed Sunday."),
            ("friend", "Usually I go hiking on Sundays too, if the weather is nice."),
            ("friend", "Also, lemon cake is the best cake and I will defend that opinion."),
            ("me", "Okay, now I need to try lemon cake."),
            ("friend", "My comfort film is Spirited Away, and I collect postcards from trips."),
        ],
    },
    "zuri": {
        "id": "zuri", "name": "Zuri", "age": 22, "gender": "woman", "palette": "peach",
        "bio": "Creative soul. I love learning new things and friendships with room to breathe.",
        "interests": ["Art", "Movies", "Cooking", "Music", "Travel"],
        "pace": "A few times a week", "connection": "Shared ideas & laughter", "symbol": "✳",
        "starter": "Hi! What's a movie you could talk about forever?",
        "facts": [
            ("What hobby does Zuri do with watercolours?", ["painting", "paint"]),
            ("What food does Zuri like cooking?", ["pasta"]),
            ("What kind of films does Zuri enjoy?", ["animated", "animation"]),
            ("What does Zuri take photos of when travelling?", ["buildings", "architecture"]),
            ("What kind of music does Zuri enjoy?", ["indie"]),
        ],
        "history": [
            ("friend", "Watercolour painting is my favourite way to relax."),
            ("friend", "I could cook pasta any day of the week."),
            ("friend", "I love animated films and indie music."),
            ("friend", "When I travel I take photos of old buildings."),
        ],
    },
    "theo": {
        "id": "theo", "name": "Theo", "age": 25, "gender": "man", "palette": "slate",
        "bio": "More into thoughtful questions than small talk. Also terrible at choosing a film.",
        "interests": ["Gaming", "Books", "Technology", "Movies", "Nature"],
        "pace": "When we feel like it", "connection": "Thoughtful friendship", "symbol": "✦",
        "starter": "Hey. Important question: books or movies on a rainy day?",
        "facts": [
            ("What tabletop game does Theo play?", ["chess"]),
            ("What genre of books does Theo read?", ["science fiction", "sci fi", "sci-fi"]),
            ("Where does Theo like walking?", ["beach"]),
            ("What does Theo build on weekends?", ["keyboards", "keyboard"]),
            ("What drink does Theo prefer?", ["tea"]),
        ],
        "history": [
            ("friend", "I play chess sometimes."),
            ("friend", "My favourite books are science fiction."),
            ("friend", "I take long walks at the beach and build keyboards on weekends."),
            ("friend", "Always tea over coffee for me."),
        ],
    },
    "jo": {
        "id": "jo", "name": "Jo", "age": 23, "gender": "nonbinary", "palette": "sage",
        "bio": "Here for gentle friendships, creative ideas and genuinely good jokes.",
        "interests": ["Art", "Books", "Gaming", "Cooking", "Technology"],
        "pace": "No rush", "connection": "Creative conversations", "symbol": "✧",
        "starter": "Hello! What's a hobby you wish you had more time for?",
        "facts": [
            ("What does Jo like to sketch?", ["plants"]),
            ("What does Jo bake?", ["bread"]),
            ("What type of games does Jo enjoy?", ["puzzle"]),
            ("Where does Jo read?", ["garden"]),
            ("What instrument is Jo learning?", ["piano"]),
        ],
        "history": [
            ("friend", "I love sketching plants and baking bread."),
            ("friend", "Puzzle games are my favourite."),
            ("friend", "I read in the garden, and I'm slowly learning piano."),
        ],
    },
}

STOPWORDS = {"a", "the", "is", "and", "of", "to", "my", "i", "it", "you", "in", "at", "with", "for", "on"}


def safe_words(text: str) -> set[str]:
    return set(re.findall(r"[a-z]+", text.lower())) - STOPWORDS


def profile_summary() -> list[dict[str, Any]]:
    """Never expose quiz answers or simulated private messages to discovery cards."""
    return [{k: v for k, v in p.items() if k not in ("facts", "history")} for p in PROFILES.values()]


def ranked_matches(interests: list[str], genders: list[str] | None = None) -> list[dict[str, Any]]:
    selections = {s.casefold() for s in interests if isinstance(s, str)}
    allowed = {s.casefold() for s in (["woman", "man", "nonbinary"] if genders is None else genders)}
    matches = []
    for p in profile_summary():
        if p["gender"] not in allowed:
            continue
        shared = sorted(i for i in p["interests"] if i.casefold() in selections)
        # Simple, explainable discovery score; not a prediction of friendship.
        score = round(100 * len(shared) / max(1, len(set(i.casefold() for i in p["interests"]) | selections)))
        matches.append({**p, "shared": shared, "shared_count": len(shared), "interest_overlap": score})
    return sorted(matches, key=lambda p: (-p["shared_count"], p["name"]))


def choose_tool(last_text: str, recent: list[dict[str, str]]) -> str:
    text = last_text.casefold()
    if any(word in text for word in ("hurt", "sad", "lonely", "anxious", "stressed", "worried", "difficult", "hard day")):
        return "empathetic_followup"
    if not recent or len(recent) < 2:
        return "first_hello"
    if any(word in text for word in ("?", "what", "how", "why", "where", "which")):
        return "answer_and_return_question"
    if any(word in text for word in ("bye", "later", "busy", "sleep", "tomorrow")):
        return "low_pressure_reply"
    return "shared_interest_followup"


def coach(profile_id: str, interests: list[str], recent: list[dict[str, str]]) -> dict[str, Any]:
    """Decide which conversation tool to use and generate editable text.

    This is an explainable *rules-based* prototype, not an LLM. The backend
    never modifies or dispatches messages. Limit input to recent demo messages.
    """
    if profile_id not in PROFILES:
        raise ValueError("Unknown demo profile")
    if len(recent) > 12:
        raise ValueError("Only the last 12 messages may be used")
    if any(not isinstance(m, dict) or m.get("role") not in ("me", "friend") or not isinstance(m.get("text"), str) or len(m["text"]) > 2000 for m in recent):
        raise ValueError("Invalid messages")
    p = PROFILES[profile_id]
    shared = [s for s in p["interests"] if s.casefold() in {str(x).casefold() for x in interests}]
    last = recent[-1]["text"] if recent else ""
    tool = choose_tool(last, recent)
    topic = (shared or p["interests"])[0].lower()
    if tool == "empathetic_followup":
        suggestions = [
            "That sounds like a lot. Do you want to talk about it, or would a distraction help?",
            "I'm sorry today feels difficult. No pressure to explain, but I'm here to listen.",
            "Would you rather have some company or a little space today?",
        ]
        reason = "Respond with care instead of changing the subject."
    elif tool == "first_hello":
        suggestions = [
            f"Hey {p['name']}! I noticed we both enjoy {topic}. What's your favourite thing about it?",
            "Hi! I liked your profile. What's a little thing that made you smile this week?",
            "Hello! Would you rather start with a random question or talk about something we both like?",
        ]
        reason = "A friendly opener with an easy response path."
    elif tool == "answer_and_return_question":
        suggestions = [
            f"That's a good question! I really like {topic}. What about you?",
            "I hadn't thought of it like that. What got you interested in it?",
            "I might need to think about that one 😄 What would your answer be?",
        ]
        reason = "Offer a reply that keeps the exchange two-sided."
    elif tool == "low_pressure_reply":
        suggestions = [
            "Of course, take your time. We can pick up whenever you're free.",
            "No rush at all. Hope the rest of your day goes well!",
            "Talk soon, whenever works for you 😊",
        ]
        reason = "Respect the other person's time and boundaries."
    else:
        suggestions = [
            f"I love hearing about that! Have you ever tried anything new related to {topic}?",
            f"Speaking of {topic}, what made you get into it in the first place?",
            "That made me curious. Tell me a little more?",
        ]
        reason = "Follow up naturally, using a shared interest where possible."
    return {
        "mode": "offline_rules", "tool_used": tool, "reason": reason,
        "shared_interests": shared, "suggestions": suggestions,
        "sends_messages": False,
        "note": "These are editable suggestions from a rules-based demo, not a language model. The user decides what to send.",
    }


def score_friendly_quiz(profile_id: str, answers: list[str]) -> dict[str, Any]:
    """Score five fictional, non-sensitive memory prompts.

    The quiz is optional. It is NOT a safety check or proof of trust.
    Medical history, addresses, intimate details and private identity must
    not be mined to create questions. Real deployment requires permission.
    """
    if profile_id not in PROFILES:
        raise ValueError("Unknown demo profile")
    qs = PROFILES[profile_id]["facts"]
    if len(answers) != len(qs) or any(not isinstance(a, str) or len(a) > 300 for a in answers):
        raise ValueError("Provide five short answers")
    hits = []
    for ans, (_, accepted) in zip(answers, qs):
        normalized = " ".join(re.findall(r"[a-z0-9]+", ans.casefold()))
        hits.append(any(" ".join(re.findall(r"[a-z0-9]+", x.casefold())) in normalized for x in accepted) and bool(normalized))
    return {"percentage": sum(hits) * 20, "correct": hits, "threshold_met": sum(hits) >= 4,
            "note": "A quiz score is not evidence that someone is safe or trustworthy."}


def can_reveal(consent_a: bool, consent_b: bool, quiz_a: int | None = None, quiz_b: int | None = None, quiz_opted_in: bool = False) -> bool:
    """Mutual consent is mandatory; optional quiz requires both scores >= 80."""
    if not (consent_a and consent_b):
        return False
    if quiz_opted_in:
        return quiz_a is not None and quiz_b is not None and quiz_a >= 80 and quiz_b >= 80
    return True


def demo_history(profile_id: str) -> list[dict[str, str]]:
    if profile_id not in PROFILES:
        raise ValueError("Unknown demo profile")
    return [{"role": role, "text": txt} for role, txt in PROFILES[profile_id]["history"]]


def quiz_questions(profile_id: str) -> list[str]:
    if profile_id not in PROFILES:
        raise ValueError("Unknown demo profile")
    return [q for q, _ in PROFILES[profile_id]["facts"]]
