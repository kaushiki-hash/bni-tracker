window.toggleAbsenceFields = (memberId) => {
  const isPresent = document.getElementById(`status-${memberId}`).checked;
  const fields = document.getElementById(`absence-fields-${memberId}`);
  
  if (isPresent) {
    fields.classList.add('hidden');
  } else {
    fields.classList.remove('hidden');
  }
};
