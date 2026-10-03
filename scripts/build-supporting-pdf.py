from pathlib import Path
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'pdf' / 'Vishwas-Supporting-Document.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
fonts = Path.home() / '.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/share/fonts'
regular = fonts / 'DejaVuSans.ttf'
bold = fonts / 'DejaVuSans-Bold.ttf'
if not bold.exists(): bold = Path('C:/Windows/Fonts/arialbd.ttf')
pdfmetrics.registerFont(TTFont('Vishwas', str(regular)))
pdfmetrics.registerFont(TTFont('VishwasBold', str(bold)))
pdfmetrics.registerFontFamily('Vishwas', normal='Vishwas', bold='VishwasBold')
TEAL, INK, MUTED, PALE = map(colors.HexColor, ['#17494e', '#20363c', '#60747a', '#eef5f3'])
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyV', fontName='Vishwas', fontSize=9.2, leading=13, textColor=INK, spaceAfter=6))
styles.add(ParagraphStyle(name='SmallV', parent=styles['BodyV'], fontSize=7.8, leading=11, textColor=MUTED, spaceAfter=5))
styles.add(ParagraphStyle(name='TitleV', parent=styles['BodyV'], fontName='VishwasBold', fontSize=27, leading=32, textColor=TEAL, spaceAfter=12))
styles.add(ParagraphStyle(name='HeadingV', parent=styles['BodyV'], fontName='VishwasBold', fontSize=13, leading=18, textColor=TEAL, spaceBefore=9, spaceAfter=7))
styles.add(ParagraphStyle(name='LabelV', parent=styles['SmallV'], fontName='VishwasBold', textColor=TEAL, spaceAfter=8))
story=[]
def p(text, style='BodyV'): return Paragraph(text, styles[style])
def add(text, style='BodyV'): story.append(p(text,style))
def section(title): add(title,'HeadingV')
def table(rows, widths, header=False):
    body=[[p(str(x), 'SmallV' if header and i==0 else 'BodyV') for x in row] for i,row in enumerate(rows)]
    t=Table(body,colWidths=widths,hAlign='LEFT')
    t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),('BACKGROUND',(0,0),(0,-1),PALE),('LINEBELOW',(0,0),(-1,-1),0.4,colors.HexColor('#dbe6e2'))]))
    story.extend([t,Spacer(1,8)])
def page(title, subtitle):
    add('VISHWAS  |  SUPPORTING DOCUMENT  |  03 OCTOBER 2026','LabelV')
    add(title,'TitleV');add(subtitle,'SmallV')

page('The hospital visit<br/>starts at home.', 'Prepared for Bhavya Dhoot | New solution | Working local prototype using fictional data')
table([['Track','Diabetes'],['Primary user','Doctor / Care Team'],['Use case','Clinic Operations &amp; Patient Flow']], [105,402])
section('The coordination gap')
add('A referral does not always give a patient a confirmed department, specialist, appointment or arrival plan before travel. Staff then coordinate availability and documents through repeated calls and separate registers. After the consultation, return dates and practical barriers can fall into another disconnected process. Vishwas brings those operational steps into one journey, starting while the patient is still at home.')
section('How the journey works')
table([
['01  Enquire','The patient submits the department named in an existing referral, supporting files, language and appointment preferences.'],
['02  Route','An exact department ID or label enters that department\'s inbox. Missing or unclear referrals go to coordination.'],
['03  Accept once','Department acceptance triggers consented doctor and slot matching. The connected workflow confirms only after hospital acknowledgement.'],
['04  Prepare','The patient sees the doctor, date, room and document checklist before travel. Missing capacity or consent remains a visible exception.'],
['05  Continue','Check-in and attendance lead to a clinician-set return date. Reminders and practical barriers remain visible until attendance is confirmed.']
],[105,402])
section('A clear clinical boundary')
add('Routing uses an existing referral, not clinical interpretation. Uploaded records are available to authorized staff; their contents do not select a specialty. Vishwas does not diagnose, score clinical risk, recommend tests or treatment, or decide urgency. The matched doctor is administratively compatible with the referral, language, availability and preferences.')
add('<b>Intended benefit:</b> fewer routine coordination steps and a clearer next visit. No reduction in waiting time, staff workload or missed visits has been measured yet.','SmallV')

