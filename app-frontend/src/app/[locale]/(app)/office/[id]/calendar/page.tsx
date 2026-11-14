"use client";

import { useEffect } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { useOffice } from "@/components/app/OfficeShell";
import { CalendarPage as Calendar } from "@/components/calendar/CalendarPage";
import { calendarAvailable } from "@/lib/calendar";
import { officePath } from "@/lib/links";

/** The Calendar page; where there's no calendar (lib/calendar), the floor instead. */
export default function CalendarPage() {
  const router = useRouter();
  const { office } = useOffice();
  useEffect(() => {
    if (!calendarAvailable) router.replace(officePath(office.id));
  }, [router, office.id]);
  return calendarAvailable ? <Calendar /> : null;
}
