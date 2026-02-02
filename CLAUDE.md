# Add to GCal - Project Notes

## What This Is
A web app that reads screenshots of calendar events (flight bookings, restaurant reservations, hotel confirmations, concert tickets, etc.) and creates Google Calendar entries. Drop a screenshot, review the extracted details, and add to Google Calendar with one click.

## File Structure
- `index.html` - Main page with drop zone, review form, and About modal
- `styles.css` - Glassmorphism design matching the Squares app
- `app.js` - OCR processing, text parsing, Google Calendar URL generation

## Key Features
- Drag and drop any screenshot (PNG, JPG, etc.)
- Client-side OCR using Tesseract.js (nothing leaves the browser)
- Smart text parsing to extract event name, date, time, location
- Editable review form so user can correct any OCR mistakes
- Opens Google Calendar with pre-filled event (no API keys needed)
- Privacy-friendly: no server, no uploads, no storage

## Design Decisions
- Glassmorphism UI matching Squares (gradient bg, glass card, blur effects)
- About button in upper left (fixed position)
- Credit line "by @bijan" links to instagram.com/bijan
- Single screenshot at a time (not batch)
- Google Calendar URL approach (no OAuth) for simplicity
- Tesseract.js v5 from CDN for OCR

## Tech Stack
- Vanilla HTML/CSS/JS (no frameworks, no build)
- Tesseract.js v5 (CDN) for client-side OCR
- Google Calendar TEMPLATE URL for event creation

## Google Calendar URL Format
`https://calendar.google.com/calendar/render?action=TEMPLATE&text=EVENT&dates=START/END&location=LOC&details=NOTES`
- Timed events: `dates=20260215T190000/20260215T210000`
- All-day events: `dates=20260215/20260216` (end date exclusive)

## Owner
Built by @bijan (instagram.com/bijan)

## Last Updated
February 2026
