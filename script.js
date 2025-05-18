// script.js

// Globals 
const calendarDays = document.getElementById('calendarDays');
const monthYear = document.getElementById('monthYear');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const selectedDateDisplay = document.getElementById('selectedDateDisplay');
const eventList = document.getElementById('eventList');
const addEventButton = document.getElementById('addEventButton');

const eventModal = document.getElementById('eventModal');
const eventForm = document.getElementById('eventForm');
const cancelButton = document.getElementById('cancelButton');
const modalTitle = document.getElementById('modalTitle');

// Date variables
let currentDate = new Date();
let selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

// Object to hold scheduled reminders timers by event id
let reminderTimers = {};

// Utility to zero-pad numbers <10
function zeroPad(num) {
  return num < 10 ? '0' + num : num;
}

// Format date as "YYYY-MM-DD"
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Format time as "HH:MM"
function formatTime(date) {
  return zeroPad(date.getHours()) + ':' + zeroPad(date.getMinutes());
}

// Load events from localStorage
function loadEvents() {
  const eventsStr = localStorage.getItem('calendarEvents');
  if (!eventsStr) return {};
  try {
    return JSON.parse(eventsStr);
  } catch {
    return {};
  }
}

// Save events to localStorage
function saveEvents(events) {
  localStorage.setItem('calendarEvents', JSON.stringify(events));
}

// Generate unique ID for an event
function generateId() {
  return 'e' + Date.now() + Math.floor(Math.random() * 1000);
}

// Get event list for a specific date (YYYY-MM-DD)
function getEventsForDate(events, dateStr) {
  return events[dateStr] || [];
}

// Render calendar for currentDate's month
function renderCalendar() {
  calendarDays.innerHTML = '';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  monthYear.textContent = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Start from first day of the month
  const firstDay = new Date(year, month, 1);
  const startingDay = firstDay.getDay(); // Sun=0 ... Sat=6
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Calculate number of days to display from previous month in calendar grid
  // Calendar grid: 7 columns * 6 rows = 42 days max for stable grid size
  const totalCells = 42;

  // Fill days from previous month
  for (let i = startingDay - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const div = createDayCell(new Date(year, month - 1, dayNum), true);
    calendarDays.appendChild(div);
  }

  // Fill days for current month
  for (let i = 1; i <= daysInMonth; i++) {
    const dayDate = new Date(year, month, i);
    const div = createDayCell(dayDate, false);
    calendarDays.appendChild(div);
  }

  // Fill days for next month to complete the grid
  const nextDays = totalCells - (startingDay + daysInMonth);
  for (let i = 1; i <= nextDays; i++) {
    const div = createDayCell(new Date(year, month + 1, i), true);
    calendarDays.appendChild(div);
  }
}

// Create individual day cell
function createDayCell(date, otherMonth = false) {
  const dateStr = formatDate(date);
  const div = document.createElement('div');
  div.classList.add('day');
  if (otherMonth) div.classList.add('other-month');

  // Highlight today
  const today = new Date();
  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate() &&
    !otherMonth
  ) {
    div.classList.add('today');
  }

  // Highlight selected date
  if (
    date.getFullYear() === selectedDate.getFullYear() &&
    date.getMonth() === selectedDate.getMonth() &&
    date.getDate() === selectedDate.getDate()
  ) {
    div.classList.add('selected');
  }

  const dayNumber = document.createElement('div');
  dayNumber.classList.add('day-number');
  dayNumber.textContent = date.getDate();
  div.appendChild(dayNumber);

  // Show event indicator if there are events on that date
  const events = getEventsForDate(loadEvents(), dateStr);
  if (events.length > 0 && !otherMonth) {
    const indicator = document.createElement('div');
    indicator.classList.add('event-indicator');
    div.appendChild(indicator);
  }

  if (!otherMonth) {
    div.tabIndex = 0; // make day cells focusable
    div.setAttribute('role', 'button');
    div.setAttribute('aria-pressed', div.classList.contains('selected') ? 'true' : 'false');
    div.setAttribute('aria-label', `Select ${date.toDateString()}`);

    div.addEventListener('click', () => {
      selectedDate = date;
      renderCalendar();
      renderSelectedDateEvents();
    });
    div.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        div.click();
      }
    });
  }

  return div;
}

