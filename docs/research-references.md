# Supporting research for Vishwas

Checked 3 October 2026. These papers support the design rationale, not a claim that Vishwas has improved attendance, waiting time or clinical outcomes. The papers study different populations, workflows and technologies. No paper validates the complete Vishwas prototype or its proposed pricing.

## Referral coordination

**Azamar-Alonso A et al. (2019). Electronic referral systems in health care: a scoping review.** *ClinicoEconomics and Outcomes Research*. DOI: 10.2147/CEOR.S195597.

[Open-access article](https://pmc.ncbi.nlm.nih.gov/articles/PMC6511625/) · [PubMed](https://pubmed.ncbi.nlm.nih.gov/31190925/)

The review describes potential improvements in referral processing and communication, while emphasizing that the evidence base is limited and economic evaluation is needed. Use it to motivate connected pre-arrival referral workflows. It does not establish that automated medical specialty selection is appropriate, or that Vishwas saves a particular amount of time.

## Appointment reminders

**Gurol-Urganci I, de Jongh T, Vodopivec-Jamsek V, Atun R, Car J. (2013). Mobile phone messaging reminders for attendance at healthcare appointments.** *Cochrane Database of Systematic Reviews*, CD007458. DOI: 10.1002/14651858.CD007458.pub3.

[Cochrane review and summary](https://www.cochrane.org/evidence/CD007458_mobile-phone-messaging-reminders-attendance-healthcare-appointments) · [Author-institution PDF](https://researchonline.lshtm.ac.uk/1386850/1/CD007458.pdf)

Eight randomized trials involving 6,615 participants were included. The review found low-to-moderate-quality evidence that text reminders improved attendance compared with no reminders. Use it for the reminder component. It concerns SMS/MMS, not Vishwas or its simulated WhatsApp interface; the underlying search ended in 2012. Do not transfer its effect sizes into the pitch as prototype results.

## Evidence specific to diabetes follow-up

**An Enhanced SMS Text Message-Based Support and Reminder Program for Young Adults With Type 2 Diabetes (TEXT2U): Randomized Controlled Trial. (2021).** *Journal of Medical Internet Research*. DOI: 10.2196/27263.

[Open-access article](https://pmc.ncbi.nlm.nih.gov/articles/PMC8569538/) · [PubMed](https://pubmed.ncbi.nlm.nih.gov/34524102/)

This 12-month Australian study randomized 40 young adults with type 2 diabetes. Complete attendance at scheduled visits was achieved by 12/21 participants receiving the enhanced program and 5/19 controls. The study did not find between-group differences in HbA1c, BMI or lipids. It supports evaluating attendance as a distinct operational outcome. Its small population and enhanced support intervention do not justify a general claim that simple reminders, Indian OPDs or Vishwas will produce the same result.

## Permissioned ledger architecture

**Androulaki E et al. (2018). Hyperledger Fabric: A Distributed Operating System for Permissioned Blockchains.** *EuroSys '18*. DOI: 10.1145/3190508.3190538.

[Paper and full-text links](https://arxiv.org/abs/1801.10228)

The paper explains Fabric's permissioned membership, modular architecture and transaction processing. Use it to explain the optional institutional integrity registry. It is not evidence that blockchain improves patient privacy automatically or that a single hospital needs a ledger. Do not claim its benchmark throughput as Vishwas's capacity.

## Local edge processing

**Satyanarayanan M. (2017). The Emergence of Edge Computing.** *Computer*, 50(1), 30-39. DOI: 10.1109/MC.2017.9.

[Author-hosted PDF at Carnegie Mellon University](https://elijah.cs.cmu.edu/DOCS/satya-edge2016.pdf)

The paper describes computing and storage near users and devices. It provides architectural background for local processing. Vishwas currently demonstrates one local Node/SQLite host with an outbound policy; it has not deployed a distributed edge network, provided offline patient access or measured energy savings.

## Encryption standard (not a clinical paper)

**Dworkin M. (2007). NIST SP 800-38D: Recommendation for Block Cipher Modes of Operation: Galois/Counter Mode (GCM) and GMAC.** DOI: 10.6028/NIST.SP.800-38D.

[NIST publication](https://csrc.nist.gov/pubs/sp/800/38/d/final) · [NIST PDF](https://nvlpubs.nist.gov/nistpubs/legacy/sp/nistspecialpublication800-38d.pdf)

This specifies GCM authenticated encryption with associated data, relevant to record-context binding. Using AES-GCM does not certify the application, key management or regulatory compliance. The NIST page notes that a revision is planned.

## Suggested citation line for the deck

“Prior research supports studying electronic referral coordination and appointment reminders. Vishwas combines these operational steps in a local prototype; a hospital pilot will measure its actual benefit.”

Use the referral review, Cochrane review and TEXT2U study for the problem/validation slide; use Fabric, edge computing and NIST on the architecture/security slide. Keep the full links in the supporting-files field or an appendix.
