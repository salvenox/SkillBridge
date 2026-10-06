# SkillBridge

A Smart India Hackathon 2026 workforce-intelligence prototype built with Next.js App Router.

## Setup

1. Copy `.env.example` to `.env.local` only if you want O*NET enrichment.
2. Add `ONET_API_KEY` to `.env.local`; the key is used only by the server-side `/api/onet` route.
3. Install dependencies with `npm install`, then run `npm run dev`.

The NCS catalog contains no seeded records. The application does not scrape NCS during user searches.

## NCS Source And Data Access

NCS pages inspected:

- [NCS home and job-search form](https://www.ncs.gov.in/)
- [NCS job listing](https://www.ncs.gov.in/job-listing)
- [NCS terms and conditions](https://ncs.gov.in/terms%26condition)

The current NCS site is an Angular application. Its public home search accepts a role/skill and location; its frontend calls a first-party job-post search endpoint using an opaque encrypted request body. NCS does not publish a public schema/OpenAPI specification for that interface in the inspected documentation. The NCS robots URL redirects to the homepage instead of serving a robots policy. The terms do not explicitly grant automated collection or republication rights. Therefore SkillBridge does not call that undocumented endpoint or scrape NCS pages.

The application accepts a **lawfully obtained and authorized NCS export** through a local catalog import. The source adapter recognizes only fields observed in NCS's own job detail frontend: `id`, `jobTitle`, `industry`, `organizationName`, `description`, `minExperience`, `maxExperience`, `jobLocations[].state`, `createdAt`, and `requiredSkills`. Records retain source URL and collection timestamp. NCS's public page does not expose a learning curriculum/optional-skill taxonomy in the verified detail view, so optional skills are not inferred.

After receiving explicit permission or an official data export, normalize and import it with:

```bash
npm run import:ncs -- /path/to/authorized-ncs-export.json
```

Input may be an array of NCS job-detail records or an object with a `jobs` array. The import rejects malformed records, drops duplicate IDs and duplicate skill aliases, and writes `src/data/ncsCareers.json`. It does not contact NCS. Refresh it only from an authorized fresh export.

## SkillBridge Flow

`authorized NCS export → normalizer → local NCS catalog → selected NCS career → exact skill comparison → missing-skill roadmap`

Skill matching lowercases and normalizes spacing/punctuation; the only built-in alias is `JS` / `JavaScript`. Original display names are retained. No fuzzy matching is used. The current user-skill profile is held in page state for the active session because the project has no account/profile store or database.

O*NET remains an optional server-side enrichment: for a selected NCS career, SkillBridge searches its title and only attaches O*NET importance to required skills with exact normalized-name matches. O*NET-only skills are not added as NCS requirements. If no `ONET_API_KEY` is configured, the NCS comparison continues without enrichment.

There is no existing course/resource or roadmap-progress system. The current roadmap sequences missing NCS-listed requirements in their source order and explains why each matters; course links and completion tracking remain future work.

## Commands

```bash
npm run test
npm run lint
npx tsc --noEmit
npm run build
```