// Render events list for the selected date
function renderSelectedDateEvents() {
  const dateStr = formatDate(selectedDate);
  selectedDateDisplay.textContent = selectedDate.toDateString();

  const events = getEventsForDate(loadEvents(), dateStr);
  eventList.innerHTML = '';

  if (events.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No events';
    li.style.fontStyle = 'italic';
    li.style.color = '#999';
    eventList.appendChild(li);
    return;
  }

  // Sort events by time ascending
  events.sort((a, b) => a.time.localeCompare(b.time));

  for (const event of events) {
    const li = document.createElement('li');

    const eventTimeSpan = document.createElement('span');
    eventTimeSpan.classList.add('time');
    eventTimeSpan.textContent = event.time;

    const eventTitleSpan = document.createElement('span');
    eventTitleSpan.textContent = event.title;

    li.appendChild(eventTimeSpan);
    li.appendChild(eventTitleSpan);

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.classList.add('event-delete-btn');
    delBtn.title = 'Delete event';
    delBtn.innerHTML = '&times;';
    delBtn.addEventListener('click', e => {
      e.stopPropagation();
      deleteEvent(dateStr, event.id);
    });

    li.appendChild(delBtn);
    eventList.appendChild(li);
  }
}

// Delete an event by id for a date
function deleteEvent(dateStr, id) {
  const events = loadEvents();
  if (!(dateStr in events)) return;
  events[dateStr] = events[dateStr].filter(ev => ev.id !== id);
  if (events[dateStr].length === 0) {
    delete events[dateStr];
  }
  saveEvents(events);
  cancelReminder(id);
  renderCalendar();
  renderSelectedDateEvents();
}

// Open event modal with default values
function openModal() {
  eventForm.reset();
  modalTitle.textContent = 'Add Event';

  eventDate.value = formatDate(selectedDate);
  eventTime.value = '12:00';
  eventReminder.value = '0';

  eventModal.classList.add('show');
  eventModal.setAttribute('aria-hidden', 'false');
  eventTitle.focus();
}

// Close modal function
function closeModal() {
  eventModal.classList.remove('show');
  eventModal.setAttribute('aria-hidden', 'true');
  addEventButton.focus();
}

// Schedule reminders on page load and after event add/delete
function scheduleAllReminders() {
  // Clear existing timers
  for (const id in reminderTimers) {
    clearTimeout(reminderTimers[id]);
  }
  reminderTimers = {};

  const events = loadEvents();

  const now = new Date();

  for (const dateStr in events) {
    for (const ev of events[dateStr]) {
      if (ev.reminder > 0) {
        const eventDateTime = new Date(`${dateStr}T${ev.time}:00`);
        const reminderTime = new Date(eventDateTime.getTime() - ev.reminder * 60000);
        if (reminderTime > now) {
          const timeout = reminderTime.getTime() - now.getTime();
          const id = ev.id;
          reminderTimers[id] = setTimeout(() => {
            alert(`Reminder: "${ev.title}" at ${ev.time} on ${dateStr}`);
            delete reminderTimers[id];
          }, timeout);
        }
      }
    }
  }
}

// Cancel reminder by id
function cancelReminder(id) {
  if (id in reminderTimers) {
    clearTimeout(reminderTimers[id]);
    delete reminderTimers[id];
  }
}

// Handle form submission to save event
eventForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const title = eventTitle.value.trim();
  const date = eventDate.value;
  const time = eventTime.value;
  const reminder = parseInt(eventReminder.value, 10);

  if (!title || !date || !time) {
    alert('Please fill all required fields.');
    return;
  }

  const events = loadEvents();
  if (!(date in events)) {
    events[date] = [];
  }

  const newEvent = {
    id: generateId(),
    title,
    time,
    reminder,
  };

  events[date].push(newEvent);
  saveEvents(events);

  if (
    formatDate(selectedDate) === date
  ) {
    renderSelectedDateEvents();
  }

  renderCalendar();
  scheduleAllReminders();

  closeModal();
});

// Cancel modal button handler
cancelButton.addEventListener('click', closeModal);

// Open modal button
addEventButton.addEventListener('click', openModal);

// Keyboard accessibility to close modal on Escape key
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && eventModal.classList.contains('show')) {
    closeModal();
  }
});

// Variables for modal inputs for convenience
const eventTitle = document.getElementById('eventTitle');
const eventDate = document.getElementById('eventDate');
const eventTime = document.getElementById('eventTime');
const eventReminder = document.getElementById('eventReminder');

// Previous & Next month navigation buttons
prevMonthBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  // Adjust selectedDate to same month as currentDate or reset to first day of month
  selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDate.getDate());
  // Correct overflows for shorter months
  if (selectedDate.getMonth() !== currentDate.getMonth()) {
    selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  }
  renderCalendar();
  renderSelectedDateEvents();
});

nextMonthBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDate.getDate());
  if (selectedDate.getMonth() !== currentDate.getMonth()) {
    selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  }
  renderCalendar();
  renderSelectedDateEvents();
});

// Initial render on page load
window.addEventListener('load', () => {
  renderCalendar();
  renderSelectedDateEvents();
  scheduleAllReminders();
});
