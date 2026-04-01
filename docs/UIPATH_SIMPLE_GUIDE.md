# UiPath Studio - Simple Workflow Guide
## RegTech Financial Compliance Monitoring System

This guide provides detailed step-by-step instructions for creating **2 UiPath workflows** for your RPA project demonstration.

---

## Prerequisites

### Software Required
- UiPath Studio (Community Edition is free)
- Backend server running at `http://localhost:8000`
- Frontend running at `http://localhost:3000`

### UiPath Packages to Install
In UiPath Studio, go to **Manage Packages** and install:
1. `UiPath.WebAPI.Activities` - For HTTP requests
2. `UiPath.Excel.Activities` - For Excel operations

### Folder Setup
Create these folders on your computer:
```
C:\RPA\
  Input\          <- For input CSV files
  Output\         <- For Excel results
  SAR_Reports\    <- For SAR/STR PDF reports
```

---

## Workflow 1: CSV Batch Compliance Check

**Purpose**: Read transactions from a CSV file, send each to the compliance API, and save results to Excel.

**Use Case**: Process a batch of transactions offline and get compliance results.

---

### Step 1: Create the Input CSV File

Create a file `C:\RPA\Input\transactions.csv` with this content:

```csv
amount,currency,sender_country,receiver_country,transaction_type
5000,USD,US,GB,wire_transfer
15000,USD,US,IR,wire_transfer
25000,EUR,DE,RU,wire_transfer
8000,USD,IN,US,wire_transfer
50000,USD,US,KP,wire_transfer
```

---

### Step 2: Create New Project in UiPath Studio

1. Open UiPath Studio
2. Click **New Project** > **Process**
3. Name: `CSVComplianceCheck`
4. Click **Create**

---

### Step 3: Create Variables

In the Variables panel (bottom of screen), create these variables:

| Name | Type | Scope | Default |
|------|------|-------|---------|
| dtInput | DataTable | Sequence | |
| dtResults | DataTable | Sequence | |
| jsonBody | String | Sequence | |
| apiResponse | String | Sequence | |
| jsonResult | JObject | Sequence | |
| riskLevel | String | Sequence | |
| riskScore | String | Sequence | |
| explanation | String | Sequence | |

**To create JObject type**: Click "Browse for Types" > search "JObject" > select `Newtonsoft.Json.Linq.JObject`

---

### Step 4: Build the Workflow

#### 4.1 Add Sequence Container
- Drag **Sequence** from Activities panel to the Designer
- Rename it: `CSV Batch Compliance Check`

#### 4.2 Log Start
- Drag **Log Message** activity into the Sequence
- **Level**: `Info`
- **Message**: `"Starting CSV Batch Compliance Check..."`

#### 4.3 Read Input CSV
- Drag **Read CSV** activity
- Properties:
  - **FilePath**: `"C:\RPA\Input\transactions.csv"`
  - **IncludeColumnNames**: Check the box (True)
  - **Output** > **DataTable**: `dtInput`

#### 4.4 Build Results DataTable
- Drag **Build Data Table** activity
- Click **DataTable...** button to configure columns:
  
| Column Name | Data Type |
|-------------|-----------|
| Amount | String |
| Currency | String |
| SenderCountry | String |
| ReceiverCountry | String |
| RiskLevel | String |
| RiskScore | String |
| Explanation | String |

- Click **OK**
- Set **Output** > **DataTable**: `dtResults`

#### 4.5 For Each Row Loop
- Drag **For Each Row in Data Table** activity
- **In DataTable**: `dtInput`

#### 4.6 Inside the Loop - Build JSON Request
- Inside the For Each Row body, drag **Assign** activity
- **To**: `jsonBody`
- **Value** (copy exactly):
```
"{""amount"": " + CurrentRow("amount").ToString + ", ""currency"": """ + CurrentRow("currency").ToString + """, ""sender_id"": ""ACC_BATCH_" + Now.Ticks.ToString.Substring(10) + """, ""sender_country"": """ + CurrentRow("sender_country").ToString + """, ""receiver_id"": ""ACC_RCV_" + Now.Ticks.ToString.Substring(10) + """, ""receiver_country"": """ + CurrentRow("receiver_country").ToString + """, ""transaction_type"": """ + CurrentRow("transaction_type").ToString + """}"
```

#### 4.7 HTTP Request to API
- Drag **HTTP Request** activity below the Assign
- Properties:
  - **End point**: `"http://localhost:8000/api/uipath/transaction/check"`
  - **Method**: `POST`
  - **Body**: `jsonBody`
  - **Body format**: `application/json`
  - **Accept**: `application/json`
  - **Response** > **Response content**: `apiResponse`

