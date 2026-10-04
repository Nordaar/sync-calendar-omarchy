const test = require("node:test");
const assert = require("node:assert/strict");
const Model = require("../Model.js");

test("Model.stepDate forward and backward", () => {
  assert.deepEqual(Model.stepDate("2026-09-16", 1), {
    dateKey: "2026-09-17",
    year: 2026,
    month: 8,
    day: 17
  });

  assert.deepEqual(Model.stepDate("2026-09-16", -1), {
    dateKey: "2026-09-15",
    year: 2026,
    month: 8,
    day: 15
  });

  assert.deepEqual(Model.stepDate("2026-09-16", 7), {
    dateKey: "2026-09-23",
    year: 2026,
    month: 8,
    day: 23
  });

  assert.deepEqual(Model.stepDate("2026-09-16", -7), {
    dateKey: "2026-09-09",
    year: 2026,
    month: 8,
    day: 9
  });
});

test("Model.stepDate across month and year boundaries", () => {
  // Cross into previous month
  assert.deepEqual(Model.stepDate("2026-09-01", -1), {
    dateKey: "2026-08-31",
    year: 2026,
    month: 7,
    day: 31
  });

  // Cross into next month
  assert.deepEqual(Model.stepDate("2026-09-30", 1), {
    dateKey: "2026-10-01",
    year: 2026,
    month: 9,
    day: 1
  });

  // Cross into previous year
  assert.deepEqual(Model.stepDate("2026-01-01", -1), {
    dateKey: "2025-12-31",
    year: 2025,
    month: 11,
    day: 31
  });

  // Cross into next year
  assert.deepEqual(Model.stepDate("2025-12-31", 1), {
    dateKey: "2026-01-01",
    year: 2026,
    month: 0,
    day: 1
  });

  // Leap year 2024 Feb 29
  assert.deepEqual(Model.stepDate("2024-03-01", -1), {
    dateKey: "2024-02-29",
    year: 2024,
    month: 1,
    day: 29
  });

  // Non-leap year 2025 Feb 28
  assert.deepEqual(Model.stepDate("2025-03-01", -1), {
    dateKey: "2025-02-28",
    year: 2025,
    month: 1,
    day: 28
  });
});

test("Model.stepToMonthBound", () => {
  assert.deepEqual(Model.stepToMonthBound("2026-09-16", "start"), {
    dateKey: "2026-09-01",
    year: 2026,
    month: 8,
    day: 1
  });

  assert.deepEqual(Model.stepToMonthBound("2026-09-16", "end"), {
    dateKey: "2026-09-30",
    year: 2026,
    month: 8,
    day: 30
  });

  assert.deepEqual(Model.stepToMonthBound("2024-02-10", "end"), {
    dateKey: "2024-02-29",
    year: 2024,
    month: 1,
    day: 29
  });
});

test("Model.stepToWeekBound", () => {
  // 2026-09-16 is a Wednesday (day 3)
  // Monday-start week: Monday is 2026-09-14, Sunday is 2026-09-20
  assert.deepEqual(Model.stepToWeekBound("2026-09-16", "start", 1), {
    dateKey: "2026-09-14",
    year: 2026,
    month: 8,
    day: 14
  });

  assert.deepEqual(Model.stepToWeekBound("2026-09-16", "end", 1), {
    dateKey: "2026-09-20",
    year: 2026,
    month: 8,
    day: 20
  });

  // Sunday-start week: Sunday is 2026-09-13, Saturday is 2026-09-19
  assert.deepEqual(Model.stepToWeekBound("2026-09-16", "start", 0), {
    dateKey: "2026-09-13",
    year: 2026,
    month: 8,
    day: 13
  });

  assert.deepEqual(Model.stepToWeekBound("2026-09-16", "end", 0), {
    dateKey: "2026-09-19",
    year: 2026,
    month: 8,
    day: 19
  });
});

function makeEvent(calendar, date, startTime, endTime, title, allDay = false) {
  return {
    id: "evt_" + Math.random().toString(36).slice(2),
    title: title || "Event",
    calendar: calendar,
    calendarId: "",
    calendarType: "ical",
    writable: false,
    description: "",
    color: "#4A90E2",
    allDay: allDay,
    startTime: allDay ? "All Day" : startTime,
    endTime: allDay ? "" : endTime,
    location: "",
    startIso: date + "T" + (allDay ? "00:00:00" : startTime + ":00"),
    meetingUrl: "",
    meetingProvider: ""
  };
}

function makeDay(eventsByCalendar, date, startTime, endTime, title) {
  const events = [];
  for (const calendar of Object.keys(eventsByCalendar)) {
    for (const evt of eventsByCalendar[calendar]) {
      events.push(makeEvent(calendar, date, evt.startTime || startTime, evt.endTime || endTime, evt.title || title));
    }
  }
  return events;
}

test("Model.nextUpcomingEvent returns the earliest future event", () => {
  const now = new Date("2026-10-04T12:00:00");
  const eventsByDate = {
    "2026-10-04": [
      makeEvent("Work", "2026-10-04", "14:00", "15:00", "Afternoon meeting"),
      makeEvent("Work", "2026-10-04", "13:00", "14:00", "Lunch sync")
    ]
  };

  const evt = Model.nextUpcomingEvent(eventsByDate, now, 1, ["Work"]);
  assert.equal(evt.title, "Lunch sync");
});

