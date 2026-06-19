export const endpoints = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    verifyEmail: '/auth/verify-email',
    resendVerification: '/auth/resend-verification',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    googleLogin: '/auth/google-login',
    uploadDocuments: '/auth/upload-documents'
  },
  users: {
    avatarPresets: '/users/avatars/presets',
    avatar: '/users/profile/avatar',
    avatarUpload: '/users/profile/avatar/upload',
    driverStatus: '/users/driver/status',
    profile: '/users/profile',
    verifyPhone: '/users/profile/verify-phone',
    profilePrivacy: '/users/profile/privacy',
    verificationArchitecture: '/users/verification/architecture',
    vehicle: '/users/vehicle',
    vehicleUploadMedia: '/users/vehicle/upload-media',
    driverSetup: '/users/driver-setup',
    driverSetupStatus: '/users/driver-setup/status',
    driverDocumentsResubmit: '/users/driver-documents/resubmit',
    public: (id) => `/users/${id}/public`,
    reviews: (id) => `/users/${id}/reviews`
  },
  rides: {
    search: '/rides/search',
    offer: '/rides/offer',
    estimatePrice: '/rides/estimate-price',
    myOffers: '/rides/my-offers',
    byId: (id) => `/rides/${id}`,
    chat: (id) => `/rides/${id}/chat`,
    update: (id) => `/rides/${id}`,
    cancel: (id) => `/rides/${id}`
  },
  rideRequests: {
    estimate: '/ride-requests/estimate',
    create: '/ride-requests',
    active: '/ride-requests/active',
    current: '/ride-requests/current',
    incoming: '/ride-requests/incoming',
    byId: (id) => `/ride-requests/${id}`,
    chat: (id) => `/ride-requests/${id}/chat`,
    expandWave: (id) => `/ride-requests/${id}/expand-wave`,
    location: (id) => `/ride-requests/${id}/location`,
    pingHere: (id) => `/ride-requests/${id}/ping-here`,
    start: (id) => `/ride-requests/${id}/start`,
    complete: (id) => `/ride-requests/${id}/complete`,
    fare: (id) => `/ride-requests/${id}/fare`,
    driverRespond: (id) => `/ride-requests/${id}/respond`,
    offerRespond: (id, offerId) => `/ride-requests/${id}/offers/${offerId}/respond`
  },
  bookings: {
    book: '/bookings/book',
    activeCommitment: '/bookings/active-commitment',
    myTrips: '/bookings/my-trips',
    incoming: '/bookings/incoming',
    history: '/bookings/history',
    byId: (id) => `/bookings/${id}`,
    liveSeats: (rideId) => `/bookings/ride/${rideId}/seats`,
    liveMap: (rideId) => `/bookings/ride/${rideId}/live-map`,
    fareQuote: (rideId) => `/bookings/ride/${rideId}/fare-quote`,
    completeRide: (rideId) => `/bookings/ride/${rideId}/complete`,
    startRide: (rideId) => `/bookings/ride/${rideId}/start`,
    startCandidates: (rideId) => `/bookings/ride/${rideId}/start-candidates`,
    updateStatus: (id) => `/bookings/${id}/status`,
    cancel: (id) => `/bookings/${id}/cancel`,
    prepareRefund: (id) => `/bookings/${id}/refund/prepare`
  },
  notifications: {
    list: '/notifications',
    markAllRead: '/notifications/read-all',
    markRead: (id) => `/notifications/${id}/read`
  },
  communities: '/communities',
  maps: {
    bootstrap: '/maps/bootstrap',
    autocomplete: '/maps/places/autocomplete',
    placeDetails: '/maps/places/details',
    reverseGeocode: '/maps/geocode/reverse',
    directions: '/maps/directions',
    distanceMatrix: '/maps/distance-matrix',
    nearbyRides: '/maps/nearby-rides',
    routeSuggestions: '/maps/route-suggestions'
  }
};

export default endpoints;
