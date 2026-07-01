'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg } from '@fullcalendar/core'

const PLUGINS = [dayGridPlugin, interactionPlugin]
const HEADER = { left: 'title', center: '', right: 'prev,next' }

type CalEvent = {
  id: string
  title: string
  date: string
  allDay: boolean
  backgroundColor: string
  borderColor: string
  textColor: string
  extendedProps: { event: unknown }
}

export default function EventCalendar({
  events,
  onEventClick,
}: {
  events: CalEvent[]
  onEventClick: (info: EventClickArg) => void
}) {
  return (
    <FullCalendar
      plugins={PLUGINS}
      initialView="dayGridMonth"
      height="auto"
      headerToolbar={HEADER}
      forceEventDuration={false}
      defaultAllDay={true}
      displayEventTime={false}
      events={events}
      eventClick={onEventClick}
    />
  )
}