test("Model.nextUpcomingEvent includes events already in progress", () => {
  const now = new Date("2026-10-04T12:00:00");
  const eventsByDate = {
    "2026-10-04": [
      makeEvent("Work", "2026-10-04", "11:00", "13:00", "Ongoing standup"),
      makeEvent("Work", "2026-10-04", "15:00", "16:00", "Late meeting")
    ]
  };

  const evt = Model.nextUpcomingEvent(eventsByDate, now, 1, ["Work"]);
  assert.equal(evt.title, "Ongoing standup");
});

test("Model.nextUpcomingEvent skips all-day events", () => {
  const now = new Date("2026-10-04T12:00:00");
  const eventsByDate = {
    "2026-10-04": [
      makeEvent("Personal", "2026-10-04", "", "", "Holiday", true),
      makeEvent("Work", "2026-10-04", "13:00", "14:00", "Lunch sync")
    ]
  };

  const evt = Model.nextUpcomingEvent(eventsByDate, now, 1, ["Personal", "Work"]);
  assert.equal(evt.title, "Lunch sync");
});

test("Model.nextUpcomingEvent respects calendar allowlist", () => {
  const now = new Date("2026-10-04T12:00:00");
  const eventsByDate = {
    "2026-10-04": [
      makeEvent("Personal", "2026-10-04", "13:00", "14:00", "Gym"),
      makeEvent("Work", "2026-10-04", "14:00", "15:00", "Meeting")
    ]
  };

  const evt = Model.nextUpcomingEvent(eventsByDate, now, 1, ["Work"]);
  assert.equal(evt.title, "Meeting");
});

test("Model.nextUpcomingEvent returns null for empty allowlist", () => {
  const now = new Date("2026-10-04T12:00:00");
  const eventsByDate = {
    "2026-10-04": [makeEvent("Work", "2026-10-04", "13:00", "14:00", "Meeting")]
  };

  assert.equal(Model.nextUpcomingEvent(eventsByDate, now, 1, []), null);
  assert.equal(Model.nextUpcomingEvent(eventsByDate, now, 1, null), null);
});

test("Model.nextUpcomingEvent applies horizonDays", () => {
  const now = new Date("2026-10-04T12:00:00");
  const eventsByDate = {
    "2026-10-04": [makeEvent("Work", "2026-10-04", "10:00", "11:00", "Past today")],
    "2026-10-05": [makeEvent("Work", "2026-10-05", "09:00", "10:00", "Tomorrow")],
    "2026-10-06": [makeEvent("Work", "2026-10-06", "09:00", "10:00", "Day after")]
  };

  assert.equal(Model.nextUpcomingEvent(eventsByDate, now, 1, ["Work"]), null);
  assert.equal(Model.nextUpcomingEvent(eventsByDate, now, 2, ["Work"]).title, "Tomorrow");
  assert.equal(Model.nextUpcomingEvent(eventsByDate, now, 3, ["Work"]).title, "Tomorrow");
});

test("Model.nextUpcomingEvent skips events that have already ended", () => {
  const now = new Date("2026-10-04T12:00:00");
  const eventsByDate = {
    "2026-10-04": [makeEvent("Work", "2026-10-04", "10:00", "11:00", "Finished")]
  };

  assert.equal(Model.nextUpcomingEvent(eventsByDate, now, 1, ["Work"]), null);
});

test("Model.nextUpcomingEvent defaults to a one-hour end when endTime is missing", () => {
  const now = new Date("2026-10-04T12:00:00");
  const eventsByDate = {
    "2026-10-04": [{
      id: "evt",
      title: "No end",
      calendar: "Work",
      startIso: "2026-10-04T11:30:00",
      endTime: "",
      allDay: false
    }]
  };

  const evt = Model.nextUpcomingEvent(eventsByDate, now, 1, ["Work"]);
  assert.equal(evt.title, "No end");
});

test("Model.formatEventCountdown rounds at the documented edges", () => {
  const now = new Date("2026-10-04T12:00:00").getTime();

  assert.equal(Model.formatEventCountdown(now + 0 * 60000, now), "now");
  assert.equal(Model.formatEventCountdown(now + 1 * 60000, now), "in 1m");
  assert.equal(Model.formatEventCountdown(now + 44 * 60000, now), "in 44m");
  assert.equal(Model.formatEventCountdown(now + 45 * 60000, now), "in 1h");
  assert.equal(Model.formatEventCountdown(now + 60 * 60000, now), "in 1h");
  assert.equal(Model.formatEventCountdown(now + 120 * 60000, now), "in 2h");
  assert.equal(Model.formatEventCountdown(now + 1410 * 60000, now), "in 1d");
  assert.equal(Model.formatEventCountdown(now + (24 * 60 + 18 * 60) * 60000, now), "in 2d");
  assert.equal(Model.formatEventCountdown(now + (6 * 24 * 60 + 8 * 60) * 60000, now), "in 6d");
});
