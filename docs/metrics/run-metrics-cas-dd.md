# Run metrics — cas-dd

Arm `cas-dd` · branch `main` at `ed04b10` · model claude-opus-5 · effort high · **working tree was dirty**

Transcripts: `C:\Users\tschl\.claude\projects\C--develop-intellij-installations-clew-example-reservations2\1e961545-4b2f-4bc8-b98e-be1be2754954\subagents\workflows\wf_ca414841-511`

16 agent tasks · 557 model requests · 56,997,859 tokens · 169.3 min of agent wall time (43.6 min generating, 125.7 min in tools).

## Tokens and time per task

| task | kind | in | out | cache write | cache read | total | reqs | gen min | tool min | wall min |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| preflight | preflight | 4 | 262 | 35,942 | 35,463 | 71,671 | 2 | 0.0 | 0.1 | 0.1 |
| str-1 | increment | 86 | 30,289 | 107,247 | 3,100,083 | 3,237,705 | 43 | 2.8 | 7.6 | 10.4 |
| str-1-review | review | 1,317 | 19,120 | 77,332 | 1,550,374 | 1,648,143 | 26 | 1.1 | 6.8 | 7.9 |
| str-2 | increment | 580 | 74,501 | 169,275 | 5,971,038 | 6,215,394 | 58 | 5.7 | 13.8 | 19.5 |
| str-2-review | review | 1,042 | 41,625 | 117,211 | 2,526,917 | 2,686,795 | 29 | 1.4 | 11.3 | 12.8 |
| str-3 | increment | 1,260 | 56,061 | 165,113 | 7,483,270 | 7,705,704 | 71 | 5.4 | 14.0 | 19.4 |
| str-3-review | review | 62 | 19,105 | 103,373 | 2,362,817 | 2,485,357 | 31 | 1.2 | 8.8 | 10.0 |
| str-4 | increment | 678 | 30,129 | 136,286 | 4,924,507 | 5,091,600 | 52 | 2.9 | 7.1 | 9.9 |
| str-4-review | review | 34 | 17,685 | 87,386 | 995,399 | 1,100,504 | 17 | 0.8 | 4.3 | 5.1 |
| str-5 | increment | 130 | 61,861 | 183,935 | 7,489,670 | 7,735,596 | 65 | 5.7 | 13.1 | 18.7 |
| str-5-review | review | 68 | 23,811 | 100,887 | 2,624,965 | 2,749,731 | 34 | 1.4 | 8.8 | 10.2 |
| str-6-cherry-pick | increment | 6 | 800 | 38,194 | 75,213 | 114,213 | 3 | 0.1 | 0.3 | 0.4 |
| str-6 | increment | 168 | 78,219 | 222,588 | 12,305,161 | 12,606,136 | 84 | 5.8 | 20.7 | 26.5 |
| str-6-review | review | 62 | 19,637 | 116,702 | 2,649,138 | 2,785,539 | 31 | 0.6 | 6.8 | 7.4 |
| metrics | metrics | 14 | 2,842 | 42,976 | 241,929 | 287,761 | 7 | 0.3 | 1.8 | 2.1 |
| report | report | 8 | 52,020 | 242,126 | 181,856 | 476,010 | 4 | 8.5 | 0.5 | 8.9 |

`in` is uncached input, `cache read` is input served from the prompt cache and `cache write` is input written into it — they are three different prices for the same axis, so they are never summed into one "input" column here.

## Cost by kind of task

| kind | tasks | total tokens | share | in | cache write | cache read | out | reqs | wall min |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| increment | 7 | 42,706,348 | 74.9% | 2,908 | 1,022,638 | 41,348,942 | 331,860 | 376 | 104.8 |
| review | 6 | 13,456,069 | 23.6% | 2,585 | 602,891 | 12,709,610 | 140,983 | 168 | 53.4 |
| report | 1 | 476,010 | 0.8% | 8 | 242,126 | 181,856 | 52,020 | 4 | 8.9 |
| metrics | 1 | 287,761 | 0.5% | 14 | 42,976 | 241,929 | 2,842 | 7 | 2.1 |
| preflight | 1 | 71,671 | 0.1% | 4 | 35,942 | 35,463 | 262 | 2 | 0.1 |

A review is a phase of the work, not an activity within it — on the activity axis below it is scattered across orientation, verification and the rest. This is the row that sets one arm's review against the other's.

## Where the tokens went — activity

| activity | total tokens | share | in | cache write | cache read | out | reqs | gen min | tool min |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| reporting | 2,661,341 | 4.7% | 44 | 42,525 | 2,483,333 | 135,439 | 22 | 22.2 | 0.7 |
| specification | 5,016,175 | 8.8% | 678 | 89,896 | 4,883,822 | 41,779 | 52 | 3.9 | 9.5 |
| traceability | 4,065,799 | 7.1% | 66 | 54,799 | 4,003,108 | 7,826 | 33 | 0.4 | 10.3 |
| implementation | 4,966,419 | 8.7% | 76 | 58,163 | 4,874,328 | 33,852 | 38 | 2.9 | 3.6 |
| test-authoring | 5,349,080 | 9.4% | 80 | 119,140 | 5,156,381 | 73,479 | 40 | 6.2 | 4.8 |
| workspace | 83,200 | 0.1% | 2 | 3,801 | 76,209 | 3,188 | 1 | 0.2 | 0.8 |
| verification | 10,885,676 | 19.1% | 178 | 117,217 | 10,738,766 | 29,515 | 89 | 1.1 | 38.0 |
| version-control | 6,090,702 | 10.7% | 136 | 351,883 | 5,693,034 | 45,649 | 68 | 1.9 | 15.0 |
| orientation | 17,879,467 | 31.4% | 4,259 | 1,109,149 | 16,608,819 | 157,240 | 214 | 4.8 | 42.9 |

