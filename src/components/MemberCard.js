export const createMemberCard = (member, lastWeekStatus) => {
  return `
    <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4" id="card-${member.id}">
      <div class="flex justify-between items-center mb-3">
        <h3 class="font-bold text-slate-800 text-lg">${member.name}</h3>
        <span class="text-xs px-2 py-1 rounded-full ${lastWeekStatus === 'Yes' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
          Last Week: ${lastWeekStatus === 'Yes' ? '✅' : '❌'}
        </span>
      </div>

      <div class="flex items-center gap-4 mb-4">
        <span class="text-sm font-medium">Present?</span>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked class="sr-only peer" onchange="window.toggleAbsenceFields('${member.id}')" id="status-${member.id}">
          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
        </label>
      </div>

      <div id="absence-fields-${member.id}" class="hidden space-y-3 pt-3 border-t border-dashed border-slate-200">
        <div>
          <label class="block text-xs font-semibold text-slate-500 uppercase">Reason for Absence</label>
          <select id="reason-${member.id}" class="w-full mt-1 p-2 bg-slate-50 border border-slate-300 rounded-md text-sm">
            <option value="">Select Reason</option>
            <option value="Medical">Medical</option>
            <option value="Travel">Travel</option>
            <option value="Work">Work</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <input type="checkbox" id="intimation-${member.id}" class="rounded text-cyan-600">
          <label class="text-sm text-slate-600">Prior Intimation Received?</label>
        </div>
      </div>
    </div>
  `;
};
