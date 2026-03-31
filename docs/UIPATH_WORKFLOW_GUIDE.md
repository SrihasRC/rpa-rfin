# UiPath Studio Workflow Guide
## RegTech Financial Compliance Monitoring System - RPA Automation

This guide provides step-by-step instructions for creating UiPath workflows to automate compliance monitoring tasks.

---

## Prerequisites

1. **UiPath Studio** installed (Community or Enterprise)
2. **Backend server** running at `http://localhost:8000`
3. **Supabase database** configured and seeded with data

### Required UiPath Packages
- `UiPath.WebAPI.Activities` (for HTTP requests)
- `UiPath.Excel.Activities` (for Excel operations)
- `UiPath.System.Activities` (core activities)

---

## Workflow 1: Download Transactions and Export to Excel

**Purpose**: Fetch all transactions from the API and save to an Excel file for review.

### Step-by-Step:

1. **Create New Process**
   - Open UiPath Studio
   - Click "New Project" > "Process"
   - Name: `ComplianceTransactionsExport`

2. **Add HTTP Request Activity**
   - Drag "HTTP Request" from Activities panel
   - Configure:
     - **Endpoint**: `http://localhost:8000/api/uipath/transactions/json`
     - **Method**: GET
     - **Accept Format**: JSON
   - Output: Save to variable `jsonResponse` (String)

3. **Deserialize JSON**
   - Add "Deserialize JSON" activity
   - Input: `jsonResponse`
   - Output: `jsonObject` (JObject)

4. **Extract Transactions Array**
   - Add "Assign" activity
   - Variable: `transactionsArray` (JArray)
   - Value: `jsonObject("transactions")`

5. **Build DataTable**
   - Add "Build Data Table" activity
   - Define columns:
     - transaction_id (String)
     - amount (Double)
     - currency (String)
     - sender_id (String)
     - receiver_id (String)
     - final_risk (String)
     - risk_score (Double)
     - timestamp (String)
   - Output: `dtTransactions`

6. **For Each to Populate DataTable**
   - Add "For Each" activity (Type: JToken)
   - In: `transactionsArray`
   - Body: Add "Add Data Row" activity
     - DataTable: `dtTransactions`
     - ArrayRow: `{item("transaction_id").ToString, CDbl(item("amount")), item("currency").ToString, item("sender_id").ToString, item("receiver_id").ToString, item("final_risk").ToString, CDbl(item("risk_score")), item("timestamp").ToString}`

7. **Write to Excel**
   - Add "Excel Application Scope" (or "Use Excel File")
   - Path: `"C:\Reports\Transactions_" + Now.ToString("yyyyMMdd_HHmmss") + ".xlsx"`
   - Inside scope, add "Write Range"
     - SheetName: "Transactions"
     - DataTable: `dtTransactions`
     - AddHeaders: True

---

## Workflow 2: Process Flagged Transactions

**Purpose**: Get flagged (HIGH/MEDIUM risk) transactions and generate a review report.

### Step-by-Step:

1. **Create New Process**: `FlaggedTransactionsReview`

2. **HTTP Request for Flagged Transactions**
   - **Endpoint**: `http://localhost:8000/api/uipath/flagged/json`
   - **Method**: GET
   - Output: `flaggedResponse`

3. **Deserialize and Extract**
   ```
   jsonObject = Deserialize JSON(flaggedResponse)
   highRiskCount = CInt(jsonObject("high_risk").Count)
   mediumRiskCount = CInt(jsonObject("medium_risk").Count)
   totalFlagged = CInt(jsonObject("count"))
   ```

4. **Log Summary**
   - Add "Log Message" activity
   - Message: `"Flagged Transactions: " + totalFlagged.ToString + " (High: " + highRiskCount.ToString + ", Medium: " + mediumRiskCount.ToString + ")"`

5. **Process Each High Risk Transaction**
   - For Each over `jsonObject("high_risk")`
   - For each item:
     - Extract transaction_id, amount, explanation
     - Log or write to Excel

6. **Send Email Alert (Optional)**
   - If highRiskCount > 0:
     - Add "Send SMTP Mail Message"
     - Subject: "ALERT: High Risk Transactions Detected"
     - Body: Details of flagged transactions

---

## Workflow 3: Single Transaction Compliance Check

**Purpose**: Submit a transaction for compliance check via API.

### Step-by-Step:

1. **Create New Process**: `SingleTransactionCheck`

2. **Read Transaction Data**
   - Use "Input Dialog" or read from Excel
   - Collect: amount, currency, sender_id, sender_country, receiver_id, receiver_country

3. **Build JSON Body**
   ```json
   {
     "amount": 15000,
     "currency": "USD",
     "sender_id": "ACC_12345678",
     "sender_country": "US",
     "receiver_id": "ACC_87654321",
     "receiver_country": "IR",
     "transaction_type": "wire_transfer"
   }
   ```

4. **HTTP Request**
   - **Endpoint**: `http://localhost:8000/api/uipath/transaction/check`
   - **Method**: POST
   - **Body**: JSON from step 3
   - **Headers**: Content-Type: application/json
   - Output: `checkResponse`

5. **Parse Response**
   ```
   result = Deserialize JSON(checkResponse)
   riskLevel = result("risk_level").ToString
   riskScore = CDbl(result("risk_score"))
   requiresReview = CBool(result("requires_review"))
   explanation = result("explanation").ToString
   ```

