# Hackathon submission

Deadline: **19 Nov 2026, 11:59 PM IST** (= 18:29 WAT). Submit on the 18th if you can.

Form: <https://www.surveymonkey.com/r/kane-cli-hackathon-submission>

## 1. GitHub URL

`<REPO_URL>` — public, README with setup steps. Repo initialised on/after 12 Nov.

## 2. About your app (one paragraph)

> Kane Court is an adversarial QA court built with Google Antigravity, where the AI
> coding agent is the prosecutor and Kane CLI is the judge. Kane, a vision-based
> end-to-end agent that drives a real Chrome browser, rules against the app under
> five adversarial personas (the impatient newcomer, the skeptical reader, the
> mobile user, the form filler, the promise checker). When Kane returns a failure,
> the failure is written to a prompt file and the coding agent is re-prompted with
> exactly that failure; the agent repairs the application code and Kane re-runs,
> repeating until the round is green. A verdict is published only when the final
> Kane run was genuinely green, and an Antigravity Stop hook prevents the agent
> from finishing a task while the judge is red. The demo target ships with four
> deliberate bugs — a dead CTA, placeholder copy, a form that submits silently and
> content that overflows on mobile — so the loop can be seen catching and repairing
> them on camera.

## 3. Demo video

`<VIDEO_URL>` — YouTube **Unlisted** (not Private), 3-5 minutes, shows the app working
and Kane running. Test the link in an incognito window.

## 4. Live URL

`<LIVE_URL>` — or the runnable command, which must work in under 30 seconds:

```bash
npm install && npm start   # court on :3000
```

## 5. Launch buzz

At least two public posts, four planned:

- Hacker News — <HN_URL>
- X — <X_URL>
- Reddit — <REDDIT_URL>
- LinkedIn — <LINKEDIN_URL>

## Before you submit

- [ ] Kane CLI installed, logged in, `kane-cli balance` shows credits
- [ ] `bash scripts/loop.sh atlas` reaches green and publishes a verdict
- [ ] Verdict page loads at `/v/atlas`
- [ ] Video uploaded **Unlisted**, link tested in incognito
- [ ] README has setup steps and the loop diagram
- [ ] Repo's first commit is on/after 12 Nov
- [ ] Working credentials for any third-party service, plus a recorded fallback
- [ ] Two public posts live
- [ ] Submit before 18 Nov evening
