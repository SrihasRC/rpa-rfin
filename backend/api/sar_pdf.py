"""
SAR/STR PDF Report Generator using ReportLab.
Generates a professional FinCEN-style Suspicious Activity Report.
"""

import io
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)


def generate_sar_pdf(txn: dict) -> io.BytesIO:
    """Generate a SAR/STR PDF report for a transaction."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        "SectionHeader",
        parent=styles["Heading2"],
        fontSize=12,
        spaceAfter=6,
        textColor=colors.HexColor("#1a1a2e"),
    ))
    styles.add(ParagraphStyle(
        "FieldLabel",
        parent=styles["Normal"],
        fontSize=8,
        textColor=colors.grey,
    ))
    styles.add(ParagraphStyle(
        "FieldValue",
        parent=styles["Normal"],
        fontSize=10,
        spaceAfter=4,
    ))

    elements = []

    # --- Header ---
    elements.append(Paragraph(
        "SUSPICIOUS ACTIVITY REPORT (SAR/STR)",
        styles["Title"],
    ))
    elements.append(Paragraph(
        "Confidential — For Regulatory Filing Purposes Only",
        ParagraphStyle("Subtitle", parent=styles["Normal"], fontSize=9,
                       textColor=colors.red, alignment=1),
    ))
    elements.append(Spacer(1, 6 * mm))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.black))
    elements.append(Spacer(1, 4 * mm))

    # --- Filing Info ---
    elements.append(Paragraph("1. FILING INFORMATION", styles["SectionHeader"]))
    filing_data = [
        ["Filing Institution:", "RegTech Compliance Monitoring System"],
        ["Report Date:", datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")],
        ["Report Type:", "SAR/STR — Suspicious Activity Report"],
        ["Reference ID:", txn.get("transaction_id", "N/A")],
    ]
    t = Table(filing_data, colWidths=[45 * mm, 120 * mm])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 4 * mm))

    # --- Transaction Details ---
    elements.append(Paragraph("2. TRANSACTION DETAILS", styles["SectionHeader"]))
    currency = txn.get("currency", "USD")
    amount = txn.get("amount", 0)
    txn_data = [
        ["Transaction ID:", txn.get("transaction_id", "N/A")],
        ["Amount:", f"{currency} {amount:,.2f}"],
        ["Date/Time:", txn.get("timestamp", "N/A")],
        ["Type:", (txn.get("transaction_type", "N/A") or "N/A").replace("_", " ").title()],
        ["KYC Status:", (txn.get("kyc_status", "N/A") or "N/A").title()],
    ]
    t = Table(txn_data, colWidths=[45 * mm, 120 * mm])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 4 * mm))

    # --- Parties Involved ---
    elements.append(Paragraph("3. PARTIES INVOLVED", styles["SectionHeader"]))
    parties_data = [
        ["", "Sender (Originator)", "Receiver (Beneficiary)"],
        ["Account ID:", txn.get("sender_id", "N/A"), txn.get("receiver_id", "N/A")],
        ["Name:", txn.get("sender_name", "N/A") or "N/A", txn.get("receiver_name", "N/A") or "N/A"],
        ["Country:", txn.get("sender_country", "N/A"), txn.get("receiver_country", "N/A")],
    ]
    t = Table(parties_data, colWidths=[35 * mm, 65 * mm, 65 * mm])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f0f0")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 4 * mm))

    # --- Risk Assessment ---
    elements.append(Paragraph("4. RISK ASSESSMENT", styles["SectionHeader"]))
    risk = txn.get("final_risk", "N/A")
    score = txn.get("risk_score", 0)
    rules_count = txn.get("rules_count", 0)

    risk_color = colors.red if risk == "HIGH" else colors.orange if risk == "MEDIUM" else colors.green
    risk_data = [
        ["Final Risk Level:", risk],
        ["Risk Score:", f"{float(score) * 100:.1f}%"],
        ["Rules Triggered:", str(rules_count)],
    ]
    t = Table(risk_data, colWidths=[45 * mm, 120 * mm])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (1, 0), (1, 0), risk_color),
        ("FONTNAME", (1, 0), (1, 0), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 3 * mm))

    # Triggered rules detail
    rules = txn.get("rules_triggered", [])
    if rules and isinstance(rules, list) and len(rules) > 0:
        elements.append(Paragraph("Triggered Compliance Rules:", styles["FieldLabel"]))
        elements.append(Spacer(1, 2 * mm))
        for rule in rules:
            if isinstance(rule, dict):
                rule_text = (
                    f"<b>[{rule.get('id', '')}] {rule.get('name', '')}</b> "
                    f"({rule.get('source', '')}) — {rule.get('details', '')}"
                )
                elements.append(Paragraph(rule_text, ParagraphStyle(
                    "RuleItem", parent=styles["Normal"], fontSize=8,
                    leftIndent=10, spaceAfter=2,
                )))
        elements.append(Spacer(1, 3 * mm))

    # --- Explanation ---
    elements.append(Paragraph("5. COMPLIANCE NARRATIVE", styles["SectionHeader"]))
    explanation = txn.get("explanation_summary", "No explanation available.")
    elements.append(Paragraph(explanation or "No explanation available.", ParagraphStyle(
        "Narrative", parent=styles["Normal"], fontSize=9,
        leading=13, spaceAfter=4,
    )))
    elements.append(Spacer(1, 4 * mm))

    # --- Recommendation ---
    elements.append(Paragraph("6. RECOMMENDED ACTION", styles["SectionHeader"]))
    if risk == "HIGH":
        rec = (
            "IMMEDIATE REVIEW REQUIRED. This transaction has been flagged as HIGH RISK "
            "by the automated compliance system. Escalate to the Chief Compliance Officer. "
            "Consider filing this SAR with FinCEN within 30 calendar days of initial detection. "
            "Preserve all related records for a minimum of 5 years per BSA requirements."
        )
    elif risk == "MEDIUM":
        rec = (
            "Enhanced due diligence recommended. Monitor the account for further suspicious activity. "
            "Document all findings in the compliance audit trail."
        )
    else:
        rec = "No immediate action required. Transaction processed within normal parameters."

    elements.append(Paragraph(rec, ParagraphStyle(
        "Rec", parent=styles["Normal"], fontSize=9, leading=13,
    )))
    elements.append(Spacer(1, 8 * mm))

    # --- Signature Block ---
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.grey))
    elements.append(Spacer(1, 6 * mm))

    sig_data = [
        ["Prepared By: ________________________", "Date: ________________________"],
        ["Compliance Officer Signature", ""],
        ["", ""],
        ["Reviewed By: ________________________", "Date: ________________________"],
        ["Chief Compliance Officer Signature", ""],
    ]
    t = Table(sig_data, colWidths=[85 * mm, 80 * mm])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(t)

    elements.append(Spacer(1, 10 * mm))
    elements.append(Paragraph(
        "This report is confidential and intended solely for regulatory compliance purposes. "
        "Unauthorized disclosure is prohibited under 31 USC 5318(g)(2).",
        ParagraphStyle("Disclaimer", parent=styles["Normal"], fontSize=7,
                       textColor=colors.grey, alignment=1),
    ))

    doc.build(elements)
    buf.seek(0)
    return buf
