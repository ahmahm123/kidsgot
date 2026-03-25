# Stock Gainers Screenshots to Google Doc

This repository contains an automation workflow that:

1. Opens `https://www.google.com/finance/markets/gainers`
2. Collects the top 50 gainers
3. Captures a screenshot for each stock's detail page
4. Uploads those images to Google Drive
5. Creates a Google Doc with all 50 screenshots

## Prerequisites

- Python 3.11+
- A Google Cloud service account with:
  - Google Drive API enabled
  - Google Docs API enabled
  - Access to create/edit docs and files in your Drive (or shared drive/folder)

## Local Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m playwright install --with-deps chromium
```

## Credentials

Provide credentials in one of these ways:

- `GOOGLE_APPLICATION_CREDENTIALS` = path to service account JSON file
- `GOOGLE_SERVICE_ACCOUNT_JSON` = raw JSON or base64-encoded JSON content

Optional environment variables:

- `DRIVE_PARENT_FOLDER_ID` = parent folder to place generated image folders
- `DOC_TITLE_PREFIX` = custom prefix for generated document title

## Run

```bash
python scripts/capture_gainers_to_gdoc.py --limit 50
```

The script prints:

- Google Drive folder URL containing screenshots
- Google Doc URL containing screenshots inline

## GitHub Actions Workflow

Workflow file: `.github/workflows/stock-gainers-screenshots.yml`

Triggers:

- Manual (`workflow_dispatch`)
- Daily schedule (`cron`)

Required GitHub Secrets:

- `GOOGLE_SERVICE_ACCOUNT_JSON`

Optional GitHub Secrets:

- `DRIVE_PARENT_FOLDER_ID`
- `DOC_TITLE_PREFIX`

The workflow uploads local screenshots as an Actions artifact and logs links to the generated Drive folder and Google Doc.
