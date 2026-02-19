export const isEmpty = (value) => {
  return value === undefined || value === null || String(value).trim() === "";
};

export const isValidEmail = (email) => {
  if (isEmpty(email)) return false;
  const emailRegex = /^((?:[A-Za-z0-9!#$%&'*+\-/=?^_`{|}~]|(?<=^|\.)"|"(?=$|\.|@)|(?<=".*)[ .](?=.*")|(?<!\.)\.){1,64})(@)((?:[A-Za-z0-9.\-])*(?:[A-Za-z0-9])\.(?:[A-Za-z0-9]){2,})$/gm;
  return emailRegex.test(email);
};

export const isValidPhone = (phone) => {
  if (isEmpty(phone)) return false;
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(String(phone).trim());
};

export const isValidDOBFormat = (dob) => {
  if (isEmpty(dob)) return false;
  const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
  return dobRegex.test(dob);
};

export const isValidDOBStrict = (dob) => {
  // strict calendar validation (detects 2021-02-30)
  if (!isValidDOBFormat(dob)) return false;
  const [yStr, mStr, dStr] = dob.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  const dobDate = new Date(y, m - 1, d);
  return (
    dobDate.getFullYear() === y &&
    dobDate.getMonth() === m - 1 &&
    dobDate.getDate() === d
  );
};

export const isDOBNotFuture = (dob) => {
  // Empty DOB should be treated as invalid (DOB is required)
  if (isEmpty(dob)) return false;
  // Parse date string as YYYY-MM-DD in local timezone
  const [year, month, day] = dob.split("-").map(Number);
  const dobDate = new Date(year, month - 1, day);
  const now = new Date();
  // Compare dates at midnight
  dobDate.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return dobDate < now;
};

export const isPasswordLongEnough = (password, min = 6) => {
  return String(password).length >= min;
};

export default {
  isEmpty,
  isValidEmail,
  isValidPhone,
  isValidDOBFormat,
  isValidDOBStrict,
  isDOBNotFuture,
  isPasswordLongEnough,
};