#### 4.8 Parse JSON Response
- Drag **Deserialize JSON** activity
- **JSON String**: `apiResponse`
- **JSON Object**: `jsonResult`

#### 4.9 Extract Risk Data
Add 3 **Assign** activities one after another:

| To | Value |
|----|-------|
| `riskLevel` | `jsonResult("risk_level").ToString` |
| `riskScore` | `jsonResult("risk_score").ToString` |
| `explanation` | `jsonResult("explanation").ToString` |

#### 4.10 Add Row to Results
- Drag **Add Data Row** activity
- **DataTable**: `dtResults`
- **ArrayRow**: 
```
{CurrentRow("amount").ToString, CurrentRow("currency").ToString, CurrentRow("sender_country").ToString, CurrentRow("receiver_country").ToString, riskLevel, riskScore, explanation}
```

#### 4.11 Log Progress
- Drag **Log Message** activity (still inside loop)
- **Level**: If `riskLevel = "HIGH"` use `Error`, else `Info`
- **Message**: `"Checked: " + CurrentRow("amount").ToString + " " + CurrentRow("currency").ToString + " -> " + riskLevel`

#### 4.12 Write Results to Excel (Outside Loop)
- **After** the For Each Row ends, drag **Write Range Workbook** activity
- **File**: `"C:\RPA\Output\ComplianceResults_" + Now.ToString("yyyyMMdd_HHmmss") + ".xlsx"`
- **Sheet name**: `"Results"`
- **DataTable**: `dtResults`

#### 4.13 Final Log
- Drag **Log Message**
- **Message**: `"Completed! Processed " + dtInput.Rows.Count.ToString + " transactions. Results saved to Excel."`

---

### Step 5: Run the Workflow

1. Start the backend server
2. Ensure `C:\RPA\Input\transactions.csv` exists
3. Click **Run** (or press F5)
4. Check `C:\RPA\Output\` for the Excel file

---

## Workflow 2: Live Transaction Monitor with SAR Generation

**Purpose**: Monitor the system for new transactions. When a HIGH risk transaction is detected, automatically generate a SAR/STR report.

**Use Case**: Real-time compliance monitoring - when someone makes a transaction from the frontend, this workflow detects it and takes action.

---

### How This Works

```
[User makes transaction on Frontend]
         |
         v
[Backend processes & stores in DB with compliance results]
         |
         v
[UiPath polls API for flagged transactions]
         |
         v
[If HIGH risk found -> Generate SAR PDF Report]
         |
         v
