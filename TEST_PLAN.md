# Atlas - Comprehensive Test Plan

## Test Scope

This document outlines manual and automated tests for Atlas v1.0.

## Prerequisites for Testing

1. Backend running on `http://localhost:8000`
2. Frontend running on `http://localhost:3000`
3. MongoDB connected and operational
4. Sample test data will be created during testing

## Test Categories

### Category 1: Navigation & UI

#### Test 1.1: Sidebar Navigation (Desktop)
- **Steps:**
  1. Load the app on desktop browser
  2. Verify sidebar is visible on the left
  3. Click each nav item: Dashboard, Bills, Subscriptions, Tasks, Renewals, Documents, Calendar, Settings
  4. Verify URL changes correctly
  5. Verify active nav item is highlighted
- **Expected:** All pages load, navigation works smoothly
- **Status:** ⬜ To Test

#### Test 1.2: Mobile Navigation
- **Steps:**
  1. Resize browser to mobile size (375px width)
  2. Verify hamburger menu is visible
  3. Click hamburger to open mobile nav
  4. Click each nav item
  5. Verify pages load and menu closes
- **Expected:** Mobile nav drawer opens/closes, all pages accessible
- **Status:** ⬜ To Test

#### Test 1.3: AI Assistant Button
- **Steps:**
  1. Click "Ask Atlas" button (sidebar or mobile)
  2. Verify AI drawer opens from the right
  3. Click close button
  4. Verify drawer closes
- **Expected:** Drawer animation smooth, opens/closes properly
- **Status:** ⬜ To Test

#### Test 1.4: Responsive Design
- **Steps:**
  1. Test on mobile (375px), tablet (768px), desktop (1920px)
  2. Verify layout adapts properly
  3. Verify text remains readable
  4. Verify buttons are clickable
- **Expected:** App looks good at all breakpoints
- **Status:** ⬜ To Test

### Category 2: Dashboard

#### Test 2.1: Dashboard Loads
- **Steps:**
  1. Navigate to Dashboard
  2. Verify page header: "Your life, calmly organized."
  3. Verify stats tiles appear
- **Expected:** Dashboard loads without errors
- **Status:** ⬜ To Test

#### Test 2.2: Dashboard Stats Calculation
- **Steps:**
  1. Add 3 bills (2 paid, 1 unpaid)
  2. Return to Dashboard
  3. Verify "Active bills" stat shows 1
  4. Add 2 subscriptions
  5. Verify "Subscriptions" stat shows 2
- **Expected:** Stats update in real-time
- **Status:** ⬜ To Test

#### Test 2.3: Overdue & Due Soon Section
- **Steps:**
  1. Add bill due yesterday with status unpaid
  2. Return to Dashboard
  3. Verify it appears in "Overdue & due soon"
  4. Verify it has "Overdue" badge
- **Expected:** Overdue items are highlighted
- **Status:** ⬜ To Test

### Category 3: Bills Page

#### Test 3.1: Add Bill
- **Steps:**
  1. Navigate to Bills
  2. Click "Add bill"
  3. Fill in:
     - Name: "Electricity"
     - Amount: "120.50"
     - Currency: "USD"
     - Due date: Pick date 7 days from today
     - Category: "utilities"
  4. Click "Add bill"
- **Expected:** Bill created, appears in list, toast says "Bill added"
- **Status:** ⬜ To Test

#### Test 3.2: Edit Bill
- **Steps:**
  1. Click pencil icon on any bill
  2. Change amount to "150.00"
  3. Click "Save changes"
- **Expected:** Bill updated, toast says "Bill updated"
- **Status:** ⬜ To Test

#### Test 3.3: Mark Bill Paid
- **Steps:**
  1. Click circle icon on an unpaid bill
  2. Verify status changes to "Paid"
  3. Click circle icon again
  4. Verify status changes back to "Upcoming"
- **Expected:** Toggle works smoothly, status badge updates
- **Status:** ⬜ To Test

#### Test 3.4: Delete Bill
- **Steps:**
  1. Click trash icon on any bill
  2. Confirm delete dialog
  3. Verify bill disappears from list
- **Expected:** Bill deleted, toast says "Deleted"
- **Status:** ⬜ To Test

