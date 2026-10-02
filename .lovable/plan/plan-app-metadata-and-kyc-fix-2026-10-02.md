# Plan — App Metadata and KYC Fix

## Search and social information
- Replace the outdated BlackPAL metadata with accurate CryptoVest naming and investment-focused wording.
- Add the published CryptoVest URL as the canonical page and social URL.
- Remove the unrelated placeholder share image so hosting can provide the correct preview image.

## KYC submission fix
- Stop submitting the nonexistent `id_selfie_url` field.
- Keep the actual `selfie_url`, `id_front_url`, and `id_back_url` fields used by the database and admin review screen.
- Preserve both first-time submission and rejected-document resubmission behavior.

## Verification
- Check the current build diagnostics and correct any blocking compile issue.
- Test the KYC flow’s generated request and confirm the page renders on mobile without the schema-cache error.

## Technical details
- This is a focused frontend correction; no database schema migration is needed because the correct KYC columns already exist.
- Metadata will be written in the static app head so search engines and social crawlers can read it.
