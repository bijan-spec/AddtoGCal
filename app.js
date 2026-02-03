(function () {
    'use strict';

    // --- DOM Elements ---
    var uploadSection = document.getElementById('uploadSection');
    var dropZone = document.getElementById('dropZone');
    var fileInput = document.getElementById('fileInput');
    var cameraInput = document.getElementById('cameraInput');
    var cameraBtn = document.getElementById('cameraBtn');
    var pasteTextarea = document.getElementById('pasteTextarea');
    var pasteBtn = document.getElementById('pasteBtn');
    var progressSection = document.getElementById('progressSection');
    var progressFill = document.getElementById('progressFill');
    var progressText = document.getElementById('progressText');
    var reviewSection = document.getElementById('reviewSection');
    var reviewTitle = document.getElementById('reviewTitle');
    var screenshotPreview = document.getElementById('screenshotPreview');
    var screenshotImg = document.getElementById('screenshotImg');
    var eventsList = document.getElementById('eventsList');
    var actionSection = document.getElementById('actionSection');
    var addAllBtn = document.getElementById('addAllBtn');
    var addAllBtnText = document.getElementById('addAllBtnText');
    var successSection = document.getElementById('successSection');
    var successText = document.getElementById('successText');
    var addAnotherBtn = document.getElementById('addAnotherBtn');
    var startOverBtn = document.getElementById('startOverBtn');
    var glassCard = document.getElementById('glassCard');
    var aboutBtn = document.getElementById('aboutBtn');
    var aboutModal = document.getElementById('aboutModal');
    var modalClose = document.getElementById('modalClose');

    // --- State ---
    var screenshotObjectURL = null;
    var eventCards = []; // tracks { element, added } for each event card

    // --- Month Names ---
    var MONTHS = {
        'january': 0, 'jan': 0, 'february': 1, 'feb': 1, 'march': 2, 'mar': 2,
        'april': 3, 'apr': 3, 'may': 4, 'june': 5, 'jun': 5, 'july': 6, 'jul': 6,
        'august': 7, 'aug': 7, 'september': 8, 'sep': 8, 'sept': 8,
        'october': 9, 'oct': 9, 'november': 10, 'nov': 10, 'december': 11, 'dec': 11
    };

    // --- Init ---
    function init() {
        setupDropZone();
        setupPasteText();
        setupCamera();
        setupButtons();
        setupModal();
    }

    // --- Drop Zone ---
    function setupDropZone() {
        dropZone.addEventListener('click', function () {
            fileInput.click();
        });

        fileInput.addEventListener('change', function (e) {
            if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
            }
        });

        dropZone.addEventListener('dragover', function (e) {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', function (e) {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', function (e) {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            var files = e.dataTransfer.files;
            if (files && files[0]) {
                if (!files[0].type.startsWith('image/') && files[0].type !== 'application/pdf') {
                    showNotification('Please drop an image or PDF file');
                    return;
                }
                handleFile(files[0]);
            }
        });
    }

    // --- Paste Text ---
    function setupPasteText() {
        pasteBtn.addEventListener('click', function () {
            var text = pasteTextarea.value.trim();
            if (!text) {
                showNotification('Please paste some text first');
                return;
            }
            uploadSection.style.display = 'none';
            screenshotPreview.style.display = 'none';
            var events = parseAllEvents(text);
            showReviewForm(events, text);
        });
    }

    // --- Camera ---
    function setupCamera() {
        cameraBtn.addEventListener('click', function () {
            cameraInput.click();
        });

        cameraInput.addEventListener('change', function (e) {
            if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
            }
        });
    }

    // --- Buttons ---
    function setupButtons() {
        addAllBtn.addEventListener('click', addAllToCalendar);
        addAnotherBtn.addEventListener('click', resetAll);
        startOverBtn.addEventListener('click', resetAll);
    }

    // --- Modal ---
    function setupModal() {
        aboutBtn.addEventListener('click', function () {
            aboutModal.classList.add('visible');
        });

        modalClose.addEventListener('click', function () {
            aboutModal.classList.remove('visible');
        });

        aboutModal.addEventListener('click', function (e) {
            if (e.target === aboutModal) {
                aboutModal.classList.remove('visible');
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && aboutModal.classList.contains('visible')) {
                aboutModal.classList.remove('visible');
            }
        });
    }

    // --- Handle File ---
    function handleFile(file) {
        if (screenshotObjectURL) {
            URL.revokeObjectURL(screenshotObjectURL);
        }

        uploadSection.style.display = 'none';
        progressSection.classList.add('visible');
        progressFill.style.width = '0%';

        if (file.type === 'application/pdf') {
            progressText.textContent = 'Rendering PDF...';
            handlePDF(file);
        } else {
            screenshotObjectURL = URL.createObjectURL(file);
            screenshotImg.src = screenshotObjectURL;
            progressText.textContent = 'Loading OCR engine...';
            runOCR(screenshotObjectURL);
        }
    }

    // --- PDF Handling ---
    async function handlePDF(file) {
        try {
            var arrayBuffer = await file.arrayBuffer();
            var pdfjsLib = window.pdfjsLib;

            if (!pdfjsLib) {
                showNotification('PDF library failed to load. Please try an image instead.');
                setTimeout(resetAll, 2000);
                return;
            }

            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

            var pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            var allText = '';
            var previewSet = false;
            var totalPages = pdf.numPages;

            for (var i = 1; i <= totalPages; i++) {
                progressText.textContent = 'Processing page ' + i + ' of ' + totalPages + '...';
                progressFill.style.width = Math.round((i / totalPages) * 30) + '%';

                var page = await pdf.getPage(i);

                var textContent = await page.getTextContent();
                var pageText = textContent.items.map(function (item) { return item.str; }).join(' ');

                if (pageText.trim().length > 10) {
                    allText += pageText + '\n';
                } else {
                    var viewport = page.getViewport({ scale: 2 });
                    var canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    var ctx = canvas.getContext('2d');

                    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

                    if (!previewSet) {
                        screenshotObjectURL = canvas.toDataURL('image/png');
                        screenshotImg.src = screenshotObjectURL;
                        previewSet = true;
                    }

                    progressText.textContent = 'Running OCR on page ' + i + '...';

                    var ocrResult = await Tesseract.recognize(
                        canvas.toDataURL('image/png'),
                        'eng',
                        {
                            logger: function (info) {
                                if (info.status === 'recognizing text') {
                                    var basePct = Math.round(30 + ((i - 1) / totalPages) * 70);
                                    var pagePct = Math.round((info.progress / totalPages) * 70);
                                    progressFill.style.width = (basePct + pagePct) + '%';
                                }
                            }
                        }
                    );
                    allText += ocrResult.data.text + '\n';
                }

                if (!previewSet) {
                    var vpPreview = page.getViewport({ scale: 1.5 });
                    var cvPreview = document.createElement('canvas');
                    cvPreview.width = vpPreview.width;
                    cvPreview.height = vpPreview.height;
                    var ctxPreview = cvPreview.getContext('2d');
                    await page.render({ canvasContext: ctxPreview, viewport: vpPreview }).promise;
                    screenshotObjectURL = cvPreview.toDataURL('image/png');
                    screenshotImg.src = screenshotObjectURL;
                    previewSet = true;
                }
            }

            progressFill.style.width = '100%';
            var events = parseAllEvents(allText);
            showReviewForm(events, allText);

        } catch (err) {
            console.error('PDF Error:', err);
            progressText.textContent = 'Error reading PDF. Please try again.';
            setTimeout(resetAll, 2000);
        }
    }

    // --- OCR ---
    async function runOCR(imageSource) {
        try {
            var result = await Tesseract.recognize(
                imageSource,
                'eng',
                {
                    logger: function (info) {
                        if (info.status === 'recognizing text') {
                            var pct = Math.round(info.progress * 100);
                            progressFill.style.width = pct + '%';
                            progressText.textContent = 'Reading screenshot... ' + pct + '%';
                        } else if (info.status === 'loading tesseract core') {
                            progressText.textContent = 'Loading OCR engine...';
                            progressFill.style.width = '5%';
                        } else if (info.status === 'initializing tesseract') {
                            progressText.textContent = 'Initializing...';
                            progressFill.style.width = '10%';
                        } else if (info.status === 'loading language traineddata') {
                            progressText.textContent = 'Loading language data...';
                            progressFill.style.width = '20%';
                        } else if (info.status === 'initializing api') {
                            progressText.textContent = 'Preparing...';
                            progressFill.style.width = '30%';
                        }
                    }
                }
            );

            var text = result.data.text;
            var events = parseAllEvents(text);
            showReviewForm(events, text);

        } catch (err) {
            console.error('OCR Error:', err);
            progressText.textContent = 'Error reading screenshot. Please try again.';
            setTimeout(resetAll, 2000);
        }
    }

    // =========================================================
    // Multi-Event Parsing
    // =========================================================

    function parseAllEvents(rawText) {
        // First, try airline-specific parsing (flight itineraries)
        var flightEvents = parseFlightItinerary(rawText);
        if (flightEvents.length >= 2) {
            return flightEvents;
        }

        // Second, try hotel reservation parsing
        var hotelEvent = parseHotelReservation(rawText);
        if (hotelEvent) {
            return [hotelEvent];
        }

        // Then try generic splitting
        var blocks = splitIntoEventBlocks(rawText);
        var events = [];

        for (var i = 0; i < blocks.length; i++) {
            var ev = parseSingleEvent(blocks[i]);
            if (ev.name || ev.date) {
                events.push(ev);
            }
        }

        if (events.length === 0) {
            events.push(parseSingleEvent(rawText));
        }

        return events;
    }

    // --- Airline Flight Itinerary Parser ---
    // Detects patterns like "BOS SXM Flight 1977" with nearby dates/times
    function parseFlightItinerary(rawText) {
        var events = [];
        var fullText = rawText;

        // Find the airline name from the text
        var airlineNames = ['JetBlue', 'Delta', 'United', 'American', 'Southwest', 'Alaska',
            'Spirit', 'Frontier', 'Hawaiian', 'Sun Country', 'Allegiant', 'Air Canada',
            'British Airways', 'Virgin Atlantic', 'Lufthansa', 'Emirates', 'Qatar'];
        var detectedAirline = '';
        for (var a = 0; a < airlineNames.length; a++) {
            if (fullText.toLowerCase().indexOf(airlineNames[a].toLowerCase()) !== -1) {
                detectedAirline = airlineNames[a];
                break;
            }
        }

        // Find confirmation code
        var confCode = '';
        var confMatch = fullText.match(/(?:confirmation|conf\.?)\s*(?:code|#|number)?\s*(?:is\s+)?([A-Z]{6})/i);
        if (confMatch) confCode = confMatch[1];
        if (!confCode) {
            var pnrMatch = fullText.match(/(?:PNR|record\s+locator|booking\s+code)[:\s]+([A-Z0-9]{5,8})/i);
            if (pnrMatch) confCode = pnrMatch[1];
        }

        // Pattern: "XXX YYY Flight NNNN" or "XXX ► YYY Flight NNNN"
        // Also handles "BOS  SXM  Flight 1977" with varied whitespace/symbols
        // Updated to handle more Unicode arrows and flexible whitespace
        var flightSegmentRegex = /([A-Z]{3})\s*[►▶→▸▷➤➜➔➙>\-–—]?\s*([A-Z]{3})\s+Flight\s+(\d{3,5})/gi;
        var segMatch;
        var segments = [];

        // First pass: try the standard pattern
        while ((segMatch = flightSegmentRegex.exec(fullText)) !== null) {
            segments.push({
                origin: segMatch[1],
                dest: segMatch[2],
                flightNum: segMatch[3],
                index: segMatch.index
            });
        }

        // Second pass: if not enough segments found, try alternate JetBlue PDF format
        // JetBlue PDFs often have "Flight NNNN" on a separate line after airport codes
        if (segments.length < 2) {
            segments = [];
            // Look for "XXX YYY" followed by "Flight NNNN" within nearby text
            // This pattern: airport codes on one line, "Flight" nearby
            var airportPairRegex = /([A-Z]{3})\s+([A-Z]{3})\b/g;
            var flightNumRegex = /Flight\s+(\d{3,5})/gi;

            var airportPairs = [];
            var apMatch;
            while ((apMatch = airportPairRegex.exec(fullText)) !== null) {
                // Skip if this looks like something else (e.g., "USA NYC")
                var orig = apMatch[1];
                var dest = apMatch[2];
                // Common airport codes - basic validation
                airportPairs.push({
                    origin: orig,
                    dest: dest,
                    index: apMatch.index
                });
            }

            var flightNums = [];
            var fnMatch;
            while ((fnMatch = flightNumRegex.exec(fullText)) !== null) {
                flightNums.push({
                    num: fnMatch[1],
                    index: fnMatch.index
                });
            }

            // Match airport pairs with nearby flight numbers (within 100 chars)
            for (var ap = 0; ap < airportPairs.length; ap++) {
                var pair = airportPairs[ap];
                for (var fn = 0; fn < flightNums.length; fn++) {
                    var flight = flightNums[fn];
                    var distance = flight.index - pair.index;
                    if (distance > 0 && distance < 100) {
                        segments.push({
                            origin: pair.origin,
                            dest: pair.dest,
                            flightNum: flight.num,
                            index: pair.index
                        });
                        break;
                    }
                }
            }
        }

        // Deduplicate segments (same flight number appears multiple times in these PDFs)
        var uniqueSegments = [];
        var seenFlights = [];
        for (var s = 0; s < segments.length; s++) {
            var key = segments[s].flightNum;
            if (seenFlights.indexOf(key) === -1) {
                seenFlights.push(key);
                uniqueSegments.push(segments[s]);
            }
        }

        if (uniqueSegments.length < 2) return [];

        // For each unique flight segment, find its associated date and time
        // Look in a window of text around each segment occurrence
        for (var f = 0; f < uniqueSegments.length; f++) {
            var seg = uniqueSegments[f];
            // Get a window of ~500 chars around the first occurrence
            var windowStart = Math.max(0, seg.index - 100);
            var windowEnd = Math.min(fullText.length, seg.index + 400);
            var windowText = fullText.substring(windowStart, windowEnd);

            var eventData = {
                name: (detectedAirline ? detectedAirline + ' ' : '') + 'Flight ' + seg.flightNum + ' ' + seg.origin + '→' + seg.dest,
                date: '',
                endDate: '',
                startTime: '',
                endTime: '',
                location: seg.origin + ' → ' + seg.dest,
                notes: confCode ? 'Confirmation: ' + confCode : ''
            };

            // Find date near this segment
            // Pattern: "Sun, Feb 8" / "Sat, Feb 14" / "Mon, Jan 15" (abbreviated, no year)
            var shortDateRegex = /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[,.\s]+\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\b/i;
            var dm = windowText.match(shortDateRegex);
            if (dm) {
                var mo = MONTHS[dm[1].toLowerCase().substring(0, 3)];
                var dy = parseInt(dm[2], 10);
                var now = new Date();
                var testD = new Date(now.getFullYear(), mo, dy);
                if (testD < new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)) {
                    testD.setFullYear(testD.getFullYear() + 1);
                }
                eventData.date = formatDateISO(testD.getFullYear(), testD.getMonth(), testD.getDate());
            }

            // Also try "Month DD, YYYY" in window
            if (!eventData.date) {
                var longDateInWindow = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})\b/i;
                var ldm = windowText.match(longDateInWindow);
                if (ldm) {
                    var mo2 = MONTHS[ldm[1].toLowerCase().substring(0, 3)];
                    eventData.date = formatDateISO(parseInt(ldm[3], 10), mo2, parseInt(ldm[2], 10));
                }
            }

            // Find times: look for "HH:MM AM" patterns near the flight
            var timesInWindow = [];
            var timeRegex = /(\d{1,2}:\d{2})\s*(AM|PM)/gi;
            var tm;
            while ((tm = timeRegex.exec(windowText)) !== null) {
                timesInWindow.push({ time: tm[1], ampm: tm[2] });
            }

            if (timesInWindow.length >= 2) {
                eventData.startTime = convertTo24Hour(timesInWindow[0].time, timesInWindow[0].ampm);
                eventData.endTime = convertTo24Hour(timesInWindow[1].time, timesInWindow[1].ampm);
            } else if (timesInWindow.length === 1) {
                eventData.startTime = convertTo24Hour(timesInWindow[0].time, timesInWindow[0].ampm);
            }

            events.push(eventData);
        }

        return events;
    }

    // --- Hotel Reservation Parser ---
    // Detects CHECK IN / CHECK OUT patterns common in hotel confirmations
    function parseHotelReservation(rawText) {
        var fullText = rawText;

        // Look for CHECK IN and CHECK OUT patterns
        var hasCheckIn = /check[\s\-]?in/i.test(fullText);
        var hasCheckOut = /check[\s\-]?out/i.test(fullText);

        // Also look for hotel-related keywords
        var hotelKeywords = /\b(hotel|resort|inn|suites?|lodge|reservation|booking\s+confirmation|room\s+type|room:|nights?:?|guest\s+name)/i;
        var hasHotelKeywords = hotelKeywords.test(fullText);

        // Must have both check-in/out AND hotel keywords to be treated as hotel reservation
        if (!hasCheckIn || !hasCheckOut || !hasHotelKeywords) {
            return null;
        }

        var result = {
            name: '',
            date: '',
            endDate: '',
            startTime: '',
            endTime: '',
            location: '',
            notes: ''
        };

        // --- Extract hotel/property name ---
        // Look for "LA SAMANNA" style headers or "Hotel Name - Your booking" patterns
        var hotelNamePatterns = [
            // "LA SAMANNA" - all caps hotel name on its own line (Belmond style)
            /^([A-Z][A-Z\s]{2,})$/m,
            // "La Samanna - Your booking confirmation"
            /([A-Za-z][A-Za-z\s&']+)\s*[-–—]\s*(?:Your\s+)?(?:booking|reservation)/i,
            // "Hotel Name" ending with hotel-type word
            /^([A-Z][A-Za-z\s&']+(?:Hotel|Resort|Inn|Suites?|Lodge))/m,
            // From subject line: "Subject: La Samanna Reservation Confirmation"
            /Subject[:\s]+(?:Fwd:\s*|Re:\s*)?([A-Za-z][A-Za-z\s&']+?)(?:\s+Reservation|\s+Confirmation|\s+Booking)/i
        ];

        for (var hp = 0; hp < hotelNamePatterns.length; hp++) {
            var hm = fullText.match(hotelNamePatterns[hp]);
            if (hm) {
                var candidateName = hm[1].trim();
                // Skip if it's too short or looks like junk
                if (candidateName.length < 3) continue;
                // Skip common false positives
                if (/^(BOOKING|RESERVATION|CONFIRMATION|DETAILS|GUEST|CHECK|ROOM|HOTEL)$/i.test(candidateName)) continue;
                // Skip if it contains numbers (likely not a hotel name)
                if (/\d/.test(candidateName)) continue;

                result.name = candidateName;
                break;
            }
        }

        // Clean up the name
        if (result.name) {
            // Remove trailing "A BELMOND HOTEL" etc if present
            result.name = result.name.replace(/\s+A\s+BELMOND.*$/i, '').trim();
            // Limit length
            if (result.name.length > 40) {
                result.name = result.name.substring(0, 40).trim();
            }
        }

        // Add "Stay" suffix
        if (result.name) {
            if (!/hotel|resort|inn|suites?|lodge|stay/i.test(result.name)) {
                result.name = result.name + ' Stay';
            }
        }

        // --- Extract CHECK-IN and CHECK-OUT dates ---
        // Belmond PDFs have format: "CHECK IN: ," and "CHECK OUT: ," with dates appearing later
        // like "SUNDAY 08 FEB 2026" and "SATURDAY 14 FEB 2026"
        // Strategy: Find all dates with day names, first one is check-in, second is check-out

        var dayDatePattern = /(?:SUNDAY|MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY)[,\s]+(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s+(\d{4})/gi;
        var allDayDates = [];
        var dayMatch;
        while ((dayMatch = dayDatePattern.exec(fullText)) !== null) {
            allDayDates.push({
                day: parseInt(dayMatch[1], 10),
                month: dayMatch[2],
                year: parseInt(dayMatch[3], 10),
                index: dayMatch.index
            });
        }

        // If we found day-prefixed dates (like "SUNDAY 08 FEB 2026"), use first for check-in, second for check-out
        if (allDayDates.length >= 2) {
            var ciMonth = MONTHS[allDayDates[0].month.toLowerCase().substring(0, 3)];
            result.date = formatDateISO(allDayDates[0].year, ciMonth, allDayDates[0].day);

            var coMonth = MONTHS[allDayDates[1].month.toLowerCase().substring(0, 3)];
            result.endDate = formatDateISO(allDayDates[1].year, coMonth, allDayDates[1].day);
        } else if (allDayDates.length === 1) {
            var ciMonth2 = MONTHS[allDayDates[0].month.toLowerCase().substring(0, 3)];
            result.date = formatDateISO(allDayDates[0].year, ciMonth2, allDayDates[0].day);
        }

        // Fallback: try standard patterns if day-prefixed dates not found
        if (!result.date) {
            var checkInPatterns = [
                /check[\s\-]?in[:\s]+(?:[A-Za-z]+,?\s*)?(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i,
                /check[\s\-]?in[:\s]+(?:[A-Za-z]+,?\s*)?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i,
                /check[\s\-]?in[:\s]+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i
            ];

            for (var ci = 0; ci < checkInPatterns.length; ci++) {
                var cim = fullText.match(checkInPatterns[ci]);
                if (cim) {
                    if (ci === 0) {
                        var ciMonth3 = MONTHS[cim[2].toLowerCase().substring(0, 3)];
                        result.date = formatDateISO(parseInt(cim[3], 10), ciMonth3, parseInt(cim[1], 10));
                    } else if (ci === 1) {
                        var ciMonth4 = MONTHS[cim[1].toLowerCase().substring(0, 3)];
                        result.date = formatDateISO(parseInt(cim[3], 10), ciMonth4, parseInt(cim[2], 10));
                    } else {
                        var yr = parseInt(cim[3], 10);
                        if (yr < 100) yr += 2000;
                        result.date = formatDateISO(yr, parseInt(cim[1], 10) - 1, parseInt(cim[2], 10));
                    }
                    break;
                }
            }
        }

        if (!result.endDate) {
            var checkOutPatterns = [
                /check[\s\-]?out[:\s]+(?:[A-Za-z]+,?\s*)?(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i,
                /check[\s\-]?out[:\s]+(?:[A-Za-z]+,?\s*)?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i,
                /check[\s\-]?out[:\s]+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i
            ];

            for (var co = 0; co < checkOutPatterns.length; co++) {
                var com = fullText.match(checkOutPatterns[co]);
                if (com) {
                    if (co === 0) {
                        var coMonth2 = MONTHS[com[2].toLowerCase().substring(0, 3)];
                        result.endDate = formatDateISO(parseInt(com[3], 10), coMonth2, parseInt(com[1], 10));
                    } else if (co === 1) {
                        var coMonth3 = MONTHS[com[1].toLowerCase().substring(0, 3)];
                        result.endDate = formatDateISO(parseInt(com[3], 10), coMonth3, parseInt(com[2], 10));
                    } else {
                        var yr2 = parseInt(com[3], 10);
                        if (yr2 < 100) yr2 += 2000;
                        result.endDate = formatDateISO(yr2, parseInt(com[1], 10) - 1, parseInt(com[2], 10));
                    }
                    break;
                }
            }
        }

        // --- Extract check-in TIME ---
        var checkInTimeMatch = fullText.match(/check[\s\-]?in\s+time[:\s]+(\d{1,2}:\d{2})\s*(AM|PM)?/i);
        if (checkInTimeMatch) {
            result.startTime = checkInTimeMatch[2]
                ? convertTo24Hour(checkInTimeMatch[1], checkInTimeMatch[2])
                : checkInTimeMatch[1];
        }

        // --- Extract location ---
        // Look for address patterns or location fields
        var locationPatterns = [
            /(?:address|location)[:\s]+([^\n]+)/i,
            /(\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr)[^\n]*)/i,
            /([A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5})/  // City, ST ZIP
        ];

        for (var lp = 0; lp < locationPatterns.length; lp++) {
            var lm = fullText.match(locationPatterns[lp]);
            if (lm) {
                result.location = lm[1].trim();
                break;
            }
        }

        // If no address found, use hotel name + any city/region mentioned
        if (!result.location && result.name) {
            var cityMatch = fullText.match(/\b(St\.?\s*Martin|Saint\s*Martin|French\s*West\s*Indies|[A-Z][a-z]+,\s*[A-Z]{2})\b/i);
            if (cityMatch) {
                result.location = result.name.replace(/\s*(?:Hotel\s*)?Stay$/i, '') + ', ' + cityMatch[1];
            }
        }

        // --- Extract confirmation/booking number ---
        // Look for "BOOKING NUMBER: 6084649709-1-LAS" or similar patterns
        var confPatterns = [
            /booking\s*(?:#|number|no\.?)?[:\s]+([A-Z0-9\-]{6,25})/i,
            /confirmation\s*(?:#|number|no\.?|code)?[:\s]+([A-Z0-9\-]{6,25})/i,
            /reservation\s*(?:#|number|no\.?)?[:\s]+([A-Z0-9\-]{6,25})/i,
            /(?:conf|ref)\.?\s*(?:#|number|code)?[:\s]+([A-Z0-9\-]{6,25})/i
        ];

        for (var cp = 0; cp < confPatterns.length; cp++) {
            var cm = fullText.match(confPatterns[cp]);
            if (cm) {
                var confNum = cm[1].trim();
                // Skip if it matched a word like "CONFIRMATION" or "DETAILS"
                if (!/^[A-Z]+$/i.test(confNum) || confNum.length > 12) {
                    // Must contain at least one digit to be a real confirmation number
                    if (/\d/.test(confNum)) {
                        result.notes = 'Confirmation: ' + confNum;
                        break;
                    }
                }
            }
        }

        // Only return if we found at least a check-in date
        if (result.date) {
            return result;
        }

        return null;
    }

    // --- Generic Block Splitter ---
    function splitIntoEventBlocks(rawText) {
        var lines = rawText.split('\n');

        var boundaryPatterns = [
            /^[-=_]{3,}\s*$/,
            /^\s*(?:event|reservation|booking|confirmation)\s*#?\s*\d/i,
            /^\s*(?:hotel|stay|check.?in)\b/i,
            /^\s*(?:dinner|lunch|brunch|breakfast)\s+(?:at|for)\b/i,
        ];

        // Date pattern for splitting — includes dates with and without year
        var datePatternForSplit = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{0,4}\b|\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/i;

        var dateLineIndices = [];
        for (var i = 0; i < lines.length; i++) {
            if (datePatternForSplit.test(lines[i])) {
                dateLineIndices.push(i);
            }
        }

        if (dateLineIndices.length >= 2) {
            var uniqueDates = [];
            var dateValues = [];
            for (var d = 0; d < dateLineIndices.length; d++) {
                var dateStr = lines[dateLineIndices[d]].match(datePatternForSplit)[0].trim();
                if (dateValues.indexOf(dateStr) === -1) {
                    dateValues.push(dateStr);
                    uniqueDates.push(dateLineIndices[d]);
                }
            }

            if (uniqueDates.length >= 2) {
                var blocks = [];
                for (var b = 0; b < uniqueDates.length; b++) {
                    var startLine = (b === 0) ? 0 : uniqueDates[b];
                    var endLine = (b + 1 < uniqueDates.length) ? uniqueDates[b + 1] : lines.length;

                    if (b > 0) {
                        var lookBack = Math.max(startLine - 3, 0);
                        for (var lb = startLine - 1; lb >= lookBack; lb--) {
                            var trimmed = lines[lb].trim();
                            if (trimmed === '' || boundaryPatterns.some(function (p) { return p.test(trimmed); })) {
                                startLine = lb + 1;
                                break;
                            }
                        }
                        if (startLine === uniqueDates[b] && startLine > 0) {
                            startLine = Math.max(startLine - 2, 0);
                        }
                    }

                    blocks.push(lines.slice(startLine, endLine).join('\n'));
                }
                return blocks;
            }
        }

        // Fallback: try splitting on explicit boundary patterns
        var boundaryIndices = [];
        for (var j = 0; j < lines.length; j++) {
            var line = lines[j].trim();
            for (var p = 0; p < boundaryPatterns.length; p++) {
                if (boundaryPatterns[p].test(line)) {
                    boundaryIndices.push(j);
                    break;
                }
            }
        }

        if (boundaryIndices.length >= 2) {
            var bBlocks = [];
            for (var bi = 0; bi < boundaryIndices.length; bi++) {
                var bStart = boundaryIndices[bi];
                var bEnd = (bi + 1 < boundaryIndices.length) ? boundaryIndices[bi + 1] : lines.length;
                var block = lines.slice(bStart, bEnd).join('\n').trim();
                if (block) bBlocks.push(block);
            }
            if (bBlocks.length >= 2) return bBlocks;
        }

        return [rawText];
    }

    // =========================================================
    // Single Event Parser (same logic as before)
    // =========================================================

    function parseSingleEvent(rawText) {
        var lines = rawText.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
        var fullText = rawText;

        var result = {
            name: '',
            date: '',
            endDate: '',
            startTime: '',
            endTime: '',
            location: '',
            notes: ''
        };

        // --- DATE DETECTION ---
        var dateMatch = null;
        var m;

        // "January 15, 2026" / "Jan 15, 2026"
        var monthNameDateRegex = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})\b/i;
        m = fullText.match(monthNameDateRegex);
        if (m) {
            var monthNum = MONTHS[m[1].toLowerCase().substring(0, 3)];
            result.date = formatDateISO(parseInt(m[3], 10), monthNum, parseInt(m[2], 10));
            dateMatch = m[0];
        }

        // "15 January 2026" (European)
        if (!dateMatch) {
            var eurDateRegex = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})\b/i;
            m = fullText.match(eurDateRegex);
            if (m) {
                var monthNum2 = MONTHS[m[2].toLowerCase().substring(0, 3)];
                result.date = formatDateISO(parseInt(m[3], 10), monthNum2, parseInt(m[1], 10));
                dateMatch = m[0];
            }
        }

        // "MM/DD/YYYY"
        if (!dateMatch) {
            var slashDateRegex = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/;
            m = fullText.match(slashDateRegex);
            if (m) {
                var yr = parseInt(m[3], 10);
                if (yr < 100) yr += 2000;
                result.date = formatDateISO(yr, parseInt(m[1], 10) - 1, parseInt(m[2], 10));
                dateMatch = m[0];
            }
        }

        // "2026-01-15" (ISO)
        if (!dateMatch) {
            var isoDateRegex = /\b(\d{4})-(\d{2})-(\d{2})\b/;
            m = fullText.match(isoDateRegex);
            if (m) {
                result.date = m[0];
                dateMatch = m[0];
            }
        }

        // "Monday, January 15" or "Sun, Feb 8" (no year — abbreviated or full)
        if (!dateMatch) {
            var dayMonthRegex = /\b(?:Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)[,.\s]+\s*(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i;
            m = fullText.match(dayMonthRegex);
            if (m) {
                var monthNum3 = MONTHS[m[1].toLowerCase().substring(0, 3)];
                var day3 = parseInt(m[2], 10);
                var now = new Date();
                var testDate = new Date(now.getFullYear(), monthNum3, day3);
                if (testDate < new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)) {
                    testDate.setFullYear(testDate.getFullYear() + 1);
                }
                result.date = formatDateISO(testDate.getFullYear(), testDate.getMonth(), testDate.getDate());
                dateMatch = m[0];
            }
        }

        // --- TIME DETECTION ---
        var timeRangeRegex = /(\d{1,2}:\d{2})\s*(AM|PM|am|pm)?\s*[-–—to]+\s*(\d{1,2}:\d{2})\s*(AM|PM|am|pm)/i;
        m = fullText.match(timeRangeRegex);
        if (m) {
            result.startTime = convertTo24Hour(m[1], m[2] || m[4]);
            result.endTime = convertTo24Hour(m[3], m[4]);
        }

        if (!result.startTime) {
            var singleTimeRegex = /(\d{1,2}:\d{2})\s*(AM|PM|am|pm)/i;
            m = fullText.match(singleTimeRegex);
            if (m) {
                result.startTime = convertTo24Hour(m[1], m[2]);
            }
        }

        if (!result.startTime) {
            var labeledTimeRegex = /(?:check.?in|depart|arrival|arrive|time|starts?|begins?|from)[:\s]+(\d{1,2}:\d{2})\s*(AM|PM|am|pm)?/i;
            m = fullText.match(labeledTimeRegex);
            if (m) {
                result.startTime = m[2] ? convertTo24Hour(m[1], m[2]) : m[1];
            }
        }

        if (!result.endTime) {
            var labeledEndTimeRegex = /(?:check.?out|arrives?|ends?|until|to|through)[:\s]+(\d{1,2}:\d{2})\s*(AM|PM|am|pm)?/i;
            m = fullText.match(labeledEndTimeRegex);
            if (m) {
                result.endTime = m[2] ? convertTo24Hour(m[1], m[2]) : m[1];
            }
        }

        // --- LOCATION DETECTION ---
        for (var i = 0; i < lines.length; i++) {
            var locKeyword = /^(?:location|address|where|venue|place|restaurant|hotel)\s*[:\-]\s*/i;
            var locMatch = lines[i].match(locKeyword);
            if (locMatch) {
                var locValue = lines[i].substring(locMatch[0].length).trim();
                if (locValue && i + 1 < lines.length && !lines[i + 1].match(/^[A-Z][a-z]+\s*[:\-]/)) {
                    var nextLine = lines[i + 1];
                    if (nextLine.match(/^[\d,]/) || nextLine.match(/^[A-Z]{2}\s+\d/) || nextLine.length < 60) {
                        locValue += ', ' + nextLine;
                    }
                }
                if (locValue) {
                    result.location = locValue;
                    break;
                }
            }
        }

        if (!result.location) {
            var addressRegex = /\b(\d{1,5}\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\s+(?:St(?:reet)?|Ave(?:nue)?|Blvd|Boulevard|Dr(?:ive)?|Rd|Road|Ln|Lane|Way|Pl(?:ace)?|Ct|Court|Cir(?:cle)?|Pkwy|Parkway|Hwy|Highway)\.?(?:,?\s*(?:Suite|Ste|Apt|#)\s*\w+)?(?:,?\s*[A-Z][a-zA-Z\s]+)?(?:,?\s*[A-Z]{2}\s+\d{5})?)\b/;
            m = fullText.match(addressRegex);
            if (m) {
                result.location = m[1].trim();
            }
        }

        // --- EVENT NAME DETECTION ---
        for (var j = 0; j < lines.length; j++) {
            var nameKeyword = /^(?:subject|event|title|reservation(?:\s+for)?|booking)\s*[:\-]\s*/i;
            var nameMatch = lines[j].match(nameKeyword);
            if (nameMatch) {
                result.name = lines[j].substring(nameMatch[0].length).trim();
                break;
            }
        }

        if (!result.name) {
            // Try "AIRLINE Flight NNNN" first
            var airlineFlightRegex = /\b((?:United|Delta|American|Southwest|JetBlue|Alaska|Spirit|Frontier|Hawaiian|Sun Country|Allegiant)\s+(?:Airlines?\s+)?Flight\s+#?\d+)\b/i;
            m = fullText.match(airlineFlightRegex);
            if (m) {
                result.name = m[1].trim();
            } else {
                // Try "XXX YYY Flight NNNN" (airport codes + flight number)
                var routeFlightRegex = /([A-Z]{3})\s*[►▶→\-–—]?\s*([A-Z]{3})\s+Flight\s+(\d{3,5})/i;
                m = fullText.match(routeFlightRegex);
                if (m) {
                    result.name = 'Flight ' + m[3] + ' ' + m[1] + '→' + m[2];
                } else {
                    // Try just "Flight NNNN"
                    var simpleFlightRegex = /\b((?:Flight|FLT)\s*#?\s*\d{3,5})\b/i;
                    m = fullText.match(simpleFlightRegex);
                    if (m) result.name = m[1].trim();
                }
            }
        }

        if (!result.name) {
            var restRegex = /(?:reservation|dinner|lunch|brunch|breakfast)\s+(?:at|for)\s+(.+)/i;
            m = fullText.match(restRegex);
            if (m) result.name = m[0].trim();
        }

        if (!result.name) {
            var hotelRegex = /(?:stay\s+at|hotel|check.?in\s+at)\s+(.+)/i;
            m = fullText.match(hotelRegex);
            if (m) {
                result.name = m[0].trim();
                if (result.name.length > 80) result.name = result.name.substring(0, 80);
            }
        }

        if (!result.name) {
            for (var k = 0; k < Math.min(lines.length, 5); k++) {
                var candidateLine = lines[k];
                if (candidateLine.length < 4) continue;
                if (candidateLine.match(/^\d{1,2}[\/\-]\d{1,2}/)) continue;
                if (candidateLine.match(/^\d{1,2}:\d{2}/)) continue;
                if (candidateLine.match(/^(location|address|date|time|where|when|from|to)\s*:/i)) continue;
                result.name = candidateLine;
                break;
            }
        }

        if (result.name && result.name.length > 100) {
            result.name = result.name.substring(0, 100);
        }

        // --- END DATE DETECTION (multi-day events like hotels) ---
        var checkoutRegex = /(?:check[\s-]?out|departure|depart(?:ing)?|end(?:s|ing)?|through|checkout)\s*(?:date)?\s*[:\-]?\s*(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i;
        m = fullText.match(checkoutRegex);
        if (m) {
            var endMo = MONTHS[m[1].toLowerCase().substring(0, 3)];
            var endDy = parseInt(m[2], 10);
            var endYr = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
            var testEndDate = new Date(endYr, endMo, endDy);
            if (!m[3] && testEndDate < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 30)) {
                testEndDate.setFullYear(testEndDate.getFullYear() + 1);
            }
            result.endDate = formatDateISO(testEndDate.getFullYear(), testEndDate.getMonth(), testEndDate.getDate());
        }

        if (!result.endDate) {
            var checkoutSlashRegex = /(?:check[\s-]?out|departure|end(?:s|ing)?|through|checkout)\s*(?:date)?\s*[:\-]?\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i;
            m = fullText.match(checkoutSlashRegex);
            if (m) {
                var yr2 = parseInt(m[3], 10);
                if (yr2 < 100) yr2 += 2000;
                result.endDate = formatDateISO(yr2, parseInt(m[1], 10) - 1, parseInt(m[2], 10));
            }
        }

        // --- NOTES ---
        var confRegex = /(?:confirmation|booking|reference|record\s+locator|PNR|itinerary)\s*(?:#|number|no\.?|code)?\s*[:\-]?\s*([A-Z0-9]{4,12})/i;
        m = fullText.match(confRegex);
        if (m) {
            result.notes = 'Confirmation: ' + m[1].trim();
        }

        return result;
    }

    // =========================================================
    // UI: Render Event Cards
    // =========================================================

    function showReviewForm(events, rawText) {
        progressSection.classList.remove('visible');
        reviewSection.classList.add('visible');
        actionSection.classList.add('visible');

        // Clear previous cards
        eventsList.innerHTML = '';
        eventCards = [];

        var multipleEvents = events.length > 1;

        // Update header and button text
        if (multipleEvents) {
            reviewTitle.textContent = events.length + ' Events Found';
            addAllBtnText.textContent = 'Add All ' + events.length + ' to Google Calendar';
        } else {
            reviewTitle.textContent = 'Event Details';
            addAllBtnText.textContent = 'Add to Google Calendar';
        }

        for (var i = 0; i < events.length; i++) {
            var card = createEventCard(events[i], i, multipleEvents, rawText);
            eventsList.appendChild(card);
            eventCards.push({ element: card, added: false });
        }

        // If we couldn't extract much from a single event, show raw text
        if (events.length === 1) {
            var ev = events[0];
            var fieldsPopulated = [ev.name, ev.date, ev.startTime, ev.location].filter(Boolean).length;
            if (fieldsPopulated < 2 && rawText.trim()) {
                var notesField = eventCards[0].element.querySelector('.field-notes');
                if (notesField) {
                    notesField.value = (ev.notes ? ev.notes + '\n\n' : '') +
                        'OCR text:\n' + rawText.trim().substring(0, 500);
                }
                showNotification('Could not extract all details \u2014 please fill in the fields manually');
            }
        }
    }

    function createEventCard(eventData, index, showNumber, rawText) {
        var card = document.createElement('div');
        card.className = 'event-card';
        card.dataset.index = index;

        var html = '';

        // Header with event number and per-card actions
        if (showNumber) {
            html += '<div class="event-card-header">';
            html += '<span class="event-card-number">Event ' + (index + 1) + '</span>';
            html += '<span class="event-card-status">Added</span>';
            html += '<button class="remove-event-btn" data-index="' + index + '">Remove</button>';
            html += '</div>';
        }

        // Form fields
        html += '<div class="form-group">';
        html += '<label>Event Name</label>';
        html += '<input type="text" class="field-name" value="' + escapeAttr(eventData.name) + '" placeholder="e.g. Dinner at Chez Panisse">';
        html += '</div>';

        html += '<div class="form-row">';
        html += '<div class="form-group">';
        html += '<label>Start Date</label>';
        html += '<input type="date" class="field-date" value="' + escapeAttr(eventData.date) + '">';
        html += '</div>';
        html += '<div class="form-group">';
        html += '<label>End Date</label>';
        html += '<input type="date" class="field-end-date" value="' + escapeAttr(eventData.endDate || '') + '" placeholder="Optional">';
        html += '</div>';
        html += '</div>';

        html += '<div class="form-row">';
        html += '<div class="form-group">';
        html += '<label>Start Time</label>';
        html += '<input type="time" class="field-start" value="' + escapeAttr(eventData.startTime) + '">';
        html += '</div>';
        html += '<div class="form-group">';
        html += '<label>End Time</label>';
        html += '<input type="time" class="field-end" value="' + escapeAttr(eventData.endTime) + '">';
        html += '</div>';
        html += '</div>';

        html += '<div class="form-group">';
        html += '<label>Location</label>';
        html += '<input type="text" class="field-location" value="' + escapeAttr(eventData.location) + '" placeholder="e.g. 1517 Shattuck Ave, Berkeley">';
        html += '</div>';

        html += '<div class="form-group">';
        html += '<label>Notes</label>';
        html += '<textarea class="field-notes" rows="2" placeholder="Confirmation number, special instructions, etc.">' + escapeHTML(eventData.notes) + '</textarea>';
        html += '</div>';

        // Per-card add button
        html += '<button class="add-single-btn" data-index="' + index + '">Add to Google Calendar</button>';

        card.innerHTML = html;

        // Wire up per-card button
        var addBtn = card.querySelector('.add-single-btn');
        addBtn.addEventListener('click', function () {
            addSingleEvent(index);
        });

        // Wire up remove button
        var removeBtn = card.querySelector('.remove-event-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', function () {
                removeEventCard(index);
            });
        }

        return card;
    }

    // =========================================================
    // Actions
    // =========================================================

    function getCardData(cardEl) {
        return {
            name: cardEl.querySelector('.field-name').value.trim(),
            date: cardEl.querySelector('.field-date').value,
            endDate: cardEl.querySelector('.field-end-date').value,
            startTime: cardEl.querySelector('.field-start').value,
            endTime: cardEl.querySelector('.field-end').value,
            location: cardEl.querySelector('.field-location').value.trim(),
            notes: cardEl.querySelector('.field-notes').value.trim()
        };
    }

    function buildGoogleCalendarURL(data) {
        var dates = '';
        var endDateValue = data.endDate || data.date;

        if (data.date && data.startTime) {
            var startStr = data.date.replace(/-/g, '') + 'T' + data.startTime.replace(':', '') + '00';
            if (data.endTime) {
                var endStr = endDateValue.replace(/-/g, '') + 'T' + data.endTime.replace(':', '') + '00';
                dates = startStr + '/' + endStr;
            } else {
                var startDate = new Date(data.date + 'T' + data.startTime + ':00');
                var endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
                var endDateStr = endDate.getFullYear().toString() +
                    pad(endDate.getMonth() + 1) + pad(endDate.getDate()) + 'T' +
                    pad(endDate.getHours()) + pad(endDate.getMinutes()) + '00';
                dates = startStr + '/' + endDateStr;
            }
        } else if (data.date) {
            // All-day event: end date is exclusive in Google Calendar
            var d = new Date(data.date + 'T00:00:00');
            var endD;
            if (data.endDate) {
                // Multi-day: end date exclusive = endDate + 1 day
                endD = new Date(data.endDate + 'T00:00:00');
                endD = new Date(endD.getTime() + 24 * 60 * 60 * 1000);
            } else {
                endD = new Date(d.getTime() + 24 * 60 * 60 * 1000);
            }
            dates = data.date.replace(/-/g, '') + '/' +
                endD.getFullYear().toString() + pad(endD.getMonth() + 1) + pad(endD.getDate());
        }

        var params = new URLSearchParams();
        params.set('action', 'TEMPLATE');
        if (data.name) params.set('text', data.name);
        if (dates) params.set('dates', dates);
        if (data.location) params.set('location', data.location);
        if (data.notes) params.set('details', data.notes);

        return 'https://calendar.google.com/calendar/render?' + params.toString();
    }

    function addSingleEvent(index) {
        var entry = eventCards[index];
        if (entry.added) return;

        var data = getCardData(entry.element);
        var url = buildGoogleCalendarURL(data);
        window.open(url, '_blank');

        entry.added = true;
        entry.element.classList.add('added');
        var btn = entry.element.querySelector('.add-single-btn');
        btn.textContent = 'Added';

        // Check if all events are added
        checkAllAdded();
    }

    function addAllToCalendar() {
        var addedCount = 0;
        for (var i = 0; i < eventCards.length; i++) {
            if (!eventCards[i].added) {
                var data = getCardData(eventCards[i].element);
                var url = buildGoogleCalendarURL(data);
                window.open(url, '_blank');

                eventCards[i].added = true;
                eventCards[i].element.classList.add('added');
                var btn = eventCards[i].element.querySelector('.add-single-btn');
                btn.textContent = 'Added';
                addedCount++;
            }
        }

        if (addedCount === 0) {
            showNotification('All events have already been added');
            return;
        }

        showSuccess(addedCount);
    }

    function removeEventCard(index) {
        eventCards[index].element.remove();
        eventCards.splice(index, 1);

        // Re-index remaining cards
        for (var i = 0; i < eventCards.length; i++) {
            var numEl = eventCards[i].element.querySelector('.event-card-number');
            if (numEl) numEl.textContent = 'Event ' + (i + 1);
            eventCards[i].element.dataset.index = i;

            // Update button data-index attributes
            var addBtn = eventCards[i].element.querySelector('.add-single-btn');
            if (addBtn) addBtn.dataset.index = i;
            var rmBtn = eventCards[i].element.querySelector('.remove-event-btn');
            if (rmBtn) rmBtn.dataset.index = i;
        }

        // Update header count
        if (eventCards.length > 1) {
            reviewTitle.textContent = eventCards.length + ' Events Found';
            addAllBtnText.textContent = 'Add All ' + eventCards.length + ' to Google Calendar';
        } else if (eventCards.length === 1) {
            reviewTitle.textContent = 'Event Details';
            addAllBtnText.textContent = 'Add to Google Calendar';
            // Hide the event number/remove for single remaining card
            var numEl2 = eventCards[0].element.querySelector('.event-card-header');
            if (numEl2) numEl2.style.display = 'none';
        } else {
            // No events left — reset
            resetAll();
        }
    }

    function checkAllAdded() {
        var allDone = eventCards.every(function (e) { return e.added; });
        if (allDone) {
            showSuccess(eventCards.length);
        }
    }

    function showSuccess(count) {
        reviewSection.classList.remove('visible');
        actionSection.classList.remove('visible');
        successSection.classList.add('visible');
        glassCard.classList.add('success');

        if (count > 1) {
            successText.textContent = count + ' events added to Google Calendar!';
        } else {
            successText.textContent = 'Google Calendar opened!';
        }

        setTimeout(function () {
            glassCard.classList.remove('success');
        }, 600);
    }

    // --- Reset ---
    function resetAll() {
        if (screenshotObjectURL) {
            URL.revokeObjectURL(screenshotObjectURL);
            screenshotObjectURL = null;
        }

        fileInput.value = '';
        cameraInput.value = '';
        pasteTextarea.value = '';
        eventsList.innerHTML = '';
        eventCards = [];

        progressSection.classList.remove('visible');
        reviewSection.classList.remove('visible');
        actionSection.classList.remove('visible');
        successSection.classList.remove('visible');

        progressFill.style.width = '0%';
        progressText.textContent = 'Reading screenshot...';

        uploadSection.style.display = '';
        screenshotPreview.style.display = '';
    }

    // --- Helpers ---

    function pad(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    function formatDateISO(year, month, day) {
        return year + '-' + pad(month + 1) + '-' + pad(day);
    }

    function convertTo24Hour(timeStr, ampm) {
        var parts = timeStr.split(':');
        var hours = parseInt(parts[0], 10);
        var minutes = parts[1];

        if (ampm) {
            var isPM = ampm.toUpperCase() === 'PM';
            if (isPM && hours !== 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;
        }

        return pad(hours) + ':' + minutes;
    }

    function escapeAttr(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function showNotification(message) {
        var existing = document.querySelector('.toast');
        if (existing) existing.remove();

        var toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        toast.offsetHeight;
        toast.classList.add('visible');

        setTimeout(function () {
            toast.classList.remove('visible');
            setTimeout(function () {
                toast.remove();
            }, 300);
        }, 3000);
    }

    // --- Start ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