#### Test 3.5: Recurring Bills
- **Steps:**
  1. Click "Add bill"
  2. Toggle "Recurring" on
  3. Select frequency: "Monthly"
  4. Fill other fields
  5. Save
- **Expected:** Bill saves with frequency field
- **Status:** ⬜ To Test

#### Test 3.6: Bill Table Sorting
- **Steps:**
  1. Add 3 bills with different due dates
  2. Verify they're sorted by due date (earliest first)
- **Expected:** Bills are in chronological order
- **Status:** ⬜ To Test

### Category 4: Subscriptions Page

#### Test 4.1: Add Subscription
- **Steps:**
  1. Navigate to Subscriptions
  2. Click "Add subscription"
  3. Fill in:
     - Name: "Netflix"
     - Amount: "15.99"
     - Next renewal: 30 days from today
     - Frequency: "Monthly"
     - Category: "entertainment"
  4. Save
- **Expected:** Subscription created, "Monthly" tag shows in renewal date row
- **Status:** ⬜ To Test

#### Test 4.2: Monthly Cost Calculation
- **Steps:**
  1. Add 3 subscriptions:
     - Netflix: $15.99 monthly
     - Spotify: $9.99 monthly
     - Hulu: $12.00 yearly
  2. Verify total monthly shows ~$25.99 (Hulu = $1/month)
- **Expected:** Monthly calculation is accurate
- **Status:** ⬜ To Test

#### Test 4.3: Toggle Active/Inactive
- **Steps:**
  1. Click power icon on any subscription
  2. Verify it grays out and status changes
  3. Click again
  4. Verify it's active again
- **Expected:** Status toggles, subscription appears/disappears from cost calculation
- **Status:** ⬜ To Test

#### Test 4.4: Delete Subscription
- **Steps:**
  1. Click trash icon on any subscription
  2. Confirm delete
  3. Verify monthly cost updates
- **Expected:** Subscription deleted, totals recalculate
- **Status:** ⬜ To Test

### Category 5: Tasks Page

#### Test 5.1: Add Task
- **Steps:**
  1. Navigate to Tasks
  2. Click "Add task"
  3. Fill in:
     - Title: "Renew passport"
     - Description: "Book appointment at local office"
     - Due date: 14 days from today
     - Priority: "High"
  4. Save
- **Expected:** Task appears in list with high priority badge
- **Status:** ⬜ To Test

#### Test 5.2: Task Filtering
- **Steps:**
  1. Add 3 tasks: 2 completed, 1 active
  2. Select "Active" filter
  3. Verify only 1 task shows
  4. Select "Done" filter
  5. Verify 2 tasks show
  6. Select "All" filter
  7. Verify all 3 show
- **Expected:** Filtering works correctly
- **Status:** ⬜ To Test

#### Test 5.3: Toggle Task Complete
- **Steps:**
  1. Click circle icon on any task
  2. Verify task gets checkmark icon
  3. Task should move to "Done" category
- **Expected:** Task marked complete, icon changes
- **Status:** ⬜ To Test

#### Test 5.4: Delete Task
- **Steps:**
  1. Click trash icon on any task
  2. Confirm delete
  3. Task disappears
- **Expected:** Task deleted successfully
- **Status:** ⬜ To Test

### Category 6: Renewals Page

#### Test 6.1: Add Renewal
- **Steps:**
  1. Navigate to Renewals
  2. Click "Add renewal"
  3. Fill in:
     - Name: "Auto Insurance"
     - Type: "insurance"
     - Renewal date: 60 days from today
     - Amount: "1200"
     - Auto-renew: toggle on
  4. Save
- **Expected:** Renewal created with all fields saved
- **Status:** ⬜ To Test

#### Test 6.2: Toggle Complete
- **Steps:**
  1. Click circle icon on any renewal
  2. Verify it gets checkmark
  3. Click again
  4. Verify checkmark is removed
- **Expected:** Toggle works smoothly
- **Status:** ⬜ To Test

#### Test 6.3: Edit Renewal
- **Steps:**
  1. Click pencil on any renewal
  2. Change the amount
  3. Save
- **Expected:** Changes persist
- **Status:** ⬜ To Test

### Category 7: Documents Page

#### Test 7.1: Upload Document
- **Steps:**
  1. Navigate to Documents
  2. Click "Upload"
  3. Select a PDF or image file
  4. Category: "receipt"
  5. Notes: "Gas station receipt"
  6. Click upload