story.append(PageBreak())
page('Local processing.<br/>Protected records.', 'The working architecture and the evidence behind it')
table([
['Interface','Responsive HTML, CSS and JavaScript patient and staff views.'],
['Local service','Node.js 22 performs rules-based routing, scheduling, encryption, reminders and recovery.'],
['Storage','SQLite holds encrypted workflow snapshots, document records and persistent booking intents.'],
['Hospital adapter','REST directory and reservation contract, stable idempotency keys, lookup and terminal cancellation by key.'],
['Optional ledger','Hyperledger Fabric 2.5.16, two local organizations in Docker. Salted document commitments only.'],
['Optional AI','OpenAI Responses API administrative draft adapter, with staff review and a working local-template fallback.']
],[105,402])
section('Security and recovery implemented')
add('<b>Encryption:</b> AES-256-GCM uses a fresh nonce and authenticated record context. Keys stay separate from SQLite. Copying ciphertext into a different record is rejected. Named local staff accounts use salted scrypt verifiers; patient sessions are scoped to their own journeys.')
add('<b>Recovery:</b> an encrypted booking intent is saved before a remote reservation. Startup and bounded scheduled retries reconcile interruptions. Changed consent or slot selection requires cancellation that cannot be undone by a delayed booking request. An offline rekey utility creates a verified copy under a new key and preserves the original database.')
add('<b>Edge mode:</b> EDGE_ONLY=true forces local templates and loopback-only hospital/Fabric endpoints. Patient records are not cached for offline browser use. This demonstrates processing on one local host, not a deployed or distributed hospital network.')
add('<b>Blockchain boundary:</b> only SHA-256 commitments with a random 32-byte salt go on-chain. Files, names, patient IDs, metadata and salts remain encrypted off-chain. A receipt checks file integrity; it does not certify the issuer or medical accuracy. The server can decrypt data, so this is encryption at rest, not end-to-end encryption.')
section('Verified locally')
add('<b>42 core automated tests passed</b>, plus a Fabric contract test. The browser journey passed from home enquiry to confirmed return, including named staff login and scheduling-consent changes; no JavaScript errors or horizontal overflow at 390 pixels. A connected walkthrough used a real HTTP sample hospital service and the live local Fabric ledger. The bridge rejected unauthenticated requests and non-JSON uploads.')
add('A synthetic local scheduling preview with 10,000 slots and 1,000 existing episodes measured about 58 ms median across ten runs on this machine. It is not a concurrent-load or hospital throughput result.','SmallV')

story.append(PageBreak())
page('How a hospital<br/>would adopt Vishwas.', 'Proposed commercial model, practical limits and the next validation step')
section('Hospital-funded, free for patients')
add('The buyer is a hospital administrator, owner or operations head. Start with one diabetes OPD, measure coordination effort and planned return attendance, then expand within the site. Patients and caregivers use the service free. No referral commissions, paid doctor rankings or patient-data sales are proposed.')
table([
['Paid pilot','INR 40,000 for ten weeks in one diabetes OPD. Custom integration is separate.'],
['Subscription','INR 20,000 per site per month, billed annually. Up to three departments and 3,000 new enquiries per month; agreed storage and support.'],
['Integration','Proposed INR 60,000 for one scoped scheduling connector. Additional complexity is quoted separately.'],
['Variable charges','Messaging and hospital API fees separately approved. A shared Fabric deployment is optional and priced only when needed.']
],[105,402])
add('These are unvalidated proposed prices, before applicable taxes. On conversion within 30 days of evaluation, the pilot is credited against the first annual subscription, whose term includes the pilot period. Proposed first-year fixed total: INR 300,000 including integration, plus usage and taxes. No paying customers or measured ROI yet.','SmallV')
section('SWOT: what is strong and what remains')
table([
['Strengths','Pre-arrival routing, one-acceptance scheduling, a separate verified return episode, encrypted documents and tested booking recovery.'],
['Weaknesses','No hospital pilot or real vendor acceptance. Patient identity/recovery, live WhatsApp and ABDM are not connected. Named local accounts are not enterprise SSO or departmental RBAC.'],
['Opportunities','Measure staff minutes, booking turnaround, wrong-desk transfers, preparation and actual planned returns in a scoped diabetes OPD.'],
['Threats','Stale availability, inconsistent referral details, poor connectivity, staff adoption, integration cost and unresolved institutional governance.']
],[105,402])
section('What the pilot must establish')
add('Agree a real vendor contract, identity controls, HTTPS, managed keys, retention/deletion rules and ownership of clinical escalations. Measure a baseline, then compare staff effort, booking failures and attendance within a clinician-set observation window. Capacity released is not automatically cash saved. Fabric governance is needed only if independent institutions choose to share verification.')
section('Supporting links and disclosure')
add('<link href="https://vishwas-care-demo.vercel.app" color="#17494e">Demo: vishwas-care-demo.vercel.app</link> | <link href="https://github.com/Bhavya-Dhoot/Vishwas" color="#17494e">GitHub: Bhavya-Dhoot/Vishwas</link><br/><link href="https://github.com/Bhavya-Dhoot/Vishwas/blob/main/docs/research-references.md" color="#17494e">Supporting research and direct paper links</link><br/>The public Vercel demo has separate temporary visitor workspaces; sessions may reset. Uploads and hospital/Fabric connections are disabled there. The local prototype provides the connected demonstration described above. WhatsApp and ABHA remain simulated. Secret-pattern scans do not replace an independent review.','SmallV')
add('This supporting note supplements the application. It is not the required 6-8 slide pitch deck.','SmallV')

def decorate(canvas, doc):
    canvas.saveState()
    w,h=A4
    canvas.setFillColor(TEAL); canvas.rect(0,h-10,w,10,fill=1,stroke=0)
    canvas.setStrokeColor(colors.HexColor('#dbe6e2'));canvas.line(44,41,w-44,41)
    canvas.setFillColor(MUTED);canvas.setFont('Vishwas',7.5)
    canvas.drawString(44,27,'Vishwas | Bhavya Dhoot | Synthetic-data prototype')
    canvas.drawRightString(w-44,27,str(doc.page))
    canvas.restoreState()

doc=SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=44,leftMargin=44,topMargin=35,bottomMargin=54,title='Vishwas - Supporting Document',author='Bhavya Dhoot',subject='Pre-arrival patient routing and continuity of care')
doc.build(story,onFirstPage=decorate,onLaterPages=decorate)
print(OUT)