| activity | what it covers |
| --- | --- |
| reporting | emitting the structured result, or writing a report document |
| specification | authoring or maintaining specs/stories/ADRs under docs/spec, and clew mint/promote |
| traceability | anchor markers, clew spec/coverage/check — the spec<->code link itself |
| implementation | production code under src/main |
| test-authoring | test code under src/test |
| workspace | build and tool configuration (pom.xml, .clewrc.json, .claude/, package.json) |
| verification | running the build and the test suite (mvn / mvnw) |
| version-control | git staging, committing, inspecting history |
| orientation | reading and searching — files, specs, code, skills |

## Roll-up

| roll-up | total tokens | share | in | cache write | cache read | out | gen min | tool min | members |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| reasoning | 22,895,642 | 40.2% | 4,937 | 1,199,045 | 21,492,641 | 199,019 | 8.8 | 52.4 | orientation, deliberation, specification |
| implementation | 10,398,699 | 18.2% | 158 | 181,104 | 10,106,918 | 110,519 | 9.3 | 9.3 | implementation, test-authoring, workspace |
| verification | 10,885,676 | 19.1% | 178 | 117,217 | 10,738,766 | 29,515 | 1.1 | 38.0 | verification |
| traceability | 4,065,799 | 7.1% | 66 | 54,799 | 4,003,108 | 7,826 | 0.4 | 10.3 | traceability |
| overhead | 8,752,043 | 15.4% | 180 | 394,408 | 8,176,367 | 181,088 | 24.1 | 15.7 | version-control, reporting |

Output tokens are the axis worth ranking on: they are a fraction of the volume and a large share of the spend, and unlike cache read they do not move with cache-hit timing. Cache read reads as *how much context this work had to re-read*.

## Roll-up per task — output tokens

| task | kind | reasoning | implementation | verification | traceability | overhead | total out |
| --- | --- | --- | --- | --- | --- | --- | --- |
| preflight | preflight | 0 | 0 | 0 | 0 | 262 | 262 |
| str-1 | increment | 5,582 | 8,752 | 1,072 | 422 | 14,461 | 30,289 |
| str-1-review | review | 7,864 | 0 | 7,038 | 0 | 4,218 | 19,120 |
| str-2 | increment | 33,462 | 18,285 | 1,330 | 2,321 | 19,103 | 74,501 |
| str-2-review | review | 23,984 | 4,312 | 1,263 | 764 | 11,302 | 41,625 |
| str-3 | increment | 20,056 | 20,285 | 2,225 | 614 | 12,881 | 56,061 |
| str-3-review | review | 5,576 | 852 | 1,093 | 453 | 11,131 | 19,105 |
| str-4 | increment | 13,426 | 9,834 | 994 | 569 | 5,306 | 30,129 |
| str-4-review | review | 6,226 | 0 | 1,000 | 181 | 10,278 | 17,685 |
| str-5 | increment | 21,189 | 22,569 | 2,958 | 618 | 14,527 | 61,861 |
| str-5-review | review | 9,907 | 1,233 | 3,991 | 20 | 8,660 | 23,811 |
| str-6-cherry-pick | increment | 292 | 0 | 0 | 0 | 508 | 800 |
| str-6 | increment | 41,202 | 22,744 | 3,525 | 803 | 9,945 | 78,219 |
| str-6-review | review | 8,935 | 1,653 | 3,026 | 1,061 | 4,962 | 19,637 |
| metrics | metrics | 1,021 | 0 | 0 | 0 | 1,821 | 2,842 |
| report | report | 297 | 0 | 0 | 0 | 51,723 | 52,020 |

Method-specific spend (specification + traceability): **9,081,974 tokens, 15.9% of the run** — the part a run driven straight from the stories would not spend. Review tasks are excluded: both arms review, so charging one arm's review to the method would confound it with having a second pair of eyes.

## Tokens per method stage

| stage | total tokens | share | reqs | gen min | tool min |
| --- | --- | --- | --- | --- | --- |
| skill:superpowers:test-driven-development | 18,525,290 | 32.5% | 138 | 9.8 | 34.0 |
| orientation | 16,574,422 | 29.1% | 228 | 16.7 | 55.2 |
| skill:superpowers:verification-before-completion | 7,936,798 | 13.9% | 50 | 11.1 | 10.0 |
| skill:clew-implement | 4,192,824 | 7.4% | 42 | 1.3 | 5.9 |
| skill:clew-review | 2,649,356 | 4.6% | 17 | 0.8 | 6.1 |
| skill:clew-draft | 2,249,715 | 3.9% | 30 | 1.9 | 4.8 |
| skill:clew-promote | 1,511,127 | 2.7% | 17 | 0.1 | 2.3 |
| skill:clew-context | 1,491,292 | 2.6% | 19 | 1.5 | 4.8 |
| skill:superpowers:systematic-debugging | 1,236,994 | 2.2% | 6 | 0.1 | 1.5 |
| skill:clew-setup | 630,041 | 1.1% | 10 | 0.3 | 1.3 |

Stages come from the skill invoked at the time; a run that uses no skills reports one stage. This axis describes the method, so only the activity axis above is comparable across methods.

## Tool calls

| tool | calls |
| --- | --- |
| Bash | 344 |
| Edit | 69 |
| Write | 48 |
| Skill | 41 |
| Read | 33 |
| StructuredOutput | 20 |
| PowerShell | 2 |

Counted once per settled message. A streaming response is written to the transcript twice, so a naive count over the raw records inflates this figure.