- **Expected:** File uploads, appears in list with metadata
- **Status:** ⬜ To Test

#### Test 7.2: Download Document
- **Steps:**
  1. Click download icon on any document
  2. Verify file downloads with correct name
- **Expected:** File downloads to computer
- **Status:** ⬜ To Test

#### Test 7.3: Delete Document
- **Steps:**
  1. Click trash icon on any document
  2. Confirm delete
  3. Document disappears
- **Expected:** Document deleted
- **Status:** ⬜ To Test

#### Test 7.4: Category Filter
- **Steps:**
  1. Upload 3 documents with different categories
  2. Verify they appear grouped or can be filtered
- **Expected:** Documents organized by category
- **Status:** ⬜ To Test

### Category 8: Calendar Page

#### Test 8.1: Calendar Loads
- **Steps:**
  1. Navigate to Calendar
  2. Verify header: "The next 90 days"
  3. Verify days are listed in chronological order
- **Expected:** Calendar displays upcoming events
- **Status:** ⬜ To Test

#### Test 8.2: Calendar Shows All Event Types
- **Steps:**
  1. Ensure you have: bills, subscriptions, tasks, renewals with due dates
  2. Go to Calendar
  3. Verify all 4 types appear with correct icons
- **Expected:** All event types visible, icons correct
- **Status:** ⬜ To Test

#### Test 8.3: Event Status Badges
- **Steps:**
  1. Mark one bill as "Paid" 
  2. Leave another as unpaid
  3. Go to Calendar
  4. Verify paid bill shows "Paid" badge
  5. Unpaid shows "Upcoming" or "Overdue"
- **Expected:** Badges reflect event status
- **Status:** ⬜ To Test

#### Test 8.4: Overdue Indicator
- **Steps:**
  1. Add item with due date in the past
  2. Go to Calendar
  3. Verify past events are marked "past" in date section
- **Expected:** Overdue items clearly marked
- **Status:** ⬜ To Test

### Category 9: Settings Page

#### Test 9.1: Settings Page Loads
- **Steps:**
  1. Navigate to Settings
  2. Verify page title: "Connections"
  3. Verify Gmail section appears
- **Expected:** Settings page renders
- **Status:** ⬜ To Test

#### Test 9.2: Gmail Status Display
- **Steps:**
  1. Go to Settings
  2. Verify Gmail status shows "Not configured" or "Connected"
  3. If not configured, see setup instructions
- **Expected:** Gmail status displays correctly
- **Status:** ⬜ To Test

#### Test 9.3: Gmail Connection (Optional - requires credentials)
- **Prerequisites:** Google OAuth credentials configured
- **Steps:**
  1. Click "Connect Gmail"
  2. Login with Google account
  3. Authorize Atlas app
  4. Verify redirect back to Settings with "Connected" status
- **Expected:** Gmail connection successful
- **Status:** ⬜ To Test

#### Test 9.4: Gmail Scan (Optional)
- **Prerequisites:** Gmail connected
- **Steps:**
  1. Click "Scan emails"
  2. Wait for scan to complete
  3. Verify toast shows "Scanned X emails · imported Y"
  4. Go to Bills/Subscriptions
  5. Verify Gmail-imported items appear with "from Gmail" tag
- **Expected:** Emails scanned, bills/subscriptions imported
- **Status:** ⬜ To Test

### Category 10: AI Assistant

#### Test 10.1: AI Drawer Opens
- **Steps:**
  1. Click "Ask Atlas" button
  2. Verify drawer slides in from right
  3. Verify text input and suggestions appear
- **Expected:** Drawer opens with chat interface
- **Status:** ⬜ To Test

#### Test 10.2: Send Message
- **Prerequisites:** EMERGENT_LLM_KEY configured
- **Steps:**
  1. Type: "What's due this week?"
  2. Click send or press Enter
  3. Wait for response
  4. Verify response appears in chat
- **Expected:** Message sent, AI responds
- **Status:** ⬜ To Test

#### Test 10.3: Chat Suggestions
- **Steps:**
  1. Open AI drawer
  2. Verify 3 suggestions appear
  3. Click one suggestion
  4. Verify it fills the input box
- **Expected:** Suggestions populate input
- **Status:** ⬜ To Test

