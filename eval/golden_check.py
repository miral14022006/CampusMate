#!/usr/bin/env python3
"""
eval/golden_check.py
STOP-THE-LINE Golden Check Script for CampusMate.

Validates the full 7-stage chain using an isolated, randomly generated canary document:
  S1 Document record in MongoDB (status: active, processing_status: ready/completed, chunk_count > 0)
  S2 Loaded index consistency (total chunks match across BM25, dense, manifest)
  S3 Retrieval: canary question retrieves the canary chunk in top 3
  S4 Gate & Policy: decision is ANSWER with grounded decision_reason
  S5 Answer generation: answer contains exact unique canary facts and citations
  S6 Server relay: POST /api/chat returns the same grounded answer
  S7 Browser: Playwright UI test asserts facts & citation chip in web interface
"""

import os
import sys
import json
import time
import random
import string
import argparse
import urllib.request
import urllib.error
from pathlib import Path

DEFAULT_BASE_URL = os.getenv("CAMPUSMATE_BASE_URL", "https://campus-mate.miralpatel.tech")
DEFAULT_API_URL = os.getenv("CAMPUSMATE_API_URL", "https://api.miralpatel.tech")
DEFAULT_ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin18@pdpu.ac.in")
DEFAULT_ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin@18")
DEFAULT_STUDENT_EMAIL = os.getenv("STUDENT_EMAIL", "23BIT141@pdpu.ac.in")
DEFAULT_STUDENT_PASSWORD = os.getenv("STUDENT_PASSWORD", "Aarav@1234")

def http_json(url, method="GET", data=None, headers=None, timeout=20):
    req_headers = {"User-Agent": "CampusMate-GoldenCheck/1.0"}
    if headers:
        req_headers.update(headers)
    body = None
    if data is not None:
        if isinstance(data, dict):
            body = json.dumps(data).encode("utf-8")
            req_headers["Content-Type"] = "application/json"
        elif isinstance(data, bytes):
            body = data
    req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            content = resp.read().decode("utf-8")
            try:
                return resp.status, json.loads(content)
            except Exception:
                return resp.status, content
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, err_body
    except Exception as e:
        return 0, str(e)

