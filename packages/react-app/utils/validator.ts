export const E164_REGEX = /^\+[1-9][0-9]{1,14}$/;

export function validatePhoneNumber(phoneNumber: string): boolean {
  if (E164_REGEX.test(phoneNumber)) {
    return true;
  }
  return false;
}
