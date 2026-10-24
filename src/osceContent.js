// Content for the examiner computer (scoring sheets, procedure instructions) and the candidate
// computer (question stations). Plain data, no React.

// Examiners grade every step with one of these.
export const GRADES = [0, 0.5, 1, 1.5, 2];

// Day 1 components: what the examiner scores.
export const COMPONENT_STEPS = {
  viva: [
    "Greets the panel and states his or her name and exam number",
    "Responds to the opening question clearly and correctly",
    "Applies knowledge to the clinical situation presented",
    "Gives the rationale for nursing actions",
    "Communicates professionally and with confidence",
  ],
  client_care: [
    "Takes a relevant history from the client",
    "Assesses the client systematically",
    "Identifies the client's nursing problems",
    "Plans and prioritises the care",
    "Documents the care given and evaluates the outcome",
  ],
  family_care: [
    "Identifies the health needs of the family",
    "Assesses the home and the environment",
    "Plans the care together with the family",
    "Gives relevant health education to the family",
    "Plans follow-up and referral",
  ],
  research: [
    "States the research problem and objectives clearly",
    "Reviews relevant literature",
    "Describes the methodology",
    "Presents and interprets the findings",
    "Draws conclusions and makes recommendations",
  ],
};

// Day 2 procedure stations. The id is `${program id}-p${number}`.
export const PROCEDURE_DETAILS = {
  "rn-p1": {
    title: "Wound dressing",
    instructions: "Perform a sterile dressing of a clean surgical wound on the client's lower abdomen. You have 10 minutes.",
    requirements: ["Dressing trolley", "Sterile dressing pack", "Normal saline", "Sterile and clean gloves", "Adhesive tape and a waste bag"],
    steps: [
      "Explains the procedure and gets consent",
      "Washes hands and prepares the trolley",
      "Removes the old dressing and assesses the wound",
      "Cleans the wound with aseptic technique",
      "Applies a sterile dressing and secures it",
      "Disposes of waste and documents",
    ],
  },
  "rn-p2": {
    title: "Urinary catheterisation",
    instructions: "Insert an indwelling urinary catheter into the female simulation model. You have 15 minutes.",
    requirements: ["Catheterisation set", "Sterile gloves", "Foley catheter", "Lubricant", "Sterile water and syringe", "Urine bag"],
    steps: [
      "Explains the procedure and ensures privacy",
      "Positions the client and washes hands",
      "Prepares the sterile field and cleans the meatus",
      "Lubricates and inserts the catheter gently",
      "Inflates the balloon and connects the urine bag",
      "Secures the catheter, disposes of waste and documents",
    ],
  },
  "rn-p3": {
    title: "Intramuscular injection",
    instructions: "Give the prescribed drug as an intramuscular injection into the ventrogluteal site. You have 10 minutes.",
    requirements: ["Prescription chart", "Drug vial and diluent", "Syringe and needles", "Alcohol swab", "Sharps box", "Gloves"],
    steps: [
      "Checks the prescription and the five rights",
      "Washes hands and prepares the drug",
      "Identifies the client and explains the procedure",
      "Selects and cleans the site",
      "Injects at 90 degrees and aspirates as required",
      "Disposes of sharps and documents",
    ],
  },
  "cc-p1": {
    title: "Tracheostomy care",
    instructions: "Perform tracheostomy tube care, including suctioning, for a client with a tracheostomy. You have 15 minutes.",
    requirements: ["Suction machine and catheters", "Sterile gloves", "Normal saline", "Tracheostomy dressing and ties", "Inner cannula cleaning set", "Oxygen source"],
    steps: [
      "Explains the procedure and positions the client",
      "Pre-oxygenates and prepares the suction",
      "Suctions using sterile technique",
      "Cleans the inner cannula and the stoma",
      "Changes the dressing and secures the ties",
      "Monitors the client and documents",
    ],
  },
  "cc-p2": {
    title: "Central venous pressure measurement",
    instructions: "Measure central venous pressure with a manometer for a client with a central line. You have 10 minutes.",
    requirements: ["CVP manometer set", "Three-way stopcock", "Spirit level", "IV fluid", "Gloves", "Documentation chart"],
    steps: [
      "Explains the procedure and positions the client supine",
      "Levels the zero point to the phlebostatic axis",
      "Fills the manometer with fluid",
      "Turns the stopcock to the client and reads at end-expiration",
      "Returns the stopcock to the infusion and checks the line",
      "Records the reading and reports abnormal values",
    ],
  },
  "cc-p3": {
    title: "Cardiopulmonary resuscitation",
    instructions: "Perform adult cardiopulmonary resuscitation on the manikin until help arrives. You have 8 minutes.",
    requirements: ["Manikin", "Bag-valve-mask", "AED trainer", "Oxygen source", "Gloves", "Resuscitation chart"],
    steps: [
      "Checks scene safety and responsiveness",
      "Calls for help and the resuscitation team",
      "Checks breathing and pulse for no more than 10 seconds",
      "Gives compressions at the correct depth and rate",
      "Gives ventilations with the bag-valve-mask",
      "Uses the AED and continues until the team takes over",
    ],
  },
  "po-p1": {
    title: "Surgical hand scrub, gowning and gloving",
    instructions: "Perform a surgical hand scrub, then gown and glove using the closed technique. You have 10 minutes.",
    requirements: ["Scrub sink with antiseptic", "Sterile brush or sponge", "Sterile towels", "Sterile gown", "Sterile gloves", "Cap, mask and eye protection"],
    steps: [
      "Wears cap, mask and eye protection correctly",
      "Scrubs hands and arms with the correct technique and time",
      "Dries hands with a sterile towel without contamination",
      "Puts on the sterile gown correctly",
      "Gloves with the closed technique without touching the outside of the glove",
      "Keeps hands above the waist and within the sterile field",
    ],
  },
  "po-p2": {
    title: "Preparation of the operating table",
    instructions: "Prepare the operating table for a client having abdominal surgery. You have 10 minutes.",
    requirements: ["Operating table with accessories", "Linen and drapes", "Arm boards and straps", "Gel pads", "Diathermy plate", "Safety checklist"],
    steps: [
      "Checks that the table works and the brakes are on",
      "Fits the required accessories",
      "Places the mattress and gel pads to protect pressure areas",
      "Positions the diathermy plate and checks the equipment",
      "Prepares the linen and straps",
      "Confirms the room is ready against the checklist",
    ],
  },
  "po-p3": {
    title: "Counting of instruments, swabs and sharps",
    instructions: "Carry out the surgical count with the circulating nurse for a laparotomy. You have 10 minutes.",
    requirements: ["Instrument tray", "Swabs and gauze", "Sharps", "Count board or record sheet", "Gloves", "Sterile field"],
    steps: [
      "Counts instruments, swabs and sharps aloud with a second person",
      "Records the initial count correctly",
      "Counts again before closing a cavity",
      "Counts again before closing the skin",
      "Reports any discrepancy at once and acts on it",
      "Signs and documents the final count",
    ],
  },
};

