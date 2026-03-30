# UiPath Integration Guide

## Overview

UiPath acts as an automation layer that:
1. Reads transaction data from a CSV file
2. Calls the RegTech backend API for compliance checks
3. Writes results into an Excel report

UiPath does **NOT** implement rules or ML logic — that stays in the backend.

## Prerequisites

- UiPath Studio installed (Windows)
- Backend API running (accessible from the Windows machine)
- Transaction CSV file ready

## Workflow Steps

### Step 1: Read CSV
- Use **Read CSV** activity to load `transactions.csv`
- Store in a DataTable variable

### Step 2: Loop Through Rows
- Use **For Each Row** activity on the DataTable
- For each row, build a JSON request body:

```json
{
  "amount": <row["amount"]>,
  "currency": "<row["currency"]>",
  "sender_id": "<row["sender_id"]>",
  "sender_country": "<row["sender_country"]>",
  "receiver_id": "<row["receiver_id"]>",
  "receiver_country": "<row["receiver_country"]>",
  "transaction_type": "<row["transaction_type"]>",
  "kyc_status": "<row["kyc_status"]>"
}
```

### Step 3: Call API
- Use **HTTP Request** activity
- Method: POST
- URL: `http://<your-backend-ip>:8000/api/compliance-check`
- Headers: `Content-Type: application/json`
- Body: The JSON from Step 2

### Step 4: Parse Response
- Use **Deserialize JSON** on the response
- Extract: `transaction_id`, `final_risk`, `risk_score`, `rules_count`, `explanation.summary`

### Step 5: Write to Excel
- Use **Write Cell** or **Append Row** to write results into an Excel file
- Columns: Transaction ID | Amount | Currency | Final Risk | Risk Score | Rules Count | Explanation

### Step 6: Save & Close
- Use **Save Workbook** activity

## Batch Mode (Alternative)

Instead of one-by-one, send all transactions at once:
- URL: `http://<backend-ip>:8000/api/compliance-check/batch`
- Body: `{ "transactions": [<array of transaction objects>] }`

## Tips

- Set the backend URL as a UiPath Config variable for easy switching
- Add error handling (**Try Catch**) around the HTTP Request
- Log each result for debugging
