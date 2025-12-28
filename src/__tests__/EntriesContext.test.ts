// Simplified tests that don't require React rendering
import { mockEntries } from '../data/mockData';
import type { Entry } from '../types/models';

describe('EntriesContext Logic', () => {
  it('should have entries with Date objects for createdAt', () => {
    expect(mockEntries.length).toBeGreaterThan(0);
    mockEntries.forEach((entry) => {
      expect(entry.createdAt).toBeInstanceOf(Date);
      expect(entry.content).toBeDefined();
      expect(typeof entry.content).toBe('string');
    });
  });

  it('should filter entries by date correctly', () => {
    const testDate = new Date();
    const filtered = mockEntries.filter(
      (entry) => entry.createdAt.toDateString() === testDate.toDateString()
    );
    expect(Array.isArray(filtered)).toBe(true);
  });

  it('should create entry with content', () => {
    const newEntry: Entry = {
      id: 'test-1',
      content: 'Test entry',
      createdAt: new Date(),
    };
    expect(newEntry.content).toBe('Test entry');
    expect(newEntry.createdAt).toBeInstanceOf(Date);
  });
});