// Works for Day 1 components (key "viva") and procedure stations (key "p1".."p3" plus the candidate's program).
export const stepsFor = (key, program) =>
  COMPONENT_STEPS[key] || PROCEDURE_DETAILS[`${program}-${key}`]?.steps || [];

// Question stations: QUESTIONS[program id][station number]. `answer` is the index of the right option.
const q = (text, options, answer) => ({ text, options, answer });

export const QUESTIONS = {
  rn: {
    1: [
      q("Which action is most effective in preventing the spread of infection between patients?", ["Wearing a mask at all times", "Hand hygiene before and after contact", "Using antibiotics routinely", "Isolating every patient"], 1),
      q("Before giving any medication, the nurse must first", ["Pour the drug into a cup", "Check the prescription and the five rights", "Ask a relative to confirm the name", "Record the time given"], 1),
      q("The correct position for an unconscious patient who is breathing normally is the", ["Supine position", "Prone position", "Recovery position", "Fowler's position"], 2),
    ],
    2: [
      q("A normal adult respiratory rate at rest is", ["6 to 10 breaths per minute", "12 to 20 breaths per minute", "25 to 30 breaths per minute", "35 to 40 breaths per minute"], 1),
      q("The early sign of hypovolaemic shock is usually", ["Bradycardia", "Rising blood pressure", "Tachycardia and restlessness", "Warm dry skin"], 2),
      q("After surgery, which measure best prevents deep vein thrombosis?", ["Strict bed rest", "Early ambulation and leg exercises", "Fluid restriction", "Keeping the legs still"], 1),
    ],
    3: [
      q("The recommended feeding for a newborn for the first six months is", ["Formula only", "Exclusive breastfeeding", "Water and glucose", "Cow's milk"], 1),
      q("Which sign in pregnancy needs urgent referral?", ["Mild backache", "Frequent urination", "Severe headache with blurred vision", "Increased appetite"], 2),
      q("The Apgar score is assessed at", ["Birth only", "1 and 5 minutes after birth", "24 hours after birth", "The end of the first week"], 1),
    ],
  },
  cc: {
    1: [
      q("Normal central venous pressure is about", ["0 to 2 mmHg", "2 to 8 mmHg", "15 to 20 mmHg", "25 to 30 mmHg"], 1),
      q("Mean arterial pressure below which organ perfusion is at risk is", ["Below 40 mmHg", "Below 65 mmHg", "Below 90 mmHg", "Below 110 mmHg"], 1),
      q("Which rhythm needs immediate defibrillation?", ["Asystole", "Pulseless electrical activity", "Ventricular fibrillation", "Sinus bradycardia"], 2),
    ],
    2: [
      q("Suctioning of a tracheostomy should not last longer than", ["5 seconds", "10 to 15 seconds", "30 seconds", "60 seconds"], 1),
      q("An early sign of hypoxia in a ventilated patient is", ["Calm sleep", "Restlessness and a rising heart rate", "Pink warm skin", "A slow heart rate only"], 1),
      q("To reduce ventilator-associated pneumonia, the head of the bed should be raised to", ["0 degrees", "10 degrees", "30 to 45 degrees", "90 degrees"], 2),
    ],
    3: [
      q("In adult CPR the recommended compression to ventilation ratio is", ["15:2", "30:2", "5:1", "10:1"], 1),
      q("The first drug given in anaphylaxis is", ["Intravenous hydrocortisone", "Intramuscular adrenaline", "An oral antihistamine", "Salbutamol"], 1),
      q("The compression rate in adult CPR is", ["60 to 80 per minute", "80 to 100 per minute", "100 to 120 per minute", "140 to 160 per minute"], 2),
    ],
  },
  po: {
    1: [
      q("A surgical hand scrub is complete when", ["The hands look clean", "The prescribed time and technique have been followed", "The water is hot", "The gloves are on"], 1),
      q("A sterile field is contaminated when", ["It is covered", "Anything non-sterile touches it", "It has been used for an hour", "It is near a wall"], 1),
      q("A gowned surgeon's hands should be kept", ["Below the waist", "Above the waist and in front of the body", "Behind the back", "On the shoulders"], 1),
    ],
    2: [
      q("The diathermy plate should be placed on", ["A bony prominence", "A clean dry muscular area close to the surgical site", "A hairy area", "Over a metal implant"], 1),
      q("The risk of pressure injury on the operating table is reduced by", ["Using hard mattresses", "Padding bony prominences", "Tight straps", "Leaving wet linen"], 1),
      q("The surgical safety checklist is completed", ["After surgery only", "Before induction, before incision and before leaving theatre", "Once a week", "Only for major surgery"], 1),
    ],
    3: [
      q("A surgical count discrepancy must be", ["Ignored if it is small", "Reported immediately and acted on", "Corrected after the patient leaves", "Hidden from the surgeon"], 1),
      q("Surgical specimens should be", ["Discarded", "Labelled correctly and sent with the request form", "Stored in the staff room", "Labelled the next day"], 1),
      q("Counts are done", ["Only at the end", "Before the operation, before closing a cavity and before closing the skin", "Only on request", "Only when swabs are used"], 1),
    ],
  },
};
