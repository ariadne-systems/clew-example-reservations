# Repo metrics — cas-dd

Branch `main` at `ed04b10`, 18 commits over 6 increments.

## Lines written per increment, by what they are

| increment | commits | spec + | adr + | production + | test + | build/gov + | generated + | total + | total − |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| STR-1 | 3 | 38 | 111 | 48 | 59 | 2,127 | 28 | 2,678 | 1 |
| STR-2 | 3 | 411 | 0 | 243 | 441 | 0 | 812 | 2,038 | 63 |
| STR-3 | 3 | 214 | 0 | 212 | 400 | 0 | 140 | 1,008 | 47 |
| STR-4 | 2 | 105 | 0 | 105 | 163 | 0 | 4 | 397 | 12 |
| STR-5 | 3 | 122 | 0 | 124 | 269 | 0 | 4 | 539 | 33 |
| STR-6 | 4 | 252 | 51 | 145 | 314 | 0 | 8 | 864 | 83 |

`generated` is the clew traceables — emitted by the tool, not written by an agent, and excluded from any hand-written total.

## State of the tree at the end of each increment

| increment | prod files | prod lines | test files | test lines | @Test | spec files | spec lines | ADRs | @Realizes | @Verifies |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| STR-1 | 9 | 57 | 1 | 59 | 0 | 1 | 39 | 6 | 0 | 0 |
| STR-2 | 23 | 313 | 9 | 507 | 22 | 15 | 529 | 6 | 14 | 18 |
| STR-3 | 30 | 527 | 13 | 901 | 43 | 20 | 760 | 6 | 24 | 26 |
| STR-4 | 34 | 636 | 14 | 1,065 | 52 | 23 | 878 | 6 | 28 | 30 |
| STR-5 | 37 | 758 | 15 | 1,325 | 66 | 26 | 1,007 | 6 | 29 | 33 |
| STR-6 | 38 | 875 | 15 | 1,616 | 83 | 31 | 1,278 | 7 | 32 | 48 |

## Commits

| increment | commit | kind | subject | files | + | − |
| --- | --- | --- | --- | --- | --- | --- |
| STR-1 | c92f51e | draft | chore: scaffold clew and draft set-up-the-workspace (STR-1) | 28 | 1,903 | 0 |
| STR-1 | 6349fff | implement | feat: stand up the reservations workspace (STR-1) | 18 | 775 | 1 |
| STR-1 | 711180e | other | fix: review (STR-1 set up workspace) | 1 | 0 | 0 |
| STR-2 | 2b09e72 | draft | docs: draft reserve-single-item (STR-2) | 14 | 411 | 0 |
| STR-2 | 2819736 | implement | feat: implement reserve-single-item (STR-2) | 65 | 1,606 | 61 |
| STR-2 | 9c1a49a | other | fix: review (STR-2 reserve single item) | 3 | 21 | 2 |
| STR-3 | 4add9e9 | draft | docs: draft tentative-holds-with-expiry (STR-3) | 5 | 177 | 0 |
| STR-3 | 5ba3acf | implement | feat: implement tentative-holds-with-expiry (STR-3) | 34 | 826 | 46 |
| STR-3 | d7afcbe | other | fix: review (STR-3 tentative holds) | 1 | 5 | 1 |
| STR-4 | 6d59bba | draft | docs: draft owner-cancellation-and-release (STR-4) | 3 | 105 | 0 |
| STR-4 | 14b27a3 | implement | feat: implement owner-cancellation-and-release (STR-4) | 20 | 292 | 12 |
| STR-5 | 67a346d | draft | docs: draft per-user-quota (STR-5) | 3 | 105 | 0 |
| STR-5 | 75d4329 | implement | feat: implement per-user-quota (STR-5) | 22 | 429 | 31 |
| STR-5 | a8e4e49 | other | fix: review (STR-5 per-user quota) | 1 | 5 | 2 |
| STR-6 | 4a798d4 | other | demo(str-6): reveal the multi-item redesign requirement | 1 | 50 | 0 |
| STR-6 | 3dcd88b | draft | docs: draft atomic-multi-item-bookings (STR-6) | 5 | 214 | 0 |
| STR-6 | 70b5067 | implement | feat: implement atomic-multi-item-bookings (STR-6) | 29 | 584 | 80 |
| STR-6 | ed04b10 | other | fix: review (STR-6 multi-item redesign (blind)) | 3 | 16 | 3 |

## Coverage

JaCoCo line coverage at the last local build: **100.0%** (218 covered / 218 total).

