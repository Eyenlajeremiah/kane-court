# Launch posts

The rules ask for at least **two public posts**. Aim for four, staggered. Post the
verdict link, not a screenshot of a screenshot.

---

## Post 1 — Hacker News (post the demo + repo)

**Title:** Show HN: Kane Court — an AI agent that can't finish until a browser agent says it's green

> I built a small thing for the Kane CLI hackathon and I think the idea is
> stranger than the code.

> Most "AI + AI testing" demos run the test once, at the end, and print a green
> tick. That tick proves very little.

> Kane Court inverts it. The coding agent is the prosecutor. Kane CLI — a
> vision-based agent that drives a real Chrome — is the judge. It rules against
> the app on five adversarial personas: the impatient newcomer, the skeptical
> reader, the mobile user, the form filler, the promise checker.

> When Kane returns a failure, the failure is written to a file and the coding
> agent is re-prompted with exactly that failure. It fixes the app. Kane re-runs.
> A verdict is published only when the final round is green — and the green is
> Kane's, not mine. There's a Stop hook too, so the agent literally cannot end
> its turn while the judge is red.

> The demo target has four deliberate bugs. Watch it get caught, fixed, and
> re-verified.

> Repo (built with Antigravity): <REPO_URL>
> Demo video: <VIDEO_URL>

---

## Post 2 — X (the quotable one)

> An AI agent wrote a landing page. It looked perfect.
>
> A browser agent clicked the button. Nothing happened.

> So we made it a court: the agent is the prosecutor, the browser is the judge,
> and a verdict only prints when the judge says green.

> Built for the Kane CLI hackathon.
>
> <VIDEO_URL> | <REPO_URL>

---

## Post 3 — Reddit (r/webdev or r/programming)

> Built this for the Kane CLI hackathon: a QA court where the coding agent has
> to earn a green verdict from a real browser agent.
>
> The part I like: a Stop hook means the agent can't finish a task while the
> browser agent is failing it. It gets re-entered with the failure and has to
> fix the actual code. The verdict page only renders a green badge if the final
> Kane run was genuinely green.
>
> The demo target ships with four planted bugs (dead CTA, `undefined` in a table,
> a form that submits silently, content that overflows on mobile) and you can
> watch the loop catch and repair them.
>
> Repo: <REPO_URL>
> Video: <VIDEO_URL>
>
> Feedback welcome — especially on the persona objectives. I'm opinionated that
> the agent must not be allowed to weaken an assertion to force a pass.

---

## Post 4 — LinkedIn (professional angle)

> How do you know an AI-built feature actually works? You don't — until something
> other than the AI tries to use it.
>
> For the Kane CLI hackathon I built Kane Court: a QA court where the coding agent
> is the prosecutor, Kane CLI (a vision-based agent that drives a real Chrome) is
> the judge, and adversarial personas — the impatient newcomer, the skeptical
> reader, the mobile user — rule against what was built.
>
> The interesting part isn't the testing. It's the closed loop: a failure is fed
> back to the agent as a re-prompt, the agent repairs the code, and a verdict is
> published only when the browser agent confirms green.
>
> Repo: <REPO_URL>
> Demo: <VIDEO_URL>

---

## Posting notes

- Replace `<REPO_URL>` and `<VIDEO_URL>` everywhere before posting.
- Post HN and Reddit after the video is confirmed unlisted-and-working in incognito.
- Reply to every comment in the first hour — engagement earns brownie points.
- Do not mention the prize amount; do not tag TestMu unless they asked you to.
