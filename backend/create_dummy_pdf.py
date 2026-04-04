from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import os

def create_pdf(filename):
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, height - 50, "Sample Banking Policy")
    
    c.setFont("Helvetica", 12)
    text = [
        "1. Account Types",
        "We offer standard savings, current accounts, and fixed deposits.",
        "Savings accounts have a minimum balance of $100.",
        "Current accounts have a monthly fee of $10 unless the balance is over $500.",
        "",
        "2. Interest Rates",
        "Savings accounts currently earn 2% APY.",
        "Fixed deposits for 1 year earn 4% APY.",
        "Interest is credited monthly for savings and at maturity for fixed deposits.",
        "",
        "3. Loan Policy",
        "Personal loans are available up to $50,000 for qualified customers.",
        "Interest rates for personal loans start at 8% APR.",
        "Mortgage loans require a 20% down payment or PMl insurance.",
        "",
        "4. Digital Banking",
        "Online banking is available 24/7.",
        "Mobile check deposit has a daily limit of $2,500.",
        "Wire transfers within the country are processed within 1 business day.",
        "",
        "5. Contact Information",
        "For support, call 1-800-BANK-HELP or email support@bank.com.",
        "Our head office is located at 123 Finance Street, Capital City."
    ]
    
    y = height - 100
    for line in text:
        c.drawString(100, y, line)
        y -= 20
        if y < 50:
            c.showPage()
            y = height - 50
            
    c.save()

if __name__ == "__main__":
    data_dir = "backend/data"
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
    create_pdf(os.path.join(data_dir, "banking_policy.pdf"))
    print(f"Sample PDF created in {data_dir}/banking_policy.pdf")
