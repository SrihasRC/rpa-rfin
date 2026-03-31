# UiPath Integration Guide

## Overview

UiPath acts as an automation layer that:
1. Reads transaction data from a CSV file
2. Calls the RegTech backend API for compliance checks
3. Writes results into an Excel report
4. Can generate SAR/STR PDF reports for high-risk transactions

UiPath does **NOT** implement rules or ML logic -- that stays in the backend.

## Prerequisites

- UiPath Studio installed (Windows)
- Backend API running (accessible from the Windows machine)
- Transaction CSV file ready

## API Endpoints for UiPath

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/compliance-check` | POST | Check a single transaction |
| `/api/compliance-check/batch` | POST | Check multiple transactions |
| `/api/transactions` | GET | List all transactions (paginated) |
| `/api/transactions/{id}` | GET | Get transaction details |
| `/api/reports/sar/{id}` | GET | Get SAR report (JSON) |
| `/api/reports/sar/{id}/pdf` | GET | Download SAR report (PDF) |
| `/api/uipath/transactions/csv` | GET | Download all transactions as CSV |
| `/api/uipath/compliance-check/csv` | POST | Upload CSV, get compliance results CSV |
| `/api/dashboard/stats` | GET | Get dashboard statistics |
| `/health` | GET | Health check |

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

## Alternative: Batch CSV Upload (Recommended)

Instead of processing one-by-one, you can upload the entire CSV file:

### Workflow
1. **Read CSV** activity -> get file path
2. **HTTP Request** activity:
   - Method: POST
   - URL: `http://<backend-ip>:8000/api/uipath/compliance-check/csv`
   - Content Type: `multipart/form-data`
   - Attach the CSV file
3. Response: CSV file with compliance results (transaction_id, amount, currency, final_risk, risk_score, rules_count, explanation)
4. **Write CSV** activity to save results

### Download All Transactions
- URL: `http://<backend-ip>:8000/api/uipath/transactions/csv`
- Method: GET
- Response: CSV download of all transactions in the database

## SAR PDF Generation

For high-risk transactions, generate a FinCEN-style SAR PDF:

1. Identify HIGH risk transactions from the compliance results
2. **HTTP Request** activity:
   - Method: GET
   - URL: `http://<backend-ip>:8000/api/reports/sar/<transaction_id>/pdf`
3. Save the response body as a PDF file

## Tips

- Set the backend URL as a UiPath Config variable for easy switching
- Add error handling (**Try Catch**) around the HTTP Request
- Log each result for debugging
- Use the batch CSV endpoint for large datasets (faster than one-by-one)
- The `/health` endpoint can be used to verify backend connectivity before processing
