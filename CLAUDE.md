# Add to GCal - Project Notes

## What This Is
A web app that extracts event details from screenshots, PDFs, or pasted text and creates Google Calendar entries. Drop a file, paste text, or take a photo on mobile — review the extracted details and add to Google Calendar with one click.

**Live URL:** https://bijan-spec.github.io/AddtoGCal/

## File Structure
- `index.html` - Main page with upload section, review form, and About modal
- `styles.css` - Glassmorphism design matching the Squares app
- `app.js` - OCR processing, PDF handling, text parsing, Google Calendar URL generation
- `CLAUDE.md` - This project documentation

## Key Features

### Input Methods
- **Drag & drop** screenshots or PDFs
- **Paste text** directly from confirmation emails (skips OCR)
- **Take a photo** on mobile devices (camera capture)

### Processing
- Client-side OCR using Tesseract.js v5 (nothing leaves the browser)
- PDF text extraction using PDF.js v3 (with OCR fallback for scanned PDFs)
- Smart text parsing extracts: event name, date, start/end time, location, confirmation numbers

### Multi-Event Support
- Detects multiple events in a single screenshot/PDF (e.g., round-trip flights)
- Dedicated flight itinerary parser for airlines (JetBlue, Delta, United, etc.)
- Each event shown as a separate card with individual "Add to Calendar" button
- "Add All" button to add all events at once

### Multi-Day Events
- Start date and end date fields for hotel stays, conferences, etc.
- Detects checkout/departure dates from text
- Correctly handles Google Calendar's exclusive end-date format

### Privacy
- 100% client-side — no server, no uploads, no storage
- All processing happens in the browser

## Design
- Glassmorphism UI matching the Squares app
- Gradient background with purple, pink, and blue radials
- Glass card with backdrop blur
- iOS-style colors (accent blue #007AFF, success green #34C759, danger red #FF3B30)
- Mobile responsive at 480px breakpoint
- Camera button appears on touch devices

## Tech Stack
- Vanilla HTML/CSS/JS (no frameworks, no build process)
- Tesseract.js v5 (CDN) for client-side OCR
- PDF.js v3.11.174 (CDN) for PDF rendering and text extraction
- Google Calendar TEMPLATE URL for event creation (no OAuth needed)

## Google Calendar URL Format
`https://calendar.google.com/calendar/render?action=TEMPLATE&text=EVENT&dates=START/END&location=LOC&details=NOTES`

- Timed events: `dates=20260215T190000/20260215T210000`
- All-day events: `dates=20260215/20260216` (end date exclusive)
- Multi-day all-day: `dates=20260215/20260220` (end = checkout + 1 day)

## Version History

### v.3 (February 2026)
- Added paste text option (skip OCR, paste confirmation text directly)
- Added end date field for multi-day events (hotels, conferences)
- Added mobile camera capture button
- Improved end date detection for checkout/departure dates

### v.2 (February 2026)
- Added PDF support with PDF.js
- Added multi-event detection and display
- Added dedicated flight itinerary parser
- Added per-event "Add to Calendar" buttons
- Added "Add All" button for batch adding

### v.1 (February 2026)
- Initial release
- Screenshot OCR with Tesseract.js
- Single event extraction and review
- Google Calendar integration

## Deployment
- GitHub repo: https://github.com/bijan-spec/AddtoGCal
- Hosted on GitHub Pages: https://bijan-spec.github.io/AddtoGCal/

## Owner
Built by @bijan (instagram.com/bijan)

## Last Updated
February 2026
