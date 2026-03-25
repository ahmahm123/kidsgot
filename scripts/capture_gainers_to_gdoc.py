#!/usr/bin/env python3
import argparse
import base64
import datetime as dt
import io
import os
import re
import tempfile
from dataclasses import dataclass
from typing import List, Optional

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright

GOOGLE_FINANCE_GAINERS_URL = "https://www.google.com/finance/markets/gainers"
SCOPES = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/documents",
]


@dataclass
class StockRow:
    symbol: str
    name: str
    detail_url: str


def decode_service_account_json(secret_value: str) -> str:
    # Supports plain JSON or base64-encoded JSON.
    value = secret_value.strip()
    if value.startswith("{"):
        return value
    decoded = base64.b64decode(value).decode("utf-8")
    return decoded


def build_google_clients(credentials_path: Optional[str], credentials_json: Optional[str]):
    if credentials_json:
        sa_data = decode_service_account_json(credentials_json)
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as fh:
            fh.write(sa_data)
            temp_path = fh.name
        credentials_path = temp_path

    if not credentials_path:
        raise ValueError(
            "Missing Google credentials. Provide --credentials-path or GOOGLE_SERVICE_ACCOUNT_JSON."
        )

    creds = service_account.Credentials.from_service_account_file(
        credentials_path, scopes=SCOPES
    )
    drive = build("drive", "v3", credentials=creds)
    docs = build("docs", "v1", credentials=creds)
    return drive, docs


def sanitize_filename(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9._-]+", "_", name).strip("_")


def get_top_gainers(limit: int) -> List[StockRow]:
    gainers: List[StockRow] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        page.goto(GOOGLE_FINANCE_GAINERS_URL, wait_until="domcontentloaded", timeout=120000)

        try:
            # Attempt to accept cookie prompt when present.
            page.get_by_role("button", name=re.compile("Accept all", re.I)).click(timeout=3000)
        except PlaywrightTimeoutError:
            pass
        except Exception:
            pass

        page.wait_for_timeout(3000)
        page.mouse.wheel(0, 3000)
        page.wait_for_timeout(1500)

        rows = page.locator("a[href*='/finance/quote/']")
        count = rows.count()

        seen_symbols = set()
        for idx in range(count):
            if len(gainers) >= limit:
                break
            row = rows.nth(idx)
            href = row.get_attribute("href")
            text = row.inner_text().strip()
            if not href or not text:
                continue
            symbol = text.split("\n")[0].strip()
            if not symbol or symbol in seen_symbols:
                continue
            seen_symbols.add(symbol)
            detail_url = href if href.startswith("http") else f"https://www.google.com{href}"
            name = text.replace("\n", " | ")
            gainers.append(StockRow(symbol=symbol, name=name, detail_url=detail_url))

        browser.close()

    if len(gainers) < limit:
        raise RuntimeError(f"Only found {len(gainers)} gainers; expected {limit}.")

    return gainers[:limit]


def capture_stock_screenshots(stocks: List[StockRow], output_dir: str) -> List[str]:
    os.makedirs(output_dir, exist_ok=True)
    screenshot_paths: List[str] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})

        for i, stock in enumerate(stocks, start=1):
            page.goto(stock.detail_url, wait_until="domcontentloaded", timeout=120000)
            page.wait_for_timeout(2500)
            page.mouse.wheel(0, 1200)
            page.wait_for_timeout(1000)
            filename = f"{i:02d}_{sanitize_filename(stock.symbol)}.png"
            path = os.path.join(output_dir, filename)
            page.screenshot(path=path, full_page=True)
            screenshot_paths.append(path)
            print(f"[{i}/{len(stocks)}] Captured {stock.symbol} -> {path}")

        browser.close()

    return screenshot_paths


def ensure_folder(drive, folder_name: str, parent_id: Optional[str] = None) -> str:
    query = (
        f"mimeType='application/vnd.google-apps.folder' and "
        f"name='{folder_name}' and trashed=false"
    )
    if parent_id:
        query += f" and '{parent_id}' in parents"

    res = drive.files().list(q=query, fields="files(id,name)").execute()
    files = res.get("files", [])
    if files:
        return files[0]["id"]

    metadata = {
        "name": folder_name,
        "mimeType": "application/vnd.google-apps.folder",
    }
    if parent_id:
        metadata["parents"] = [parent_id]
    folder = drive.files().create(body=metadata, fields="id").execute()
    return folder["id"]


