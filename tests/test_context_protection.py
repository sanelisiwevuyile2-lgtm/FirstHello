
import unittest

from firsthello.agent_ai import local_agent


class NeverCalledModel:
    def chat_json(self, *args, **kwargs):
        raise AssertionError(
            "AI should not be called for this supportive conversation"
        )


class TestContextProtection(unittest.TestCase):

    def test_supportive_conversation(self):
        conversation = [
            {
                "role": "me",
                "text": (
                    "I've been finding it difficult to make new "
                    "friends lately. Sometimes I don't know what to say."
                )
            },
            {
                "role": "friend",
                "text": (
                    "Sorry it's been a tough time. I'm glad you felt "
                    "okay saying that. No pressure to reply quickly."
                )
            }
        ]

        result = local_agent(
            "sam",
            ["Books", "Music"],
            conversation,
            client=NeverCalledModel()
        )

        self.assertEqual(result["mode"], "offline_rules")
        self.assertFalse(result["sends_messages"])
        self.assertEqual(len(result["suggestions"]), 3)

        self.assertIn(
            "Thank you for understanding",
            result["suggestions"][0]
        )


if __name__ == "__main__":
    unittest.main()