6. **Decision Based on Risk**
   - If `requiresReview = True`:
     - Log warning
     - Add to review queue (Excel/Database)
   - Else:
     - Log success

---

## Workflow 4: Batch CSV Processing

**Purpose**: Upload a CSV of transactions, get compliance results back.

### Step-by-Step:

1. **Create New Process**: `BatchCSVComplianceCheck`

2. **Prepare Input CSV**
   - Ensure CSV has columns: amount, currency, sender_id, sender_country, receiver_id, receiver_country, transaction_type
   - Path: `"C:\Input\transactions_to_check.csv"`

3. **HTTP Request with File Upload**
   - **Endpoint**: `http://localhost:8000/api/uipath/compliance-check/csv`
   - **Method**: POST
   - **Body Format**: Form-Data (Multipart)
   - **Attach File**: Select the CSV file

4. **Save Response CSV**
   - The response is a CSV file
   - Save to: `"C:\Output\compliance_results.csv"`

5. **Read Results into DataTable**
   - Use "Read CSV" activity
   - Path: `"C:\Output\compliance_results.csv"`
   - Output: `dtResults`

6. **Filter High Risk**
   - Use "Filter Data Table"
   - Condition: `final_risk = "HIGH"`
   - Output: `dtHighRisk`

7. **Export Filtered Results**
   - Write `dtHighRisk` to a separate Excel sheet

---

## Workflow 5: Download Reports to Excel

**Purpose**: Download compliance report and save to Excel.

### Step-by-Step:

1. **Create New Process**: `DownloadComplianceReport`

2. **HTTP Request**
   - **Endpoint**: `http://localhost:8000/api/reports/compliance?format=csv`
   - **Method**: GET
   - **Response Type**: Binary/File

3. **Save File**
   - Save response to: `"C:\Reports\ComplianceReport_" + Now.ToString("yyyyMMdd") + ".csv"`

4. **Convert CSV to Excel (Optional)**
   - Read CSV into DataTable
   - Write to Excel with formatting

---

## API Endpoints Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/uipath/transactions/csv` | GET | All transactions as CSV |
| `/api/uipath/transactions/json` | GET | All transactions as JSON |
| `/api/uipath/flagged/json` | GET | Flagged transactions (HIGH/MEDIUM) |
| `/api/uipath/transaction/check` | POST | Check single transaction |
| `/api/uipath/compliance-check/csv` | POST | Batch check from CSV, returns CSV |
| `/api/reports/compliance?format=csv` | GET | Full compliance report CSV |
| `/api/reports/flagged?format=csv` | GET | Flagged transactions report CSV |
| `/api/reports/sar?format=csv` | GET | SAR report CSV |

---

## Sample JSON Payloads

### Single Transaction Check Request
```json
{
  "amount": 15000.00,
  "currency": "USD",
  "sender_id": "ACC_12345678",
  "sender_country": "US",
  "sender_account_age_days": 365,
  "receiver_id": "ACC_87654321",
  "receiver_country": "IR",
  "transaction_type": "wire_transfer",
  "kyc_status": "verified",
  "is_sanctioned_entity": false,
  "is_pep": false
}
```

### Single Transaction Check Response
```json
{
  "success": true,
  "transaction_id": "TXN_ABC123456789",
  "amount": 15000.00,
  "currency": "USD",
  "risk_level": "HIGH",
  "risk_score": 0.8523,
  "rules_triggered": 3,
  "explanation": "High-risk transaction: High-value transfer ($15,000) to high-risk country (IR). Multiple compliance rules triggered.",
  "requires_review": true
}
```

---

## Tips for UiPath Development

1. **Use Try-Catch**: Wrap HTTP requests in Try-Catch to handle network errors
2. **Retry Scope**: Add retry logic for transient failures
3. **Log Everything**: Use Log Message activities for debugging
4. **Config Files**: Store API URL in config file for easy updates
5. **Credentials**: Use UiPath Orchestrator Assets for sensitive data

---

## Testing the API

Before building UiPath workflows, test endpoints using:

1. **Browser**: Visit `http://localhost:8000/docs` for Swagger UI
2. **Postman/Insomnia**: Import and test endpoints
3. **curl**:
   ```bash
   # Get all transactions
   curl http://localhost:8000/api/uipath/transactions/json
   
   # Get flagged transactions
   curl http://localhost:8000/api/uipath/flagged/json
   
   # Check single transaction
   curl -X POST http://localhost:8000/api/uipath/transaction/check \
     -H "Content-Type: application/json" \
     -d '{"amount": 15000, "currency": "USD", "sender_id": "ACC_001", "sender_country": "US", "receiver_id": "ACC_002", "receiver_country": "IR", "transaction_type": "wire_transfer"}'
   ```

---

## Project Demo Flow

For demonstrating the RPA project:

1. **Show the Web Application**
   - Login as user (john@example.com / demo1234)
   - Send a transaction
   - Show transaction in history

2. **Show Admin Dashboard**
   - Login as admin (admin@regtech.com / admin1234)
   - View all transactions
   - Show flagged transactions
   - Download reports

3. **Run UiPath Workflow**
   - Execute "Download Transactions to Excel" workflow
   - Show the generated Excel file
   - Execute "Flagged Transactions Review" workflow
   - Show the alert/log output

4. **Explain the Automation Value**
   - Manual process: Hours of reviewing transactions
   - Automated: Seconds to process and flag
   - Compliance rules automatically applied
   - Reports generated instantly
