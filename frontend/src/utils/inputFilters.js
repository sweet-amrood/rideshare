/** Strip non-digits (phone, OTP, numeric fields). */
export const filterDigits = (value) => String(value ?? '').replace(/\D/g, '');

/** Username: letters, numbers, underscore only. */
export const filterUsername = (value) => String(value ?? '').replace(/[^a-zA-Z0-9_]/g, '');

/** Person name: letters, spaces, apostrophe, hyphen, period. */
export const filterPersonName = (value) => String(value ?? '').replace(/[^a-zA-Z\s'.-]/g, '');

/** Alphanumeric with spaces (e.g. plate, general text). */
export const filterAlphanumeric = (value) => String(value ?? '').replace(/[^a-zA-Z0-9\s]/g, '');

/** License plate style: alphanumeric and hyphen. */
export const filterPlate = (value) => String(value ?? '').replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();

export const inputHandlers = {
  digitsOnly: (setter) => ({
    inputMode: 'numeric',
    autoComplete: 'tel',
    onChange: (e) => setter(filterDigits(e.target.value))
  }),
  username: (setter) => ({
    autoComplete: 'username',
    onChange: (e) => setter(filterUsername(e.target.value))
  }),
  personName: (setter) => ({
    autoComplete: 'name',
    onChange: (e) => setter(filterPersonName(e.target.value))
  }),
  plate: (setter) => ({
    onChange: (e) => setter(filterPlate(e.target.value))
  })
};
