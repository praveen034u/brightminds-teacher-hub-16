import React from 'react';
import CalendarMockup from './CalendarMockup';

export default function AdminAvailability() {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-4">Teacher Availability</h2>
      <CalendarMockup />
    </div>
  );
}
