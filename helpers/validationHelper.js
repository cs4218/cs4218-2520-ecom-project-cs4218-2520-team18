// Loh Ze Qing Norbert, A0277473R

export const validateEmail = (email) => {
    const emailRegex = /^((?:[A-Za-z0-9!#$%&'*+\-\/=?^_`{|}~]|(?<=^|\.)"|"(?=$|\.|@)|(?<=".*)[ .](?=.*")|(?<!\.)\.){1,64})(@)((?:[A-Za-z0-9.\-])*(?:[A-Za-z0-9])\.(?:[A-Za-z0-9]){2,})$/gm;
    return emailRegex.test(email);
}

export const validatePhoneE164 = (phone) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
    return phoneRegex.test(phone);
}

export const validatePassword = (password) => {
    if (!password || password.length < 6) {
        return false;
    }
    return true;
}

export const validateName = (name) => {
    // Name should be between 1 and 100 characters
    if (!name || name.trim().length === 0 || name.trim().length > 100) {
        return false;
    }
    return true;
}

export const validateDOB = (DOB) => {
    const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dobRegex.test(DOB)) return false;

    const [year, month, day] = DOB.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    return date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day;
}

export const validateDOBNotFuture = (DOB) => {
    const dob = new Date(DOB);
    const today = new Date();
    return dob < today;
}
