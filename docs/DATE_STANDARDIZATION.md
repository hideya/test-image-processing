# Date Standardization

This document describes the date handling standardization implemented throughout the application.

## Overview

To ensure consistent date handling across all parts of the application, we've implemented a standardized approach using the YYYY-MM-DD format for all date communications between client and server. This standardization simplifies date handling, improves reliability, and eliminates timezone-related issues.

## Key Principles

1. **API Date Format**: All API endpoints exclusively accept and return dates in YYYY-MM-DD format (e.g., "2023-05-15")
2. **Database Storage**: Dates are stored as PostgreSQL timestamp type with noon time (12:00:00) to avoid timezone issues
3. **Client-side Helpers**: A dedicated date utility module provides consistent date handling functions

## Date Utility Module

The client uses a centralized date utility module (`/client/src/lib/dateUtils.ts`) with standardized functions:

```typescript
// Convert a Date object to YYYY-MM-DD string
formatDateToYYYYMMDD(date: Date): string

// Parse a YYYY-MM-DD string to a Date object at noon
parseYYYYMMDD(dateString: string): Date

// Create a noon date for today
createTodayNoon(): Date

// Get start and end of day as Date objects
getStartOfDay(dateString: string): Date
getEndOfDay(dateString: string): Date

// Get first and last days of month as YYYY-MM-DD strings
getMonthDateRange(year: number, month: number): { startDate: string, endDate: string }

// Get all dates in a month as YYYY-MM-DD strings
getAllDatesInMonth(year: number, month: number): string[]

// Validates a date string is in YYYY-MM-DD format
isValidYYYYMMDD(dateString: string): boolean

// Ensure a date is not in the future
ensureDateNotInFuture(date: Date): Date
```

## Server-Side Date Handling

### API Input Validation

All date inputs are validated with a regex pattern to ensure YYYY-MM-DD format:

```typescript
const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
if (!dateFormatRegex.test(formData.fields.customDate)) {
  return res.status(400).json({
    message: "Invalid date format. Please use YYYY-MM-DD format.",
  });
}
```

### Date Comparisons

When comparing dates (e.g., checking if a date is in the future), we normalize both dates to midnight (00:00:00) to compare only the date parts without time components:

```typescript
// Create a comparison date set to the start of the current day
const currentDate = new Date();
currentDate.setHours(0, 0, 0, 0);

// Create a truncated date (without time component) for comparison
const submittedDateOnly = new Date(customDate);
submittedDateOnly.setHours(0, 0, 0, 0);

// Only compare the date parts (ignoring time)
if (submittedDateOnly > currentDate) {
  // This is a future date
}
```

### Database Storage

When storing dates in the database:

1. Date inputs are parsed from YYYY-MM-DD format
2. The time component is set to noon (12:00:00) for consistency
3. The date is stored as a PostgreSQL timestamp

```typescript
// If a custom timestamp is provided, ensure it's set to noon
let timestamp = new Date(); // default to now
if (customTimestamp) {
  timestamp = new Date(customTimestamp);
  timestamp.setHours(12, 0, 0, 0);
}

const dataToInsert = {
  ...measurementData,
  timestamp,
  // other fields...
};
```

### Database Queries

When querying date ranges, start and end of day are used for inclusive date ranges:

```typescript
// Create start and end dates for the given date (entire day)
const startOfDay = new Date(dateForQuery);
startOfDay.setHours(0, 0, 0, 0);

const endOfDay = new Date(dateForQuery);
endOfDay.setHours(23, 59, 59, 999);

// SQL query with date range
return await db
  .select()
  .from(angleMeasurements)
  .where(
    and(
      eq(angleMeasurements.userId, userId),
      sql`${angleMeasurements.timestamp} >= ${startOfDay}`,
      sql`${angleMeasurements.timestamp} <= ${endOfDay}`
    )
  )
  .orderBy(angleMeasurements.timestamp);
```

### API Response Formatting

When sending dates in API responses, PostgreSQL's `TO_CHAR` function formats them as YYYY-MM-DD:

```sql
TO_CHAR(am.timestamp, 'YYYY-MM-DD') as date
```

## Client-Side Date Handling

### API Requests

When sending dates to API endpoints, they are always formatted as YYYY-MM-DD strings:

```typescript
// Get first and last day of the month using utility function
const year = currentViewMonth.getFullYear();
const month = currentViewMonth.getMonth();

// Use utility function to get month range in YYYY-MM-DD format
const { startDate, endDate } = getMonthDateRange(year, month);

const res = await apiRequest('GET', `/api/angle-data?start=${startDate}&end=${endDate}`);
```

### Form Submissions

When uploading images or other data with dates:

```typescript
// Ensure the date is not in the future
const dateForServer = ensureDateNotInFuture(new Date(customDate));
dateForServer.setHours(12, 0, 0, 0);

// Send date in YYYY-MM-DD format
formData.append("customDate", formatDateToYYYYMMDD(dateForServer));
```

### Data Display

Client-side display formatting uses `date-fns` for localized date display, independent of the API format:

```typescript
// Format for display, e.g., "8/15" or "August 15, 2023"
const formattedDate = format(parseYYYYMMDD(dateStr), "d");
```

## Best Practices

When working with dates in this application:

1. **Always use the date utility functions** for consistent date handling
2. **Validate date inputs** with `isValidYYYYMMDD` before processing
3. **For API communication**, only use YYYY-MM-DD strings
4. **For date comparisons**, normalize to midnight to compare only date parts
5. **For storage**, set time to noon (12:00:00) to avoid timezone issues
6. **For display**, use `date-fns` formatting based on UI requirements

## Benefits

This standardized approach provides several key benefits:

1. **Simplified API contract**: Clear, unambiguous date format requirements
2. **Elimination of timezone issues**: Using noon time prevents date shifts
3. **Consistent validation**: Uniform handling of date inputs across the application
4. **Improved debugging**: Easier to track date-related issues
5. **Better interoperability**: Clear separation between API format and display format
