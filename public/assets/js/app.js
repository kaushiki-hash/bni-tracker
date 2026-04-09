import { db } from './db/firebase-config.js';
import { 
    collection, query, where, getDocs, writeBatch, doc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const memberListContainer = document.getElementById('member-list-container');
const saveBtn = document.getElementById('save-attendance-btn');

// 1. INITIALIZE & LOAD MEMBERS
async function loadDashboard() {
    const teamId = localStorage.getItem("teamId");
    if (!teamId) return;

    try {
        const q = query(collection(db, "members"), where("teamId", "==", teamId));
        const querySnapshot = await getDocs(q);
        memberListContainer.innerHTML = ""; 

        querySnapshot.forEach((memberDoc) => {
            renderMemberCard(memberDoc.id, memberDoc.data());
        });
    } catch (error) {
        console.error("Load Error:", error);
    }
}

// 2. RENDER THE CARD WITH EVENT LISTENERS
function renderMemberCard(id, data) {
    const card = document.createElement('div');
    card.className = "member-card bg-white rounded-2xl p-4 shadow-sm border-l-4 border-green-500 mb-4";
    card.dataset.memberId = id;
    
    card.innerHTML = `
        <div class="flex justify-between items-center mb-3">
            <div>
                <h3 class="font-bold text-slate-800">${data.memberName}</h3>
                <p class="text-[10px] uppercase font-bold text-slate-400">Prev: <span id="prev-${id}">Loading...</span></p>
            </div>
            <div class="inline-flex bg-slate-100 p-1 rounded-xl">
                <button type="button" id="p-btn-${id}" class="status-btn px-4 py-1.5 rounded-lg font-bold text-sm bg-green-500 text-white">P</button>
                <button type="button" id="a-btn-${id}" class="status-btn px-4 py-1.5 rounded-lg font-bold text-sm text-slate-400">A</button>
            </div>
        </div>
        <div id="absent-fields-${id}" class="hidden space-y-3 pt-3 border-t border-slate-50 mt-2">
            <select id="reason-${id}" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm">
                <option value="">Select Reason</option>
                <option value="Medical">Medical</option>
                <option value="Business">Business</option>
                <option value="Personal">Personal</option>
            </select>
            <div class="flex items-center gap-2">
                <input type="checkbox" id="intimation-${id}" class="w-4 h-4">
                <label class="text-sm text-slate-600 font-medium">Prior Intimation?</label>
            </div>
        </div>
    `;

    memberListContainer.appendChild(card);

    // Wire up the toggles
    const pBtn = card.querySelector(`#p-btn-${id}`);
    const aBtn = card.querySelector(`#a-btn-${id}`);
    const absentFields = card.querySelector(`#absent-fields-${id}`);

    pBtn.onclick = () => {
        absentFields.classList.add('hidden');
        pBtn.className = "px-4 py-1.5 rounded-lg font-bold text-sm bg-green-500 text-white";
        aBtn.className = "px-4 py-1.5 rounded-lg font-bold text-sm text-slate-400";
        card.classList.replace('border-red-500', 'border-green-500');
    };

    aBtn.onclick = () => {
        absentFields.classList.remove('hidden');
        aBtn.className = "px-4 py-1.5 rounded-lg font-bold text-sm bg-red-600 text-white";
        pBtn.className = "px-4 py-1.5 rounded-lg font-bold text-sm text-slate-400";
        card.classList.replace('border-green-500', 'border-red-500');
    };
}

// 3. THE BATCH SAVE FUNCTION
saveBtn.addEventListener('click', async () => {
    const batch = writeBatch(db);
    const cards = document.querySelectorAll('.member-card');
    const today = new Date().toISOString().split('T')[0];

    for (const card of cards) {
        const id = card.dataset.memberId;
        const isAbsent = !card.querySelector(`#absent-fields-${id}`).classList.contains('hidden');
        const reason = card.querySelector(`#reason-${id}`).value;
        const intimation = card.querySelector(`#intimation-${id}`).checked;

        if (isAbsent && !reason) {
            alert("Please provide a reason for all absent members.");
            return;
        }

        const attendanceRef = doc(collection(db, "attendance"));
        batch.set(attendanceRef, {
            memberId: id,
            meetingDate: today,
            presentStatus: isAbsent ? "No" : "Yes",
            absenceReason: isAbsent ? reason : "",
            priorIntimation: isAbsent ? intimation : false,
            timestamp: serverTimestamp(),
            teamId: localStorage.getItem("teamId")
        });
    }

    try {
        saveBtn.innerText = "Saving...";
        await batch.commit();
        alert("Attendance Logged Successfully!");
        window.location.href = 'home.html';
    } catch (err) {
        console.error("Save failed:", err);
        alert("Error saving data.");
        saveBtn.innerText = "Save Team Attendance";
    }
});

loadDashboard();
