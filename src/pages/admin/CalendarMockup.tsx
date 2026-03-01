import React, { useMemo, useState, useEffect } from 'react';

type Grade = {
  id: string;
  name: string;
};

type Teacher = {
  id: string;
  name: string;
  gradeId: string;
  color?: string;
};

type LeaveEvent = {
  id: string;
  teacherId: string;
  date: string; // ISO date yyyy-mm-dd
  type?: 'leave' | 'substitute';
};

const today = new Date();

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function formatISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Color mapping
const COLOR_AVAILABLE = '#10B981'; // green
const COLOR_LEAVE = '#FB923C'; // orange
const COLOR_SUBSTITUTE = '#3B82F6'; // blue

export default function CalendarMockup() {
  // Grades 1..10
  const grades = useMemo<Grade[]>(() => {
    return Array.from({ length: 10 }, (_, i) => ({ id: `g${i + 1}`, name: `Grade ${i + 1}` }));
  }, []);

  // Generate sample teachers for all grades (4 per grade)
  const allTeachers = useMemo<Teacher[]>(() => {
    const t: Teacher[] = [];
    grades.forEach((g, gi) => {
      for (let j = 1; j <= 4; j++) {
        const id = `${g.id}-t${j}`;
        // default available color (green)
        t.push({ id, name: `Teacher ${g.id.slice(1)}-${j}`, gradeId: g.id, color: COLOR_AVAILABLE });
      }
    });
    return t;
  }, [grades]);

  const [selectedGrade, setSelectedGrade] = useState<string>(grades[0].id);
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(today));
  const [events, setEvents] = useState<LeaveEvent[]>([]);

  // teachers for selected grade
  const teachersForGrade = useMemo(() => allTeachers.filter((t) => t.gradeId === selectedGrade), [allTeachers, selectedGrade]);

  // Calendar days for the current month view
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const startDay = start.getDay(); // 0-6

    const days: Date[] = [];
    // previous month's tail
    for (let i = 0; i < startDay; i++) {
      days.push(new Date(start.getFullYear(), start.getMonth(), i - startDay + 1));
    }

    // this month
    for (let d = 1; d <= end.getDate(); d++) {
      days.push(new Date(start.getFullYear(), start.getMonth(), d));
    }

    // fill to complete weeks
    while (days.length % 7 !== 0) {
      const last = days[days.length - 1];
      days.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
    }

    return days;
  }, [currentMonth]);

  const handlePrev = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNext = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  // Generate sample leave events every time selectedGrade or currentMonth changes
  useEffect(() => {
    // create a predictable set of events for the selected grade
    const sample: LeaveEvent[] = [];
    teachersForGrade.forEach((teacher, idx) => {
      // primary leave on day (5 + idx*2)
      const day1 = 5 + idx * 2;
      const day2 = 12 + idx; // secondary leave
      const end = endOfMonth(currentMonth).getDate();
      if (day1 <= end) {
        const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day1);
        sample.push({ id: `${teacher.id}-${formatISO(d)}`, teacherId: teacher.id, date: formatISO(d), type: 'leave' });
      }
      if (day2 <= end) {
        const d2 = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day2);
        sample.push({ id: `${teacher.id}-${formatISO(d2)}`, teacherId: teacher.id, date: formatISO(d2), type: 'leave' });
      }
    });

    setEvents(sample);
  }, [selectedGrade, currentMonth, teachersForGrade]);

  // Drag handlers: set teacher id in dataTransfer when dragging from list
  const onDragStartTeacher = (e: React.DragEvent, teacherId: string) => {
    e.dataTransfer.setData('text/plain', teacherId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const onDragOverCell = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const onDropOnCell = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    const teacherId = e.dataTransfer.getData('text/plain');
    if (!teacherId) return;
    const iso = formatISO(date);
    // avoid duplicate
    const exists = events.find((ev) => ev.teacherId === teacherId && ev.date === iso);
    if (exists) return;
    // Dropping a teacher marks a substitute assignment (blue)
    const ev: LeaveEvent = { id: `${teacherId}-${iso}`, teacherId, date: iso, type: 'substitute' };
    setEvents((s) => [...s, ev]);
  };

  const removeEvent = (id: string) => {
    setEvents((s) => s.filter((ev) => ev.id !== id));
  };

  const eventsForDate = (date: Date) => {
    const iso = formatISO(date);
    return events
      .filter((ev) => ev.date === iso)
      .map((ev) => ({ event: ev, teacher: allTeachers.find((t) => t.id === ev.teacherId)! }));
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Grade</label>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="border px-3 py-1 rounded"
          >
            {grades.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 ml-6">
            <button onClick={handlePrev} className="px-2 py-1 border rounded">Prev</button>
            <div className="font-semibold">{currentMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
            <button onClick={handleNext} className="px-2 py-1 border rounded">Next</button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded" style={{ background: COLOR_LEAVE }} />
          <span className="text-sm">On Leave</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded" style={{ background: COLOR_AVAILABLE }} />
          <span className="text-sm">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded" style={{ background: COLOR_SUBSTITUTE }} />
          <span className="text-sm">Substitute</span>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Calendar grid */}
        <div className="flex-1">
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded overflow-hidden">
            {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d) => (
              <div key={d} className="bg-gray-100 text-center text-xs py-2 font-medium">{d}</div>
            ))}

            {monthDays.map((d, idx) => {
              const isThisMonth = d.getMonth() === currentMonth.getMonth();
              const dayEvents = eventsForDate(d);
              return (
                <div
                  key={idx}
                  onDragOver={onDragOverCell}
                  onDrop={(e) => onDropOnCell(e, d)}
                  className={`min-h-[80px] bg-white p-2 text-sm ${isThisMonth ? '' : 'bg-gray-50 text-gray-400'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="text-xs font-semibold">{d.getDate()}</div>
                  </div>

                  <div className="mt-2 space-y-1">
                    {dayEvents.map(({ event, teacher }) => {
                      const bg = event.type === 'substitute' ? COLOR_SUBSTITUTE : COLOR_LEAVE;
                      return (
                        <div key={event.id} className="w-full rounded text-xs px-2 py-1 text-white relative" style={{ background: bg }} title={teacher.name}>
                          {/* name wraps instead of truncating */}
                          <span className="text-xs font-medium break-words">{teacher.name}</span>
                          {event.type !== 'leave' && (
                            <button
                              aria-label="Remove event"
                              onClick={(e) => { e.stopPropagation(); removeEvent(event.id); }}
                              className="absolute top-0 right-0 mt-1 mr-1 w-4 h-4 flex items-center justify-center rounded hover:bg-black/40 text-white font-bold text-xs leading-none"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right side teacher list */}
        <aside className="w-64 border-l pl-4">
          <div className="mb-2 text-sm font-medium">Teachers ({teachersForGrade.length})</div>
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {teachersForGrade.map((t) => (
              <div
                key={t.id}
                draggable
                onDragStart={(e) => onDragStartTeacher(e, t.id)}
                className="flex items-center gap-3 p-2 rounded border cursor-grab hover:shadow"
              >
                <div className="h-8 w-8 rounded-full flex items-center justify-center text-white font-medium" style={{ background: t.color || '#6B7280' }}>{t.name.split(' ').map(s=>s[0]).slice(0,2).join('')}</div>
                <div className="flex-1 text-sm">{t.name}</div>
              </div>
            ))}
            {teachersForGrade.length === 0 && <div className="text-sm text-gray-500">No teachers for selected grade</div>}
          </div>
        </aside>
      </div>
    </div>
  );
}
