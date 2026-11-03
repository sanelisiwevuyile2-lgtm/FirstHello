FirstHello

*Start with one person. Find your people, at your own pace.*

## Where the idea came from

I enjoy my own company, but that doesn't mean I don't want meaningful friendships. For me, it can be easier to get to know one person at a time than to enter a group where everyone is talking at once. I also think making a friend and keeping a friendship going are two different things. Sometimes the first conversation is the hardest part.

That is how FirstHello started. I wondered what an app would look like if it gave quieter people a little more room to connect. Not a dating app, not a place where you need a perfect picture or a big audience, but somewhere people could begin with shared interests and take things at their own pace.

## What FirstHello is

FirstHello is the first working version of that idea. It is a local prototype that I run on my computer. The people and conversations inside it are fictional, so I can test how the experience feels without involving real users.

You can create a simple profile, choose interests and find fictional people with things in common. The conversations are one-on-one. There are no public posts, follower counts or pressure to reply immediately. People are represented by abstract avatars rather than real photographs.

## The parts I wanted to make useful

Conversation Coach. If someone doesn't know what to say next, they can ask for a few possible replies. I used a free local language model, Gemma 3 1B through Ollama, to explore how AI could take account of a conversation. Suggestions are only drafts: the person can change them, ignore them or choose their own words. There is also clearly labelled offline guidance.

Friendship Memory. When a fictional friend mentions their birthday in a new message, FirstHello can recognise the date and ask whether it should be remembered. Nothing is saved until the person chooses Remember. Saved birthdays can be viewed, edited and deleted; the app also avoids asking to save a birthday it already remembers.

Matching, privacy and friendship circles. The demo matches fictional people by shared interests and lets them practise one-to-one chats. It includes a preview of optional identity reveal and the idea of small friendship circles. These are demonstrations, not real photo sharing or live group conversations.

## How I approached building it

I was new to building something like this, so I had to learn a lot as I went along. I worked on FirstHello in VS Code, using Python for the backend and HTML, CSS and JavaScript for the website. I used ChatGPT to help me understand errors, work through things I found confusing, and create or improve parts of the code when I needed guidance. I tested the changes, checked what worked and what didn't, and kept adjusting things until the application behaved the way I wanted. I also made the decisions about the features, the design and what I wanted the app to achieve. I still have a lot to learn, but working on FirstHello has helped me understand more about what goes into building an application.

It wasn't a straight line from idea to working screen. Sometimes a page didn't open, a small change broke something else, or the AI suggested something that didn't fit the conversation. I had to check errors, try changes and test again. There are currently 42 passing automated tests, alongside my manual browser tests. Some AI tests use simulated responses, so they don't prove the local language model will always be accurate.

## What it cannot do yet

This is a local, fictional portfolio prototype, not a finished social network. It doesn't have real user accounts, real-time conversations between people, real photos or video calls. Demo messages are fictional, and birthday data is stored locally. A public version would need proper authentication, privacy, security, age checks and consent safeguards.

## How to try it
1. Install Python and open the FirstHello_v5_AI_Portfolio project folder.
2. Run py app.py on Windows (or python3 app.py on macOS/Linux).
3. Open http://127.0.0.1:8772 in your browser.
4. To try the optional local AI, install Ollama, download gemma3:1b with ollama pull gemma3:1b, and make sure Ollama is running. No paid API is required.
5. To run the automated tests, use py -m unittest discover -s tests -v.

## Why I wanted to try
I started with a problem I understood and got to see how the parts of an application fit together. I still have a lot to learn, but FirstHello made me more interested in the work behind technology, not just what we see when we open an app.