def upload_images_to_drive(drive, image_paths: List[str], folder_id: str) -> List[str]:
    image_file_ids: List[str] = []
    for path in image_paths:
        file_name = os.path.basename(path)
        metadata = {"name": file_name, "parents": [folder_id]}
        with open(path, "rb") as fh:
            media = MediaIoBaseUpload(io.BytesIO(fh.read()), mimetype="image/png")
            uploaded = drive.files().create(body=metadata, media_body=media, fields="id").execute()
        image_file_ids.append(uploaded["id"])
        print(f"Uploaded to Drive: {file_name} ({uploaded['id']})")
    return image_file_ids


def create_google_doc(docs, title: str) -> str:
    doc = docs.documents().create(body={"title": title}).execute()
    return doc["documentId"]


def insert_content_into_doc(docs, doc_id: str, stocks: List[StockRow], image_file_ids: List[str]):
    requests = []
    index = 1

    intro = (
        f"Top {len(stocks)} Google Finance Gainers\n"
        f"Generated at: {dt.datetime.utcnow().isoformat()}Z\n\n"
    )
    requests.append({"insertText": {"location": {"index": index}, "text": intro}})
    index += len(intro)

    for i, (stock, file_id) in enumerate(zip(stocks, image_file_ids), start=1):
        header = f"{i}. {stock.symbol}\n{stock.detail_url}\n"
        requests.append({"insertText": {"location": {"index": index}, "text": header}})
        index += len(header)

        image_uri = f"https://drive.google.com/uc?id={file_id}"
        requests.append(
            {
                "insertInlineImage": {
                    "location": {"index": index},
                    "uri": image_uri,
                    "objectSize": {
                        "height": {"magnitude": 300, "unit": "PT"},
                        "width": {"magnitude": 520, "unit": "PT"},
                    },
                }
            }
        )
        index += 1
        spacer = "\n\n"
        requests.append({"insertText": {"location": {"index": index}, "text": spacer}})
        index += len(spacer)

    docs.documents().batchUpdate(documentId=doc_id, body={"requests": requests}).execute()


def share_doc_and_images(drive, doc_id: str, folder_id: str):
    # Make folder readable by anyone with link so inline images render in Docs.
    perm = {"type": "anyone", "role": "reader"}
    drive.permissions().create(fileId=folder_id, body=perm).execute()
    drive.permissions().create(fileId=doc_id, body=perm).execute()


def main():
    parser = argparse.ArgumentParser(
        description="Capture Google Finance top gainers screenshots and store in Google Doc."
    )
    parser.add_argument("--limit", type=int, default=50, help="Number of stocks to process.")
    parser.add_argument(
        "--credentials-path",
        default=os.getenv("GOOGLE_APPLICATION_CREDENTIALS"),
        help="Path to Google service account credentials JSON.",
    )
    parser.add_argument(
        "--credentials-json",
        default=os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON"),
        help="Raw or base64 service account JSON.",
    )
    parser.add_argument(
        "--drive-parent-folder-id",
        default=os.getenv("DRIVE_PARENT_FOLDER_ID"),
        help="Optional Drive parent folder ID.",
    )
    parser.add_argument(
        "--doc-title-prefix",
        default=os.getenv("DOC_TITLE_PREFIX", "Google Finance Gainers"),
        help="Prefix for generated Google Doc title.",
    )
    parser.add_argument(
        "--output-dir",
        default="artifacts/screenshots",
        help="Local output directory for screenshots.",
    )
    args = parser.parse_args()

    drive, docs = build_google_clients(args.credentials_path, args.credentials_json)
    stocks = get_top_gainers(limit=args.limit)
    screenshot_paths = capture_stock_screenshots(stocks, args.output_dir)

    run_stamp = dt.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    folder_name = f"stock_gainers_{run_stamp}"
    folder_id = ensure_folder(drive, folder_name, parent_id=args.drive_parent_folder_id)
    image_file_ids = upload_images_to_drive(drive, screenshot_paths, folder_id)

    doc_title = f"{args.doc_title_prefix} - {run_stamp}"
    doc_id = create_google_doc(docs, doc_title)
    insert_content_into_doc(docs, doc_id, stocks, image_file_ids)
    share_doc_and_images(drive, doc_id, folder_id)

    print("\nDone.")
    print(f"Drive folder: https://drive.google.com/drive/folders/{folder_id}")
    print(f"Google Doc: https://docs.google.com/document/d/{doc_id}/edit")


if __name__ == "__main__":
    main()
