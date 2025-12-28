/**
 * Date Utilities Tests
 * 
 * Tests for date formatting and manipulation utilities.
 * Ensures date handling is consistent and correct across the app.
 */

import {
  getWeekStart,
  getWeekDays,
  formatDateLong,
  formatDateShort,
  formatTime,
  isToday,
  getNextDay,
  getPreviousDay,
} from "../utils/dateUtils";

describe("dateUtils", () => {
  describe("getWeekStart", () => {
    it("should return Sunday for a Sunday date", () => {
      const sunday = new Date(2024, 0, 7); // January 7, 2024 is a Sunday
      const weekStart = getWeekStart(sunday);
      expect(weekStart.getDay()).toBe(0); // 0 = Sunday
      expect(weekStart.toDateString()).toBe(sunday.toDateString());
    });

    it("should return the previous Sunday for a Monday", () => {
      const monday = new Date(2024, 0, 8); // January 8, 2024 is a Monday
      const weekStart = getWeekStart(monday);
      expect(weekStart.getDay()).toBe(0); // Should be Sunday
      expect(weekStart.getDate()).toBe(7); // Should be January 7
    });

    it("should reset time to start of day", () => {
      const date = new Date(2024, 0, 10, 15, 30, 45); // 3:30:45 PM
      const weekStart = getWeekStart(date);
      expect(weekStart.getHours()).toBe(0);
      expect(weekStart.getMinutes()).toBe(0);
      expect(weekStart.getSeconds()).toBe(0);
    });
  });

  describe("getWeekDays", () => {
    it("should return 7 days starting from Sunday", () => {
      const sunday = new Date(2024, 0, 7);
      const weekDays = getWeekDays(sunday);
      
      expect(weekDays).toHaveLength(7);
      expect(weekDays[0].getDay()).toBe(0); // Sunday
      expect(weekDays[6].getDay()).toBe(6); // Saturday
    });

    it("should return consecutive days", () => {
      const sunday = new Date(2024, 0, 7);
      const weekDays = getWeekDays(sunday);
      
      for (let i = 1; i < weekDays.length; i++) {
        const prevDay = weekDays[i - 1].getDate();
        const currentDay = weekDays[i].getDate();
        expect(currentDay).toBe(prevDay + 1);
      }
    });
  });

  describe("formatDateLong", () => {
    it("should format date with weekday and full date string", () => {
      const date = new Date(2024, 0, 15); // January 15, 2024 (Monday)
      const formatted = formatDateLong(date);
      
      expect(formatted.weekday).toBe("Monday");
      expect(formatted.dateStr).toContain("January");
      expect(formatted.dateStr).toContain("15th");
      expect(formatted.dateStr).toContain("2024");
    });

    it("should use correct ordinal suffixes", () => {
      const testCases = [
        { date: new Date(2024, 0, 1), expected: "1st" },
        { date: new Date(2024, 0, 2), expected: "2nd" },
        { date: new Date(2024, 0, 3), expected: "3rd" },
        { date: new Date(2024, 0, 4), expected: "4th" },
        { date: new Date(2024, 0, 21), expected: "21st" },
        { date: new Date(2024, 0, 22), expected: "22nd" },
        { date: new Date(2024, 0, 23), expected: "23rd" },
      ];

      testCases.forEach(({ date, expected }) => {
        const formatted = formatDateLong(date);
        expect(formatted.dateStr).toContain(expected);
      });
    });
  });

  describe("formatDateShort", () => {
    it("should format date as 'day Month'", () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      const formatted = formatDateShort(date);
      
      expect(formatted).toBe("15 January");
    });
  });

  describe("formatTime", () => {
    it("should format time in 12-hour format with AM/PM", () => {
      const morning = new Date(2024, 0, 15, 9, 30); // 9:30 AM
      const afternoon = new Date(2024, 0, 15, 15, 45); // 3:45 PM
      const midnight = new Date(2024, 0, 15, 0, 0); // 12:00 AM
      const noon = new Date(2024, 0, 15, 12, 0); // 12:00 PM
      
      expect(formatTime(morning)).toBe("9:30 AM");
      expect(formatTime(afternoon)).toBe("3:45 PM");
      expect(formatTime(midnight)).toBe("12:00 AM");
      expect(formatTime(noon)).toBe("12:00 PM");
    });

    it("should pad minutes with leading zero", () => {
      const date = new Date(2024, 0, 15, 10, 5); // 10:05 AM
      const formatted = formatTime(date);
      
      expect(formatted).toBe("10:05 AM");
    });
  });

  describe("isToday", () => {
    it("should return true for today's date", () => {
      const today = new Date();
      expect(isToday(today)).toBe(true);
    });

    it("should return false for yesterday", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });

    it("should return false for tomorrow", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isToday(tomorrow)).toBe(false);
    });
  });

  describe("getNextDay", () => {
    it("should return the next day", () => {
      const date = new Date(2024, 0, 15);
      const nextDay = getNextDay(date);
      
      expect(nextDay.getDate()).toBe(16);
      expect(nextDay.getMonth()).toBe(0);
      expect(nextDay.getFullYear()).toBe(2024);
    });

    it("should handle month boundaries", () => {
      const lastDayOfMonth = new Date(2024, 0, 31); // January 31
      const nextDay = getNextDay(lastDayOfMonth);
      
      expect(nextDay.getDate()).toBe(1);
      expect(nextDay.getMonth()).toBe(1); // February
    });

    it("should not mutate the original date", () => {
      const date = new Date(2024, 0, 15);
      const originalDate = date.getDate();
      getNextDay(date);
      
      expect(date.getDate()).toBe(originalDate);
    });
  });

  describe("getPreviousDay", () => {
    it("should return the previous day", () => {
      const date = new Date(2024, 0, 15);
      const prevDay = getPreviousDay(date);
      
      expect(prevDay.getDate()).toBe(14);
      expect(prevDay.getMonth()).toBe(0);
      expect(prevDay.getFullYear()).toBe(2024);
    });

    it("should handle month boundaries", () => {
      const firstDayOfMonth = new Date(2024, 1, 1); // February 1
      const prevDay = getPreviousDay(firstDayOfMonth);
      
      expect(prevDay.getDate()).toBe(31);
      expect(prevDay.getMonth()).toBe(0); // January
    });

    it("should not mutate the original date", () => {
      const date = new Date(2024, 0, 15);
      const originalDate = date.getDate();
      getPreviousDay(date);
      
      expect(date.getDate()).toBe(originalDate);
    });
  });
});
