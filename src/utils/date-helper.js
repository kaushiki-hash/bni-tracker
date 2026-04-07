/**
 * Date helper utilities
 */

export const formatDate = (date, format = 'DD/MM/YYYY') => {
  if (!date) return '';
  
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  if (format === 'DD/MM/YYYY') return `${day}/${month}/${year}`;
  if (format === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
  if (format === 'MM/DD/YYYY') return `${month}/${day}/${year}`;
  
  return `${day}/${month}/${year}`;
};

export const parseDate = (dateString, format = 'DD/MM/YYYY') => {
  if (!dateString) return null;
  
  let parts;
  if (format === 'DD/MM/YYYY') {
    parts = dateString.split('/');
    return new Date(parts[2], parts[1] - 1, parts[0]);
  } else if (format === 'YYYY-MM-DD') {
    return new Date(dateString);
  }
  
  return new Date(dateString);
};

export const getThisWeekStart = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

export const getThisWeekEnd = () => {
  const start = getThisWeekStart();
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
};

export const isThisWeek = (date) => {
  const d = new Date(date);
  const start = getThisWeekStart();
  const end = getThisWeekEnd();
  return d >= start && d <= end;
};

export const getDaysDifference = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};
