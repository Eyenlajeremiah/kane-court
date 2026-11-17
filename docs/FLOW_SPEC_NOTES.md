# Flow spec notes: why the objectives are phrased the way they are

## What happened

During round 2 of the atlas demo, the `newcomer` flow failed with:

```
run_end status: failed
reason_code: agent_error.child_failed
one_liner: "The run was stopped because the child agent said the test had to fail, even though the portfolio panel was shown after the button click."
```

The application was already correct. Kane's own recorded memory checks for that run all resolved to PASS:

| memory variable | value | meaning |
| --- | --- | --- |
| `portfolio_section_or_panel_visible` | true | panel visible -> PASS |
| `portfolio_company_name_present` | true | company name present -> PASS |
| `view_portfolio_click_changes_nothing` | false | the click DID change the page -> PASS |

## Root cause

The objective was written as a conditional trap:

> "If clicking it changes nothing, the test FAILS."

Kane's child agent reads the objective as an instruction set and, on encountering the word "FAILS" attached to a conditional, reported the required failure instead of evaluating the page. It halted the run with `agent_error.child_failed` even though every assertion had passed.

This is a specification-clarity defect, not an application defect. It is also not specific to this flow: `skeptic` and `mobile` were written the same way and are exposed to the same misreading.

## The fix

Every objective now states the passing condition first and derives the failure condition from it:

- "The test PASSES when X, and FAILS if any one of them is false."
- "The test PASSES when there is no horizontal overflow ... The test FAILS if content overflows horizontally or is cut off."

## Why this is not spec-weakening

The integrity lock exists so the agent cannot make a test pass by changing the thing it is judged against. This change is the opposite of that: it does not remove, relax, or reword any assertion, and it does not add a way for a broken page to pass.

The assertion set is unchanged and maps 1:1 onto the checks Kane records:

| flow | assertion (unchanged) |
| --- | --- |
| `newcomer` | panel visible; contains a company name; the click changes the page |
| `skeptic` | no `undefined`/`null`/`NaN`/`Lorem ipsum`/`TODO`/`coming soon`; every table cell has a real value |
| `mobile` | no sideways scroll at 375px; headline and button visible, no overlap |

A buggy page still fails all three:

- dead CTA -> panel never becomes visible -> `newcomer` FAILS
- `Coming soon.` and `undefined` present -> `skeptic` FAILS
- `min-width:960px` container -> horizontal overflow -> `mobile` FAILS

The parser was deliberately left untouched. `scripts/parse-kane.js` reported the run correctly: a child agent that aborted *is* a failed run, and the harness should not paper over that. The bug was in the wording, so the wording was fixed.

## Re-pinning the lock

Because `targets/atlas/flows.json` is a locked file, this change requires re-pinning the manifest:

```bash
node scripts/lock-files.js --init
node scripts/lock-files.js --status   # expect: drift 0
```

The lock still does its job from this point on: the agent may edit `targets/*/index.html` and nothing else.
