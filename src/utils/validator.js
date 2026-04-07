/**
 * Validation utilities
 */

export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const isValidPassword = (password) => {
  // Minimum 6 characters
  return password && password.length >= 6;
};

export const isValidName = (name) => {
  return name && name.trim().length >= 2;
};

export const isValidTeamName = (teamName) => {
  return teamName && teamName.trim().length >= 2;
};

export const isValidPhoneNumber = (phone) => {
  const re = /^\d{10}$/;
  return re.test(phone.replace(/\D/g, ''));
};

export const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

export const validateCaptainData = (data) => {
  const errors = [];
  
  if (!isValidName(data.name)) errors.push('Invalid captain name');
  if (!isValidEmail(data.email)) errors.push('Invalid email address');
  
  return errors;
};

export const validateTeamData = (data) => {
  const errors = [];
  
  if (!isValidTeamName(data.teamName)) errors.push('Invalid team name');
  if (!data.captainId) errors.push('Captain ID is required');
  
  return errors;
};

export const validateMemberData = (data) => {
  const errors = [];
  
  if (!isValidName(data.memberName)) errors.push('Invalid member name');
  if (!data.teamId) errors.push('Team ID is required');
  
  return errors;
};
