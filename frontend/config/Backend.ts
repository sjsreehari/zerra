const isProduction = process.env.NEXT_PUBLIC_NODE_ENV === "development";

const baseUrl = isProduction
  ? `http://localhost:8080`
  : " ";

export const APIENDPOINT = {
  SendOtp: `${baseUrl}/api/v1/auth/otp/send`,
  VerifyOTP: `${baseUrl}/api/v1/auth/otp/verify`,
  Validate: `${baseUrl}/api/v1/auth/validate`,
  GetGuestInitialCred: `${baseUrl}/api/v1/guests/initial`,
  ResendOTP: `${baseUrl}/api/v1/auth/otp/resend`,

  GetActivities: `${baseUrl}/api/v1/adventures/activities`,
  GetActivityDetails: (activityID: string) =>
    `${baseUrl}/api/v1/adventures/activities/${activityID}`,

  CreateBooking: (entityID: string) => `${baseUrl}/api/v1/bookings/${entityID}`,

  ListAllBookings: `${baseUrl}/api/v1/bookings`,

  GetTicketData: (bookingID: string) =>
    `${baseUrl}/api/v1/bookings/${bookingID}/ticket`,
};
