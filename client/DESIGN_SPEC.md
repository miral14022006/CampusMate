# CampusMate design spec (replicates an 8-screen mockup)
Mood: warm, premium, dark "espresso charcoal" with a burnt-orange/terracotta accent; calm, spacious, rounded corners, soft shadows.

## Tokens (dark default)
page bg #161616 | app bg #1b1b1b | surface-1 #202020 | surface-2 #262626 | surface-3 #2d2d2d | border rgba(255,255,255,.06) | text-primary #F3EEE9 | text-secondary #A8A29C | text-muted #78726D
accent gradient #D4673F -> #C4553A; accent-soft = accent at 12-18% alpha
status: green #4E9A62 on 15% tint (Active/Positive), red #D9564E (Negative/delete), amber #D9A441 (Needs Review)
Light mode: bg #F6F2EE, white cards, same terracotta accent.
Radius 10/14/20 + pill. Inter for UI; Noto Sans Devanagari/Gujarati for Indic text. Tabular numbers for stats. Lucide icons, 1.5px stroke. Charts use only terracotta tints (no blue/purple). Text on accent is always white.

## Brand
Logo = graduation cap (mortarboard) in a copper-gradient rounded-square badge + wordmark "CampusMate" (semibold, tight tracking). Subtitle used in chat header: "Your AI campus assistant".

## Shared admin/chat sidebar
~240px wide, surface slightly darker than content, logo at top. Nav items with icon + label, 40px rows. ACTIVE item = filled terracotta pill with white text. Chat sidebar items: [+ New Chat (full-width orange button)], Chat History, Documents, Analytics, Settings; bottom: "Student Portal / PDEU" card with external-link icon, then a moon icon "Dark Mode" row with an orange toggle switch. Admin sidebar items: Dashboard, Documents, Analytics, Feedback, Cache, Settings, Logout.

## Screen 1: Landing
Top nav: logo left; right: Home (active, orange underline), Features, About, Contact, and a small orange pill "Get Started". Hero left: huge headline in two lines "Your campus," (cream) / "your way." (terracotta); below, 2-line subtext "Ask, explore and get instant answers about notices, exams, fees and more — all in one place."; buttons: orange pill "Start Chatting →" and ghost text button "Learn More" with a circled play icon; under them a row of 3 trust items with icons: lightning "Instant Answers", shield-check "Verified Information", institution/building "Built for PDEU". Hero right: large photo of a modern college building, masked in a soft cloud/arch shape, with a warm dark vignette fading into the page background. 

## Screen 2: Chat
Sidebar as above. Header bar: round logo avatar + "CampusMate" + small muted "Your AI campus assistant". Messages: user bubble right-aligned (surface-2 pill, small user avatar circle at its right); assistant bubble left (logo avatar at left, surface-1 rounded card, 2 lines of text) containing a "Source: Exam Notice 2025 (Page 1)" chip (document icon, outlined). Below: three suggestion chips ("Fee details?", "Exam schedule?", "Hostel rules?") as outlined pills. Bottom composer: wide rounded pill input "Type your question…" with a circular orange send button (paper-plane icon) at the right.

## Screen 3: Admin Dashboard
Header: "Admin Dashboard" + muted "Overview of CampusMate performance"; right: dropdown "Last 30 days". Row of 4 KPI cards (surface-1, orange icon tile top-left, big number, label, tiny delta with arrow): Total Queries 125.4K (+12%), Cache Hit Rate 94.2% (+2%), Avg Response 620ms (-8%, good), User Satisfaction 96.1% (+3%). Below, 2 cards: "Query Trend" (area/line chart, orange line with dots, soft gradient fill, x-axis Mon..Sun, small "This Week" dropdown) and "Top Intents" (donut chart in terracotta tints with legend: Exam Related 28.5%, Fee Information 24.1%, Academic Calendar 18.7%, Hostel 15.3%, Others 13.4%).

## Screen 4: Documents Management
Header "Documents Management" + muted "Manage college notices and circulars"; top-right outlined orange button "Upload Document" with upload icon. A rounded table card: columns File Name (orange file icon + name), Type (PDF), Uploaded On (e.g. Apr 15, 2025), Status (green "Active" pill), Actions (eye icon, red trash icon). Sample rows: Exam Notice 2025.pdf, Fee Circular.pdf, Academic Calendar.pdf, Hostel Rules.pdf, Library Guidelines.pdf.

## Screen 5: Analytics Overview
Header "Analytics Overview" + muted "Insights into user queries and system performance"; "Last 30 days" dropdown. Top row: "Intent Distribution" card (donut + legend Exam Related 32%, Fee Information 28%, Academic Calendar 22%, Others 18%) and "Language Breakdown" card (vertical bars in terracotta tints; the mockup shows English, Hindi, Gujarati — the real app must also show Hinglish and Gujlish). Bottom full-width card: "Response Time Trend" line chart (orange line, dots, faint fill, y-axis 0 / 500ms / 1s) with "Avg: 620ms" label top-right.

## Screen 6: Feedback & Reviews
Header "Feedback & Reviews" + muted "User feedback and review queue". Filter tabs: All (active, orange pill), Positive, Negative, Needs Review. List card with rows: thumbs-up (orange) / thumbs-down (red) icon, bold title ("Great response!", "Didn't find the answer", "Super helpful!"), muted subtitle ("Very helpful. Thank you.", "Not relevant to my query.", "Got my answer easily."), right side relative time ("2m ago", "5m ago", "10m ago") and a status pill (green "Positive" / red "Negative").

## Screen 7: Settings
Header "Settings" + muted "Manage your preferences". "Profile Settings" card: round avatar with letter, name "Student User", email line, outlined "Edit Profile" button. "Preferences" card: Language row with a select (English), Theme row with an orange "Dark Mode" switch.

(Cache page is not in the mockup: build it in the same style: stat cards for hit rate/entries, a table of entries, a "Flush cache" button with confirm.)

## Motion
Framer Motion, easing cubic-bezier(0.22,1,0.36,1), 150/250/400ms. Route fade+slide, staggered card reveals, hover lift, animated active-nav pill (layoutId), chart draw-in, KPI count-up, message entrance (fade + 8px rise). Only transform/opacity. Respect prefers-reduced-motion.
