import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Phone, Mail } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfWeek, endOfWeek, parseISO } from "date-fns";
import type { Appointment, BlockedTime } from "@shared/schema";

interface CalendarViewProps {
  appointments?: Appointment[];
  onEventClick?: (appointment: Appointment) => void;
}

export default function CalendarView({ appointments = [], onEventClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: blockedDates = [] } = useQuery<BlockedTime[]>({
    queryKey: ["/api/blocked-dates"]
  });

  // Get calendar days for the current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Get appointments for a specific day using timezone-aware timestamps
  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter(appointment => {
      // Use startTimestamptz if available, fallback to appointmentDate
      let appointmentDay: Date;
      
      if (appointment.startTimestamptz) {
        appointmentDay = new Date(appointment.startTimestamptz);
      } else {
        // Fallback to legacy appointmentDate
        appointmentDay = new Date(appointment.appointmentDate);
      }
      
      return isSameDay(appointmentDay, day);
    });
  };

  // Check if a day is blocked
  const isDateBlocked = (day: Date) => {
    return blockedDates.some(blockedDate => 
      isSameDay(new Date(blockedDate.startTimestamptz), day)
    );
  };

  // Get blocked date for a specific day
  const getBlockedDateForDay = (day: Date) => {
    return blockedDates.find(blockedDate => 
      isSameDay(new Date(blockedDate.startTimestamptz), day)
    );
  };

  // Get appointments for selected date
  const selectedDateAppointments = selectedDate ? getAppointmentsForDay(selectedDate) : [];

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Appointment Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigateMonth('prev')}
              >
                ←
              </Button>
              <span className="text-lg font-semibold min-w-[160px] text-center">
                {format(currentDate, 'MMMM yyyy')}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigateMonth('next')}
              >
                →
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(day => {
              const dayAppointments = getAppointmentsForDay(day);
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);
              const isBlocked = isDateBlocked(day);
              const blockedDate = getBlockedDateForDay(day);
              
              return (
                <div
                  key={day.toISOString()}
                  className={`
                    min-h-[80px] p-1 border cursor-pointer transition-colors
                    ${isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-100 text-gray-400'}
                    ${isSelected ? 'ring-2 ring-brand-red bg-brand-red/5' : ''}
                    ${isTodayDate ? 'bg-blue-50 border-blue-200' : 'border-gray-200'}
                    ${isBlocked ? 'bg-red-50 border-red-300' : ''}
                  `}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className={`text-sm font-medium mb-1 ${isTodayDate ? 'text-blue-600' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  
                  <div className="space-y-1">
                    {isBlocked && blockedDate && (
                      <div className="text-xs p-1 rounded bg-red-200 text-red-800 border border-red-300">
                        <div className="font-medium truncate">BLOCKED</div>
                        <div className="truncate">
                          {blockedDate.isFullDay ? 'All Day' : `${format(blockedDate.startTimestamptz, 'h:mm a')}-${format(blockedDate.endTimestamptz, 'h:mm a')}`}
                        </div>
                      </div>
                    )}
                    
                    {!isBlocked && dayAppointments.slice(0, 2).map(appointment => {
                      // Format time from startTimestamptz or fallback to appointmentTime
                      const displayTime = appointment.startTimestamptz 
                        ? format(new Date(appointment.startTimestamptz), 'h:mm a')
                        : appointment.appointmentTime;
                      
                      return (
                        <div
                          key={appointment.id}
                          className={`text-xs p-1 rounded border cursor-pointer hover:opacity-80 ${getStatusColor(appointment.status)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onEventClick) {
                              onEventClick(appointment);
                            }
                          }}
                          data-testid={`calendar-event-${appointment.id}`}
                        >
                          <div className="font-medium truncate">
                            {displayTime}
                          </div>
                          <div className="truncate">
                            {appointment.firstName} {appointment.lastName}
                          </div>
                        </div>
                      );
                    })}
                    
                    {!isBlocked && dayAppointments.length > 2 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{dayAppointments.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Appointments for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateAppointments.length > 0 ? (
              <div className="space-y-4">
                {selectedDateAppointments
                  .sort((a, b) => {
                    // Sort by startTimestamptz if available, fallback to appointmentTime
                    const timeA = a.startTimestamptz 
                      ? new Date(a.startTimestamptz).getTime()
                      : new Date(`1970-01-01 ${a.appointmentTime}`).getTime();
                    const timeB = b.startTimestamptz 
                      ? new Date(b.startTimestamptz).getTime()
                      : new Date(`1970-01-01 ${b.appointmentTime}`).getTime();
                    return timeA - timeB;
                  })
                  .map(appointment => (
                    <div key={appointment.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {appointment.firstName} {appointment.lastName}
                          </h3>
                          <p className="text-sm text-gray-600">{appointment.serviceType}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-medium">
                            {appointment.startTimestamptz 
                              ? format(new Date(appointment.startTimestamptz), 'h:mm a')
                              : appointment.appointmentTime}
                          </div>
                          <Badge className={getStatusColor(appointment.status)}>
                            {appointment.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span>{appointment.email}</span>
                        </div>
                        {appointment.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span>{appointment.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="capitalize">{appointment.status}</span>
                        </div>
                      </div>
                      
                      {appointment.notes && (
                        <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                          <strong>Notes:</strong> {appointment.notes}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No appointments scheduled for this date.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}