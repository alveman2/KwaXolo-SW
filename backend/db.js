import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import bcrypt from "bcryptjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "kwaxolo.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS courses (
    id               TEXT    PRIMARY KEY,
    title            TEXT    NOT NULL,
    description      TEXT    NOT NULL,
    category         TEXT    NOT NULL,
    level            TEXT    NOT NULL,
    duration_minutes INTEGER NOT NULL,
    lessons_json     TEXT    NOT NULL,
    created_by       TEXT    NOT NULL,
    created_at       INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS schools (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    code       TEXT UNIQUE NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name  TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'student',
    school_id     TEXT REFERENCES schools(id),
    created_at    INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS classes (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    join_code  TEXT UNIQUE NOT NULL,
    school_id  TEXT REFERENCES schools(id),
    teacher_id TEXT REFERENCES users(id),
    created_at INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS class_members (
    id        TEXT PRIMARY KEY,
    class_id  TEXT REFERENCES classes(id),
    user_id   TEXT REFERENCES users(id),
    joined_at INTEGER NOT NULL,
    UNIQUE(class_id, user_id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS class_courses (
    id           TEXT PRIMARY KEY,
    class_id     TEXT REFERENCES classes(id),
    course_id    TEXT REFERENCES courses(id),
    published_at INTEGER NOT NULL,
    UNIQUE(class_id, course_id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS progress (
    id           TEXT PRIMARY KEY,
    user_id      TEXT REFERENCES users(id),
    course_id    TEXT REFERENCES courses(id),
    lesson_index INTEGER NOT NULL,
    completed_at INTEGER NOT NULL,
    UNIQUE(user_id, course_id, lesson_index)
  )
`);

// ============================================================================
// SEED DATA — 6 Phase 1 / Phase 2 courses, culturally grounded in KZN
// ============================================================================
const SEED = [
  {
    title: "How to use a computer for the first time",
    description:
      "Start here. Learn how to turn a computer on, move the mouse, type on the keyboard, and open a program — step by step.",
    category: "phase1",
    level: "beginner",
    duration_minutes: 30,
    lessons: [
      {
        title: "Turning the computer on and off",
        content: `When you sit in front of a computer for the first time, it can feel strange. The most important thing to know is that you cannot break it just by pressing keys. Press the power button — usually on the side or front of the machine — and wait. The computer needs about 30 seconds to start up. You will see a screen asking for a password. If you are at a school computer lab, your teacher will give you the password.\n\nWhen you are finished, never just pull out the plug. Instead, click the icon at the bottom left corner of the screen (called the Start button), then choose "Shut Down." This gives the computer time to save everything properly. Pulling the plug is like closing your shop without locking the door — things get left in a mess.\n\nIf the screen goes dark while you are busy, do not panic. The computer is just saving power. Move the mouse or press any key and the screen will come back.`,
        keyPoints: [
          "Press the power button and wait 30 seconds to start",
          "Always use Shut Down — never just unplug",
          "A dark screen means the computer is sleeping, not broken",
          "You cannot break a computer by pressing the wrong key",
        ],
      },
      {
        title: "Using the mouse",
        content: `The mouse controls the arrow you see on the screen. When you move the mouse on the desk, the arrow on screen moves the same way. Take a moment to slide the mouse around and watch the arrow follow.\n\nThere are two main buttons on a mouse. The left button is the one you use most. Click it once to select something — for example, to choose a file or place your cursor in a text box. Double-click it (two quick clicks) to open a program or file. The right button opens a small menu with extra options. You will use this less often, but it is useful for copying or deleting things.\n\nBetween the two buttons there is usually a small wheel. Roll it forward to scroll up on a page and backward to scroll down — very useful when reading a long document or a website.`,
        keyPoints: [
          "Single left-click to select; double-click to open",
          "Right-click shows a menu of options",
          "The scroll wheel moves up and down on a page",
          "Move the mouse slowly at first — speed comes with practice",
        ],
      },
      {
        title: "Using the keyboard",
        content: `The keyboard is how you type words and numbers into the computer. The letters are arranged in a pattern called QWERTY — named after the first six letters on the top row. At first the positions feel random, but after a few hours of practice your fingers will start to remember.\n\nFour keys you will use every day: the Space bar (the long bar at the bottom) puts a space between words. The Enter key confirms what you have typed or moves to the next line. The Backspace key (top right, marked with an arrow pointing left) deletes the letter behind your cursor — use it to fix mistakes. The Shift key (press and hold while pressing a letter) makes that letter a capital.\n\nIf you want everything in capitals, press Caps Lock once. A small light on the keyboard will turn on to remind you. Press Caps Lock again to go back to normal. This is useful when writing a heading like YOUR NAME on a form.`,
        keyPoints: [
          "Backspace deletes backwards — your main correction key",
          "Enter confirms or starts a new line",
          "Shift + letter makes one capital; Caps Lock makes all capitals",
          "Take it slow — typing speed improves naturally over weeks",
        ],
      },
      {
        title: "Opening and closing a program",
        content: `Programs are the tools on your computer — the same way a hammer and a pen are tools in your hands. You open a program by double-clicking its icon (picture) on the screen, or by clicking the Start button and finding its name in the list.\n\nWhen a program opens, it fills part or all of your screen. In the top right corner you will see three small buttons: the minus sign ( – ) hides the program, the square makes it bigger or smaller, and the X closes it completely. Always save your work before pressing X, otherwise what you typed will be lost.\n\nYou can have more than one program open at the same time. Each open program appears as a button along the bar at the very bottom of your screen. Click between them to switch. This is like having different pages open on your desk at the same time.`,
        keyPoints: [
          "Double-click an icon to open a program",
          "The X button closes a program — save first",
          "The minus button hides a program without closing it",
          "The bar at the bottom shows all open programs",
        ],
      },
    ],
  },

  {
    title: "Creating your first email account",
    description:
      "Learn what email is, why it matters for jobs and learnership applications, and how to sign up for Gmail and send your first message.",
    category: "phase1",
    level: "beginner",
    duration_minutes: 25,
    lessons: [
      {
        title: "What is email and why it matters",
        content: `Email is like a letter — except it arrives in seconds, costs nothing to send, and stays saved forever. When you apply for a learnership at SEDA in Port Shepstone, they will ask for your email address. When a company wants to call you for an interview, they often email first. Without an email address, many opportunities simply cannot reach you.\n\nEmail also builds trust. If you send a professional email to a school principal about a project, they take you more seriously than if you sent a WhatsApp message. Government departments, NGOs, banks, and most employers communicate by email. It is the formal letter of the digital world.\n\nOne email account also unlocks many other services. A Gmail account, for example, lets you use Google Drive (to store documents online), Google Meet (for video calls), and YouTube. Think of it as a key that opens many doors.`,
        keyPoints: [
          "Email is free to send and arrives instantly",
          "Most job applications and learnerships require an email address",
          "Email is more professional than WhatsApp for formal communication",
          "A Gmail account unlocks Google Drive, Meet, and more",
        ],
      },
      {
        title: "Signing up for Gmail",
        content: `Open your browser (Chrome, for example) and go to gmail.com. Click "Create account." You will be asked for your first name, last name, and a username. Your username is the part before @gmail.com — for example, sipho.dlamini or ntokozo.gwacela. Choose something with your real name, because this address will appear on every job application you send.\n\nNext, choose a password. Make it at least 8 characters and mix letters and numbers — something only you would know. Write it down in a safe place. If you forget it, Google can help you recover it, but you will need a phone number to do so. For this reason, add your phone number when Google asks — this protects your account.\n\nWhen you finish, Google will show you your new inbox. It will be empty except for one welcome email from Google. You have just created your digital identity.`,
        keyPoints: [
          "Go to gmail.com and click 'Create account'",
          "Choose a username with your real name — you'll use it for jobs",
          "Write down your password in a safe place",
          "Add your phone number so you can recover the account if needed",
        ],
      },
      {
        title: "Sending your first email",
        content: `Click the button that says "Compose" (in Gmail it is on the left side). A small window will open. In the "To" field, type the email address of the person you want to contact. In the "Subject" field, write a short title that tells them what the email is about — for example: "Application: Part-time Helper – Thabo Shude, KwaXolo."\n\nIn the big white space below, write your message. Start with a greeting: "Dear Mr Phehlukwayo," or "Dear Madam," if you do not know the name. Keep the message short and clear. Say who you are, why you are writing, and what you need. End with "Kind regards" and your name. Then click the "Send" button — a blue or green button at the bottom.\n\nPractice: try sending an email to yourself first. Put your own Gmail address in the "To" field and see it arrive in your inbox. This is a safe way to test before sending to a real contact.`,
        keyPoints: [
          "Compose → To field → Subject → Message → Send",
          "Always fill in the subject line — blank subjects get ignored",
          "Start with a greeting and end with 'Kind regards' + your name",
          "Send a test email to yourself first to practice",
        ],
      },
      {
        title: "Staying safe with your email",
        content: `Now that you have an email account, you need to protect it. Never share your password with anyone — not even a friend. Your email address can be used to reset passwords for your bank, your phone account, and your other online services. Losing access to your email can cause big problems.\n\nYou will start receiving spam — unwanted emails trying to sell you things or trick you. Delete them without clicking any links inside. Some emails will pretend to be from your bank or from a government department and will ask you to click a link and enter your password. This is called phishing — it is a scam. Real banks and real government departments never ask for your password by email.\n\nIf you use a shared computer at school or at a library, always log out when you finish. Click your photo icon in the top right corner of Gmail and click "Sign out." Otherwise the next person who sits at that computer can read your emails.`,
        keyPoints: [
          "Never share your email password with anyone",
          "Do not click links in emails from strangers",
          "Government and banks will never ask for your password by email",
          "Always log out on shared computers",
        ],
      },
    ],
  },

  {
    title: "Using WhatsApp safely and effectively",
    description:
      "Set up WhatsApp, learn to use voice notes, groups, and broadcasts — and discover how to use it professionally for your business or school.",
    category: "phase1",
    level: "beginner",
    duration_minutes: 20,
    lessons: [
      {
        title: "Installing and setting up WhatsApp",
        content: `WhatsApp is a free app for sending messages, voice notes, photos, and making calls over the internet. You need a smartphone and a phone number to use it. Open the Google Play Store (Android) or App Store (iPhone) and search for "WhatsApp Messenger." Tap Install. The app is free — you only pay for data when you use it.\n\nOnce installed, open WhatsApp and tap "Agree and Continue." Enter your phone number. WhatsApp will send you a 6-digit code by SMS — type it in to verify your number. Then add your name and a profile photo if you want one. You are ready.\n\nWhen you have access to Wi-Fi — for example at the Msenti Hub or a hotspot in KwaXolo — use that to download WhatsApp and send longer messages. On mobile data, be aware that sending voice notes and videos uses significantly more data than text messages.`,
        keyPoints: [
          "Download WhatsApp from the Play Store — it is free to install",
          "You need a phone number to register",
          "Uses data (not airtime) for messages and calls",
          "Use Wi-Fi for sending long voice notes or videos",
        ],
      },
      {
        title: "Contacts and one-to-one messaging",
        content: `WhatsApp shows you a list of people who are in your phone's contacts and also have WhatsApp. To start a chat, tap the green pencil icon, find the person's name, and tap their name. Type your message and tap the send arrow.\n\nTwo grey ticks next to a sent message mean it was delivered to the other person's phone. Two blue ticks mean they have opened and read the message. One grey tick means the message is still waiting — maybe they have no signal or their phone is off.\n\nYou can also send a voice note instead of typing. Press and hold the microphone icon to record, then release to send. Many people in KwaXolo find voice notes easier than typing, especially in isiZulu. Keep voice notes under one minute for everyday conversations — people are busy.`,
        keyPoints: [
          "Two blue ticks means the person has read your message",
          "Hold the microphone icon to record a voice note",
          "Voice notes are great for communicating in isiZulu",
          "One grey tick means the recipient has no signal yet",
        ],
      },
      {
        title: "Groups and broadcast lists",
        content: `A group lets multiple people chat together — everyone can see all the messages. This is useful for a school committee, a soccer team, or a community savings group. To create a group, tap the pencil icon, choose "New Group," add the people, and give the group a name. Be thoughtful about who you add — once someone is in a group they can see all past messages.\n\nA broadcast is different: you send one message to many people, but each person receives it as a private message from you. They reply privately, not in a shared chat. This is better for business — for example, if you run a spaza shop and want to tell 50 customers that fresh bread arrived this morning, a broadcast lets you do that without sharing their numbers with each other.\n\nTip: keep groups focused. A group where people send good morning messages all day makes it easy to miss important information. Politely agree with the group about what kinds of messages belong there.`,
        keyPoints: [
          "Groups: everyone sees all messages — good for teams and committees",
          "Broadcasts: private messages to many — good for business updates",
          "Broadcasts keep your customers' numbers private from each other",
          "Keep groups focused to avoid missing important messages",
        ],
      },
      {
        title: "Using WhatsApp for business",
        content: `Many small businesses in KZN run on WhatsApp. If you are starting a business — a delivery service, a bakery like 1LT Bakery, or a photography service like Hlobisile Pearl Studios — WhatsApp is often your first customer communication tool. WhatsApp Business is a free app designed for this: it lets you add your business hours, a short description, and product catalogue.\n\nWhen messaging customers, be professional: reply within a few hours, use complete sentences, and do not send voice notes for formal price quotes — write the numbers clearly so the customer can refer back to them. When messaging a supplier in Durban, be specific: "I need 20kg bread flour, 5kg sugar, and 2 litres sunflower oil. What is your best price delivered to Port Shepstone?"\n\nFor applying to a learnership or contacting SEDA, always use email rather than WhatsApp — it is more formal and creates a paper trail. Keep WhatsApp for customers and quick coordination with your team.`,
        keyPoints: [
          "WhatsApp Business is free and designed for small businesses",
          "Write price quotes in text, not voice notes, so customers can re-read",
          "For formal matters like learnerships, use email not WhatsApp",
          "Reply to customers within a few hours to build trust",
        ],
      },
    ],
  },

  {
    title: "Searching the internet effectively",
    description:
      "Learn what a browser is, how to search with Google, how to tell if a source is trustworthy, and how to find information that saves you time and money.",
    category: "phase1",
    level: "beginner",
    duration_minutes: 30,
    lessons: [
      {
        title: "What is a browser and how do websites work",
        content: `A browser is a program that lets you visit websites. The most common browsers are Google Chrome (a blue, red, yellow, and green circle icon) and Mozilla Firefox. When you open Chrome and type a web address — called a URL — into the bar at the top, the browser fetches that website and shows it to you.\n\nEvery website has its own URL. For example, the South African government's main website is www.gov.za. When you see ".gov.za" at the end of an address, you know it is an official government website. When you see ".com" it is usually a business.\n\nIf you visit the same website often — for example the SASSA website to check grant payment dates — you can bookmark it. Click the small star icon in the address bar and the site is saved. Next time, click the bookmark icon and you go straight there. This saves data because you are not searching for it again.`,
        keyPoints: [
          "Chrome and Firefox are browsers — programs for visiting websites",
          "The URL bar at the top is where you type web addresses",
          ".gov.za means an official South African government site",
          "Bookmark frequently visited sites to save time and data",
        ],
      },
      {
        title: "How to search with Google",
        content: `Open Chrome and you will likely see Google's search bar. Type your question or topic and press Enter. Google shows you a list of results — usually 10 on the first page. The first two or three results are often paid advertisements (marked with a small "Ad" label) — scroll past them to see the regular results.\n\nThe most important skill in searching is choosing the right words. Instead of typing a full sentence like "I want to know how I can register my business," try shorter, specific words: "business registration South Africa SEDA." This gives you better results with less reading.\n\nSome useful search tricks for KZN: add "site:gov.za" to search only official government sites. Add "2025" to find recent results. Add "near Port Shepstone" or "KwaZulu-Natal" to find local information. Example: "learnership applications 2025 KwaZulu-Natal" will show you current opportunities in your province.`,
        keyPoints: [
          "Use short, specific keywords — not full sentences",
          "Skip the 'Ad' results and scroll to the regular ones",
          "Add 'site:gov.za' to search only government websites",
          "Add the year (e.g. 2025) to find the most recent results",
        ],
      },
      {
        title: "Can you trust what you read online?",
        content: `Not everything on the internet is true. Anyone can publish a website and write whatever they want. Before you trust information — especially about health, money, or the law — ask yourself three questions: Who wrote this? When was it written? Can I find the same information on another trustworthy site?\n\nSites ending in .gov.za (South African government), .edu (universities), and well-known news organisations like News24 or SABC are generally reliable. Social media posts, WhatsApp forwards, and sites you have never heard of need to be checked carefully. If a WhatsApp message says "Free SASSA grants for everyone — click this link," that is almost certainly a scam.\n\nA quick way to check: search the same information on Google. If only one obscure website says it, be very suspicious. If gov.za, News24, and the SABC all say the same thing, you can probably trust it.`,
        keyPoints: [
          "Ask: who wrote it, when, and can another trusted site confirm it?",
          ".gov.za and .edu sites are generally reliable",
          "Cross-check important information on at least two sources",
          "If it sounds too good to be true, it probably is a scam",
        ],
      },
      {
        title: "Practical searches that save you money and time",
        content: `Once you know how to search, the internet becomes a practical tool for everyday life in KwaXolo. Here are examples of searches that can make a real difference.\n\nBefore travelling to Port Shepstone for any government service, search for the office hours and address: "SASSA Port Shepstone office hours" or "SEDA Port Shepstone contact." This prevents a wasted 3-hour bus trip. You can also check if forms are available online to download and fill in before you arrive.\n\nFor load-shedding, search "Eskom load shedding schedule" and add your area. Apps like EskoSe Push give you notifications on your phone. For business purposes, knowing the schedule lets you plan your baking, printing, or phone charging work around the outages. Search "Google Translate" if you need to read a page that is not in isiZulu — it can translate a full webpage in seconds.`,
        keyPoints: [
          "Search office hours before travelling to Port Shepstone",
          "Most government forms are available to download online",
          "Search the load-shedding schedule to plan your working hours",
          "Google Translate can convert any page into isiZulu",
        ],
      },
    ],
  },

  {
    title: "Microsoft Word basics",
    description:
      "Open Word, format text, save your work, write a professional letter, and print — the skills you need for job applications and school.",
    category: "phase2",
    level: "beginner",
    duration_minutes: 45,
    lessons: [
      {
        title: "Opening Word and understanding the screen",
        content: `Microsoft Word is a program for writing documents — letters, CVs, reports, and assignments. To open it, look for the blue "W" icon on the desktop or in the Start menu. When you open Word, it will ask if you want to open an existing document or start a new blank one. Click "Blank document."\n\nThe white area in the middle is your page. You will see a blinking line — the cursor — where your text will appear when you type. At the very top of the screen is the ribbon, a wide bar full of buttons and menus. Do not let it overwhelm you. You only need a handful of buttons to start: the ones in the "Home" tab, which is open by default.\n\nIf you make a mistake — any mistake — press Ctrl+Z. This undoes your last action. You can press it multiple times to undo several actions in a row. This is the most important shortcut in Word. Knowing it exists means you can experiment freely without fear.`,
        keyPoints: [
          "Open Word and choose 'Blank document' to start",
          "The ribbon at the top contains all your tools",
          "Ctrl+Z undoes any mistake — use it freely",
          "The blinking cursor shows where your text will appear",
        ],
      },
      {
        title: "Formatting your text",
        content: `Formatting means changing how your text looks — making a heading bigger, making a word bold, or changing the font. To format text, you must first select it. Click at the start of the word or sentence you want to change, hold the mouse button down, and drag to the end. The selected text will turn blue. Now any formatting button you click will apply to that text.\n\nThe most useful formatting shortcuts: Ctrl+B makes text Bold (good for headings and your name on a CV). Ctrl+I makes it Italic (good for titles of books or emphasis). Ctrl+U adds an Underline. To change the size of your text, click the number in the font size box in the ribbon and type a bigger number — 12 is normal, 14–16 is good for headings.\n\nWhen writing a letter to your school principal or a job application for a learnership at SEDA, keep the formatting simple: one font, one size for the body text, a slightly larger bold heading at the top. Documents that use many different fonts and colours look unprofessional.`,
        keyPoints: [
          "Select text first (click and drag), then apply formatting",
          "Ctrl+B = Bold, Ctrl+I = Italic, Ctrl+U = Underline",
          "Font size 12 for body text; 14–16 for headings",
          "Keep formatting simple — one font, consistent sizing",
        ],
      },
      {
        title: "Saving your document",
        content: `Saving your work is the most important habit to build. Press Ctrl+S every few minutes while working. The first time you save, Word will ask you where to put the file and what to name it. Click "Browse," choose the "Documents" folder, and type a clear name — for example: CV_Sipho_Dlamini_2025 or Letter_To_Principal_April2026.\n\nAvoid vague names like "Document1" or "New file." When you have 20 documents and need to find the right one quickly, a clear name saves time. Use underscores or hyphens instead of spaces in the name.\n\nIf you want to keep different versions — for example, one CV sent to a school and a different one sent to a shop — use "Save As" (File → Save As) to create a copy with a new name, rather than overwriting the original. This way you always have the previous version safe.`,
        keyPoints: [
          "Press Ctrl+S every few minutes — do not wait until you are done",
          "Name files clearly: CV_YourName_Year, not 'Document1'",
          "Use underscores instead of spaces in file names",
          "Use 'Save As' to keep different versions of the same document",
        ],
      },
      {
        title: "Writing a professional letter",
        content: `A letter in Word follows a standard layout. At the top right, put today's date. Below that on the left, put the recipient's name and their address or institution. Then a greeting: "Dear Mr Phehlukwayo," or "Dear Sir/Madam," if you do not know the name.\n\nThe body of the letter should be short — ideally one page. Start with why you are writing: "I am writing to apply for the administrative learnership advertised by SEDA in Port Shepstone." Then explain who you are and why you qualify. End with what you want them to do next: "I would appreciate the opportunity to discuss this further. Please contact me at sipho.dlamini@gmail.com or 071 234 5678."\n\nClose with "Yours sincerely" (if you used their name in the greeting) or "Yours faithfully" (if you wrote "Dear Sir/Madam"). Leave space for a signature, then type your full name. Add the date at the end. This format is used across all formal correspondence in South Africa.`,
        keyPoints: [
          "Date top right; recipient's details top left",
          "'Dear [Name]' → 'Yours sincerely'; 'Dear Sir/Madam' → 'Yours faithfully'",
          "State your purpose clearly in the first sentence",
          "End with your email and phone number so they can reach you",
        ],
      },
      {
        title: "Printing your document",
        content: `When your document is ready, you can print it. Go to File (top left corner) → Print. A preview of your document will appear on the right side of the screen. Check it carefully — this is what will come out of the printer. If a page breaks in a bad place, go back and fix it before printing.\n\nIf you are printing at a print shop — like Inkify in KwaXolo when it opens, or at a library in Port Shepstone — save your document first on a USB flash drive. Put the USB into the shop's computer, open your file, and print from there. Ask the shop assistant to help if it is your first time.\n\nTo save money on printing: choose "Black and White" (also called Grayscale) unless you specifically need colour. Check the number of copies is set to 1. And always do a print preview first — printing a 10-page document when you only needed 1 page is an expensive mistake.`,
        keyPoints: [
          "File → Print → check the preview before you print",
          "Save to a USB flash drive to print at a shop in Port Shepstone",
          "Choose Black and White to save money",
          "Always check how many copies you are about to print",
        ],
      },
    ],
  },

  {
    title: "Sending professional emails",
    description:
      "Learn subject lines, greetings, sign-offs, attachments, and how to reply — skills that make employers and schools take you seriously.",
    category: "phase2",
    level: "beginner",
    duration_minutes: 35,
    lessons: [
      {
        title: "Why professional email matters for your future",
        content: `Every email you send to a school, an employer, a government office, or a potential business partner creates an impression — before they have ever met you. A clear, polite, well-written email suggests you are organised and serious. A confusing or rude email can close a door before it opened.\n\nConsider two people applying for the same learnership at SEDA in Port Shepstone. The first sends an email with no subject line and a message that just says "i want to apply." The second sends an email with the subject "Application: Business Admin Learnership – Ntokozo Gwacela, KwaXolo" and a short, clear message explaining who they are and what they want. The second person gets the interview — every time.\n\nProfessional email is also how you follow up. If you send a letter and hear nothing after a week, a polite follow-up email shows you are serious. In business, a client who does not respond to one message may respond to a second. Knowing how to write that second message — not pushy, not desperate — is a skill that pays.`,
        keyPoints: [
          "Your email creates an impression before you meet anyone",
          "A clear subject line and polite tone signal that you are serious",
          "Follow-up emails show initiative — they are expected in business",
          "Professional email is used for applications, suppliers, and clients",
        ],
      },
      {
        title: "Writing a clear subject line",
        content: `The subject line is the first thing a busy person sees in their inbox. If it is blank or vague, your email may never get opened. A good subject line tells the reader exactly what the email is about in under 10 words.\n\nExamples of bad subject lines: "Hello", "Question", "Job" (too vague). Examples of good subject lines: "Application: Bakery Assistant – Thabo Shude, KwaXolo," "Quote Request: Tent Hire for Funeral – Saturday 3 May," "Follow-up: Learnership Application Submitted 15 April."\n\nFor business emails — quoting a price, requesting stock from a Durban supplier, or following up on a delivery — always include the relevant reference: order number, event date, or the person's name. This makes it easy for the other person to search their inbox for your message later. They may receive dozens of emails a day. Help them find yours quickly.`,
        keyPoints: [
          "Never leave the subject line blank",
          "State the purpose and your name: 'Application: Role – Your Name'",
          "Include relevant dates or reference numbers in business emails",
          "Keep the subject under 10 words",
        ],
      },
      {
        title: "Greetings, body text, and sign-offs",
        content: `Start every professional email with a greeting. If you know the person's name, use it: "Dear Mr Phehlukwayo," or "Dear Ms Jaca," (note the comma at the end). If you do not know the name, write "Dear Sir or Madam," — never just "Hi" for a formal email. "Hi" is fine for people you already know well.\n\nIn the body of the email, state your purpose in the first one or two sentences. Do not make them read three paragraphs before they understand why you are writing. Example: "I am writing to enquire about the price of tent hire for a function on Saturday, 3 May, near KwaXolo. I need one large tent (10x20 metres) and 80 chairs." Then add any extra detail they need. Keep it short — if the body is longer than three short paragraphs, consider whether you need all of it.\n\nEnd with a sign-off. "Kind regards" works for most emails. "Yours sincerely" is more formal. Then your full name, your phone number, and if relevant your business name. Do not end with just your first name — it looks incomplete.`,
        keyPoints: [
          "Use 'Dear [Title] [Surname]' — never just 'Hi' for formal emails",
          "State your purpose clearly in the first sentence",
          "Keep the body to three short paragraphs or less",
          "End with 'Kind regards', your full name, and phone number",
        ],
      },
      {
        title: "Attachments, replying, and forwarding",
        content: `An attachment is a file you send along with your email — a CV, a quote, a photo of a completed order. To attach a file in Gmail, click the paper clip icon at the bottom of the compose window and find the file on your device. Attach the file before you write the message — this way you will not forget and send an email saying "see attached" with nothing attached.\n\nWhen someone emails you and you click Reply, your response goes only to the person who sent the email. When you click Reply All, your response goes to everyone who was included in the original email. Be careful with Reply All — in a group email with 20 people, "Reply All" with "Thank you!" wastes everyone's time and looks careless.\n\nForwarding sends someone else's email to a new recipient. Before forwarding, ask yourself: does this person have permission to see this email? Forwarding a supplier's private price list to a competitor, or sharing a client's personal details with someone else, can damage trust and your reputation. When in doubt, ask the original sender before forwarding.`,
        keyPoints: [
          "Attach the file before writing the message — not after",
          "'Reply' goes to the sender only; 'Reply All' goes to everyone",
          "Use Reply All sparingly — only when everyone needs to see your response",
          "Always get permission before forwarding someone else's private email",
        ],
      },
    ],
  },
];

// ============================================================================
// SEED: Schools
// ============================================================================
const SCHOOL_SEEDS = [
  "KwaXolo Secondary",
  "Margate High",
  "Port Shepstone High",
  "Gamalakhe High",
  "Izingolweni High",
  "Southport Secondary",
  "Umzumbe High",
  "Gcekeni Secondary",
  "Weza High",
];

// Run seed on first launch
(function seedIfEmpty() {
  const courseCount = db.prepare("SELECT COUNT(*) as n FROM courses").get().n;
  if (courseCount === 0) {
    const insert = db.prepare(`
      INSERT INTO courses
        (id, title, description, category, level, duration_minutes, lessons_json, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAll = db.transaction((courses) => {
      for (const c of courses) {
        insert.run(
          randomUUID(),
          c.title,
          c.description,
          c.category,
          c.level,
          c.duration_minutes,
          JSON.stringify(c.lessons),
          "system",
          Date.now()
        );
      }
    });

    insertAll(SEED);
    console.log(`Seeded ${SEED.length} courses into kwaxolo.db`);
  }

  const schoolCount = db.prepare("SELECT COUNT(*) as n FROM schools").get().n;
  if (schoolCount === 0) {
    const insertSchool = db.prepare(
      "INSERT INTO schools (id, name, code, created_at) VALUES (?, ?, ?, ?)"
    );
    const seedSchools = db.transaction(() => {
      for (const name of SCHOOL_SEEDS) {
        const code = name.toUpperCase().replace(/\s+/g, "-").slice(0, 12);
        insertSchool.run(randomUUID(), name, code, Date.now());
      }
    });
    seedSchools();
    console.log(`Seeded ${SCHOOL_SEEDS.length} schools`);
  }


  const userCount = db.prepare("SELECT COUNT(*) as n FROM users").get().n;
  if (userCount === 0) {
    const hash = bcrypt.hashSync("admin123", 10);
    db.prepare(
      "INSERT INTO users (id, email, password_hash, display_name, role, school_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(randomUUID(), "admin@kwaxolo.org", hash, "Admin", "admin", null, Date.now());
    console.log("Seeded admin user: admin@kwaxolo.org / admin123");
  }

  const existingTeacher = db.prepare("SELECT id FROM users WHERE email = ?").get("teacher@kwaxolo.org");
  if (!existingTeacher) {
    const firstSchool = db.prepare("SELECT id FROM schools ORDER BY created_at ASC LIMIT 1").get();
    const teacherHash = bcrypt.hashSync("teacher123", 10);
    db.prepare(
      "INSERT INTO users (id, email, password_hash, display_name, role, school_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(randomUUID(), "teacher@kwaxolo.org", teacherHash, "Teacher", "teacher", firstSchool?.id ?? null, Date.now());
    console.log("Seeded teacher user: teacher@kwaxolo.org / teacher123");
  }

  const existingStudent = db.prepare("SELECT id FROM users WHERE email = ?").get("student@kwaxolo.org");
  if (!existingStudent) {
    const firstSchool = db.prepare("SELECT id FROM schools ORDER BY created_at ASC LIMIT 1").get();
    const studentHash = bcrypt.hashSync("student123", 10);
    db.prepare(
      "INSERT INTO users (id, email, password_hash, display_name, role, school_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(randomUUID(), "student@kwaxolo.org", studentHash, "Student", "student", firstSchool?.id ?? null, Date.now());
    console.log("Seeded student user: student@kwaxolo.org / student123");
  }
})();

// ============================================================================
// EXPORTS
// ============================================================================

export { db };

export function getUserByEmail(email) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email);
}

export function getUserById(id) {
  const row = db.prepare("SELECT id, email, display_name, role, school_id, created_at FROM users WHERE id = ?").get(id);
  return row || null;
}

export function createUser({ email, passwordHash, displayName, role = "student", schoolId = null }) {
  const id = randomUUID();
  const now = Date.now();
  db.prepare(
    "INSERT INTO users (id, email, password_hash, display_name, role, school_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, email, passwordHash, displayName, role, schoolId, now);
  return getUserById(id);
}

export function generateJoinCode() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) code += letters[Math.floor(Math.random() * 26)];
  code += "-";
  for (let i = 0; i < 3; i++) code += Math.floor(Math.random() * 10);
  return code;
}

export function listCourses({ category } = {}) {
  const base =
    "SELECT id, title, description, category, level, duration_minutes FROM courses";
  if (category) {
    return db
      .prepare(`${base} WHERE category = ? ORDER BY created_at ASC`)
      .all(category);
  }
  return db.prepare(`${base} ORDER BY created_at ASC`).all();
}

export function getCourse(id) {
  const row = db.prepare("SELECT * FROM courses WHERE id = ?").get(id);
  if (!row) return null;
  return { ...row, lessons: JSON.parse(row.lessons_json) };
}

export function createCourse(data) {
  const id = randomUUID();
  const now = Date.now();
  db.prepare(`
    INSERT INTO courses
      (id, title, description, category, level, duration_minutes, lessons_json, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.title,
    data.description,
    data.category ?? "custom",
    data.level ?? "beginner",
    data.duration_minutes ?? 0,
    JSON.stringify(data.lessons ?? []),
    data.created_by ?? "teacher",
    now
  );
  return getCourse(id);
}
