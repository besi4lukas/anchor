# Refactoring Guide

This document outlines the design patterns and best practices implemented in the Anchor codebase.

## Design Patterns Implemented

### 1. **Constants Pattern**
**Location:** `src/constants/ui.ts`

Centralized all magic numbers and reusable values into a constants file. This makes the design system maintainable and consistent.

**Benefits:**
- Single source of truth for UI values
- Easy to adjust design system globally
- Prevents magic numbers scattered throughout code
- Better for theming in the future

**Example:**
```typescript
// Before: Magic numbers everywhere
const CORE = 28;
const RING = 54;

// After: Centralized constants
import { ANCHOR_BEAM } from "../constants/ui";
const { CORE, RING } = ANCHOR_BEAM;
```

### 2. **Utility Functions Pattern**
**Location:** `src/utils/dateUtils.ts`

Extracted reusable date manipulation and formatting logic into utility functions.

**Benefits:**
- Reusable across components
- Easier to test
- Consistent date handling
- Single responsibility principle

**Example:**
```typescript
// Before: Duplicated date logic in components
const getWeekStart = (date: Date) => { /* ... */ }

// After: Shared utility
import { getWeekStart } from "../utils/dateUtils";
```

### 3. **Custom Hooks Pattern**
**Location:** `src/hooks/usePulseAnimation.ts`

Created reusable hooks for complex logic that can be shared across components.

**Benefits:**
- Encapsulates complex logic
- Reusable across components
- Easier to test
- Follows React best practices

**Example:**
```typescript
// Custom hook for animation
const { scale, opacity } = usePulseAnimation(isActive, config);
```

### 4. **Shared Component Pattern**
**Location:** `src/components/shared/`

Created base components that can be reused across the app (ModalSheet, ModalHeader, ModalFooter, Button).

**Benefits:**
- Reduces code duplication
- Consistent UI/UX
- Easier maintenance
- Single source of truth for styling

**Example:**
```typescript
// Before: Duplicated modal structure in each sheet
<Modal>
  <View style={/* inline styles */}>
    {/* header */}
    {/* content */}
    {/* footer */}
  </View>
</Modal>

// After: Reusable components
<ModalSheet visible={visible} onClose={onClose}>
  <ModalHeader onLeftPress={onClose} />
  {/* content */}
  <ModalFooter>{/* buttons */}</ModalFooter>
</ModalSheet>
```

### 5. **Context API Pattern**
**Location:** `src/state/`

Used React Context API for global state management with custom hooks.

**Benefits:**
- Centralized state management
- Type-safe with TypeScript
- Prevents prop drilling
- Clear API with custom hooks

**Example:**
```typescript
// Provider wraps app
<EntriesProvider>
  <TasksProvider>
    <App />
  </TasksProvider>
</EntriesProvider>

// Components use custom hooks
const { entries, createEntry } = useEntries();
```

### 6. **Memoization Pattern**
Used `useMemo` and `useCallback` strategically to prevent unnecessary re-renders.

**Benefits:**
- Better performance
- Prevents unnecessary calculations
- Optimizes context values

**Example:**
```typescript
// Memoized context value
const value = useMemo(
  () => ({ entries, createEntry }),
  [entries]
);
```

## Code Organization

### Folder Structure
```
src/
├── components/
│   ├── shared/          # Reusable base components
│   └── ...             # Feature-specific components
├── constants/          # App-wide constants
├── hooks/              # Custom React hooks
├── navigation/         # Navigation configuration
├── screens/            # Screen components
├── state/              # Context providers
├── theme/              # Theme configuration
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── __tests__/          # Test files
```

## Best Practices

### 1. **Comments**
- Added comprehensive JSDoc comments to all functions and components
- Explained complex logic and design decisions
- Documented parameters and return types
- Added usage examples where helpful

### 2. **TypeScript**
- Strict typing throughout
- No `any` types
- Proper interface definitions
- Type-safe context values

### 3. **Performance**
- Memoization where appropriate
- useNativeDriver for animations
- Efficient re-render patterns
- Lazy loading where possible

### 4. **Accessibility**
- Added accessibility labels
- Proper role attributes
- Keyboard navigation support
- Screen reader friendly

### 5. **Testing**
- Unit tests for utilities
- Component tests for key components
- Context tests for state management
- Date manipulation tests

## Migration Guide

### For New Components

1. **Use Constants:**
   ```typescript
   import { SPACING, BUTTON } from "../constants/ui";
   ```

2. **Use Shared Components:**
   ```typescript
   import { ModalSheet, Button } from "../components/shared";
   ```

3. **Use Utilities:**
   ```typescript
   import { formatDateLong, isToday } from "../utils/dateUtils";
   ```

4. **Add Comments:**
   ```typescript
   /**
    * Component description
    * 
    * @param prop - Description of prop
    */
   ```

5. **Use Custom Hooks:**
   ```typescript
   import { usePulseAnimation } from "../hooks/usePulseAnimation";
   ```

## Future Improvements

1. **Theme System:** Expand constants to support theming
2. **Error Boundaries:** Add error boundaries for better error handling
3. **Loading States:** Add loading state management
4. **Form Validation:** Create reusable form validation utilities
5. **Animation Library:** Expand custom hooks for more animation patterns
6. **Component Library:** Build out more shared components
7. **Integration Tests:** Add end-to-end tests
8. **Performance Monitoring:** Add performance tracking

## Testing Strategy

### Unit Tests
- Test utility functions thoroughly
- Test custom hooks in isolation
- Test context providers

### Component Tests
- Test component rendering
- Test user interactions
- Test edge cases

### Integration Tests
- Test component interactions
- Test navigation flows
- Test state management

## Code Review Checklist

- [ ] Uses constants instead of magic numbers
- [ ] Uses shared components where applicable
- [ ] Has comprehensive comments
- [ ] Follows TypeScript best practices
- [ ] Has appropriate tests
- [ ] Follows accessibility guidelines
- [ ] Uses memoization where needed
- [ ] Follows folder structure
- [ ] No code duplication

