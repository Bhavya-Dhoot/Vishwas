# Files for a fictional demonstration

Upload `referral-demo.txt` through the patient's document panel. It is deliberately
free of real medical information. `enquiry-example.json` shows the corresponding
structured enquiry fields; it can also exercise the accepted JSON upload type.

Use **Tara Demo**, **Hindi**, **Endocrinology**, and allow automatic scheduling.
Leave date, time and preferred doctor blank to allow the earliest compatible slot.
The staff department accepts once; then assignment and scheduling happen together.

Ledger consent is optional. If selected, only a salted commitment is sent to the
configured local Hyperledger Fabric network. A successful verification checks file
integrity against that commitment. It does not authenticate a referral or give
medical advice. Deleting the file leaves the opaque ledger commitment behind.

Use a separate browser profile for the staff and patient sessions. These files
contain fictional demonstration content and may be shared with the prototype.