[Log all activity for audit trail]
```

---

### Step 1: Create New Project

1. Open UiPath Studio
2. Click **New Project** > **Process**
3. Name: `LiveTransactionMonitor`
4. Click **Create**

---

### Step 2: Create Variables

| Name | Type | Default |
|------|------|---------|
| apiResponse | String | |
| jsonData | JObject | |
| highRiskArray | JArray | |
| highRiskCount | Int32 | 0 |
| mediumRiskCount | Int32 | 0 |
| txn | JToken | |
| transactionId | String | |
| sarResponse | String | |
| lastCheckTime | DateTime | Now.AddMinutes(-5) |
| currentTxnTime | DateTime | |

**For JArray type**: Browse for Types > search "JArray" > select `Newtonsoft.Json.Linq.JArray`

---

### Step 3: Build the Workflow

#### 3.1 Main Sequence
- Drag **Sequence** to Designer
- Rename: `Live Transaction Monitor`

#### 3.2 Log Start
- Drag **Log Message**
- **Level**: `Info`
- **Message**: `"=== LIVE TRANSACTION MONITOR STARTED ===" + vbCrLf + "Monitoring for HIGH risk transactions..." + vbCrLf + "Press Stop to end monitoring."`

#### 3.3 Monitoring Loop (Do While or Retry Scope)

For a simple demo, we'll check once. For continuous monitoring, wrap in a **While** loop.

**Option A: Single Check (Simple Demo)**
Continue with steps below directly.

**Option B: Continuous Monitoring (Advanced)**
- Drag **While** activity
- **Condition**: `True` (runs forever until stopped)
- Put all following activities inside the While body
- Add a **Delay** activity at the end: `TimeSpan.FromSeconds(10)` (polls every 10 seconds)

---

#### 3.4 HTTP Request - Get Flagged Transactions
- Drag **HTTP Request**
- **End point**: `"http://localhost:8000/api/uipath/flagged/json"`
- **Method**: `GET`
- **Accept**: `application/json`
- **Response content**: `apiResponse`

#### 3.5 Deserialize Response
- Drag **Deserialize JSON**
- **JSON String**: `apiResponse`
- **JSON Object**: `jsonData`

#### 3.6 Extract Data
Add these **Assign** activities:

| To | Value |
|----|-------|
| `highRiskArray` | `CType(jsonData("high_risk"), JArray)` |
| `highRiskCount` | `highRiskArray.Count` |
| `mediumRiskCount` | `CType(jsonData("medium_risk"), JArray).Count` |

#### 3.7 Log Summary
- Drag **Log Message**
- **Level**: `Info`
- **Message**: 
```
"--- Compliance Check Summary ---" + vbCrLf + "HIGH Risk: " + highRiskCount.ToString + vbCrLf + "MEDIUM Risk: " + mediumRiskCount.ToString + vbCrLf + "--------------------------------"
```

#### 3.8 Check for High Risk Transactions
- Drag **If** activity
- **Condition**: `highRiskCount > 0`

---

#### 3.9 THEN Branch - Process High Risk Transactions

Inside the **Then** branch:

##### 3.9.1 Log Alert
- Drag **Log Message**
- **Level**: `Error`
- **Message**: `"ALERT: " + highRiskCount.ToString + " HIGH RISK TRANSACTION(S) DETECTED!"`

##### 3.9.2 For Each High Risk Transaction
- Drag **For Each** activity
- **TypeArgument**: `JToken` (Newtonsoft.Json.Linq.JToken)
- **Values**: `highRiskArray`

##### 3.9.3 Inside For Each - Extract Transaction ID
- Drag **Assign**
- **To**: `transactionId`
- **Value**: `item("transaction_id").ToString`

##### 3.9.4 Log Transaction Details
- Drag **Log Message**
- **Level**: `Error`
- **Message**:
```
"HIGH RISK TRANSACTION DETECTED:" + vbCrLf + "  ID: " + transactionId + vbCrLf + "  Amount: $" + item("amount").ToString + " " + item("currency").ToString + vbCrLf + "  Sender: " + item("sender_country").ToString + " -> Receiver: " + item("receiver_country").ToString + vbCrLf + "  Risk Score: " + item("risk_score").ToString + vbCrLf + "  Reason: " + item("explanation_summary").ToString
```

##### 3.9.5 Generate SAR Report - HTTP Request
- Drag **HTTP Request**
- **End point**: `"http://localhost:8000/api/reports/sar/" + transactionId + "/pdf"`
- **Method**: `GET`
- **Accept**: `application/pdf`
- **Response** > **Response content**: `sarResponse`
- **Options** > **Response content type**: Select "Binary" or handle as file

**Alternative approach using Download File:**
- Drag **HTTP Request** but save response differently:
- **Response** > **Download resource path**: `"C:\RPA\SAR_Reports\SAR_" + transactionId + ".pdf"`

**OR use Invoke Web Service / HTTP Client:**
If HTTP Request doesn't download PDF directly, use this workaround:

- Drag **Invoke Code** activity (Advanced)
- **Language**: VB.NET
- **Code**:
```vb
Dim client As New System.Net.WebClient()
client.DownloadFile("http://localhost:8000/api/reports/sar/" + transactionId + "/pdf", "C:\RPA\SAR_Reports\SAR_" + transactionId + ".pdf")
```

##### 3.9.6 Log SAR Generation
- Drag **Log Message**
- **Level**: `Warn`
- **Message**: `"SAR REPORT GENERATED: C:\RPA\SAR_Reports\SAR_" + transactionId + ".pdf"`

---

#### 3.10 ELSE Branch (No High Risk)
Inside the **Else** branch:

- Drag **Log Message**
- **Level**: `Info`
- **Message**: `"No HIGH risk transactions detected. System is clear."`

---

#### 3.11 Final Log (Outside If)
- Drag **Log Message**
- **Level**: `Info`
- **Message**: `"=== Monitoring cycle complete at " + Now.ToString("HH:mm:ss") + " ==="`

---

### Complete Workflow Structure

```
Sequence: Live Transaction Monitor
|
+-- Log Message: "=== LIVE TRANSACTION MONITOR STARTED ==="
|
+-- HTTP Request: GET /api/uipath/flagged/json
|
+-- Deserialize JSON
|
+-- Assign: highRiskArray = ...
+-- Assign: highRiskCount = ...
+-- Assign: mediumRiskCount = ...
|
+-- Log Message: "--- Compliance Check Summary ---"
|
+-- If: highRiskCount > 0
    |
    +-- THEN:
    |   +-- Log Message: "ALERT: HIGH RISK DETECTED!"
    |   +-- For Each: item in highRiskArray
    |       +-- Assign: transactionId = item("transaction_id")
    |       +-- Log Message: "HIGH RISK TRANSACTION DETECTED..."
    |       +-- HTTP Request: GET /api/reports/sar/{id}/pdf (Download)
    |       +-- Log Message: "SAR REPORT GENERATED..."
    |
    +-- ELSE:
        +-- Log Message: "No HIGH risk transactions. System clear."
