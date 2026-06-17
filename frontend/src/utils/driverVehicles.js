/** Approved car required for carpool publish tab */
export function hasApprovedCar(vehicles = []) {
  return vehicles.some(
    (v) => v.vehicleType === 'CAR' && (v.verificationStatus === 'APPROVED' || v.status === 'APPROVED')
  );
}

export function approvedCarVehicles(vehicles = []) {
  return vehicles.filter(
    (v) => v.vehicleType === 'CAR' && (v.verificationStatus === 'APPROVED' || v.status === 'APPROVED')
  );
}
