import { OAuth2Client } from 'googleapis-common';

// Event data interface for creating/updating calendar events
export interface GoogleCalendarEventData {
  summary: string;
  description?: string;
  start: Date | string;
  end: Date | string;
  attendees?: string[];
  appointmentId?: number;
}

// Google Calendar API response data
export interface GoogleCalendarEventResponse {
  id: string;
  [key: string]: any;
}

// Token object structure for Google OAuth
export interface GoogleTokens {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expiry_date?: number;
  [key: string]: any;
}

// Function type declarations
export declare function getOAuth2Client(): OAuth2Client;
export declare function saveTokens(tokens: GoogleTokens): void;
export declare function createEvent(eventData: GoogleCalendarEventData): Promise<GoogleCalendarEventResponse>;
export declare function findEventByAppointmentId(appointmentId: number): Promise<GoogleCalendarEventResponse | null>;
export declare function updateEvent(eventId: string, eventData: GoogleCalendarEventData): Promise<GoogleCalendarEventResponse>;
export declare function deleteEvent(eventId: string): Promise<void>;
