# מתכוננות למיפוי – תרגול מתמטיקה לכיתה ד'

A Hebrew web app for practicing ahead of the start-of-year math assessment (Tuesday, 3.11.26).
It covers the 10 topics on the teacher's list and includes an interactive version of the printed practice booklet.

## What's inside

- **Separate profiles for each girl.** Each girl logs in with her name, and her progress is saved in the browser on that device.
- **Daily practice:** questions from every topic, with weaker topics coming up more often. Questions get harder as she improves (levels 1–3).
- **A short lesson with a worked example** before each new topic. The "📖 הסבר" button reopens it at any time.
- **Mistakes:** after a wrong answer she tries again. After two mistakes the app offers a hint 💡. After three it walks through the solution step by step 👩‍🏫 and then gives a similar question later for reinforcement.
- **Minimum 5 minutes:** the finish button stays locked until 5 minutes of practice have passed. Time only counts while she is active (not when the tab is hidden or after 2 minutes with no activity).
- **Practice booklet:** all the questions from the printed booklet, page by page, with answer checking.
- **Practice test:** 12 questions with no hints, followed by a full answer review.
- **Parent report:** success rate per topic, practice time per day, and a code to move progress to another device.

## Running locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000

No build step or dependencies – just HTML, CSS and JavaScript.

## Structure

| File | Contents |
|---|---|
| `js/util.js` | Helpers, Hebrew number words, expression evaluation, drawings (number line, angles, clock, triangles) |
| `js/questions.js` | Question builders for each topic, including hints and solutions |
| `js/generators.js` | Random question generators by topic and level |
| `js/lessons.js` | A short lesson with an example for each topic |
| `js/booklet.js` | The printed booklet's questions |
| `js/app.js` | Screens, sessions, timer, saving progress |
