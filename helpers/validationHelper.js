export const validateEmail = (email) => {
    const emailRegex = /^((?:[A-Za-z0-9!#$%&'*+\-\/=?^_`{|}~]|(?<=^|\.)"|"(?=$|\.|@)|(?<=".*)[ .](?=.*")|(?<!\.)\.){1,64})(@)((?:[A-Za-z0-9.\-])*(?:[A-Za-z0-9])\.(?:[A-Za-z0-9]){2,})$/gm;
    return emailRegex.test(email);
}

export const validatePhone = (phone) => {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
}

export const validatePhoneE164 = (phone) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
    return phoneRegex.test(phone);
}

export const validatePassword = (password) => {
    if (password.length < 6) {
        return false;
    }
    return true;
}

export const validateDOB = (DOB) => {
    const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
    return dobRegex.test(DOB);
}

export const validateDOBNotFuture = (DOB) => {
    const dob = new Date(DOB);
    const today = new Date();
    return dob < today;
}