|
+-- Log Message: "=== Monitoring cycle complete ==="
```

---

### Step 4: Test the Workflow

#### 4.1 Create a High-Risk Transaction from Frontend

1. Open browser: `http://localhost:3000`
2. Login as user: `john@example.com` / `demo1234`
3. Go to **Send Money**
4. Create a suspicious transaction:
   - **Amount**: `50000` (high value)
   - **Recipient Country**: `IR` or `KP` (sanctioned country)
   - Click **Send**

#### 4.2 Run the UiPath Workflow

1. Run `LiveTransactionMonitor` in UiPath Studio
2. Watch the Output panel

#### 4.3 Expected Output

```
[Info] === LIVE TRANSACTION MONITOR STARTED ===
       Monitoring for HIGH risk transactions...
       
[Info] --- Compliance Check Summary ---
       HIGH Risk: 1
       MEDIUM Risk: 0
       --------------------------------
       
[Error] ALERT: 1 HIGH RISK TRANSACTION(S) DETECTED!

[Error] HIGH RISK TRANSACTION DETECTED:
        ID: TXN_1234567890ABCDEF
        Amount: $50000 USD
        Sender: US -> Receiver: IR
        Risk Score: 0.92
        Reason: High-value transfer to sanctioned country (Iran)
        
[Warn] SAR REPORT GENERATED: C:\RPA\SAR_Reports\SAR_TXN_1234567890ABCDEF.pdf

[Info] === Monitoring cycle complete at 14:35:22 ===
```

#### 4.4 Check the SAR Report

Open `C:\RPA\SAR_Reports\` folder - you should see the generated PDF report.

---

## API Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/uipath/transaction/check` | POST | Check single transaction compliance |
| `/api/uipath/flagged/json` | GET | Get all flagged (HIGH/MEDIUM) transactions |
| `/api/reports/sar/{transaction_id}/pdf` | GET | Generate SAR PDF for a transaction |
| `/api/reports/sar/{transaction_id}` | GET | Get SAR data as JSON |

---

## Demo Script for Project Presentation

### Part 1: Show the Web Application (2 minutes)
1. Open `http://localhost:3000`
2. Login as regular user (`john@example.com`)
3. Show the dashboard and balance
4. Send a normal transaction ($1000 to UK) - show it processes as LOW risk
5. Send a suspicious transaction ($50000 to Iran) - show it processes as HIGH risk

### Part 2: Show Admin Dashboard (1 minute)
1. Login as admin (`admin@regtech.com`)
2. Show all transactions with risk levels
3. Point out the HIGH risk transaction is flagged

### Part 3: Run CSV Batch Workflow (2 minutes)
1. Show the input CSV file
2. Run `CSVComplianceCheck` workflow
3. Show the progress in Output panel
4. Open the generated Excel file
5. Explain: "This automates batch compliance checking for historical transactions"

### Part 4: Run Live Monitor Workflow (2 minutes)
1. Run `LiveTransactionMonitor` workflow
2. Show the alerts in Output panel
3. Show the generated SAR PDF report
4. Explain: "This monitors real-time transactions and automatically generates regulatory reports for suspicious activity"

### Part 5: Conclusion (1 minute)
- **Problem**: Manual compliance review takes hours and misses suspicious patterns
- **Solution**: RPA + ML automatically monitors, detects, and reports
- **Value**: Faster detection, consistent compliance, audit trail, regulatory reporting

---

## Troubleshooting

### "Connection refused" error
- Backend not running. Start it with: `cd backend && uvicorn main:app --reload`

### No flagged transactions found
- Make some transactions from the frontend first
- Make sure to use high amounts ($10000+) or sanctioned countries (IR, KP, SY, CU, RU)

### SAR PDF not downloading
- Check the folder `C:\RPA\SAR_Reports\` exists
- Try the URL directly in browser: `http://localhost:8000/api/reports/sar/{transaction_id}/pdf`

### JSON parsing errors  
- Test API in browser first: `http://localhost:8000/api/uipath/flagged/json`
- Check variable types are correct (JObject, JArray, JToken)
