// Shared between the server pages and the client-side invite builder.

import type { EventRow, EventType, TemplateId } from "./types";

export type EventFormValues = {
  title: string;
  event_type: EventType;
  host_name: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  location_name: string;
  location_address: string;
  online_url: string;
  cover_image_url: string;
  template: TemplateId;
  rsvp_by: string;
  allow_plus_ones: boolean;
  max_party_size: number;
  open_link: boolean;
  show_guest_list: boolean;
  custom_question: string;
};

export function valuesFromEvent(event: EventRow | null): EventFormValues {
  return {
    title: event?.title ?? "",
    event_type: event?.event_type ?? "birthday",
    host_name: event?.host_name ?? "",
    description: event?.description ?? "",
    event_date: event?.event_date ?? "",
    start_time: event?.start_time?.slice(0, 5) ?? "",
    end_time: event?.end_time?.slice(0, 5) ?? "",
    timezone: event?.timezone ?? "UTC",
    location_name: event?.location_name ?? "",
    location_address: event?.location_address ?? "",
    online_url: event?.online_url ?? "",
    cover_image_url: event?.cover_image_url ?? "",
    template: event?.template ?? "classic",
    rsvp_by: event?.rsvp_by ?? "",
    allow_plus_ones: event?.allow_plus_ones ?? true,
    max_party_size: event?.max_party_size && event.max_party_size > 1 ? event.max_party_size : 4,
    open_link: event?.open_link ?? true,
    show_guest_list: event?.show_guest_list ?? false,
    custom_question: event?.custom_question ?? "",
  };
}
