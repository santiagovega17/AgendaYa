"use client";

import { useParams } from "next/navigation";
import { BookingFlow } from "@/components/booking/BookingFlow";

export default function BookingPage() {
  const params = useParams();
  return <BookingFlow slug={params.slug as string} />;
}