#### Test 10.4: Chat History
- **Steps:**
  1. Send 3 messages to Atlas
  2. Close drawer
  3. Click "Ask Atlas" again
  4. Verify previous messages are still there
- **Expected:** Chat history persists
- **Status:** ⬜ To Test

#### Test 10.5: Clear Chat
- **Steps:**
  1. Open AI drawer with chat history
  2. Click trash icon
  3. Verify chat clears
- **Expected:** Chat history cleared
- **Status:** ⬜ To Test

### Category 11: Data Validation

#### Test 11.1: Required Fields
- **Steps:**
  1. Try to add bill without name
  2. Verify error message
  3. Try without due date
  4. Verify error message
- **Expected:** Validation prevents incomplete entries
- **Status:** ⬜ To Test

#### Test 11.2: Number Validation
- **Steps:**
  1. Try to enter "abc" in amount field
  2. Verify only numbers accepted
- **Expected:** Input validation works
- **Status:** ⬜ To Test

#### Test 11.3: Date Validation
- **Steps:**
  1. Try to set date in past for future event (if applicable)
  2. Verify app handles it gracefully
- **Expected:** Invalid dates handled
- **Status:** ⬜ To Test

### Category 12: Error Handling

#### Test 12.1: API Error Handling
- **Steps:**
  1. Stop backend server
  2. Try to perform any action
  3. Verify error toast appears
  4. Verify UI doesn't crash
- **Expected:** Graceful error handling, user feedback provided
- **Status:** ⬜ To Test

#### Test 12.2: Empty State Handling
- **Steps:**
  1. Delete all bills
  2. Verify "No bills yet" empty state appears
  3. Same for subscriptions, tasks, etc.
- **Expected:** Empty states render correctly
- **Status:** ⬜ To Test

#### Test 12.3: Long Content Handling
- **Steps:**
  1. Add bill with 500-character notes
  2. Verify it displays correctly
  3. Verify truncation works where needed
- **Expected:** Long content handled gracefully
- **Status:** ⬜ To Test

### Category 13: Performance

#### Test 13.1: List Performance
- **Steps:**
  1. Add 50 bills
  2. Verify list scrolls smoothly
  3. Filtering works quickly
- **Expected:** No lag, smooth scrolling
- **Status:** ⬜ To Test

#### Test 13.2: Dashboard Load Time
- **Steps:**
  1. With 50+ items in database
  2. Load Dashboard
  3. Verify loads within 2 seconds
- **Expected:** Dashboard responsive
- **Status:** ⬜ To Test

#### Test 13.3: Search/Filter Speed
- **Steps:**
  1. Filter large lists
  2. Verify instant response
- **Expected:** Filtering is instantaneous
- **Status:** ⬜ To Test

### Category 14: Cross-Browser Testing

#### Test 14.1: Chrome
- **Steps:** Run all core tests in Chrome
- **Expected:** All tests pass
- **Status:** ⬜ To Test

#### Test 14.2: Firefox
- **Steps:** Run all core tests in Firefox
- **Expected:** All tests pass
- **Status:** ⬜ To Test

#### Test 14.3: Safari
- **Steps:** Run all core tests in Safari
- **Expected:** All tests pass
- **Status:** ⬜ To Test

#### Test 14.4: Edge
- **Steps:** Run all core tests in Edge
- **Expected:** All tests pass
- **Status:** ⬜ To Test

## Test Execution Summary

### Quick Test (15 minutes)
1. Navigation: 1.1, 1.2, 1.3
2. Bills: 3.1, 3.2, 3.3, 3.4
3. Dashboard: 2.1
4. AI: 10.1

### Full Test (2 hours)
Run all tests in categories 1-12

### Regression Test
Run categories 1, 3, 5, 6, 10 after changes

## Known Limitations

- Single-user only (by design for MVP)
- No user authentication
- No offline support
- Gmail integration optional
- Requires modern browser (Chrome 90+, Firefox 88+, Safari 14+)

## Reporting

Use this format for test results:
```
Test ID: 1.1
Title: Sidebar Navigation (Desktop)
Status: ✅ PASS | ❌ FAIL | ⚠️ PARTIAL
Notes: [Any issues or observations]
```

---

**Test Plan Version:** 1.0
**Last Updated:** May 7, 2026
**Status:** Ready for Execution
