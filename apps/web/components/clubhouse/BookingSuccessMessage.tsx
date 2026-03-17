type BookingSuccessMessageProps = {
  bookingId: string;
};

export default function BookingSuccessMessage({ bookingId }: BookingSuccessMessageProps) {
  return (
    <p className="clubhouse-booking__success" role="status" aria-live="polite">
      Thanks! Your booking request has been sent with status pending. Reference: {bookingId}
    </p>
  );
}
