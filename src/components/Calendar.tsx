import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronLeft, ChevronRight, Plus, X, RefreshCw } from 'lucide-react';

type ViewMode = 'day' | 'week' | 'month' | 'year';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location?: string;
  color: string;
}

export function Calendar() {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetchEvents();
    checkGoogleConnection();
  }, [currentDate, viewMode]);

  const checkGoogleConnection = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      const { data, error } = await supabase
        .from('google_calendar_tokens')
        .select('id')
        .eq('user_id', user.data.user.id)
        .maybeSingle();

      if (error) throw error;
      setIsGoogleConnected(!!data);
    } catch (error) {
      console.error('Error checking Google connection:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      const { startDate, endDate } = getDateRange();

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.data.user.id)
        .gte('start_time', startDate.toISOString())
        .lte('end_time', endDate.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDateRange = () => {
    const startDate = new Date(currentDate);
    const endDate = new Date(currentDate);

    switch (viewMode) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        const dayOfWeek = startDate.getDay();
        startDate.setDate(startDate.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(endDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
    }

    return { startDate, endDate };
  };

  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() - 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  const getDisplayText = () => {
    switch (viewMode) {
      case 'day':
        return currentDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      case 'week':
        const weekStart = new Date(currentDate);
        const dayOfWeek = weekStart.getDay();
        weekStart.setDate(weekStart.getDate() - dayOfWeek);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      case 'month':
        return currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      case 'year':
        return currentDate.getFullYear().toString();
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowEventDialog(true);
  };

  const handleGoogleSync = async () => {
    if (!isGoogleConnected) {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) {
        alert('Google Calendar integration is not configured. Please add VITE_GOOGLE_CLIENT_ID to your environment variables.');
        return;
      }

      const redirectUri = `${window.location.origin}/google-callback`;
      const scope = 'https://www.googleapis.com/auth/calendar';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;

      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      window.open(
        authUrl,
        'Google Calendar Auth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
      );

      window.addEventListener('message', async (event) => {
        if (event.data.type === 'google-auth-success') {
          await checkGoogleConnection();
          alert('Successfully connected to Google Calendar!');
        }
      }, { once: true });
    } else {
      try {
        setIsSyncing(true);
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const response = await fetch(`${supabaseUrl}/functions/v1/sync-google-calendar`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) throw new Error('Sync failed');

        await fetchEvents();
        alert('Successfully synced with Google Calendar!');
      } catch (error) {
        console.error('Error syncing with Google Calendar:', error);
        alert('Failed to sync with Google Calendar. Please try again.');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1>
          <button
            onClick={navigateToday}
            className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Today
          </button>
          <button
            onClick={handleGoogleSync}
            disabled={isSyncing}
            className={`flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-md ${
              isGoogleConnected
                ? 'text-white bg-green-600 hover:bg-green-700'
                : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            } disabled:opacity-50`}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : isGoogleConnected ? 'Sync Google Calendar' : 'Connect Google Calendar'}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={navigatePrevious}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-lg font-medium text-gray-900 dark:text-white min-w-[200px] text-center">
              {getDisplayText()}
            </span>
            <button
              onClick={navigateNext}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-md">
            {(['day', 'week', 'month', 'year'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-sm font-medium capitalize ${
                  viewMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                } ${mode === 'day' ? 'rounded-l-md' : ''} ${mode === 'year' ? 'rounded-r-md' : ''}`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setSelectedDate(new Date());
              setShowEventDialog(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            New Event
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {viewMode === 'month' && <MonthView currentDate={currentDate} events={events} onDateClick={handleDateClick} />}
            {viewMode === 'week' && <WeekView currentDate={currentDate} events={events} onDateClick={handleDateClick} />}
            {viewMode === 'day' && <DayView currentDate={currentDate} events={events} />}
            {viewMode === 'year' && <YearView currentDate={currentDate} onMonthClick={(date) => { setCurrentDate(date); setViewMode('month'); }} />}
          </>
        )}
      </div>

      {showEventDialog && (
        <EventDialog
          selectedDate={selectedDate || new Date()}
          onClose={() => {
            setShowEventDialog(false);
            setSelectedDate(null);
          }}
          onSave={() => {
            setShowEventDialog(false);
            setSelectedDate(null);
            fetchEvents();
          }}
        />
      )}
    </div>
  );
}

function MonthView({ currentDate, events, onDateClick }: { currentDate: Date; events: CalendarEvent[]; onDateClick: (date: Date) => void }) {
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    const date = new Date(firstDayOfMonth);
    date.setDate(date.getDate() - (startingDayOfWeek - i));
    days.push(date);
  }

  for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
    days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
  }

  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(lastDayOfMonth);
    date.setDate(date.getDate() + i);
    days.push(date);
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.start_time);
      return eventStart.getDate() === date.getDate() &&
             eventStart.getMonth() === date.getMonth() &&
             eventStart.getFullYear() === date.getFullYear();
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
            {day}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-7 grid-rows-6">
        {days.map((date, index) => {
          const dayEvents = getEventsForDate(date);
          return (
            <div
              key={index}
              onClick={() => onDateClick(date)}
              className={`border-r border-b border-gray-200 dark:border-gray-700 p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                !isCurrentMonth(date) ? 'bg-gray-50 dark:bg-gray-900/50' : ''
              }`}
            >
              <div className={`text-sm font-medium mb-1 ${
                isToday(date)
                  ? 'bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center'
                  : isCurrentMonth(date)
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-400 dark:text-gray-600'
              }`}>
                {date.getDate()}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="text-xs px-1 py-0.5 rounded truncate"
                    style={{ backgroundColor: event.color + '20', color: event.color }}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ currentDate, events, onDateClick }: { currentDate: Date; events: CalendarEvent[]; onDateClick: (date: Date) => void }) {
  const weekStart = new Date(currentDate);
  const dayOfWeek = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - dayOfWeek);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    days.push(date);
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.start_time);
      return eventStart.getDate() === date.getDate() &&
             eventStart.getMonth() === date.getMonth() &&
             eventStart.getFullYear() === date.getFullYear();
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700">
        <div className="py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300"></div>
        {days.map((date, index) => (
          <div key={index} className={`py-3 text-center ${isToday(date) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {date.toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
            <div className={`text-lg font-bold ${
              isToday(date) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
            }`}>
              {date.getDate()}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-8">
          <div className="border-r border-gray-200 dark:border-gray-700">
            {hours.map((hour) => (
              <div key={hour} className="h-12 border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 pr-2 pt-1 text-right">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
            ))}
          </div>
          {days.map((date, dayIndex) => {
            const dayEvents = getEventsForDate(date);
            return (
              <div key={dayIndex} className="border-r border-gray-200 dark:border-gray-700 relative">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    onClick={() => onDateClick(date)}
                    className="h-12 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  />
                ))}
                {dayEvents.map((event) => {
                  const start = new Date(event.start_time);
                  const end = new Date(event.end_time);
                  const top = (start.getHours() + start.getMinutes() / 60) * 48;
                  const height = ((end.getTime() - start.getTime()) / (1000 * 60 * 60)) * 48;
                  return (
                    <div
                      key={event.id}
                      className="absolute left-0 right-0 mx-1 px-2 py-1 text-xs rounded overflow-hidden"
                      style={{
                        top: `${top}px`,
                        height: `${Math.max(height, 24)}px`,
                        backgroundColor: event.color,
                        color: 'white'
                      }}
                    >
                      <div className="font-semibold truncate">{event.title}</div>
                      <div className="text-xs opacity-90 truncate">{start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DayView({ currentDate, events }: { currentDate: Date; events: CalendarEvent[] }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const dayEvents = events.filter(event => {
    const eventStart = new Date(event.start_time);
    return eventStart.getDate() === currentDate.getDate() &&
           eventStart.getMonth() === currentDate.getMonth() &&
           eventStart.getFullYear() === currentDate.getFullYear();
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="relative">
        {hours.map((hour) => (
          <div key={hour} className="flex border-b border-gray-200 dark:border-gray-700 h-16">
            <div className="w-20 text-xs text-gray-500 dark:text-gray-400 pr-4 pt-1 text-right border-r border-gray-200 dark:border-gray-700">
              {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
            </div>
            <div className="flex-1"></div>
          </div>
        ))}
        {dayEvents.map((event) => {
          const start = new Date(event.start_time);
          const end = new Date(event.end_time);
          const top = (start.getHours() + start.getMinutes() / 60) * 64;
          const height = ((end.getTime() - start.getTime()) / (1000 * 60 * 60)) * 64;
          return (
            <div
              key={event.id}
              className="absolute left-24 right-4 px-3 py-2 text-sm rounded"
              style={{
                top: `${top}px`,
                height: `${Math.max(height, 32)}px`,
                backgroundColor: event.color,
                color: 'white'
              }}
            >
              <div className="font-semibold">{event.title}</div>
              <div className="text-xs opacity-90">
                {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </div>
              {event.location && <div className="text-xs opacity-90 mt-1">{event.location}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function YearView({ currentDate, onMonthClick }: { currentDate: Date; onMonthClick: (date: Date) => void }) {
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="grid grid-cols-3 gap-4">
        {months.map((month) => {
          const monthDate = new Date(currentDate.getFullYear(), month, 1);
          const firstDay = monthDate.getDay();
          const daysInMonth = new Date(currentDate.getFullYear(), month + 1, 0).getDate();

          const days = [];
          for (let i = 0; i < firstDay; i++) {
            days.push(null);
          }
          for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
          }

          return (
            <div
              key={month}
              onClick={() => onMonthClick(monthDate)}
              className="bg-white dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600 cursor-pointer hover:border-blue-500 dark:hover:border-blue-500"
            >
              <div className="text-center font-semibold text-gray-900 dark:text-white mb-2">
                {monthDate.toLocaleDateString('en-US', { month: 'long' })}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="text-xs text-center text-gray-500 dark:text-gray-400">
                    {day}
                  </div>
                ))}
                {days.map((day, i) => (
                  <div
                    key={i}
                    className={`text-xs text-center py-1 ${
                      day ? 'text-gray-700 dark:text-gray-300' : ''
                    }`}
                  >
                    {day || ''}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventDialog({ selectedDate, onClose, onSave }: { selectedDate: Date; onClose: () => void; onSave: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(selectedDate.toISOString().slice(0, 16));
  const [endDate, setEndDate] = useState(new Date(selectedDate.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16));
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsSaving(true);
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('User not authenticated');

      const { error } = await supabase.from('calendar_events').insert({
        user_id: user.data.user.id,
        title: title.trim(),
        description: description.trim() || null,
        start_time: new Date(startDate).toISOString(),
        end_time: new Date(endDate).toISOString(),
        all_day: allDay,
        location: location.trim() || null,
        color
      });

      if (error) throw error;
      onSave();
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const colors = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#ec4899', // pink
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Event</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">All day event</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Color
            </label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
