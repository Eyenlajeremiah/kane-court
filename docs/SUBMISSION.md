# Hackathon submission

Deadline: **26 Nov 2026, 11:59 PM IST** (= 19:29 WAT). EXTENDED from 19 Nov.

Submit EARLY. The form stays open after the deadline and you can keep editing
your submission - but do not leave it to the last day.

---

# The checklist

Do these five things in order. Nothing else. Do not build anything new.

- [ ] 1. **Author + commit the replayable flows** (10 min)
      `bash scripts/record-flows.sh atlas` then `git add .testmuai && git commit`
- [ ] 2. **Publish to npm** (10 min) - `npm login && npm publish`
- [ ] 3. **Record the demo video** (1-2 hrs) - see `docs/RECORDING_GUIDE.md`
      Upload as UNLISTED. Test the link in an incognito window.
- [ ] 4. **Post twice** (30 min) - see `docs/LAUNCH_POSTS.md`
      Replace `<REPO_URL>` and `<VIDEO_URL>` first.
- [ ] 5. **Submit the form** (20 min) - use the text in section 2 below.

Deadline: 26 Nov, 19:29 WAT. You have time. Submit as early as you can.

Form: <https://www.surveymonkey.com/r/kane-cli-hackathon-submission>

## 1. GitHub URL

`<REPO_URL>` â public, README with setup steps. Repo initialised on/after 12 Nov.

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
> deliberate bugs â a dead CTA, placeholder copy, a form that submits silently and
> content that overflows on mobile â so the loop can be seen catching and repairing
> them on camera.

## 3. Demo video

`<VIDEO_URL>` â YouTube **Unlisted** (not Private), 3-5 minutes, shows the app working
and Kane running. Test the link in an incognito window.

## 4. Live URL

`<LIVE_URL>` â or the runnable command, which must work in under 30 seconds:

```bash
npm install && npm start   # court on :3000
```

## 5. Launch buzz

At least two public posts, four planned:

- Hacker News â <HN_URL>
- X â <X_URL>
- Reddit â <REDDIT_URL>
- LinkedIn â <LINKEDIN_URL>

## Before you submit

- [ ] Kane CLI installed, logged in, `kane-cli balance` shows credits
- [ ] `bash scripts/loop.sh atlas` reaches green and publishes a verdict
- [ ] Verdict page loads at `/v/atlas`
- [ ] Video uploaded **Unlisted**, link tested in incognito
- [ ] README has setup steps and the loop diagram
- [ ] Repo's first commit is on/after 12 Nov
- [ ] Working credentials for any third-party service, plus a recorded fallback
- [ ] Two public posts live
- [ ] Submit before 26 Nov 19:29 WAT
