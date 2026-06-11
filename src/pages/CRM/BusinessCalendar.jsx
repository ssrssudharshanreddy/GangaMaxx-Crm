import { useState, useMemo } from 'react';
import { useCollection } from '../../hooks/useDb';
import { PageHeader, Card, Button, Badge } from '../../components/ui/ui-components';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

export default function BusinessCalendar() {
  const followUps = useCollection('followUps');
  const visitLogs = useCollection('visitLogs');

  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const today = () => setCurrentDate(new Date());

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  const getEventsForDay = (day) => {
    const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const dayFollowUps = followUps.filter(f => f.date && f.date.startsWith(dateStr));
    const dayVisits = visitLogs.filter(v => v.date && v.date.startsWith(dateStr));

    return { followUps: dayFollowUps, visits: dayVisits };
  };

  const renderCalendarDays = () => {
    const days = [];
    const isToday = (day) => {
      const d = new Date();
      return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    };

    // Blank spaces for offset
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`blank-${i}`} className="h-28 border border-[var(--border)] bg-[var(--bg-secondary)]/50"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const { followUps: dayFollowUps, visits: dayVisits } = getEventsForDay(day);

      days.push(
        <div key={`day-${day}`} className={`h-28 border border-[var(--border)] p-2 overflow-y-auto ${isToday(day) ? 'bg-[var(--brand-light)]/20 border-[var(--brand)]' : 'bg-[var(--bg-base)]'}`}>
          <div className="flex justify-between items-start mb-1">
            <span className={`text-sm font-semibold ${isToday(day) ? 'text-[var(--brand)]' : 'text-[var(--text-secondary)]'}`}>{day}</span>
          </div>
          <div className="flex flex-col gap-1 mt-1">
            {dayFollowUps.map(f => (
              <div key={`f-${f.id}`} className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1 py-0.5 rounded truncate" title={f.institutionName}>
                📞 {f.institutionName}
              </div>
            ))}
            {dayVisits.map(v => (
              <div key={`v-${v.id}`} className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 py-0.5 rounded truncate" title={v.institutionName}>
                📍 {v.institutionName}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title="Business Calendar" 
        subtitle="Schedule and track follow-ups and visits." 
      />

      <Card noPadding>
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" icon={CalendarIcon} onClick={today}>Today</Button>
            <h2 className="text-xl font-bold text-[var(--text-primary)] min-w-[150px]">{monthName} {year}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={ChevronLeft} onClick={prevMonth} />
            <Button variant="secondary" icon={ChevronRight} onClick={nextMonth} />
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 bg-[var(--border)] gap-px">
          {renderCalendarDays()}
        </div>
      </Card>
      
      <div className="flex gap-4 px-2">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span className="w-3 h-3 rounded-full bg-amber-100 border border-amber-300 inline-block"></span> Follow-ups
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300 inline-block"></span> Visits
        </div>
      </div>
    </div>
  );
}