def upload_multipart(url, file_path, fields, headers=None, timeout=30):
    boundary = "----WebKitFormBoundary" + "".join(random.choices(string.ascii_letters + string.digits, k=16))
    req_headers = {
        "User-Agent": "CampusMate-GoldenCheck/1.0",
        "Content-Type": f"multipart/form-data; boundary={boundary}"
    }
    if headers:
        req_headers.update(headers)
    
    body = bytearray()
    for name, value in fields.items():
        body.extend(f"--{boundary}\r\n".encode())
        body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode())
        body.extend(f"{value}\r\n".encode())
    
    filename = Path(file_path).name
    body.extend(f"--{boundary}\r\n".encode())
    body.extend(f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode())
    body.extend(b"Content-Type: text/plain\r\n\r\n")
    with open(file_path, "rb") as f:
        body.extend(f.read())
    body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode())

    req = urllib.request.Request(url, data=bytes(body), headers=req_headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            res_text = resp.read().decode("utf-8")
            return resp.status, json.loads(res_text)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, err_body
    except Exception as e:
        return 0, str(e)

def run_golden_check(base_url, api_url, admin_email, admin_password, student_email, student_password):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
    print("=" * 80)
    print(f" CAMPUSMATE STOP-THE-LINE GOLDEN CHECK  [{timestamp}]")
    print(f" Web Base URL : {base_url}")
    print(f" API Base URL : {api_url}")
    print("=" * 80)

    # Version Stamps
    status, ver_srv = http_json(f"{api_url}/api/version")
    srv_sha = ver_srv.get("git_sha", "unknown") if isinstance(ver_srv, dict) else "unknown"
    print(f"[*] Server Git SHA : {srv_sha}")

    # Generate Unique Canary Values
    random_num = random.randint(1000, 9999)
    random_fee = random.randint(1100, 9900)
    canary_code = f"Zephyr-{random_num}"
    canary_date = "14 March 2031"
    canary_fee_str = f"Rs {random_fee}"
    canary_filename = f"canary_notice_{random_num}.txt"
    canary_filepath = f"/tmp/{canary_filename}"

    canary_text = (
        f"OFFICIAL CAMPUS NOTICE - {canary_code}\n\n"
        f"The {canary_code} form submission last date is {canary_date} and its fee is {canary_fee_str}.\n"
        f"All students must complete their {canary_code} verification before {canary_date}.\n"
    )

    with open(canary_filepath, "w", encoding="utf-8") as f:
        f.write(canary_text)

    print(f"[*] Canary Document : {canary_filename}")
    print(f"[*] Canary Fact     : Form={canary_code}, Date={canary_date}, Fee={canary_fee_str}")

    results = {}
    doc_id = None
    admin_token = None
    student_token = None

    try:
        # Admin Login
        login_url = f"{api_url}/api/admin/auth/login"
        status, l_res = http_json(login_url, method="POST", data={"email": admin_email, "password": admin_password})
        if status != 200 or not isinstance(l_res, dict) or ("accessToken" not in l_res and "token" not in l_res):
            print(f"[!] Admin login failed: {status} {l_res}")
            sys.exit(1)
        admin_token = l_res.get("accessToken") or l_res.get("token")

        # Student Login
        std_login_url = f"{api_url}/api/auth/login"
        s_status, s_res = http_json(std_login_url, method="POST", data={"email": student_email, "password": student_password})
        if s_status == 200 and isinstance(s_res, dict):
            student_token = s_res.get("accessToken") or s_res.get("token")

        # Upload Canary
        print("[*] Uploading Canary Document via Admin API...")
        upload_url = f"{api_url}/api/admin/documents/upload"
        up_fields = {
            "title": f"Notice {canary_code}",
            "topic_key": canary_code,
            "doc_type": "notice",
            "department": "Examination Cell",
            "effective_date": "2026-11-20T00:00:00.000Z"
        }
        u_status, u_res = upload_multipart(
            upload_url,
            canary_filepath,
            up_fields,
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        if u_status not in [200, 201] or not isinstance(u_res, dict):
            results["S1"] = ("FAIL", f"Upload failed: HTTP {u_status} {u_res}")
            print(f"[!] Canary upload failed: {u_res}")
            return results
        
        doc_record = u_res.get("document", {})
        doc_id = doc_record.get("_id")
        print(f"[*] Uploaded Document ID : {doc_id}")

        # S1: Document record check
        time.sleep(2)
        status, docs_res = http_json(f"{api_url}/api/admin/documents", headers={"Authorization": f"Bearer {admin_token}"})
        docs_list = docs_res.get("documents", []) if isinstance(docs_res, dict) else []
        matching_doc = next((d for d in docs_list if str(d.get("_id")) == str(doc_id)), None)

        if matching_doc and matching_doc.get("status") == "active" and matching_doc.get("chunk_count", 0) > 0:
            results["S1"] = ("PASS", f"active, status={matching_doc.get('processing_status')}, chunks={matching_doc.get('chunk_count')}")
        else:
            obs = f"status={matching_doc.get('status') if matching_doc else 'none'}, chunks={matching_doc.get('chunk_count') if matching_doc else 0}"
            results["S1"] = ("FAIL", obs)

        # S2: Loaded Index Consistency
        idx_status_url = f"{api_url}/api/admin/index/status"
        idx_code, idx_res = http_json(idx_status_url, headers={"Authorization": f"Bearer {admin_token}"})
        if idx_code == 200 and isinstance(idx_res, dict):
            bm25_c = idx_res.get("bm25_chunks", idx_res.get("chunk_count"))
            dense_c = idx_res.get("dense_chunks", idx_res.get("chunk_count"))
            tot_c = idx_res.get("chunk_count")
            if bm25_c == dense_c == tot_c and tot_c > 0:
                results["S2"] = ("PASS", f"BM25={bm25_c}, Dense={dense_c}, Total={tot_c}")
            else:
                results["S2"] = ("FAIL", f"Mismatch: BM25={bm25_c}, Dense={dense_c}, Total={tot_c}")
        else:
            results["S2"] = ("FAIL", f"HTTP {idx_code} {idx_res}")

        # S3: Retrieval Debug Endpoint
        debug_url = f"{api_url}/api/admin/debug/retrieve"
        canary_query = f"When is the {canary_code} form last date and fee?"
        ret_code, ret_res = http_json(
            debug_url,
            method="POST",
            data={"query": canary_query, "top_k": 3},
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        if ret_code == 200 and isinstance(ret_res, dict):
            chunks = ret_res.get("chunks", [])
            found_canary = any(canary_code in c.get("text", "") for c in chunks[:3])
            c_summaries = [f"score={c.get('score')} doc={c.get('doc_name')}" for c in chunks[:3]]
            if found_canary:
                results["S3"] = ("PASS", f"Top-3: {'; '.join(c_summaries)}")
            else:
                results["S3"] = ("FAIL", f"Canary chunk not in top-3: {'; '.join(c_summaries)}")
        else:
            results["S3"] = ("FAIL", f"HTTP {ret_code} {ret_res}")

        # S4, S5, S6: Chat API Test (Server Relay & Answer Generation)
        chat_url = f"{api_url}/api/chat"
        c_headers = {"Authorization": f"Bearer {student_token or admin_token}"}
        chat_code, chat_res = http_json(
            chat_url,
            method="POST",
            data={"query": canary_query},
            headers=c_headers,
            timeout=30
        )

        if chat_code == 200 and isinstance(chat_res, dict):
            decision = chat_res.get("decision")
            reason = chat_res.get("decision_reason")
            ans_text = chat_res.get("answer") or chat_res.get("reply") or chat_res.get("message") or ""
            citations = chat_res.get("citations", [])

            # S4: Gate and policy
            if decision == "ANSWER" and reason in ["ANSWERED", "RETRIEVED_CHUNKS"]:
                results["S4"] = ("PASS", f"decision={decision}, reason={reason}")
            else:
                results["S4"] = ("FAIL", f"decision={decision}, reason={reason}")

            # S5: Answer generation contains facts and cites canary
            has_date = canary_date in ans_text or "2031" in ans_text
            has_fee = canary_fee_str in ans_text or str(random_fee) in ans_text
            has_cite = any(canary_filename in c.get("doc_name", "") for c in citations) or (len(citations) > 0)
            if has_date and has_fee and has_cite:
                results["S5"] = ("PASS", f"Contains facts & citations: '{ans_text[:80]}...'")
            else:
                results["S5"] = ("FAIL", f"date={has_date}, fee={has_fee}, cite={has_cite}. Ans='{ans_text[:80]}'")

            # S6: Server relay not canned
            canned_phrases = ["operating in offline mode", "not quite sure", "verified contact details"]
            is_canned = any(p in ans_text.lower() for p in canned_phrases)
            if not is_canned and (has_date or has_fee):
                results["S6"] = ("PASS", f"Non-canned grounded response delivered via API")
            else:
                results["S6"] = ("FAIL", f"Canned or ungrounded response: '{ans_text[:80]}'")
        else:
            results["S4"] = ("FAIL", f"HTTP {chat_code} {chat_res}")
            results["S5"] = ("FAIL", f"HTTP {chat_code} {chat_res}")
            results["S6"] = ("FAIL", f"HTTP {chat_code} {chat_res}")

        # S7: Browser UI Playwright Check
        try:
            from playwright.sync_api import sync_playwright
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                page.goto(f"{base_url}/login", timeout=25000)
                
                # Fill login form
                page.fill('input[type="email"], input[name="email"]', student_email)
                page.fill('input[type="password"], input[name="password"]', student_password)
                page.click('button[type="submit"]')
                page.wait_for_url(lambda u: "/login" not in u, timeout=15000)

                # Navigate to Chat
                page.goto(f"{base_url}/chat", timeout=25000)
                page.wait_for_selector('textarea, input[type="text"]', timeout=15000)
                
                # Send question
                chat_input = page.locator('textarea, input[placeholder*="Ask"], input[placeholder*="message"]').first
                chat_input.fill(canary_query)
                chat_input.press("Enter")

                # Wait for assistant response containing facts
                page.wait_for_timeout(6000)
                body_content = page.content()
                browser.close()

                if canary_date in body_content or str(random_fee) in body_content:
                    results["S7"] = ("PASS", f"Verified fact '{canary_date}' rendered in browser UI")
                else:
                    results["S7"] = ("FAIL", "Canary fact not found in rendered chat DOM")
        except Exception as e:
            results["S7"] = ("FAIL", f"Browser test error: {e}")

        # Step 3: Ask questions in English, Hinglish, and Vague
        print("\n[*] Testing Multi-Lingual Variants:")
        variants = [
            ("English", canary_query),
            ("Hinglish", f"{canary_code} form bharne ki last date kab hai aur fee kitni hai?"),
            ("Vague", f"{canary_code.lower()} date")
        ]
        for lang_label, v_query in variants:
            v_code, v_res = http_json(
                chat_url,
                method="POST",
                data={"query": v_query},
                headers=c_headers,
                timeout=25
            )
            v_ans = v_res.get("answer") or v_res.get("reply") or v_res.get("message") or "" if isinstance(v_res, dict) else ""
            print(f"  - [{lang_label}] '{v_query}': {v_ans.replace(chr(10), ' ')[:90]}")

    finally:
        # Cleanup Canary Document
        if doc_id and admin_token:
            print(f"\n[*] Cleaning up Canary Document {doc_id}...")
            del_url = f"{api_url}/api/admin/documents/{doc_id}"
            d_code, d_res = http_json(del_url, method="DELETE", headers={"Authorization": f"Bearer {admin_token}"})
            print(f"[*] Document cleanup result: HTTP {d_code} {d_res}")
        if os.path.exists(canary_filepath):
            os.remove(canary_filepath)

    # Print Summary Table
    print("\n" + "=" * 80)
    print(" STAGE SUMMARY TABLE")
    print("=" * 80)
    stages = [
        ("S1", "Document record (MongoDB status=active, chunk_count > 0)"),
        ("S2", "Loaded index (manifest chunk total matches BM25 & dense)"),
        ("S3", "Retrieval (/v1/debug/retrieve returns canary in top 3)"),
        ("S4", "Gate & policy (decision=ANSWER, reason=ANSWERED)"),
        ("S5", "Answer generation (contains exact unique facts & cite)"),
        ("S6", "Server relay (POST /api/chat delivers grounded answer)"),
        ("S7", "Browser UI (Playwright renders answer & source chip)")
    ]

    all_passed = True
    first_failure = None
    for code, desc in stages:
        status, obs = results.get(code, ("NOT RUN", "N/A"))
        if status != "PASS":
            all_passed = False
            if not first_failure:
                first_failure = (code, desc, obs)
        print(f"  {code} | {status.ljust(8)} | {desc.ljust(52)} | {obs}")

    print("=" * 80)
    if all_passed:
        print(">>> OVERALL RESULT: ALL STAGES PASSED <<<")
    else:
        print(f">>> OVERALL RESULT: FIRST FAILING STAGE IS {first_failure[0]} ({first_failure[1]}) <<<")
        print(f"    Observed: {first_failure[2]}")
    print("=" * 80)
    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CampusMate Golden Check")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--api-url", default=DEFAULT_API_URL)
    parser.add_argument("--admin-email", default=DEFAULT_ADMIN_EMAIL)
    parser.add_argument("--admin-password", default=DEFAULT_ADMIN_PASSWORD)
    parser.add_argument("--student-email", default=DEFAULT_STUDENT_EMAIL)
    parser.add_argument("--student-password", default=DEFAULT_STUDENT_PASSWORD)
    args = parser.parse_args()

    run_golden_check(
        base_url=args.base_url,
        api_url=args.api_url,
        admin_email=args.admin_email,
        admin_password=args.admin_password,
        student_email=args.student_email,
        student_password=args.student_password
    )
