'use strict';

// ==========================================================================
//   DATA STORE & CONFIGURATION
// ==========================================================================

const CAPITATION_VOTEHEADS = [
    { name: 'Local Transport & Travel, BOG, Capacity Building', weight: 40 },
    { name: 'Electricicity, Water & Bank Charges', weight: 25 },
    { name: 'Personnel Emoluments, NSSF,SHIF', weight: 20 },
    { name: 'Tools, Equipment, Instructional Materials, Internal Exams', weight: 10 },
    { name: 'Office Stationery', weight: 5 }
];
const TOTAL_CAPITATION_WEIGHT = CAPITATION_VOTEHEADS.reduce((sum, v) => sum + v.weight, 0);

const store = {
    students: [],
    staff: [],
    finance: [],
    capitation: [],
    expenditure: [],
    inventory: [],
    exams: [],
    externalExams: [],
    voteheads: [],
    settings: {
        schoolName: 'TVET Manager Pro',
        schoolCode: 'TVT/2026/001',
        motto: 'Excellence in Competence',
        vision: 'To be a center of excellence in technical training.',
        mission: 'To provide quality training for national development.',
        address: 'P.O. Box 123, Nairobi',
        phone: '0712 345 678',
        email: 'info@tvet.ac.ke',
        website: 'www.tvet.ac.ke',
        principal: 'Mr. Nanja',
        examsOfficer: 'Mrs. Opongi',
        logo: null,
        stamp: null,
        academicYear: '2025/2026',
        currentTerm: 'Term 1',
        bankName: 'National Bank',
        bankAccount: '0123456789'
    },
    trades: [
        { id: 'elec_inst', name: 'Electrical Installation', fee: 7500, code: 'EI', levels: ['Level 3', 'Level 4', 'Level 5'], units: [{ code: 'EI001', name: 'Safety Precautions' }, { code: 'EI002', name: 'Domestic Installation' }, { code: 'EI003', name: 'Industrial Wiring' }, { code: 'EI004', name: 'Panel Assembly' }] },
        { id: 'mvm', name: 'Motor Vehicle Mechanics', fee: 7000, code: 'MV', levels: ['Level 3', 'Level 4', 'Level 5'], units: [{ code: 'MV001', name: 'Engine Systems' }, { code: 'MV002', name: 'Transmission' }, { code: 'MV003', name: 'Braking Systems' }] },
        { id: 'fashion', name: 'Fashion Design', fee: 5500, code: 'FD', levels: ['Level 3', 'Level 4', 'Level 5'], units: [{ code: 'FD001', name: 'Pattern Drafting' }, { code: 'FD002', name: 'Garment Construction' }] },
        { id: 'ict', name: 'Information Communication Technology', fee: 6500, code: 'ICT', levels: ['Level 3', 'Level 4', 'Level 5'], units: [{ code: 'ICT001', name: 'Computer Application' }, { code: 'ICT002', name: 'Networking Essentials' }, { code: 'ICT003', name: 'Web Development' }, { code: 'ICT004', name: 'Database Systems' }] }
    ],
    wards: ['Idakho Central', 'Idakho East', 'Idakho North', 'Idakho South']
};

const ADMIN_PASSWORD = 'admin123';
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect fill='%23e2e8f0' width='150' height='150'/%3E%3Ctext fill='%2394a3b8' font-family='sans-serif' font-size='14' x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle'%3ENo Photo%3C/text%3E%3C/svg%3E";

// State variables
let currentView = { students: 'grid', staff: 'grid', inventory: 'grid', exams: 'grid' };
let currentPage = 1;
const itemsPerPage = 9;
let currentStudentId = null;
let currentPayMethod = 'Cash';
let pendingAction = null;
let pendingActionData = null;
let currentExamContext = { studentId: null, tradeId: null };
let currentEvidenceFiles = [];
let financePage = 1;
const financePerPage = 5;
let capitationPage = 1;
const capitationPerPage = 5;
let expenditurePage = 1;
const expenditurePerPage = 5;
let batchQueue = [];
let currentDashChartType = 'enrollment';
let currentExtExamFiles = []; // Stores files temporarily while editing/adding
const AI_CURRICULUM_ASSISTANT_URL = "https://your-actual-ai-endpoint.com/query";

// ==========================================================================
//   UTILITY FUNCTIONS
// ==========================================================================

const $ = id => document.getElementById(id);
const getVal = id => $(id) ? $(id).value.trim() : '';
const setVal = (id, val) => { if ($(id)) $(id).value = val; };

const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => { clearTimeout(timeout); func(...args); };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatCurrency(num) { return 'KES ' + (num || 0).toLocaleString(); }
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }

function showToast(msg, type = 'success') {
    let toast = $('toast');
    if (!toast) { const container = document.createElement('div'); container.id = 'toast'; container.className = 'toast'; document.body.appendChild(container); toast = container; }
    toast.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : type === 'info' ? 'fa-circle-info' : 'fa-circle-check'}"></i> <span>${msg}</span>`;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function openModal(id) {
    if ($(id)) {
        $(id).classList.add('active');
        document.body.style.overflow = 'hidden';
        if (id === 'studentReportModal') currentPage = 1;

        if (id === 'expenditureModal') {
            $('expenditureForm')?.reset();
            if ($('expEditId')) $('expEditId').value = '';
            $('expMethodDynamicFields').innerHTML = '';
            const modalTitle = document.querySelector('#expenditureModal h3');
            if (modalTitle) modalTitle.innerText = "Record Expenditure (Payment Out)";
            const cashBtn = document.querySelector('#expMethodGroup .btn[data-exp-method="Cash"]');
            if (cashBtn) setExpPayMethod('Cash', cashBtn);
            initExpenditureForm();
        }
        if (id === 'capitationModal') {
            initializeCapitationForm();
        }
        if (id === 'aiAssistantModal') {
            initAIAssistant();
        }
        if (id === 'externalExamModal') {
            $('externalExamForm')?.reset();
            if ($('extStudentId')) $('extStudentId').value = '';
            if ($('extEditId')) $('extEditId').value = ''; 
            $('extStudentResults').innerHTML = '';
            $('extStudentResults').style.display = 'none';
            
            // --- ADD THIS LINE ---
            // UPDATE: Target the "July" option of the current year
             const currentYear = new Date().getFullYear();
        if ($('extExamSeries')) $('extExamSeries').value = "July " + currentYear;
    
            // ---------------------

            const modalTitle = document.querySelector('#externalExamModal h3');
            if (modalTitle) modalTitle.innerText = "Register External Exam Candidate";
        }
        if (id === 'voteheadModal') {
            initVoteheadEditor();
        }
    }
}

function closeModal(id) { if ($(id)) { $(id).classList.remove('active'); document.body.style.overflow = ''; } }

// ==========================================================================
//   GENERIC REPOSITORY
// ==========================================================================

function createRepository(entityKey) {
    return {
        getAll: () => store[entityKey] || [],
        getById: (id) => (store[entityKey] || []).find(item => item.id === id),
        findBy: (field, value) => (store[entityKey] || []).filter(item => item[field] === value),
        create: (item) => { if (!item.id) item.id = generateId(); if (!store[entityKey]) store[entityKey] = []; store[entityKey].unshift(item); saveData(); return item; },
        update: (id, updates) => { const index = store[entityKey].findIndex(item => item.id === id); if (index !== -1) { store[entityKey][index] = { ...store[entityKey][index], ...updates }; saveData(); return true; } return false; },
        delete: (id) => { const initialLength = store[entityKey].length; store[entityKey] = store[entityKey].filter(item => item.id !== id); if (store[entityKey].length < initialLength) { saveData(); return true; } return false; },
        count: () => (store[entityKey] || []).length
    };
}

const StudentRepo = createRepository('students');
const ExternalExamRepo = createRepository('externalExams');
const StaffRepo = createRepository('staff');
const FinanceRepo = createRepository('finance');
const InventoryRepo = createRepository('inventory');
const CapitationRepo = createRepository('capitation');
const ExpenditureRepo = createRepository('expenditure');


// ==========================================================================
//   INITIALIZATION
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initTheme();
    initGlobalListeners();
    initApp();
    setTimeout(() => { const loader = $('appLoader'); if (loader) loader.style.display = 'none'; }, 800);
});

async function saveData() {
    // 1. ALWAYS SAVE LOCAL (for speed)
    try { 
        localStorage.setItem('tvetProData', JSON.stringify(store)); 
    } catch (e) { console.error('Error saving local', e); }

    // 2. TRY TO SYNC TO SERVER (so PC sees changes)
    try {
        const response = await fetch('/api/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(store)
        });
        
        if (response.ok) {
            console.log('💾 Data synced to server successfully');
        } else {
            console.warn('⚠️ Failed to sync to server (Changes saved locally only)');
        }
    } catch (err) {
        console.warn('⚠️ Network error. Data is safe locally but not synced to PC.');
    }
}
function loadData() { try { const data = localStorage.getItem('tvetProData'); if (data) { const parsed = JSON.parse(data); Object.keys(parsed).forEach(key => { if (store.hasOwnProperty(key)) { if (key === 'trades' && parsed.trades && parsed.trades.length > 0) { store.trades = parsed.trades; } else if (key !== 'trades') { store[key] = parsed[key]; } } }); } } catch (e) { console.error("Error loading data", e); } }

function initApp() {
    repairExpenditureData();
    initVoteheads();
    if (StudentRepo.count() === 0) populateDemoData();
    populateDropdowns();
    reconcileStudentBalances();
    renderDashboard();
    updateSettingsForm();
    updateHeaderAndDashboard();
    startClock();
    currentView = { students: 'grid', staff: 'grid', inventory: 'grid', exams: 'grid' };
    if ($('reportDate')) $('reportDate').valueAsDate = new Date();
}

// ==========================================================================
//   INITIALIZE EXPENDITURE FORM (UPDATED)
// ==========================================================================
function initExpenditureForm() {
    const grid = $('expAllocationGrid');
    if (!grid) return;
    
    // Reset the grid
    grid.innerHTML = '';
    
    // Add one empty row by default
    addExpVoteheadRow();
    
    // Reset totals display
    updateExpAllocationTotals();

    // Ensure a default method is selected visually and logically
    // We look for the Cash button
    const cashBtn = document.querySelector('#expMethodGroup .btn[data-exp-method="Cash"]');
    if (cashBtn) {
        setExpPayMethod('Cash', cashBtn);
    } else {
        // Fallback if button not found
        const dummyBtn = { parentElement: null }; 
        setExpPayMethod('Cash', dummyBtn);
    }
}

function initVoteheads() {
    const expectedCount = CAPITATION_VOTEHEADS.length;
    const needsUpdate = !store.voteheads
        || store.voteheads.length === 0
        || store.voteheads.length !== expectedCount
        || store.voteheads.some((v, i) => v.name !== CAPITATION_VOTEHEADS[i].name);

    if (needsUpdate) {
        store.voteheads = CAPITATION_VOTEHEADS.map(v => ({ name: v.name, weight: v.weight }));
        saveData();
        console.log(`Voteheads synced to ${expectedCount} items.`);
    }
}

function repairExpenditureData() {
    let fixed = 0;
    if (!store.expenditure) return;
    store.expenditure.forEach(e => {
        if (!e.method || e.method === 'undefined') { e.method = 'Cash'; fixed++; }
        e.method = e.method.charAt(0).toUpperCase() + e.method.slice(1).toLowerCase();
    });
    if (fixed > 0) { saveData(); console.log(`Repaired ${fixed} expenditure records.`); }
}

function populateDemoData() {
    // The app starts empty — users add their own real records.
}
function calculateVoteheadAllocation(totalAmount) {
    const allocation = {};
    const voteheads = store.voteheads || [];
    voteheads.forEach(v => { allocation[v.name] = (v.weight / 100) * totalAmount; });
    return allocation;
}

function reconcileStudentBalances() {
    let corrections = 0;
    const students = StudentRepo.getAll();
    const financeRecords = FinanceRepo.getAll();
    students.forEach(student => {
        const totalPaid = financeRecords.filter(f => f.studentId === student.id).reduce((sum, f) => sum + (f.amount || 0), 0);
        const trade = store.trades.find(t => t.id === student.tradeId);
        if (trade) {
            const correctTotal = trade.fee + 5000;
            if (student.totalFees !== correctTotal) { student.totalFees = correctTotal; corrections++; }
        } else { if (!student.totalFees) student.totalFees = 0; }
        const correctBalance = (student.totalFees || 0) - totalPaid;
        if (student.fees !== correctBalance) { student.fees = correctBalance; corrections++; }
    });
    if (corrections > 0) { saveData(); console.log(`Reconciled ${corrections} records.`); }
}

// ==========================================================================
//   THEME & CLOCK
// ==========================================================================
function initTheme() {
    const themeToggle = $('themeToggle');
    const html = document.documentElement;
    const savedTheme = localStorage.getItem('theme') || 'light';
    html.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = html.getAttribute('data-theme');
            const newTheme = current === 'light' ? 'dark' : 'light';
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }
}
function updateThemeIcon(theme) {
    const themeToggle = $('themeToggle');
    if (themeToggle) {
        themeToggle.innerHTML = theme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    }
}
function startClock() {
    const clockEl = $('liveClock');
    const dateEl = $('liveDate');
    if (!clockEl && !dateEl) return;
    const tick = () => {
        const now = new Date();
        if (clockEl) clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if (dateEl) dateEl.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    };
    tick();
    setInterval(tick, 1000);
}
// ==========================================================================
//   ATTACHMENT VIEWER (Ensure this is defined before initGlobalListeners)
// ==========================================================================

function viewAttachments(examId) {
    const exam = ExternalExamRepo.getById(examId);
    if (!exam || !exam.attachments || exam.attachments.length === 0) {
        return showToast('No attachments found for this record.', 'info');
    }

    const container = $('attachmentViewerContainer');
    const noMsg = $('noAttachmentsMsg');
    if (container) container.innerHTML = '';
    if (noMsg) noMsg.style.display = 'none';

    exam.attachments.forEach(file => {
        const isPdf = file.type === 'application/pdf';
        const div = document.createElement('div');
        div.className = 'ext-file-item';
        
        if (isPdf) {
            div.innerHTML = `
                <div style="text-align:center; padding:10px;">
                    <i class="fa-solid fa-file-pdf pdf-icon"></i>
                    <div style="font-size:0.75rem; margin-top:5px; word-break:break-all;">${file.name}</div>
                    <a href="${file.data}" download="${file.name}" class="btn btn-sm btn-primary" style="margin-top:5px; display:inline-block;">Download</a>
                </div>
            `;
        } else {
            div.innerHTML = `
                <img src="${file.data}" alt="${file.name}" style="cursor:zoom-in;" onclick="openImageLightbox('${file.data}')">
                <div style="font-size:0.7rem; position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.7); color:white; padding:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${file.name}</div>
            `;
        }
        if(container) container.appendChild(div);
    });

    openModal('viewAttachmentsModal');
}

function openImageLightbox(src) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:9999; display:flex; align-items:center; justify-content:center; cursor:zoom-out;';
    overlay.innerHTML = `<img src="${src}" style="max-width:90%; max-height:90%; border-radius:4px; box-shadow:0 0 20px rgba(0,0,0,0.5);">`;
    overlay.onclick = () => overlay.remove();
    document.body.appendChild(overlay);
}
// ==========================================================================
//   GLOBAL EVENT LISTENERS
// ==========================================================================
function initGlobalListeners() {
    document.body.addEventListener('click', e => {
        const target = e.target;

        const navItem = target.closest('[data-page]');
        if (navItem) return router(navItem.dataset.page, navItem);

        const financeFilterBtn = target.closest('.finance-filter-btn');
        if (financeFilterBtn) {
            const source = financeFilterBtn.dataset.source;
            const group = financeFilterBtn.closest('.btn-group');
            if (group) {
                group.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
                financeFilterBtn.classList.add('active');
            }
            filterFinanceSource(source);
        }

        const modalTrigger = target.closest('[data-modal]');
        if (modalTrigger) return openModal(modalTrigger.dataset.modal);

        if (target.classList.contains('modal-backdrop') || target.matches('[data-dismiss="modal"]')) {
            const modal = target.closest('.modal-backdrop');
            if (modal) return closeModal(modal.id);
        }

        const viewBtn = target.closest('[data-view]');
        if (viewBtn) {
            const section = viewBtn.dataset.section;
            const viewType = viewBtn.dataset.view;
            currentView[section] = viewType;
            const group = viewBtn.closest('.btn-group');
            if (group) {
                group.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
                viewBtn.classList.add('active');
            }
            ({ students: applyFilters, staff: renderStaff, inventory: renderInventory, exams: renderExamView }[section] || (() => { }))();
            return;
        }

        const chartTab = target.closest('[data-chart]');
        if (chartTab) {
            const group = chartTab.closest('.tab-control');
            if (group) {
                group.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                chartTab.classList.add('active');
            }
            currentDashChartType = chartTab.dataset.chart;
            renderDashboardChart(currentDashChartType);
            return;
        }

        const collapseToggle = target.closest('.collapse-toggle-icon, .header-title-group');
        if (collapseToggle) {
            const card = collapseToggle.closest('.collapsible-card');
            if (card) {
                const content = card.querySelector('.collapsible-content');
                const icon = card.querySelector('.collapse-toggle-icon');
                if (content) {
                    content.classList.toggle('collapsed');
                    if (icon) icon.classList.toggle('rotated');
                }
            }
            return;
        }

        if (target.closest('#btnFinPrev')) { financePage--; renderFinance(); }
        if (target.closest('#btnFinNext')) { financePage++; renderFinance(); }
        if (target.closest('#btnCapPrev')) { capitationPage--; renderFinance(); }
        if (target.closest('#btnCapNext')) { capitationPage++; renderFinance(); }
        if (target.closest('#btnExpPrev')) { expenditurePage--; renderExpenditureList(); }
        if (target.closest('#btnExpNext')) { expenditurePage++; renderExpenditureList(); }

        const extAutoItem = target.closest('.autocomplete-item[data-ext-id]');
        if (extAutoItem) {
            const id = extAutoItem.dataset.extId;
            const s = StudentRepo.getById(id);
            if (s) {
                $('extStudentId').value = id;
                $('extStudentSearch').value = s.name;
                $('extStudentResults').style.display = 'none';
                if (s.level) $('extExamLevel').value = s.level;
            }
        }

        const actionBtn = target.closest('[data-action]');
if (actionBtn) {
    // --- FIX IS HERE: Prevent default behavior for ALL action buttons ---
    e.preventDefault();
    e.stopPropagation(); 
    // --------------------------------------------------------------------
    // --- ADD THIS BLOCK ---
    
    const action = actionBtn.dataset.action;
    const id = actionBtn.dataset.id;
    const type = actionBtn.dataset.type;

    if (action === 'edit') { 
    if (type === 'staff') { 
        openStaffModal(id); // Call openStaffModal, NOT editStaff directly
    } else { 
        editStudent(id); 
    } 
    }
    
    if (action === 'delete') { 
        if (type === 'staff') { 
            // You can remove the old e.preventDefault() lines here too
            deleteStaff(id); 
        } else { 
            secureDelete(id); 
        } 
    }
    if (action === 'viewAttachments') { 
            viewAttachments(id); 
        }
        
    if (action === 'view') viewStudent(id);
    if (action === 'payment') openPaymentFor(id);
    if (action === 'editInv') openInventoryModal(id);
    if (action === 'receipt') generateOfficialReceipt(id);
    if (action === 'editExp') editExpenditure(id);
    if (action === 'deleteExp') deleteExpenditure(id);
    
    // These were likely the ones causing the immediate disappear:
    if (action === 'openInventoryModal') openInventoryModal();
    if (action === 'openStaffModal') openStaffModal();
    
    if (action === 'openCourseModal') { 
        $('courseModalTitle').innerText = "Add New Course"; 
        $('courseForm')?.reset(); 
        if ($('courseEditId')) $('courseEditId').value = ''; 
        openModal('courseModal'); 
    }

    if (action === 'manage-units') openUnitsModal(id);
    if (action === 'edit-curriculum') editCourse(id); 
    if (action === 'delete-course') deleteCourse(id);
    if (action === 'edit-unit') editUnit(actionBtn.dataset.courseId, actionBtn.dataset.code);
    if (action === 'delete-unit') deleteUnit(actionBtn.dataset.courseId, actionBtn.dataset.code);
    
    // External Exams Actions
    if (action === 'viewExtExam') viewExtExam(id);
    if (action === 'editExtExam') editExtExam(id);
    if (action === 'deleteExtExam') deleteExtExam(id);
    
    return;
}

        const stepBtn = target.closest('[data-step]');
        if (stepBtn) { const current = parseInt(stepBtn.dataset.current); if (stepBtn.dataset.step === 'next') nextStep(current, current + 1); if (stepBtn.dataset.step === 'prev') prevStep(current, current - 1); }

        const staffStepBtn = target.closest('[data-staff-step]');
        if (staffStepBtn) { const current = parseInt(staffStepBtn.dataset.current); if (staffStepBtn.dataset.staffStep === 'next') nextStaffStep(current, current + 1); if (staffStepBtn.dataset.staffStep === 'prev') prevStaffStep(current, current - 1); }

        const payBtn = target.closest('[data-method]');
        if (payBtn) setPayMethod(payBtn.dataset.method, payBtn);
        const expPayBtn = target.closest('[data-exp-method]');
        if (expPayBtn) setExpPayMethod(expPayBtn.dataset.method, expPayBtn);

        if (target.closest('#btnToggleSidebar')) toggleSidebar();
        if (target.closest('#btnNotify')) showToast('System Updated');
        if (target.closest('#btnUploadLogo')) $('logoInput').click();
        if (target.closest('#btnUploadStamp')) $('stampInput').click();
        if (target.closest('#btnImportBackup')) $('importFile').click();
        if (target.closest('#btnExportBackup')) exportBackup();
        if (target.closest('#btnConfirmAuth')) confirmAuth();
        if (target.closest('#togglePwd')) togglePasswordVisibility();
        if (target.closest('#btnGenStudentReport')) generateOfficialStudentReport();
        if (target.closest('#btnGenFinReport')) handleFinanceReportAction();
        if (target.closest('#btnGenCert')) generateCertificatePDF();
        if (target.closest('#btnGenTrans')) generateTranscriptPDF();
        if (target.closest('#btnSaveAssessment')) saveUnitAssessment();
        if (target.closest('#btnExportCSV')) exportStudentsCSV();
        if (target.closest('#btnCalcAllocation')) toggleAllocationView();
        if (target.closest('#btnInvPDF')) generateInventoryPDF();
        if (target.closest('#btnDefaulterReport')) generateFeeDefaultersPDF();
        if (target.closest('#btnStaffReport')) generateStaffListPDF();
        if (target.closest('#btnProfileReport')) generateSchoolProfile();
        if (target.closest('#btnPrintStaffList')) generateStaffListPDF();
        if (target.closest('#btnCapitationReport')) generateCapitationAllocationPDF();
        if (target.closest('#btnResetSystem')) { pendingAction = 'reset'; pendingActionData = null; $('authMessage').textContent = 'DANGER: Enter admin password to WIPE ALL DATA.'; $('adminPassword').value = ''; openModal('authModal'); }

        if (target.closest('#btnStudentListExcel')) generateStudentExcel();
        if (target.closest('#btnStaffExcel')) generateStaffExcel();
        if (target.closest('#btnStaffPDF')) generateStaffListPDF();
        if (target.closest('#btnFinanceExcel')) generateFinanceExcel();

        const settingsTabBtn = target.closest('#settingsTabs .tab-btn');
        if (settingsTabBtn) {
            const tab = settingsTabBtn.dataset.tab;
            switchSettingsTab(parseInt(tab));
        }

        if (target.closest('#btnAddCourse')) {
            $('courseModalTitle').innerText = "Add New Course";
            $('courseForm')?.reset();
            if ($('courseEditId')) $('courseEditId').value = '';
            openModal('courseModal');
        }

        if (target.closest('#btnMockExtract')) simulateExtract();
        if (target.closest('#btnAiExtractUnits')) extractViaAI();

        if (target.closest('#btnAddNewUnit')) {
            if (!currentExamContext.tradeId && !$('editingCourseId')?.value) return showToast('Select a course first', 'error');
            $('unitModalTitle').innerText = "Add Unit of Competency";
            $('unitForm')?.reset();
            $('unitEditId').value = "";
            $('unitCourseId').value = $('editingCourseId')?.value || currentExamContext.tradeId;
            openModal('unitModal');
        }

        const pageBtn = target.closest('.btn-page');
        if (pageBtn && !pageBtn.disabled) {
            const pageNum = pageBtn.textContent;
            if (!isNaN(pageNum)) { currentPage = parseInt(pageNum); applyFilters(); }
            else if (pageBtn.querySelector('.fa-chevron-left')) { if (currentPage > 1) { currentPage--; applyFilters(); } }
            else if (pageBtn.querySelector('.fa-chevron-right')) { currentPage++; applyFilters(); }
        }

        const unitCard = target.closest('.cbet-unit-card');
        if (unitCard) {
            const code = unitCard.dataset.unitCode;
            const name = unitCard.dataset.unitName;
            const isLocked = unitCard.dataset.locked === 'true';
            const studentId = currentExamContext.studentId;
            if (isLocked) { return showToast('Unit already completed (Score >= 50%). Reattempt not allowed.', 'info'); }
            if (studentId) { openAssessmentModal(code, name, studentId); }
            else { showToast('Please select a student first.', 'error'); }
        }

        const autoItem = target.closest('.autocomplete-item[data-pay-id]');
        if (autoItem) {
            const id = autoItem.dataset.payId;
            const s = StudentRepo.getById(id);
            if (s) {
                $('payStudentId').value = id;
                $('paySearch').value = s.name;
                $('payAmount').value = s.fees;
                $('payResults').style.display = 'none';
            }
        }

        if (target.closest('#btnAddVoteheadRow')) addVoteheadEditorRow();
        if (target.closest('#btnSaveVoteheads')) saveVoteheadConfiguration();
        if (target.closest('.btn-remove-votehead-row')) {
            target.closest('.votehead-editor-row').remove();
            updateVoteheadEditorTotal();
        }
    });

    $('btnEnrolmentSummary')?.addEventListener('click', () => {
        const sel = $('feeReportCourse');
        if (sel && sel.options.length <= 1) {
            store.trades.forEach(t => sel.innerHTML += `<option value="${t.id}">${t.name}</option>`);
        }
        openModal('enrolmentSummaryModal');
    });
    $('btnGenEnrolmentSummary')?.addEventListener('click', generateEnrolmentSummary);

    document.querySelectorAll('#enrolmentSummaryModal .btn-group .btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const group = e.target.closest('.btn-group');
            group.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    $('btnFeeStatusReport')?.addEventListener('click', () => {
        const sel = $('feeReportCourse');
        if (sel && sel.options.length <= 1) {
            store.trades.forEach(t => sel.innerHTML += `<option value="${t.id}">${t.name}</option>`);
        }
        openModal('feeStatusModal');
    });
    $('btnGenFeeStatus')?.addEventListener('click', generateFeeStatusPDF);

    $('dashChartFilter')?.addEventListener('change', e => renderDashboardChart(e.target.value));

    $('newStudentForm')?.addEventListener('submit', submitRegistration);
    $('institutionForm')?.addEventListener('submit', saveInstitutionDetails);
    $('courseForm')?.addEventListener('submit', saveCourseSettings);
    $('staffForm')?.addEventListener('submit', submitStaff);
    $('inventoryForm')?.addEventListener('submit', submitInventory);
    $('paymentForm')?.addEventListener('submit', submitPayment);
    $('capitationForm')?.addEventListener('submit', submitCapitation);
    $('expenditureForm')?.addEventListener('submit', submitExpenditure);
    $('unitForm')?.addEventListener('submit', submitUnitForm);

    $('externalExamForm')?.addEventListener('submit', submitExternalExam);
    $('extStudentSearch')?.addEventListener('input', debounce(e => searchExtStudent(e.target.value), 200));
    $('btnExportExamReg')?.addEventListener('click', exportExtExamList);

    $('extExamSearch')?.addEventListener('input', debounce(renderExternalExams, 300));
    $('extExamBodyFilter')?.addEventListener('change', renderExternalExams);
    $('extSeriesFilter')?.addEventListener('change', renderExternalExams);
    $('extCertUpload')?.addEventListener('change', (e) => handleExtExamFileSelect(e.target.files, false));
    $('extOtherUpload')?.addEventListener('change', (e) => handleExtExamFileSelect(e.target.files, true));
    $('reportType')?.addEventListener('change', e => {
        const type = e.target.value;
        const bankGroup = $('bankBalanceGroup');
        const dateGroup = $('dateGroup');
        const monthGroup = $('monthGroup');
        if (bankGroup) bankGroup.style.display = (type === 'monthly') ? 'block' : 'none';
        if (dateGroup) dateGroup.style.display = (type === 'daily') ? 'block' : 'none';
        if (monthGroup) monthGroup.style.display = (type === 'monthly') ? 'block' : 'none';
    });

    $('globalSearch')?.addEventListener('input', debounce(e => handleGlobalSearch(e.target.value), 300));
    $('studentSearch')?.addEventListener('input', debounce(() => { currentPage = 1; applyFilters(); }, 300));
    ['courseFilter', 'levelFilter', 'genderFilter', 'statusFilter'].forEach(id => { $(id)?.addEventListener('change', () => { currentPage = 1; applyFilters(); }); });

    $('invSearch')?.addEventListener('input', debounce(renderInventory, 300));
    $('invCatFilter')?.addEventListener('change', renderInventory);
    $('invCondFilter')?.addEventListener('change', renderInventory);
    $('invQty')?.addEventListener('input', updateInvTotalDisplay);
    $('invPrice')?.addEventListener('input', updateInvTotalDisplay);

    $('staffSearch')?.addEventListener('input', debounce(renderStaff, 300));
    $('staffDeptFilter')?.addEventListener('change', renderStaff);
    $('staffTermsFilter')?.addEventListener('change', renderStaff);

    const staffNameInputs = ['staffSurname', 'staffFirstName', 'staffOtherNames'];
    staffNameInputs.forEach(id => { $(id)?.addEventListener('input', e => { validateStaffName(e.target); autoCapitalize(e.target); }); });
    $('staffIdNo')?.addEventListener('input', e => validateStaffID(e.target));
    $('staffPhone')?.addEventListener('input', e => validatePhone(e.target));
    $('staffEmail')?.addEventListener('input', e => validateEmail(e.target));
    $('staffDob')?.addEventListener('change', e => { validateStaffDob(e.target); calculateRetirement(); });

    $('regTrade')?.addEventListener('change', onTradeChange);
    const nameInputs = ['surname', 'firstName', 'otherNames'];
    nameInputs.forEach(id => { $(id)?.addEventListener('input', e => { validateName(e.target); autoCapitalize(e.target); updateLiveCard(); }); });
    $('idNumber')?.addEventListener('input', e => validateID(e.target));
    $('phone')?.addEventListener('input', e => validatePhone(e.target));
    $('email')?.addEventListener('input', e => validateEmail(e.target));
    $('guardianPhone')?.addEventListener('input', e => validatePhone(e.target));

    $('studentPhotoInput')?.addEventListener('change', e => previewStudentPhoto(e.target));
    $('staffPhotoInput')?.addEventListener('change', e => previewStaffPhoto(e.target));
    $('logoInput')?.addEventListener('change', e => previewLogo(e.target));
    $('stampInput')?.addEventListener('change', e => previewStamp(e.target));
    $('importFile')?.addEventListener('change', e => importBackup(e.target));

    $('dob')?.addEventListener('change', updateLiveCard);
    $('level')?.addEventListener('change', updateLiveCard);

    $('paySearch')?.addEventListener('input', debounce(e => searchPayStudent(e.target.value), 200));
    $('payFundingSource')?.addEventListener('change', e => toggleFundingFields(e.target.value));

    $('assessScore')?.addEventListener('input', updateAssessmentPreview);
    $('capAmount')?.addEventListener('input', e => { const val = parseFloat(e.target.value); if (val) autoAllocateCapitation(val); else clearAllocationInputs(); });
    $('btnAutoAllocate')?.addEventListener('click', () => { const val = parseFloat(getVal('capAmount')); if (val) autoAllocateCapitation(val); else showToast('Enter total amount first', 'error'); });
    $('btnAddCustomVotehead')?.addEventListener('click', addCustomVoteheadRow);
    $('capitationAllocationGrid')?.addEventListener('input', e => { if (e.target.classList.contains('alloc-amount') || e.target.classList.contains('alloc-name')) { updateAllocationTotals(); } });
    $('capitationAllocationGrid')?.addEventListener('click', e => { if (e.target.closest('.btn-remove-row')) { e.target.closest('.allocation-row').remove(); updateAllocationTotals(); } });

    $('aiUserInput')?.addEventListener('keypress', e => { if (e.key === 'Enter') sendAIQuery(); });
    $('btnSendAI')?.addEventListener('click', sendAIQuery);

    const settingsInputs = document.querySelectorAll('#institutionForm input, #institutionForm textarea');
    settingsInputs.forEach(input => {
        input.addEventListener('input', () => {
            input.classList.remove('error');
            if (input.id === 'setPhone') validatePhone(input);
            if (input.id === 'setEmail') validateEmail(input);
            updateLivePreview();
        });
    });

    $('examTradeSelect')?.addEventListener('change', e => { const tradeId = e.target.value; currentExamContext.tradeId = tradeId; currentExamContext.studentId = null; if ($('examInterface')) $('examInterface').style.display = 'none'; if ($('examEmptyState')) $('examEmptyState').style.display = 'flex'; loadExamStudents(); });
    $('examStudentSelect')?.addEventListener('change', e => { const studentId = e.target.value; currentExamContext.studentId = studentId; if (studentId) { loadCBETUnits(); } else { if ($('examInterface')) $('examInterface').style.display = 'none'; if ($('examEmptyState')) $('examEmptyState').style.display = 'flex'; } });

    $('unitSearch')?.addEventListener('input', debounce(e => {
        const cards = document.querySelectorAll('.cbet-unit-card');
        const term = e.target.value.toLowerCase();
        cards.forEach(card => {
            const name = card.querySelector('.unit-name').textContent.toLowerCase();
            const code = card.querySelector('.unit-code').textContent.toLowerCase();
            card.style.display = (name.includes(term) || code.includes(term)) ? 'flex' : 'none';
        });
    }, 200));
    $('btnAddCustomUnit')?.addEventListener('click', () => {
        if (!currentExamContext.tradeId) return showToast('Select a course first to add units.', 'error');
        $('unitModalTitle').innerText = "Add Unit of Competency";
        $('unitForm')?.reset();
        $('unitEditId').value = "";
        $('unitCourseId').value = currentExamContext.tradeId;
        openModal('unitModal');
    });

    const dropZone = $('evidenceDropZone');
    const evidenceInput = $('evidenceInput');
    if (dropZone && evidenceInput) {
        dropZone.addEventListener('click', () => evidenceInput.click());
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => { dropZone.addEventListener(eventName, preventDefaults, false); });
        function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }
        ['dragenter', 'dragover'].forEach(eventName => { dropZone.addEventListener(eventName, () => dropZone.classList.add('highlight'), false); });
        ['dragleave', 'drop'].forEach(eventName => { dropZone.addEventListener(eventName, () => dropZone.classList.remove('highlight'), false); });
        dropZone.addEventListener('drop', handleDrop, false);
        evidenceInput.addEventListener('change', (e) => handleEvidenceSelect(e.target.files));
    }

    $('btnAddExpVotehead')?.addEventListener('click', addExpVoteheadRow);

    $('btnModeSingle')?.addEventListener('click', () => switchAdmissionMode('single'));
    $('btnModeBatch')?.addEventListener('click', () => switchAdmissionMode('batch'));

    $('btnDownloadTemplate')?.addEventListener('click', downloadAdmissionTemplate);
    $('btnSelectFile')?.addEventListener('click', () => $('batchFileInput')?.click());
    $('batchFileInput')?.addEventListener('change', handleBatchFileUpload);
    $('btnConfirmBatch')?.addEventListener('click', confirmBatchAdmission);
}

    // Listen for changes on the Report Type dropdown inside the modal
    const reportTypeSelect = $('reportType');
    if (reportTypeSelect) {
        reportTypeSelect.addEventListener('change', (e) => {
            const type = e.target.value;
            
            // Hide all option groups first
            if ($('dailyOptions')) $('dailyOptions').style.display = 'none';
            if ($('monthlyOptions')) $('monthlyOptions').style.display = 'none';
            if ($('collectionOptions')) $('collectionOptions').style.display = 'none';

            // Show the relevant group
            if (type === 'daily') {
                if ($('dailyOptions')) $('dailyOptions').style.display = 'block';
            } else if (type === 'monthly') {
                if ($('monthlyOptions')) $('monthlyOptions').style.display = 'block';
            } else if (type === 'collection') {
                if ($('collectionOptions')) $('collectionOptions').style.display = 'block';
            }
        });
        // ---------------------------------------------------------------------
//   EXTERNAL EXAM FILE HANDLING
// ---------------------------------------------------------------------

function handleExtExamFileSelect(files, isMultiple) {
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
        if (file.size > 3 * 1024 * 1024) { // 3MB limit
            return showToast(`File ${file.name} is too large (Max 3MB)`, 'error');
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            const fileData = {
                name: file.name,
                type: file.type, // 'image/jpeg', 'application/pdf', etc.
                size: file.size,
                data: e.target.result, // Base64
                date: new Date().toISOString()
            };
            
            currentExtExamFiles.push(fileData);
            renderExtFilePreviews();
        };
        
        if (file.type.startsWith('image/')) {
            reader.readAsDataURL(file);
        } else {
            // For PDFs or others, we just read as Data URL (base64) to store
            reader.readAsDataURL(file); 
        }
    });
    // Reset input so same file can be selected again if deleted
    if (isMultiple) $('extOtherUpload').value = ''; 
    else $('extCertUpload').value = '';
}

function renderExtFilePreviews() {
    const container = $('extFilePreview');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (currentExtExamFiles.length === 0) {
        container.innerHTML = '<div style="grid-column:1/-1; font-size:0.8rem; color:var(--text-muted); text-align:center;">No files uploaded.</div>';
        return;
    }

    currentExtExamFiles.forEach((file, index) => {
        const isPdf = file.type === 'application/pdf';
        const div = document.createElement('div');
        div.className = 'ext-file-item';
        
        if (isPdf) {
            div.innerHTML = `
                <i class="fa-solid fa-file-pdf pdf-icon"></i>
                <button type="button" class="ext-file-remove" onclick="removeExtFile(${index})" title="Remove">&times;</button>
            `;
        } else {
            div.innerHTML = `
                <img src="${file.data}" alt="${file.name}">
                <button type="button" class="ext-file-remove" onclick="removeExtFile(${index})" title="Remove">&times;</button>
            `;
        }
        container.appendChild(div);
    });
}

function removeExtFile(index) {
    currentExtExamFiles.splice(index, 1);
    renderExtFilePreviews();
}

function viewAttachments(examId) {
    const exam = ExternalExamRepo.getById(examId);
    if (!exam || !exam.attachments || exam.attachments.length === 0) {
        return showToast('No attachments found for this record.', 'info');
    }

    const container = $('attachmentViewerContainer');
    const noMsg = $('noAttachmentsMsg');
    if (container) container.innerHTML = '';
    if (noMsg) noMsg.style.display = 'none';

    exam.attachments.forEach(file => {
        const isPdf = file.type === 'application/pdf';
        const div = document.createElement('div');
        div.className = 'ext-file-item';
        
        if (isPdf) {
            div.innerHTML = `
                <div style="text-align:center; padding:10px;">
                    <i class="fa-solid fa-file-pdf pdf-icon"></i>
                    <div style="font-size:0.75rem; margin-top:5px; word-break:break-all;">${file.name}</div>
                    <a href="${file.data}" download="${file.name}" class="btn btn-sm btn-primary" style="margin-top:5px; display:inline-block;">Download</a>
                </div>
            `;
        } else {
            // Create a lightbox effect for images
            div.innerHTML = `
                <img src="${file.data}" alt="${file.name}" style="cursor:zoom-in;" onclick="openImageLightbox('${file.data}')">
                <div style="font-size:0.7rem; position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.7); color:white; padding:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${file.name}</div>
            `;
        }
        if(container) container.appendChild(div);
    });

    openModal('viewAttachmentsModal');
}

// Simple Lightbox helper
function openImageLightbox(src) {
    // Create a temporary full-screen overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:9999; display:flex; align-items:center; justify-content:center; cursor:zoom-out;';
    overlay.innerHTML = `<img src="${src}" style="max-width:90%; max-height:90%; border-radius:4px; box-shadow:0 0 20px rgba(0,0,0,0.5);">`;
    
    overlay.onclick = () => overlay.remove();
    document.body.appendChild(overlay);
}
    }

// ==========================================================================
//   LIVE PREVIEW UPDATES FOR SETTINGS
// ==========================================================================
function updateLivePreview() {
    if ($('prevName')) $('prevName').innerText = getVal('setSchoolName') || 'TVET Manager Pro';
    if ($('prevMotto')) $('prevMotto').innerText = getVal('setMotto') || 'Excellence in Training';
    if ($('prevCode')) $('prevCode').innerText = `Code: ${getVal('setSchoolCode') || 'TVT/2026/001'}`;
    if ($('prevEmail')) $('prevEmail').innerHTML = `<i class="fa-solid fa-envelope"></i> ${getVal('setEmail') || 'info@school.com'}`;
    if ($('prevPhone')) $('prevPhone').innerHTML = `<i class="fa-solid fa-phone"></i> ${getVal('setPhone') || '0712 345 678'}`;
}

// ==========================================================================
//   VOTEHEAD SETTINGS MODAL
// ==========================================================================
function initVoteheadEditor() {
    const grid = $('voteheadEditorGrid');
    if (!grid) return;
    grid.innerHTML = '';
    store.voteheads.forEach(vh => addVoteheadEditorRow(vh.name, vh.weight));
    updateVoteheadEditorTotal();
}

function addVoteheadEditorRow(name = '', weight = 0) {
    const grid = $('voteheadEditorGrid');
    if (!grid) return;
    const row = document.createElement('div');
    row.className = 'votehead-editor-row';
    row.style.cssText = 'display: flex; gap: 10px; margin-bottom: 8px; align-items: center;';
    row.innerHTML = `
        <input type="text" class="form-control vhe-name" value="${name}" placeholder="Votehead Name" style="flex: 2;">
        <input type="number" class="form-control vhe-weight" value="${weight}" placeholder="Weight" style="flex: 1;" min="0" max="100">
        <span style="color: var(--text-muted);">%</span>
        <button type="button" class="btn btn-sm btn-ghost btn-remove-votehead-row" style="color: var(--danger);"><i class="fa-solid fa-times"></i></button>
    `;
    grid.appendChild(row);
}

function updateVoteheadEditorTotal() {
    const weights = document.querySelectorAll('.vhe-weight');
    let total = 0;
    weights.forEach(input => { total += parseFloat(input.value) || 0; });
    if ($('voteheadTotalWeight')) $('voteheadTotalWeight').innerText = total + '%';
    const warning = $('voteheadWarning');
    if (warning) {
        warning.style.display = Math.abs(total - 100) < 0.01 ? 'none' : 'block';
        warning.textContent = `Warning: Total weight is ${total}% (must equal 100%)`;
    }
}

function saveVoteheadConfiguration() {
    const rows = document.querySelectorAll('.votehead-editor-row');
    const newVoteheads = [];
    let totalWeight = 0;
    rows.forEach(row => {
        const name = row.querySelector('.vhe-name').value.trim();
        const weight = parseFloat(row.querySelector('.vhe-weight').value) || 0;
        if (name && weight > 0) {
            newVoteheads.push({ name, weight });
            totalWeight += weight;
        }
    });
    if (Math.abs(totalWeight - 100) > 0.01) {
        return showToast('Total weight must equal 100%', 'error');
    }
    store.voteheads = newVoteheads;
    saveData();
    closeModal('voteheadModal');
    showToast('Votehead configuration saved');
}

/* ==========================================================================
   ADMISSIONS SECTION LOGIC (FIXED & COMPLETE)
   ========================================================================== */

// Global State for Admissions
let currentStep = 1;
const totalSteps = 4;
let admissionPhotoBase64 = DEFAULT_AVATAR; // Assumes DEFAULT_AVATAR is defined globally
let admissionMode = 'single'; // 'single' or 'batch'

// --- 1. Initialization ---
function initAdmissionsSection() {
    populateAdmissionDropdowns();
    setupStepNavigation();
    setupLivePreview();
    setupPhotoUpload();
    setupBatchListeners();
    
    // Reset form on load
    document.getElementById('newStudentForm').reset();
    showStep(1);
}

// --- 2. Mode Switcher ---
function switchAdmissionMode(mode) {
    admissionMode = mode;
    const singleContainer = $('singleEntryContainer');
    const batchContainer = $('batchEntryContainer');
    const btnSingle = $('btnModeSingle');
    const btnBatch = $('btnModeBatch');

    if (mode === 'single') {
        if (singleContainer) singleContainer.style.display = 'grid'; // Grid for sidebar layout
        if (batchContainer) batchContainer.style.display = 'none';
        if (btnSingle) {
            btnSingle.classList.add('active');
            btnSingle.style.background = 'white';
            btnSingle.style.color = 'var(--text-main)';
        }
        if (btnBatch) {
            btnBatch.classList.remove('active');
            btnBatch.style.background = 'transparent';
            btnBatch.style.color = 'var(--text-muted)';
        }
        resetSingleEntryForm();
    } else {
        if (singleContainer) singleContainer.style.display = 'none';
        if (batchContainer) batchContainer.style.display = 'block';
        if (btnSingle) {
            btnSingle.classList.remove('active');
            btnSingle.style.background = 'transparent';
            btnSingle.style.color = 'var(--text-muted)';
        }
        if (btnBatch) {
            btnBatch.classList.add('active');
            btnBatch.style.background = 'white';
            btnBatch.style.color = 'var(--text-main)';
        }
        resetBatchMode();
    }
}

// --- 3. Single Entry: Stepper Logic ---
function setupStepNavigation() {
    const form = $('newStudentForm');
    if (!form) return;

    // Handle Next/Prev Buttons
    form.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-step]');
        if (!btn) return;

        e.preventDefault();
        const direction = btn.dataset.step; // 'next' or 'prev'
        const currentStepNum = parseInt(btn.dataset.current);

        if (direction === 'next') {
            if (validateStep(currentStepNum)) {
                showStep(currentStepNum + 1);
            }
        } else if (direction === 'prev') {
            showStep(currentStepNum - 1);
        }
    });

    // Handle Final Submit
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (validateStep(4)) {
            saveSingleStudent();
        }
    });
}

function showStep(step) {
    currentStep = step;
    
    // Hide all fieldsets
    document.querySelectorAll('.form-step').forEach(el => el.style.display = 'none');
    
    // Show current fieldset
    const currentFieldset = $(`form-step-${step}`);
    if (currentFieldset) {
        currentFieldset.style.display = 'block';
        // Animation effect
        currentFieldset.style.opacity = '0';
        currentFieldset.style.transform = 'translateY(10px)';
        setTimeout(() => {
            currentFieldset.style.transition = 'all 0.3s ease';
            currentFieldset.style.opacity = '1';
            currentFieldset.style.transform = 'translateY(0)';
        }, 50);
    }

    // Update Stepper Indicators
    for (let i = 1; i <= totalSteps; i++) {
        const stepLi = $(`step-ind-${i}`);
        const circle = stepLi.querySelector('.step-circle');
        
        if (i < step) {
            // Completed Step
            stepLi.classList.remove('active');
            circle.style.background = 'var(--success)'; // Green for completed
            circle.innerHTML = '<i class="fa-solid fa-check"></i>';
        } else if (i === step) {
            // Active Step
            stepLi.classList.add('active');
            circle.style.background = 'var(--primary-gradient)'; // Primary for active
            circle.innerText = i;
        } else {
            // Future Step
            stepLi.classList.remove('active');
            circle.style.background = '#e2e8f0'; // Grey for future
            circle.innerText = i;
        }
    }
}

function validateStep(step) {
    const currentFieldset = $(`form-step-${step}`);
    const inputs = currentFieldset.querySelectorAll('input[required], select[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!input.value.trim()) {
            isValid = false;
            input.style.borderColor = 'var(--danger)';
            // Shake effect
            input.animate([
                { transform: 'translateX(0)' },
                { transform: 'translateX(-5px)' },
                { transform: 'translateX(5px)' },
                { transform: 'translateX(0)' }
            ], { duration: 300 });
            
            // Remove error style on input
            input.addEventListener('input', () => {
                input.style.borderColor = 'var(--border)';
            }, { once: true });
        } else {
            // Specific format validation
            if (input.id === 'idNumber' && !/^\d{8}$/.test(input.value)) {
                showToast('ID Number must be exactly 8 digits', 'error');
                input.style.borderColor = 'var(--danger)';
                isValid = false;
            }
        }
    });

    if (!isValid) showToast('Please fill in all required fields correctly.', 'error');
    return isValid;
}

// --- 4. Single Entry: Live Preview & Photo ---
function setupLivePreview() {
    const inputs = {
        name: ['surname', 'firstName', 'otherNames'],
        trade: ['regTrade'],
        reg: ['regNo'],
        dob: ['dob'],
        level: ['level']
    };

    const updateName = () => {
        const s = $('surname').value;
        const f = $('firstName').value;
        const o = $('otherNames').value;
        const full = `${s} ${f} ${o}`.trim() || 'Student Name';
        if($('liveCardName')) $('liveCardName').textContent = full;
    };

    const updateTrade = () => {
        const select = $('regTrade');
        const text = select.options[select.selectedIndex]?.text || 'TRADE';
        if($('liveCardTrade')) $('liveCardTrade').textContent = text.split('(')[0].trim();
        
        // Update Fee Preview
        const tradeId = select.value;
        const trade = store.trades.find(t => t.id == tradeId);
        const tuition = trade ? trade.fee : 0;
        const exam = 5000;
        const total = tuition + exam;
        
        if($('feeTuition')) $('feeTuition').textContent = formatCurrency(tuition);
        if($('feeTotal')) $('feeTotal').textContent = formatCurrency(total);
    };

    // Bind Events
    inputs.name.forEach(id => $(id).addEventListener('input', updateName));
    inputs.trade.forEach(id => $(id).addEventListener('change', updateTrade));
    
    $('dob').addEventListener('input', (e) => {
        if($('liveCardDob')) $('liveCardDob').textContent = e.target.value || '---';
    });
    
    $('level').addEventListener('change', (e) => {
        if($('liveCardLevel')) $('liveCardLevel').textContent = e.target.value || '---';
    });
}

function setupPhotoUpload() {
    const input = $('studentPhotoInput');
    const preview = $('studentPhotoPreview');
    const livePhoto = $('liveCardPhoto');

    input.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                admissionPhotoBase64 = e.target.result;
                preview.src = admissionPhotoBase64;
                if (livePhoto) livePhoto.src = admissionPhotoBase64;
            };
            reader.readAsDataURL(file);
        }
    });
}

// --- 5. Single Entry: Save Logic ---
function saveSingleStudent() {
    const btn = document.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

    // Generate Reg No (Simulate logic based on Trade)
    const tradeId = $('regTrade').value;
    const year = new Date().getFullYear().toString().slice(-2);
    
    // Simple sequence logic (in real app, fetch last reg no from DB)
    const count = StudentRepo.getAll().filter(s => s.tradeId == tradeId).length + 1;
    const seq = String(count).padStart(3, '0');
    const tradeCode = store.trades.find(t => t.id == tradeId)?.code || 'ST';
    const regNo = `${tradeCode}/${year}/${seq}`;

    const studentData = {
        name: `${$('surname').value} ${$('firstName').value} ${$('otherNames').value}`.trim(),
        surname: $('surname').value,
        gender: $('gender').value,
        dob: $('dob').value,
        idNumber: $('idNumber').value,
        phone: $('phone').value,
        email: $('email').value,
        ward: $('ward').value,
        reg: regNo, // Auto generated
        tradeId: tradeId,
        trade: $('regTrade').options[$('regTrade').selectedIndex].text,
        level: $('level').value,
        totalFees: parseInt($('feeTotal').textContent.replace(/[^0-9]/g, '')) || 0,
        fees: parseInt($('feeTotal').textContent.replace(/[^0-9]/g, '')) || 0, // Full fees on admission
        guardianName: $('guardianName').value,
        guardianPhone: $('guardianPhone').value,
        guardianRel: $('guardianRel').value,
        photo: admissionPhotoBase64,
        dateAdmitted: new Date().toISOString().split('T')[0]
    };

    setTimeout(() => { // Simulate network delay
        try {
            StudentRepo.create(studentData);
            showToast(`Student ${studentData.name} admitted successfully! Reg: ${regNo}`);
            resetSingleEntryForm();
            router('students'); // Redirect to students list
            renderDashboard(); // Update stats
        } catch (err) {
            console.error(err);
            showToast('Error saving student. Check console.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }, 800);
}

function resetSingleEntryForm() {
    $('newStudentForm').reset();
    admissionPhotoBase64 = DEFAULT_AVATAR;
    $('studentPhotoPreview').src = DEFAULT_AVATAR;
    $('liveCardPhoto').src = DEFAULT_AVATAR;
    $('liveCardName').textContent = 'Student Name';
    $('liveCardReg').textContent = '---';
    $('feeTotal').textContent = '0';
    showStep(1);
}

// --- 6. Dropdowns Populator ---
function populateAdmissionDropdowns() {
    // Populate Trades
    const tradeSelect = $('regTrade');
    if (tradeSelect && store.trades) {
        tradeSelect.innerHTML = '<option value="">Select Course...</option>';
        store.trades.forEach(t => {
            tradeSelect.innerHTML += `<option value="${t.id}">${t.name} (${t.code})</option>`;
        });
    }

    // Populate Wards (Assuming store.settings.wards exists or similar)
    // For demo, using static list if store is empty
    const wardSelect = $('ward');
    const wards = store.settings?.wards || ["Idakho Central", "Idakho East", "Idakho North", "Ileho", "Shivagala", "Sigalagala"];
    if (wardSelect) {
        wardSelect.innerHTML = '<option value="">Select Ward...</option>';
        wards.forEach(w => {
            wardSelect.innerHTML += `<option value="${w}">${w}</option>`;
        });
    }
}

// --- 7. Batch Logic (Attached Listeners) ---
function setupBatchListeners() {
    const btnDownload = $('btnDownloadTemplate');
    const fileInput = $('batchFileInput');
    const btnConfirm = $('btnConfirmBatch');

    if (btnDownload) btnDownload.addEventListener('click', downloadAdmissionTemplate);
    if (fileInput) fileInput.addEventListener('change', handleBatchFileUpload);
    if (btnConfirm) btnConfirm.addEventListener('click', confirmBatchAdmission);
}

function resetBatchMode() {
    batchQueue = [];
    if ($('batchPreviewArea')) $('batchPreviewArea').style.display = 'none';
    if ($('batchStatusText')) $('batchStatusText').innerText = 'Ready...';
    if ($('batchPreviewTable')) {
        const tbody = $('batchPreviewTable').querySelector('tbody');
        if (tbody) tbody.innerHTML = '';
    }
    // Reset file input
    if ($('batchFileInput')) $('batchFileInput').value = '';
}

function downloadAdmissionTemplate() {
    if (!window.XLSX) return showToast('Excel library not loaded', 'error');

    const headers = [
        "Surname", "First Name", "Other Names", "Gender", "DOB (YYYY-MM-DD)",
        "ID Number", "Phone", "Email", "Ward",
        "Trade Code", "Level", "Guardian Name", "Guardian Phone"
    ];

    const sample = [
        "Doe", "John", "Smith", "Male", "2000-05-15",
        "12345678", "0712345678", "john@example.com", "Idakho Central",
        "EI", "Level 4", "Jane Doe", "0787654321"
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, sample]);

    // Add reference sheet for trade codes
    const refHeaders = ["Trade Code", "Trade Name"];
    const refData = store.trades.map(t => [t.code, t.name]);
    const wsRef = XLSX.utils.aoa_to_sheet([refHeaders, ...refData]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Admissions");
    XLSX.utils.book_append_sheet(wb, wsRef, "Course Codes Ref");

    XLSX.writeFile(wb, "TVET_Batch_Template.xlsx");
    showToast("Template downloaded successfully.");
}

function handleBatchFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });

            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

            if (jsonData.length === 0) {
                return showToast('The file is empty or format is invalid', 'error');
            }

            processBatchData(jsonData);
        } catch (err) {
            console.error(err);
            showToast('Error reading file. Ensure it is a valid Excel file.', 'error');
        }
    };
    reader.readAsArrayBuffer(file);
    // Reset input so same file can be selected again if needed
    e.target.value = ''; 
}

function processBatchData(rows) {
    batchQueue = [];
    const errors = [];

    rows.forEach((row, index) => {
        // Basic Validation
        if (!row['Surname'] || !row['First Name'] || !row['ID Number'] || !row['Trade Code']) {
            errors.push(`Row ${index + 2}: Missing required fields.`);
            return;
        }

        const tradeInput = String(row['Trade Code']).toUpperCase().trim();
        const tradeObj = store.trades.find(t =>
            t.code.toUpperCase() === tradeInput ||
            t.name.toUpperCase() === tradeInput
        );

        if (!tradeObj) {
            errors.push(`Row ${index + 2}: Invalid Trade Code "${row['Trade Code']}".`);
            return;
        }

        if (StudentRepo.getAll().some(s => s.idNumber === String(row['ID Number']))) {
            errors.push(`Row ${index + 2}: Duplicate ID Number ${row['ID Number']}.`);
            return;
        }

        // Construct Object
        batchQueue.push({
            name: `${row['Surname']} ${row['First Name']} ${row['Other Names'] || ''}`.trim(),
            gender: row['Gender'] || 'Male',
            dob: row['DOB (YYYY-MM-DD)'] ? new Date(row['DOB (YYYY-MM-DD)']).toISOString().split('T')[0] : '',
            idNumber: String(row['ID Number']),
            phone: String(row['Phone'] || ''),
            email: row['Email'] || '',
            ward: row['Ward'] || '',
            tradeId: tradeObj.id,
            trade: tradeObj.name,
            level: row['Level'] || 'Level 4',
            guardianName: row['Guardian Name'] || 'N/A',
            guardianPhone: row['Guardian Phone'] || 'N/A',
            totalFees: tradeObj.fee + 5000,
            fees: tradeObj.fee + 5000,
            photo: DEFAULT_AVATAR,
            isValid: true
        });
    });

    renderBatchPreview(batchQueue, errors);
}

function renderBatchPreview(data, errors) {
    const area = $('batchPreviewArea');
    const tbody = $('batchPreviewTable').querySelector('tbody');
    const btnSelectFile = $('btnSelectFile');

    if (!area || !tbody) return;
    area.style.display = 'block';

    // Show "Select Another" button
    if (btnSelectFile) btnSelectFile.style.display = 'inline-flex';

    tbody.innerHTML = data.map((s, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(s.name)}</td>
            <td>${s.gender}</td>
            <td>${s.idNumber}</td>
            <td>${s.trade}</td>
            <td><span class="badge badge-success">Valid</span></td>
        </tr>
    `).join('');

    if (errors.length > 0) {
        $('batchStatusText').innerHTML = `
            <span style="color: var(--danger); font-weight: bold;">
                ${errors.length} Errors Found. Check console (F12) for details.
            </span>`;
        console.log("Batch Import Errors:", errors);
    } else {
        $('batchStatusText').innerHTML = `
            <span style="color: var(--success);">
                ${data.length} valid records ready for admission.
            </span>`;
    }
}

function confirmBatchAdmission() {
    if (batchQueue.length === 0) return showToast('No valid data to save', 'error');

    const year = new Date().getFullYear().toString().slice(-2);
    const tradeCounts = {};

    // Initialize counts based on existing data
    store.trades.forEach(t => {
        tradeCounts[t.id] = StudentRepo.findBy('tradeId', t.id).length;
    });

    // Process Queue
    batchQueue.forEach(s => {
        tradeCounts[s.tradeId]++;
        const count = tradeCounts[s.tradeId];
        const seq = String(count).padStart(3, '0');
        const tradeCode = store.trades.find(t => t.id === s.tradeId)?.code || 'XX';

        s.reg = `${tradeCode}/${year}/${seq}`;
        StudentRepo.create(s);
    });

    const count = batchQueue.length;
    batchQueue = [];

    resetBatchMode();
    switchAdmissionMode('single');
    
    // Navigate away
    router('students');
    renderDashboard();

    showToast(`Success! ${count} students admitted.`);
}

// Ensure initialization runs when section is loaded
// Assuming a global init flow or calling this manually
document.addEventListener('DOMContentLoaded', () => {
    // Check if we are currently on the intake section
    if($('intake')) {
        initAdmissionsSection();
    }
});
// ==========================================================================
//   EXAM VIEW TOGGLE
// ==========================================================================
function renderExamView() {
}

// ==========================================================================
//   EXPENDITURE ALLOCATION LOGIC
// ==========================================================================

function initExpenditureForm() {
    const grid = $('expAllocationGrid');
    if (!grid) return;
    grid.innerHTML = '';
    addExpVoteheadRow();
    updateExpAllocationTotals();
}

function addExpVoteheadRow() {
    const grid = $('expAllocationGrid');
    if (!grid) return;

    const voteheads = store.voteheads || [];

    const row = document.createElement('div');
    row.className = 'allocation-row';
    row.style.cssText = 'display: flex; gap: 5px; margin-bottom: 5px; align-items: center;';

    row.innerHTML = `
        <select class="form-control exp-votehead-select" style="flex: 2;" onchange="updateExpAllocationTotals()">
            <option value="">Select Votehead</option>
            ${voteheads.map(vh => `<option value="${vh.name}">${vh.name}</option>`).join('')}
        </select>
        <input type="number" class="form-control exp-votehead-amt" placeholder="0.00" step="0.01" style="flex: 1;" oninput="updateExpAllocationTotals()">
        <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove(); updateExpAllocationTotals();">
            <i class="fa-solid fa-times"></i>
        </button>
    `;
    grid.appendChild(row);
}

function updateExpAllocationTotals() {
    const amounts = document.querySelectorAll('.exp-votehead-amt');
    let total = 0;
    amounts.forEach(input => { total += parseFloat(input.value) || 0; });

    const display = $('expAllocTotalDisplay');
    if (display) {
        display.innerText = formatCurrency(total);
        display.style.color = total > 0 ? 'var(--success)' : 'var(--text-muted)';
    }
    return total;
}

function setExpPayMethod(method, btn) {
    // 1. Update the Hidden Input (Source of Truth)
    let methodInput = $('expPaymentMethod');
    if (!methodInput) {
        // Create it dynamically if it's missing from HTML
        methodInput = document.createElement('input');
        methodInput.type = 'hidden';
        methodInput.id = 'expPaymentMethod';
        methodInput.name = 'expPaymentMethod';
        const form = $('expenditureForm');
        if (form) form.appendChild(methodInput);
    }
    methodInput.value = method;

    // 2. Update UI Buttons (Visual feedback)
    if (btn && btn.parentElement) {
        btn.parentElement.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    // 3. Handle Dynamic Fields
    const dynFields = $('expMethodDynamicFields');
    if (!dynFields) return;
    
    dynFields.innerHTML = ''; // Clear previous

    if (method === 'Bank') {
        dynFields.innerHTML = `<div class="form-row-2"><div class="form-group"><label>Bank Name</label><input type="text" id="expBankName" class="form-control" placeholder="Bank"></div><div class="form-group"><label>Cheque No</label><input type="text" id="expChequeNo" class="form-control" placeholder="Cheque #"></div></div>`;
        // FORCE VISIBILITY
        dynFields.style.display = 'block'; 
    } else if (method === 'M-Pesa') {
        dynFields.innerHTML = `<div class="form-group"><label>M-Pesa Transaction Code</label><input type="text" id="expTransCode" class="form-control" placeholder="Transaction ID"></div>`;
        // FORCE VISIBILITY
        dynFields.style.display = 'block';
    } else {
        // Cash: Hide the container to keep UI clean
        dynFields.style.display = 'none';
    }
}

function submitExpenditure(e) {
    e.preventDefault();
    const totalAmount = updateExpAllocationTotals();
    if (totalAmount <= 0) return showToast("Please enter an amount for at least one votehead.", 'error');

    // 1. Handle Votehead Allocations
    const allocations = {};
    const rows = document.querySelectorAll('#expAllocationGrid .allocation-row');
    let hasError = false;

    rows.forEach(row => {
        const select = row.querySelector('.exp-votehead-select');
        const input = row.querySelector('.exp-votehead-amt');
        const vhName = select.value;
        const amt = parseFloat(input.value) || 0;
        if (amt > 0 && !vhName) { 
            showToast("Please select a votehead for all amounts.", 'error'); 
            hasError = true; 
            return; 
        }
        if (vhName && amt > 0) allocations[vhName] = (allocations[vhName] || 0) + amt;
    });

    if (hasError) return;

    // 2. SAFELY GET PAYMENT METHOD
    // We check if the input exists. If not, we create it on the fly.
    let methodInput = $('expPaymentMethod');
    if (!methodInput) {
        methodInput = document.createElement('input');
        methodInput.type = 'hidden';
        methodInput.id = 'expPaymentMethod';
        methodInput.name = 'expPaymentMethod';
        const form = $('expenditureForm');
        if (form) form.appendChild(methodInput);
    }
    
    const method = methodInput.value || 'Cash';
    let details = '';

    // 3. Validate and Build Details String
    if (method === 'Bank') {
        const bankName = getVal('expBankName');
        const chequeNo = getVal('expChequeNo');
        if (!bankName || !chequeNo) {
            showToast("Please enter Bank Name and Cheque No.", 'error');
            return;
        }
        details = `Cheque: ${chequeNo} (${bankName})`;
    } else if (method === 'M-Pesa') {
        const transCode = getVal('expTransCode');
        if (!transCode) {
            showToast("Please enter M-Pesa Transaction Code.", 'error');
            return;
        }
        details = `M-Pesa: ${transCode}`;
    } else {
        details = 'Cash Payment';
    }

    // 4. Prepare Record Data
    const editId = $('expEditId')?.value;
    
    // -------------------------------------------------
    // ADD THIS SECTION: Capture specific fields for the Voucher
    // -------------------------------------------------
    const savedChequeNo = (method === 'Bank') ? getVal('expChequeNo') : '';
    const savedBankName = (method === 'Bank') ? getVal('expBankName') : '';
    const savedTransCode = (method === 'M-Pesa') ? getVal('expTransCode') : '';
    // -------------------------------------------------

    const recordData = {
        date: getVal('expDate') || new Date().toISOString(),
        payee: getVal('expPayee'),
        votehead: Object.keys(allocations).join(", "),
        amount: totalAmount,
        allocation: allocations,
        method: method, // This is now guaranteed to be correct
        details: details,
        voucher: getVal('expVoucher'),
        desc: getVal('expDesc'),
        // -------------------------------------------------
        // ADD THESE FIELDS TO THE OBJECT:
        chequeNo: savedChequeNo,
        bankName: savedBankName,
        transCode: savedTransCode
        // -------------------------------------------------
    };

    // 5. Save Data
    if (editId) {
        ExpenditureRepo.update(editId, recordData);
        showToast('Expenditure Updated Successfully');
    } else {
        ExpenditureRepo.create(recordData);
        showToast('Payment Recorded Successfully');
    }

    // 6. AUTO-GENERATE VOUCHER (New Step)
    generatePaymentVoucher(recordData);

    closeModal('expenditureModal');
    renderFinance();
    renderDashboard();
}
function editExpenditure(id) {
    const record = ExpenditureRepo.getById(id);
    if (!record) return showToast('Record not found', 'error');

    openModal('expenditureModal');
    $('expEditId').value = id;

    const modalTitle = document.querySelector('#expenditureModal h3');
    if (modalTitle) modalTitle.innerText = "Edit Expenditure";

    setVal('expDate', record.date ? record.date.split('T')[0] : '');
    setVal('expPayee', record.payee || '');
    setVal('expVoucher', record.voucher || '');
    setVal('expDesc', record.desc || '');

    const methodBtn = document.querySelector(`#expMethodGroup [data-exp-method="${record.method}"]`);
    if (methodBtn) setExpPayMethod(record.method, methodBtn);

    if (record.method === 'Bank') {
        setVal('expChequeNo', record.details.match(/Cheque: ([^\s]+)/)?.[1] || '');
        setVal('expBankName', record.details.match(/\(([^)]+)\)/)?.[1] || '');
    } else if (record.method === 'M-Pesa') {
        setVal('expTransCode', record.details.replace('M-Pesa: ', ''));
    }

    const grid = $('expAllocationGrid');
    grid.innerHTML = '';

    if (record.allocation && Object.keys(record.allocation).length > 0) {
        Object.entries(record.allocation).forEach(([name, amount]) => {
            addExpVoteheadRow();
            const lastRow = grid.lastElementChild;
            lastRow.querySelector('.exp-votehead-select').value = name;
            lastRow.querySelector('.exp-votehead-amt').value = amount;
        });
    } else {
        addExpVoteheadRow();
        const lastRow = grid.lastElementChild;
        lastRow.querySelector('.exp-votehead-select').value = record.votehead;
        lastRow.querySelector('.exp-votehead-amt').value = record.amount;
    }

    updateExpAllocationTotals();
}

function deleteExpenditure(id) {
    if (confirm('Are you sure you want to delete this expenditure record?')) {
        ExpenditureRepo.delete(id);
        showToast('Expenditure deleted');
        renderFinance();
        renderDashboard();
    }
}

function filterFinanceSource(source) {
    renderFinance(source === 'all' ? null : source);
}

// ==========================================================================
//   ADMISSIONS / INTAKE
// ==========================================================================
function clearErrors() { document.querySelectorAll('.form-control.error').forEach(el => el.classList.remove('error')); }
function validateName(input) { if (!input) return false; const regex = /^[A-Za-z\s]+$/; if (!regex.test(input.value) && input.value !== '') { input.classList.add('error'); return false; } input.classList.remove('error'); return true; }
function validateID(input) { if (!input) return false; input.value = input.value.replace(/\D/g, ''); const val = input.value; const isValid = val.length === 8; const editId = $('editModeId')?.value; const isDuplicate = StudentRepo.getAll().some(s => s.idNumber === val && s.id !== editId); if (val.length > 0 && (!isValid || isDuplicate)) { input.classList.add('error'); if (isDuplicate) showToast('A student with this ID already exists!', 'error'); return false; } input.classList.remove('error'); return isValid; }
function validatePhone(input) { if (!input || !input.value) return true; const val = input.value; const regex = /^(?:254|\+254|0)?([17][0-9]{8})$/; if (!regex.test(val)) { input.classList.add('error'); return false; } input.classList.remove('error'); return true; }
function validateEmail(input) { if (!input || !input.value) return true; const val = input.value; const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; if (!regex.test(val)) { input.classList.add('error'); return false; } input.classList.remove('error'); return true; }
function autoCapitalize(input) { const value = input.value; input.value = value.charAt(0).toUpperCase() + value.slice(1); }
function validateStep(stepNumber) {
    clearErrors();
    let isValid = true;
    let focusSet = false;
    const setError = (input, msg) => { input.classList.add('error'); if (!focusSet) { input.focus(); focusSet = true; } if (msg) showToast(msg, 'error'); isValid = false; };
    if (stepNumber === 1) { const surname = $('surname'); const firstName = $('firstName'); const dob = $('dob'); const idNum = $('idNumber'); const phone = $('phone'); const ward = $('ward'); if (!surname.value.trim()) setError(surname); if (!firstName.value.trim()) setError(firstName); if (!dob.value) setError(dob); if (!idNum.value || idNum.value.length !== 8) { setError(idNum, 'ID Number must be 8 digits'); } else { const editId = $('editModeId')?.value; const isDuplicate = StudentRepo.getAll().some(s => s.idNumber === idNum.value && s.id !== editId); if (isDuplicate) { setError(idNum, 'Duplicate ID Number detected!'); } } if (!phone.value || !validatePhone(phone)) setError(phone); if (!ward.value) setError(ward); }
    else if (stepNumber === 2) { const entryLevel = $('entryLevel'); const assessmentNo = $('assessmentNo'); if (!entryLevel.value) setError(entryLevel); if (!assessmentNo.value.trim()) setError(assessmentNo); }
    else if (stepNumber === 3) { const trade = $('regTrade'); const level = $('level'); if (!trade.value) setError(trade); if (!level.value) setError(level); }
    else if (stepNumber === 4) { const gName = $('guardianName'); const gPhone = $('guardianPhone'); if (!gName.value.trim()) setError(gName); if (!gPhone.value || !validatePhone(gPhone)) { setError(gPhone); if (gPhone.value) showToast('Invalid Guardian Phone Number', 'error'); } }
    if (!isValid) showToast('Please fill all required fields correctly.', 'error');
    return isValid;
}
function nextStep(current, next) {
    if (!validateStep(current)) return;
    $(`form-step-${current}`).classList.remove('active');
    $(`form-step-${next}`).classList.add('active');
    const stepIndicators = document.querySelectorAll('#newStudentForm .stepper .step');
    stepIndicators.forEach((step, index) => {
        step.classList.remove('active');
        if (index + 1 < next) step.classList.add('completed');
        else if (index + 1 === next) step.classList.add('active');
    });
    if (next === 3) updateLiveCard();
}
function prevStep(current, prev) {
    $(`form-step-${current}`).classList.remove('active');
    $(`form-step-${prev}`).classList.add('active');
    const stepIndicators = document.querySelectorAll('#newStudentForm .stepper .step');
    stepIndicators.forEach((step, index) => {
        step.classList.remove('active');
        if (index + 1 === prev) { step.classList.add('active'); step.classList.remove('completed'); }
    });
}
function resetIntakeForm() {
    $('newStudentForm')?.reset();
    if ($('editModeId')) $('editModeId').value = "";
    if ($('studentPhotoPreview')) $('studentPhotoPreview').src = DEFAULT_AVATAR;
    if ($('liveCardPhoto')) $('liveCardPhoto').src = DEFAULT_AVATAR;
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
    $('form-step-1')?.classList.add('active');
    const stepIndicators = document.querySelectorAll('#newStudentForm .stepper .step');
    stepIndicators.forEach((step, index) => { step.classList.remove('active', 'completed'); if (index === 0) step.classList.add('active'); });
    clearErrors();
    updateLiveCard();
}
function submitRegistration(e) {
    e.preventDefault();
    if (!validateStep(4)) return;
    const tradeId = getVal('regTrade');
    const tradeObj = store.trades.find(t => t.id === tradeId);
    if (!tradeObj) return showToast('Invalid course selection detected.', 'error');
    const totalFees = tradeObj.fee + 5000;
    const names = [getVal('surname'), getVal('firstName'), getVal('otherNames')].filter(Boolean).join(' ');
    const editId = $('editModeId')?.value;
    const photoSrc = $('studentPhotoPreview').src;
    const finalPhoto = (photoSrc && !photoSrc.includes('No Photo') && !photoSrc.startsWith('data:image/svg+xml')) ? photoSrc : DEFAULT_AVATAR;
    
    const studentData = { 
        name: names, 
        gender: getVal('gender'), 
        dob: getVal('dob'), 
        idNumber: getVal('idNumber'), 
        phone: getVal('phone'), 
        email: getVal('email'), 
        ward: getVal('ward'), 
        entryLevel: getVal('entryLevel'), 
        assessmentNo: getVal('assessmentNo'), 
        guardianName: getVal('guardianName'), 
        guardianRel: getVal('guardianRel'), 
        guardianPhone: getVal('guardianPhone'), 
        tradeId, 
        trade: tradeObj.name, 
        level: getVal('level'), 
        sponsorship: getVal('sponsorship'), 
        photo: finalPhoto, 
        totalFees, 
        fees: totalFees 
    };

    if (editId) {
        // --- EDIT MODE: Get Reg No from the input field ---
        studentData.reg = getVal('regNo');
        // -----------------------------------------------
        StudentRepo.update(editId, studentData); 
        showToast('Student Updated Successfully!'); 
    } else {
        // --- CREATE MODE: Auto-generate Reg No ---
        const year = new Date().getFullYear().toString().slice(-2);
        const count = StudentRepo.findBy('tradeId', tradeId).length + 1;
        const seq = String(count).padStart(3, '0');
        const tCode = tradeObj.code || tradeObj.name.substring(0, 2).toUpperCase();
        studentData.reg = `${tCode}/${year}/${seq}`;
        // -----------------------------------------
        StudentRepo.create(studentData); 
        showToast('Student Registered Successfully!'); 
    }

    router('students');
    resetIntakeForm();
    renderDashboard();
}
function onTradeChange() {
    const tradeId = $('regTrade')?.value;
    const trade = store.trades.find(t => t.id === tradeId);
    const levelSelect = $('level');
    if (!levelSelect) return;
    levelSelect.innerHTML = '<option value="">Select Level</option>';
    if (trade) { trade.levels.forEach(lvl => { levelSelect.innerHTML += `<option>${lvl}</option>`; }); if ($('feeTuition')) $('feeTuition').innerText = formatCurrency(trade.fee); if ($('feeTotal')) $('feeTotal').innerText = formatCurrency(trade.fee + 5000); } else { if ($('feeTuition')) $('feeTuition').innerText = '0'; if ($('feeTotal')) $('feeTotal').innerText = '0'; }
    updateLiveCard();
}
function updateLiveCard() {
    const sn = getVal('surname') || '';
    const fn = getVal('firstName') || '';
    const on = getVal('otherNames') || '';
    if ($('liveCardName')) $('liveCardName').innerText = `${sn} ${fn} ${on}`.trim() || 'Student Name';
    if ($('liveCardLevel')) $('liveCardLevel').innerText = getVal('level') || '---';
    if ($('liveCardDob')) $('liveCardDob').innerText = getVal('dob') || '---';
    const tradeId = getVal('regTrade');
    if (tradeId && !$('editModeId')?.value) {
        const tradeObj = store.trades.find(t => t.id === tradeId);
        const year = new Date().getFullYear().toString().slice(-2);
        const count = StudentRepo.findBy('tradeId', tradeId).length + 1;
        const seq = String(count).padStart(3, '0');
        const tCode = tradeObj ? (tradeObj.code || tradeObj.name.substring(0, 2).toUpperCase()) : 'XX';
        if ($('liveCardReg')) $('liveCardReg').innerText = `${tCode}/${year}/${seq}`;
    } else if ($('editModeId')?.value) {
        const student = StudentRepo.getById($('editModeId').value);
        if ($('liveCardReg')) $('liveCardReg').innerText = student ? student.reg : '---';
    } else { if ($('liveCardReg')) $('liveCardReg').innerText = '---'; }
    const tradeObj = store.trades.find(t => t.id === tradeId);
    if ($('liveCardTrade')) $('liveCardTrade').innerText = tradeObj ? tradeObj.name : 'TRADE';
}
function previewStudentPhoto(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        if (!file.type.startsWith('image/')) { showToast('Please select a valid image file (JPG, PNG).', 'error'); input.value = ''; return; }
        if (file.size > 2 * 1024 * 1024) { showToast('Image size should be less than 2MB.', 'error'); input.value = ''; return; }
        const reader = new FileReader();
        reader.onload = function (e) { if ($('studentPhotoPreview')) $('studentPhotoPreview').src = e.target.result; if ($('liveCardPhoto')) $('liveCardPhoto').src = e.target.result; };
        reader.readAsDataURL(file);
    }
}
function editStudent(id) {
    // Set the pending action and ID
    pendingAction = 'edit';
    pendingActionData = id;
    
    // Show the Auth Modal
    $('authMessage').textContent = 'WARNING: Enter admin password to EDIT student record.';
    $('adminPassword').value = ''; // Clear previous password
    openModal('authModal');
}
function executeEditStudent(id) {
    const s = StudentRepo.getById(id);
    if (!s) return;
    
    router('intake');
    switchAdmissionMode('single');
    
    if ($('intakeFormTitle')) $('intakeFormTitle').innerText = "Edit Student Details";
    $('editModeId').value = id;
    
    // Handle Photo
    if ($('studentPhotoPreview')) $('studentPhotoPreview').src = s.photo;
    if ($('liveCardPhoto')) $('liveCardPhoto').src = s.photo;
    
    // Fill Personal Details
    setVal('surname', s.name.split(' ')[0]);
    setVal('firstName', s.name.split(' ')[1] || '');
    setVal('otherNames', s.name.split(' ').slice(2).join(' '));
    setVal('gender', s.gender);
    setVal('dob', s.dob);
    
    // --- THIS IS THE LINE FOR THE REG NO ---
    setVal('regNo', s.reg);
    // --------------------------------------
    
    setVal('idNumber', s.idNumber);
    setVal('phone', s.phone);
    setVal('email', s.email || '');
    setVal('ward', s.ward || '');
    setVal('entryLevel', s.entryLevel || '');
    setVal('assessmentNo', s.assessmentNo || '');
    
    // Fill Course Details
    setVal('regTrade', s.tradeId);
    onTradeChange(); // Refresh levels
    
    // Set Level (Needs a tiny delay to ensure dropdown is populated)
    setTimeout(() => setVal('level', s.level), 100);
    
    setVal('sponsorship', s.sponsorship || 'Self Sponsored (Parent/Guardian)');
    
    // Fill Guardian Details
    setVal('guardianName', s.guardianName || '');
    setVal('guardianRel', s.guardianRel || '');
    setVal('guardianPhone', s.guardianPhone || '');
    
    updateLiveCard();
    showToast('Editing mode active.', 'info');
}
/* ==========================================================================
   STUDENTS SECTION LOGIC (UPDATED)
   ========================================================================== */

// --- 1. Initialization ---
function initStudentSection() {
    // Safely populate the Level filter based on available Trades
    const allLevels = new Set();
    if (store && store.trades) {
        store.trades.forEach(t => {
            if (t.levels) t.levels.forEach(l => allLevels.add(l));
        });
    }

    const levelSelect = $('levelFilter');
    if (levelSelect) {
        levelSelect.innerHTML = '<option value="all">All Levels</option>';
        [...allLevels].sort().forEach(l => {
            levelSelect.innerHTML += `<option value="${l}">${l}</option>`;
        });
    }

    // Default view
    setView('grid', 'students');
}

// --- 2. View & Filtering ---
function setView(type, section = 'students') {
    currentView[section] = type;
    
    // Update UI toggles visual state
    const btns = document.querySelectorAll(`.view-toggles[data-section="${section}"] .btn`);
    btns.forEach(btn => {
        if (btn.dataset.view === type) {
            btn.classList.add('active');
            btn.setAttribute('aria-checked', 'true');
        } else {
            btn.classList.remove('active');
            btn.setAttribute('aria-checked', 'false');
        }
    });

    if (section === 'students') applyFilters();
}

function applyFilters() {
    const search = ($('studentSearch')?.value || '').toLowerCase();
    const tradeId = $('courseFilter')?.value || 'all';
    const level = $('levelFilter')?.value || 'all';
    const gender = $('genderFilter')?.value || 'all';
    const status = $('statusFilter')?.value || 'all';

    let filtered = StudentRepo.getAll().filter(s => {
        if (!s || !s.name) return false;

        // Search: Name, Reg, Phone, Email
        const matchSearch = !search ||
            s.name.toLowerCase().includes(search) ||
            (s.reg && s.reg.toLowerCase().includes(search)) ||
            (s.phone && s.phone.includes(search)) ||
            (s.email && s.email.toLowerCase().includes(search));

        // Filters
        const matchTrade = tradeId === 'all' || s.tradeId === tradeId;
        const matchLevel = level === 'all' || s.level === level;
        const matchGender = gender === 'all' || s.gender === gender;

        // Status Logic
        let matchStatus = true;
        if (status === 'Clear') matchStatus = s.fees <= 0;
        if (status === 'Arrears') matchStatus = s.fees > 0;

        return matchSearch && matchTrade && matchLevel && matchGender && matchStatus;
    });

    renderStudentList(filtered);
    updateStudentStats(StudentRepo.getAll()); // Stats usually reflect total DB, not filtered view
}

function updateStudentStats(allData) {
    // Using 'allData' passed in, or default to getAll()
    const students = allData.length ? allData : StudentRepo.getAll();
    
    if ($('countTotal')) $('countTotal').textContent = students.length;
    
    const clearCount = students.filter(s => s.fees <= 0).length;
    if ($('countClear')) $('countClear').textContent = clearCount;
    
    if ($('countArrears')) $('countArrears').textContent = students.filter(s => s.fees > 0).length;
    if ($('countMale')) $('countMale').textContent = students.filter(s => s.gender === 'Male').length;
    if ($('countFemale')) $('countFemale').textContent = students.filter(s => s.gender === 'Female').length;

    // Animate Progress Bar (CSS handles the width transition)
    const percent = students.length ? Math.round((clearCount / students.length) * 100) : 0;
    const bar = document.querySelector('.progress-mini .bar');
    if (bar) {
        bar.style.width = `${percent}%`;
        bar.parentElement.setAttribute('aria-valuenow', percent);
    }
}

// --- 3. Rendering ---
function renderStudentList(data) {
    const gridContainer = $('studentsGridContainer');
    const listContainer = $('studentsListContainer');
    
    if (!gridContainer || !listContainer) return;

    if (currentView.students === 'grid') {
        gridContainer.style.display = 'block';
        listContainer.style.display = 'none';
        renderStudentGrid(data, $('studentsContainer'));
    } else {
        gridContainer.style.display = 'none';
        listContainer.style.display = 'block';
        renderStudentTable(data, $('studentsTableBody'));
    }
    renderPagination(data.length);
}

function renderPagination(totalItems) {
    // FIX: Changed 'const' to 'let' as requested
    let totalPages = Math.ceil(totalItems / itemsPerPage);
    
    const paginationControls = document.querySelector('.pagination-controls');
    const pageInfo = document.querySelector('.page-info');
    
    if (totalPages === 0) totalPages = 1;
    
    // Bounds check
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(start + itemsPerPage - 1, totalItems);
    
    // Update Info Text
    if (pageInfo) {
        pageInfo.innerHTML = `Showing <span id="pageStart">${totalItems > 0 ? start : 0}</span> to <span id="pageEnd">${end}</span> of <span id="pageTotal">${totalItems}</span> entries`;
    }
    
    // Render Buttons
    if (paginationControls) {
        let html = `
            <button class="btn btn-page" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} aria-label="Previous page">
                <i class="fa-solid fa-chevron-left"></i>
            </button>`;
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                html += `<button class="btn btn-page ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})" aria-current="${i === currentPage ? 'page' : false}">${i}</button>`;
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                html += `<button class="btn btn-page" disabled>...</button>`;
            }
        }
        
        html += `
            <button class="btn btn-page" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Next page">
                <i class="fa-solid fa-chevron-right"></i>
            </button>`;
            
        paginationControls.innerHTML = html;
    }
}

// Helper to handle page changes
function changePage(page) {
    currentPage = page;
    applyFilters();
    // Scroll to top of list container
    const container = document.querySelector('.content-card-modern');
    if(container) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderStudentGrid(data, container) {
    if (!container) return;
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedData = data.slice(start, end);
    
    if (paginatedData.length === 0) {
        container.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; text-align:center; padding: 3rem; color: var(--text-muted);">
            <i class="fa-solid fa-users-slash" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
            <p>No trainees found matching criteria.</p>
        </div>`;
        return;
    }

    container.innerHTML = paginatedData.map(s => {
        const statusClass = s.fees > 0 ? 'status-arrears' : 'status-clear';
        const feeText = s.fees > 0 ? `Arrears: ${formatCurrency(s.fees)}` : 'Fee Clear';
        const badgeClass = s.fees > 0 ? 'arrears' : 'clear';
        
        return `
        <div class="student-card ${statusClass}">
            <div class="status-indicator"></div>
            <div class="card-header">
                <div class="avatar-wrapper">
                    <img src="${s.photo}" alt="${escapeHtml(s.name)}" onerror="this.src='${DEFAULT_AVATAR}'">
                </div>
                <div class="info">
                    <div class="name">${escapeHtml(s.name)}</div>
                    <div class="meta">${s.reg} &bull; ${s.trade}</div>
                </div>
                <span class="fee-badge ${badgeClass}">${feeText}</span>
            </div>
            <div class="card-body">
                <div class="detail-item">
                    <label>Level</label>
                    <span>${s.level}</span>
                </div>
                <div class="detail-item">
                    <label>Phone</label>
                    <span>${s.phone}</span>
                </div>
            </div>
            <div class="card-footer">
                <button class="action-btn" data-action="view" data-id="${s.id}" title="View Profile"><i class="fa-solid fa-eye"></i></button>
                <button class="action-btn" data-action="edit" data-id="${s.id}" title="Edit"><i class="fa-solid fa-edit"></i></button>
                <button class="action-btn" data-action="payment" data-id="${s.id}" title="Record Payment"><i class="fa-solid fa-dollar-sign"></i></button>
                <button class="action-btn danger" data-action="delete" data-type="student" data-id="${s.id}" title="Delete Student"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>`;
    }).join('');
}

function renderStudentTable(data, tbody) {
    if (!tbody) return;
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedData = data.slice(start, end);
    
    if (paginatedData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-4" style="text-align:center; padding: 2rem;">No trainees found.</td></tr>`;
        return;
    }

    tbody.innerHTML = paginatedData.map(s => {
        const badgeClass = s.fees > 0 ? 'arrears' : 'clear';
        const badgeText = s.fees > 0 ? 'In Arrears' : 'Clear';
        
        return `
        <tr>
            <td><input type="checkbox" class="student-check" data-id="${s.id}"></td>
            <td><strong>${s.reg}</strong></td>
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${s.photo}" style="width:32px; height:32px; border-radius:50%; object-fit:cover; border:1px solid var(--border);" onerror="this.src='${DEFAULT_AVATAR}'">
                    ${escapeHtml(s.name)}
                </div>
            </td>
            <td>${s.trade} <span style="font-size:0.8em; color:var(--text-muted)">(${s.level})</span></td>
            <td>${s.gender}</td>
            <td><span class="fee-badge ${badgeClass}" style="position:static; margin:0;">${badgeText}</span></td>
            <td>
                <div class="btn-group" style="display:flex; gap:0.25rem;">
                    <button class="btn-page" data-action="view" data-id="${s.id}" title="View"><i class="fa-solid fa-eye"></i></button>
                    <button class="btn-page" data-action="edit" data-id="${s.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-page" data-action="delete" data-type="student" data-id="${s.id}" title="Delete" style="color:var(--danger)"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// --- 4. Profile & Modals ---
function viewStudent(id) {
    const s = StudentRepo.getById(id);
    if (!s) return;
    
    const content = $('viewStudentContent');
    if (!content) return;
    
    const statusClass = s.fees > 0 ? 'arrears' : 'clear';
    const statusText = s.fees > 0 ? 'In Arrears' : 'Fee Clear';
    const balanceColor = s.fees > 0 ? 'var(--danger)' : 'var(--success)';

    content.innerHTML = `
    <div class="profile-header">
        <img src="${s.photo}" class="profile-photo-large" onerror="this.src='${DEFAULT_AVATAR}'">
        <div class="profile-info">
            <h2>${escapeHtml(s.name)}</h2>
            <div class="reg-no">${s.reg}</div>
            <span class="fee-badge ${statusClass}" style="position:static; margin-top:0.5rem;">${statusText}</span>
        </div>
    </div>
    <div class="profile-details">
        <div class="profile-section">
            <h4><i class="fa-solid fa-user"></i> Personal Information</h4>
            <div class="profile-grid">
                <div class="profile-item"><label>Gender</label><span>${s.gender}</span></div>
                <div class="profile-item"><label>Date of Birth</label><span>${s.dob || 'N/A'}</span></div>
                <div class="profile-item"><label>Phone</label><span>${escapeHtml(s.phone)}</span></div>
                <div class="profile-item"><label>Email</label><span>${escapeHtml(s.email || 'N/A')}</span></div>
            </div>
        </div>
        <div class="profile-section">
            <h4><i class="fa-solid fa-graduation-cap"></i> Academic Information</h4>
            <div class="profile-grid">
                <div class="profile-item"><label>Course</label><span>${s.trade}</span></div>
                <div class="profile-item"><label>Level</label><span>${s.level}</span></div>
                <div class="profile-item"><label>ID Number</label><span>${s.idNumber || 'N/A'}</span></div>
            </div>
        </div>
        <div class="profile-section">
            <h4><i class="fa-solid fa-file-invoice-dollar"></i> Fee Summary</h4>
            <div class="profile-grid">
                <div class="profile-item"><label>Total Fees</label><span>${formatCurrency(s.totalFees)}</span></div>
                <div class="profile-item"><label>Paid</label><span>${formatCurrency(s.totalFees - s.fees)}</span></div>
                <div class="profile-item" style="border-left-color: ${balanceColor};"><label>Balance</label><span style="color:${balanceColor}; font-weight:bold;">${formatCurrency(s.fees)}</span></div>
            </div>
        </div>
    </div>
    <div class="profile-actions">
        <button class="btn btn-secondary" data-dismiss="modal">Close</button>
        <button class="btn btn-secondary" data-action="edit" data-id="${s.id}"><i class="fa-solid fa-pen"></i> Edit Details</button>
        <button class="btn btn-secondary" data-action="payment" data-id="${s.id}"><i class="fa-solid fa-dollar-sign"></i> Record Payment</button>
        <button class="btn btn-secondary danger" data-action="delete" data-type="student" data-id="${s.id}" style="color:var(--danger);"><i class="fa-solid fa-trash"></i> Delete</button>
    </div>`;
    
    openModal('viewStudentModal');
}

function secureDelete(id) { 
    pendingAction = 'delete'; 
    pendingActionData = id; 
    if ($('authMessage')) $('authMessage').textContent = 'WARNING: Enter admin password to DELETE student record.'; 
    if ($('adminPassword')) $('adminPassword').value = ''; 
    openModal('authModal'); 
}

function confirmAuth() { 
    const password = $('adminPassword') ? $('adminPassword').value : ''; 
    if (password !== ADMIN_PASSWORD) { 
        showToast('Incorrect password!', 'error'); 
        return; 
    } 
    closeModal('authModal'); 
    
    if (pendingAction === 'edit') { 
        // Assuming this function handles opening the edit form
        if (typeof executeEditStudent === 'function') executeEditStudent(pendingActionData);
    } 
    else if (pendingAction === 'delete') { 
        executeDeleteStudent(pendingActionData); 
    } 
    else if (pendingAction === 'reset') { 
        executeSystemReset(); 
    } 
    
    pendingAction = null; 
    pendingActionData = null; 
}

function executeSystemReset() { 
    if(confirm("Are you sure? This will wipe ALL data.")) {
        store.students = []; 
        store.staff = []; 
        store.finance = []; 
        store.exams = []; 
        store.inventory = []; 
        store.capitation = []; 
        store.expenditure = []; 
        store.externalExams = []; 
        saveData(); 
        initApp(); 
        showToast('System has been reset successfully.'); 
    }
}

function executeDeleteStudent(id) { 
    if (StudentRepo.delete(id)) { 
        applyFilters(); 
        renderDashboard(); 
        showToast('Student record deleted'); 
        closeModal('viewStudentModal'); 
    } else {
        showToast('Error deleting student', 'error');
    }
}

function exportStudentsCSV() { 
    const data = StudentRepo.getAll(); 
    if (data.length === 0) return showToast('No data to export', 'error'); 
    
    const headers = ["Name", "Reg No", "Gender", "Trade", "Level", "Phone", "Balance"]; 
    const rows = data.map(s => [`"${s.name}"`, s.reg, s.gender, `"${s.trade}"`, s.level, s.phone, s.fees]); 
    
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n"); 
    const encodedUri = encodeURI(csvContent); 
    
    const link = document.createElement("a"); 
    link.setAttribute("href", encodedUri); 
    link.setAttribute("download", `Student_List_${new Date().toISOString().split('T')[0]}.csv`); 
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link); 
    showToast('CSV Exported'); 
}

/* ==========================================================================
   EVENT DELEGATION (Required for buttons to work)
   ========================================================================== */

document.addEventListener('click', function(e) {
    // Find the closest button with a data-action
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;
    const type = btn.dataset.type;

    switch (action) {
        case 'view':
            viewStudent(id);
            break;
        case 'edit':
            // Determine context (student vs others)
            if (type === 'student') {
                // Logic to open edit modal
                pendingAction = 'edit';
                pendingActionData = id;
                // If password protection is required for editing:
                // $('authMessage').textContent = 'Enter password to edit.';
                // openModal('authModal'); 
                // else:
                if (typeof executeEditStudent === 'function') executeEditStudent(id);
            }
            break;
        case 'payment':
            showToast(`Opening payment for ID: ${id}`, 'info');
            // Call payment logic here
            break;
        case 'delete':
            if (type === 'student') secureDelete(id);
            break;
    }
});

// Search Shortcut
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = $('studentSearch');
        if (searchInput) searchInput.focus();
    }
});
// ==========================================================================
//   CBET EXAMS
// ==========================================================================
function getCompetenceStatus(score) { const numScore = parseInt(score) || 0; if (numScore >= 85) return { status: 'Mastery', class: 'status-c' }; if (numScore >= 70) return { status: 'Proficiency', class: 'status-c' }; if (numScore >= 50) return { status: 'Competent', class: 'status-c' }; return { status: 'Not Yet Competent', class: 'status-nyc' }; }
function resetExamView() { currentExamContext = { studentId: null, tradeId: null }; if ($('examStudentSelect')) { $('examStudentSelect').innerHTML = "<option value=''>Select Student...</option>"; $('examStudentSelect').disabled = true; } if ($('examTradeSelect')) $('examTradeSelect').value = ""; if ($('examInterface')) $('examInterface').style.display = 'none'; if ($('examEmptyState')) $('examEmptyState').style.display = 'flex'; if ($('sidebarStudentName')) $('sidebarStudentName').innerText = 'Student Name'; if ($('sidebarStudentReg')) $('sidebarStudentReg').innerText = 'ADM/0000'; if ($('sidebarStudentTrade')) $('sidebarStudentTrade').innerText = 'TRADE'; }
function loadExamStudents() { const tradeId = currentExamContext.tradeId; const studentSelect = $('examStudentSelect'); if (!studentSelect) return; studentSelect.innerHTML = "<option value=''>Select Student...</option>"; currentExamContext.studentId = null; if (!tradeId) { studentSelect.disabled = true; return; } studentSelect.disabled = false; const filtered = StudentRepo.findBy('tradeId', tradeId); if (filtered.length === 0) { studentSelect.innerHTML = "<option value=''>No students in this course</option>"; studentSelect.disabled = true; return; } filtered.forEach(s => { studentSelect.innerHTML += `<option value="${s.id}">${s.name} (${s.reg})</option>`; }); if ($('examInterface')) $('examInterface').style.display = 'none'; if ($('examEmptyState')) $('examEmptyState').style.display = 'flex'; }
function loadCBETUnits() { const studentId = currentExamContext.studentId; if (!studentId) return; const student = StudentRepo.getById(studentId); if (!student) return; if (student.tradeId !== currentExamContext.tradeId) { resetExamView(); return; } const trade = store.trades.find(t => t.id === student.tradeId); if ($('examInterface')) $('examInterface').style.display = 'flex'; if ($('examEmptyState')) $('examEmptyState').style.display = 'none'; if ($('sidebarStudentName')) $('sidebarStudentName').innerText = student.name; if ($('sidebarStudentReg')) $('sidebarStudentReg').innerText = student.reg; if ($('sidebarStudentTrade')) $('sidebarStudentTrade').innerText = student.trade; renderCBETUnits(student, trade); }
function submitUnitForm(e) { e.preventDefault(); const courseId = $('unitCourseId')?.value; const code = getVal('unitCode').toUpperCase(); const name = getVal('unitName'); const editId = $('unitEditId')?.value; if (!courseId || !code || !name) { return showToast('Please fill all fields', 'error'); } const course = store.trades.find(t => t.id === courseId); if (!course) return showToast('Course not found', 'error'); if (!course.units) course.units = []; if (editId) { const unitIndex = course.units.findIndex(u => u.code === editId); if (unitIndex !== -1) { const duplicate = course.units.find(u => u.code === code && u.code !== editId); if (duplicate) return showToast('A unit with this code already exists.', 'error'); course.units[unitIndex] = { code, name }; } } else { const exists = course.units.some(u => u.code === code); if (exists) return showToast('A unit with this code already exists.', 'error'); course.units.push({ code, name }); } saveData(); closeModal('unitModal'); showToast('Unit Saved!'); openUnitsModal(courseId); }
function renderCBETUnits(student, trade) { const container = $('cbetUnitsList'); if (!container) return; container.innerHTML = ''; if (!trade || !trade.units) { container.innerHTML = `<div class="empty-state">No units found for this course.</div>`; return; } trade.units.forEach(unit => { const result = store.exams.find(e => e.studentId === student.id && e.unitCode === unit.code); let status = 'Pending'; let score = 0; let attempts = 0; let statusClass = 'status-pending'; let isLocked = false; if (result) { const comp = getCompetenceStatus(result.score); status = comp.status; statusClass = comp.class; score = parseInt(result.score) || 0; let att = result.attempts; if (Array.isArray(att)) attempts = att.length; else attempts = parseInt(att) || 1; if (score >= 50) { isLocked = true; } } const hasEvidence = result && result.evidence && result.evidence.length > 0; container.innerHTML += `<div class="cbet-unit-card" data-unit-code="${unit.code}" data-unit-name="${unit.name}" data-status="${status}" data-locked="${isLocked}"><div class="status-bar ${statusClass}"></div><div class="unit-card-body"><div class="unit-header"><span class="unit-code">${unit.code}</span><span class="unit-status-badge ${statusClass}">${status}</span>${isLocked ? '<i class="fa-solid fa-lock" style="margin-left: auto; font-size: 0.8rem; color: var(--text-muted);" title="Completed"></i>' : ''}</div><div class="unit-name">${unit.name}</div><div class="unit-footer"><div class="unit-score-display">Score: <strong>${score}%</strong></div><div style="display:flex; align-items:center; gap:5px; font-size:0.8rem; color:var(--text-muted);">${hasEvidence ? '<span class="evidence-dot has-photo" title="Evidence Attached"></span>' : ''}<span>Attempts: ${attempts}</span>${!isLocked && result ? '<span style="color:var(--warning);">(Reattempt)</span>' : ''}</div></div></div></div>`; }); updateExamProgress(student.id); }
function updateExamProgress(studentId) { const student = StudentRepo.getById(studentId); const trade = store.trades.find(t => t.id === student?.tradeId); if (!student || !trade) return; const totalUnits = trade.units.length; const results = store.exams.filter(e => e.studentId === studentId); const competentCount = results.filter(r => parseInt(r.score) >= 50).length; const percent = totalUnits > 0 ? Math.round((competentCount / totalUnits) * 100) : 0; if ($('progressPercent')) $('progressPercent').innerText = percent + '%'; if ($('countC')) $('countC').innerText = competentCount; if ($('countNYC')) $('countNYC').innerText = totalUnits - competentCount; const circle = $('progressCircle'); if (circle) { const radius = 70; const circumference = 2 * Math.PI * radius; const offset = circumference - (percent / 100) * circumference; circle.style.strokeDasharray = circumference; circle.style.strokeDashoffset = offset; if (percent === 100) circle.style.stroke = 'var(--success)'; else if (percent >= 50) circle.style.stroke = 'var(--warning)'; else circle.style.stroke = 'var(--danger)'; } checkCertificateEligibility(percent); }
function checkCertificateEligibility(percent) { const certBtn = $('btnGenCert'); if (certBtn) { if (percent < 100) { certBtn.disabled = true; certBtn.style.opacity = '0.5'; certBtn.title = "Complete all units (Score >= 50%) to generate certificate"; } else { certBtn.disabled = false; certBtn.style.opacity = '1'; certBtn.title = "Generate Certificate"; } } }
function openAssessmentModal(code, name, studentId) { $('assessUnitTitle').innerText = name; $('assessUnitId').value = code; const result = store.exams.find(e => e.studentId === studentId && e.unitCode === code); currentEvidenceFiles = []; renderEvidencePreviews(); if (result) { $('assessScore').value = result.score; $('assessFeedback').value = result.feedback || ''; if (result.evidence && Array.isArray(result.evidence)) { currentEvidenceFiles = [...result.evidence]; } else { currentEvidenceFiles = []; } renderEvidencePreviews(); } else { $('assessScore').value = ''; $('assessFeedback').value = ''; } updateAssessmentPreview(); openModal('assessmentModal'); }
function updateAssessmentPreview() { const score = parseInt($('assessScore').value) || 0; const comp = getCompetenceStatus(score); const displayBox = $('assessStatusDisplay'); if (displayBox) { displayBox.innerText = comp.status; displayBox.className = `status-display-box ${comp.class}`; } const feedbackBox = $('assessFeedback'); if (feedbackBox && !feedbackBox.value) { if (comp.status === 'Mastery') feedbackBox.value = "Exceptional performance. The trainee exceeds industry standards."; else if (comp.status === 'Proficiency') feedbackBox.value = "Strong ability demonstrated with minor guidance needed."; else if (comp.status === 'Competent') feedbackBox.value = "Meets minimum industry standards. Satisfactory performance."; else feedbackBox.value = "Requires further training and practice. Re-assessment recommended."; } }
function handleDrop(e) { const dt = e.dataTransfer; const files = dt.files; handleEvidenceSelect(files); }
function handleEvidenceSelect(files) { if (!files || files.length === 0) return; if (currentEvidenceFiles.length + files.length > 3) { return showToast('Maximum 3 evidence files allowed.', 'error'); } Array.from(files).forEach(file => { if (file.size > 2 * 1024 * 1024) { return showToast(`File ${file.name} is too large (Max 2MB).`, 'error'); } const reader = new FileReader(); reader.onload = function (e) { currentEvidenceFiles.push({ name: file.name, type: file.type, data: e.target.result }); renderEvidencePreviews(); }; reader.readAsDataURL(file); }); }
function renderEvidencePreviews() { const previewGrid = $('evidencePreview'); if (!previewGrid) return; previewGrid.innerHTML = ''; currentEvidenceFiles.forEach((file, index) => { let thumbSrc = ''; let icon = 'fa-file'; if (file.type.startsWith('image/')) { thumbSrc = file.data; icon = ''; } else if (file.type.startsWith('video/')) { icon = 'fa-video'; } else if (file.type.startsWith('audio/')) { icon = 'fa-microphone'; } previewGrid.innerHTML += `<div class="ev-thumb-placeholder" onclick="removeEvidence(${index})" style="position:relative; cursor:pointer;">${thumbSrc ? `<img src="${thumbSrc}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">` : `<i class="fa-solid ${icon}"></i>`}<div style="position:absolute; top:2px; right:2px; background:var(--danger); color:white; border-radius:50%; width:16px; height:16px; font-size:10px; display:flex; align-items:center; justify-content:center;">&times;</div></div>`; }); if (currentEvidenceFiles.length < 3) { previewGrid.innerHTML += `<div class="ev-thumb-placeholder add-new" onclick="document.getElementById('evidenceInput').click()"><i class="fa-solid fa-plus"></i></div>`; } }
function removeEvidence(index) { currentEvidenceFiles.splice(index, 1); renderEvidencePreviews(); }
function saveUnitAssessment() { const studentId = currentExamContext.studentId; const unitCode = $('assessUnitId').value; const score = parseInt($('assessScore').value); const feedback = $('assessFeedback').value; if (isNaN(score) || score < 0 || score > 100) return showToast('Enter a valid score (0-100)', 'error'); const comp = getCompetenceStatus(score); const status = comp.status; const existingIndex = store.exams.findIndex(e => e.studentId === studentId && e.unitCode === unitCode); const existingRecord = existingIndex !== -1 ? store.exams[existingIndex] : null; let currentAttempts = 0; if (existingRecord) { let att = existingRecord.attempts; if (Array.isArray(att)) currentAttempts = att.length; else currentAttempts = parseInt(att) || 0; } const data = { id: existingRecord ? existingRecord.id : generateId(), studentId, unitCode, score, status, feedback, evidence: currentEvidenceFiles, date: new Date().toISOString(), attempts: currentAttempts + 1 }; if (existingIndex !== -1) { store.exams[existingIndex] = data; } else { store.exams.push(data); } saveData(); closeModal('assessmentModal'); showToast(`Assessment Saved: ${status}`); loadCBETUnits(); renderDashboard(); }


// ==========================================================================
//   UPDATED: External Exams Section (Rendering & Actions)
// ==========================================================================


// --- MAIN RENDER FUNCTION (Updated with Level Filter) ---
function renderExternalExams() {
    const tbody = $('externalExamsTableBody');
    if (!tbody) return;

    // Get Filter Values
    const searchVal = ($('extExamSearch')?.value || '').toLowerCase();
    const bodyFilter = $('extExamBodyFilter')?.value || 'all';
    const seriesFilter = $('extSeriesFilter')?.value || 'all';
    const levelFilter = $('extLevelFilter')?.value || 'all'; // ADDED LEVEL FILTER

    let data = ExternalExamRepo.getAll();

    // Apply Filters
    if (searchVal) {
        data = data.filter(r =>
            (r.studentName && r.studentName.toLowerCase().includes(searchVal)) ||
            (r.indexNo && r.indexNo.toLowerCase().includes(searchVal))
        );
    }
    if (bodyFilter !== 'all') {
        data = data.filter(r => r.examBody === bodyFilter);
    }
    if (seriesFilter !== 'all') {
        data = data.filter(r => r.series === seriesFilter);
    }
    // ADDED LEVEL FILTER LOGIC
    if (levelFilter !== 'all') {
        data = data.filter(r => r.level === levelFilter);
    }

    // Update Statistics
    const allData = ExternalExamRepo.getAll();
    const total = allData.length;
    const approved = allData.filter(r => r.status === 'Approved').length;
    const pending = allData.filter(r => r.feeStatus === 'Pending').length;

    if ($('extTotalReg')) $('extTotalReg').innerText = total;
    if ($('extApproved')) $('extApproved').innerText = approved;
    if ($('extPending')) $('extPending').innerText = pending;

    // Render Table
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center">No external exam registrations found.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(r => {
        // Check if record has attachments
        const hasFiles = r.attachments && r.attachments.length > 0;
        const attachmentCount = r.attachments ? r.attachments.length : 0;

        return `
        <tr>
            <td><strong>${r.indexNo || 'N/A'}</strong></td>
            <td>${escapeHtml(r.studentName)}</td>
            <td>${r.course || 'N/A'}</td>
            <td><span class="badge bg-info">${r.examBody}</span></td>
            <td>${r.series}</td>
            <td><span class="badge ${r.feeStatus === 'Paid' ? 'bg-success' : 'bg-warning'}">${r.feeStatus}</span></td>
            <td><span class="badge ${r.status === 'Approved' ? 'bg-primary' : 'bg-secondary'}">${r.status}</span></td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-ghost" data-action="viewExtExam" data-id="${r.id}" title="View Details">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-ghost" data-action="editExtExam" data-id="${r.id}" title="Edit Registration">
                        <i class="fa-solid fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-ghost ${hasFiles ? 'text-primary' : 'text-muted'}" 
                            data-action="viewAttachments" 
                            data-id="${r.id}" 
                            title="View Attachments (${attachmentCount})">
                        <i class="fa-solid fa-paperclip"></i>
                    </button>
                    <button class="btn btn-sm btn-ghost text-danger" data-action="deleteExtExam" data-id="${r.id}" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
        `;

            // --- EXTERNAL EXAMS LISTENERS ---
    const form = $('externalExamForm');
    if(form) form.addEventListener('submit', submitExternalExam);

    const searchInput = $('extStudentSearch');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => searchExtStudent(e.target.value));
    }

    const resultsDiv = $('extStudentResults');
    if(resultsDiv) {
        resultsDiv.addEventListener('click', (e) => {
            const item = e.target.closest('.autocomplete-item');
            if(item && item.dataset.extId) {
                $('extStudentId').value = item.dataset.extId;
                $('extStudentSearch').value = item.innerText;
                resultsDiv.style.display = 'none';
            }
        });
    }

    // Attach listener for Table Actions (Delegation)
    const tableBody = $('externalExamsTableBody');
    if(tableBody) {
        tableBody.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if(!btn) return;
            
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            
            switch(action) {
                case 'viewExtExam': viewExtExam(id); break;
                case 'editExtExam': editExtExam(id); break;
                case 'deleteExtExam': deleteExtExam(id); break;
                case 'viewAttachments': 
                    // FIX: This calls the function defined at the bottom of the file
                    if (typeof viewAttachments === 'function') {
                        viewAttachments(id);
                    }
                    break; 
            }
        });
    }
    }).join('');
}

// --- ATTACHMENT PREVIEW HELPER ---
function renderExtFilePreviews() {
    const container = $('extFilePreview');
    if (!container) return;

    container.innerHTML = '';

    if (!currentExtExamFiles || currentExtExamFiles.length === 0) return;

    currentExtExamFiles.forEach(file => {
        const isImage = file.type && file.type.startsWith('image/');
        const card = document.createElement('div');
        card.className = 'ext-file-card';
        card.innerHTML = `
            <button class="ext-remove-btn" onclick="removeExtFile('${file.id}')" title="Remove">×</button>
            <div class="ext-file-thumb">
                ${isImage 
                    ? `<img src="${file.data}" style="width:100%; height:100%; object-fit:cover;">` 
                    : `<i class="fa-solid fa-file-pdf ext-file-icon"></i>`
                }
            </div>
            <div class="ext-file-info">
                <div class="ext-file-name" title="${file.name}">${file.name}</div>
                <div class="ext-file-meta">${(file.size / 1024).toFixed(1)} KB</div>
            </div>
        `;
        container.appendChild(card);
    });
}

window.removeExtFile = (id) => {
    currentExtExamFiles = currentExtExamFiles.filter(f => f.id !== id);
    renderExtFilePreviews();
};

// --- ACTION FUNCTIONS ---

function viewExtExam(id) {
    const record = ExternalExamRepo.getById(id);
    if (!record) return showToast('Record not found.', 'error');

    // Ideally replace alert with a modal, but keeping alert per your snippet
    const details = `
        CANDIDATE DETAILS
        -----------------
        Name: ${record.studentName}
        Reg No: ${record.regNo}
        Course: ${record.course}
        
        EXAM DETAILS
        ------------
        Exam Body: ${record.examBody}
        Series: ${record.series}
        Level: ${record.level}
        Index No: ${record.indexNo}
        
        FINANCIALS
        ----------
        Fee: KES ${record.fee}
        Status: ${record.feeStatus}
    `;
    alert(details); 
}

function editExtExam(id) {
    // 1. OPEN THE MODAL
    openModal('externalExamModal');

    // 2. FETCH DATA
    const record = ExternalExamRepo.getById(id);
    if (!record) {
        closeModal('externalExamModal');
        return showToast('Record not found', 'error');
    }

    // 3. POPULATE FIELDS
    $('extStudentId').value = record.studentId || '';
    
    const student = StudentRepo.getById(record.studentId);
    if ($('extStudentSearch')) {
        $('extStudentSearch').value = student 
            ? `${student.name} (${student.reg})` 
            : (record.studentName || 'Unknown Student');
    }
    
    // Hide autocomplete results
    const resultsDiv = $('extStudentResults');
    if (resultsDiv) {
        resultsDiv.innerHTML = '';
        resultsDiv.style.display = 'none';
    }

    $('extExamBody').value = record.examBody || '';
    $('extExamSeries').value = record.series || ("July " + new Date().getFullYear());
    $('extExamLevel').value = record.level || '';
    $('extIndexNo').value = record.indexNo || '';
    $('extExamFee').value = record.fee || '';
    $('extPaymentStatus').value = record.feeStatus || '';

    // 4. SET EDIT MODE
    $('extEditId').value = id;

    // 5. UPDATE TITLE
    const modalTitle = document.querySelector('#externalExamModal h3');
    if (modalTitle) modalTitle.innerText = "Edit External Exam Registration";

    // 6. LOAD ATTACHMENTS
    currentExtExamFiles = record.attachments ? [...record.attachments] : [];
    renderExtFilePreviews();
}

function deleteExtExam(id) {
    if (confirm('Are you sure you want to remove this external exam registration? This cannot be undone.')) {
        const success = ExternalExamRepo.delete(id);
        if (success) {
            showToast('Registration removed successfully.');
            renderExternalExams();
        } else {
            showToast('Failed to remove registration.', 'error');
        }
    }
}

function searchExtStudent(val) {
    const resultsDiv = $('extStudentResults');
    if (!resultsDiv) return;

    if (!val || val.length < 2) {
        resultsDiv.style.display = 'none';
        return;
    }

    const found = StudentRepo.getAll().filter(s => s.name.toLowerCase().includes(val.toLowerCase())).slice(0, 5);

    if (found.length === 0) {
        resultsDiv.innerHTML = `<div class="autocomplete-item" style="padding:8px; color:var(--text-muted);">No students found</div>`;
        resultsDiv.style.display = 'block';
        return;
    }

    resultsDiv.innerHTML = found.map(s => `
        <div class="autocomplete-item" data-ext-id="${s.id}" style="padding:8px; cursor:pointer;">
            ${escapeHtml(s.name)} <small style="color:var(--text-muted);">(${s.reg} - ${s.trade})</small>
        </div>
    `).join('');
    resultsDiv.style.display = 'block';
}

function submitExternalExam(e) {
    e.preventDefault();

    // 1. Validate Student Selection
    const studentId = $('extStudentId').value;
    if (!studentId) {
        return showToast('Please select a valid student from the search results.', 'error');
    }

    const student = StudentRepo.getById(studentId);
    const studentName = student ? student.name : $('extStudentSearch').value; 

    // 2. Check for Edit Mode
    const editId = $('extEditId')?.value;
    const isNewRecord = !editId;
    
    const record = {
        studentId: studentId,
        studentName: studentName,
        regNo: student ? student.reg : 'N/A',
        course: student ? student.trade : 'N/A',
        examBody: getVal('extExamBody'),
        series: getVal('extExamSeries'),
        level: getVal('extExamLevel'),
        indexNo: getVal('extIndexNo'),
        fee: parseFloat(getVal('extExamFee')),
        feeStatus: getVal('extPaymentStatus'),
        attachments: currentExtExamFiles || [], 
        date: isNewRecord ? new Date().toISOString() : null 
    };

    // 3. Update vs Create Logic
    if (editId) {
        const oldRecord = ExternalExamRepo.getById(editId);
        if (oldRecord) {
            record.id = editId; 
            record.status = oldRecord.status || 'Pending'; 
            record.date = oldRecord.date; 
        }

        const success = ExternalExamRepo.update(editId, record);
        if (success) {
            showToast('External Exam Registration Updated Successfully!');
        } else {
            showToast('Error updating record.', 'error');
        }
    } else {
        if (!record.date) record.date = new Date().toISOString();
        ExternalExamRepo.create(record);
        showToast('Candidate Registered Successfully!');
    }

    // 4. Cleanup
    closeModal('externalExamModal');
    $('externalExamForm').reset();
    $('extStudentId').value = '';
    $('extStudentSearch').value = '';
    if ($('extEditId')) $('extEditId').value = ''; 
    currentExtExamFiles = [];
    renderExtFilePreviews();
    renderExternalExams();
}

function exportExtExamList() {
    const data = ExternalExamRepo.getAll().map(r => ({
        name: r.studentName,
        reg: r.regNo,
        index: r.indexNo,
        body: r.examBody,
        series: r.series,
        level: r.level, // Added Level to export
        fee: r.fee,
        status: r.feeStatus
    }));

    const headers = [
        { label: "Student Name", key: "name", width: 30 },
        { label: "Reg No", key: "reg", width: 15 },
        { label: "Index No", key: "index", width: 15 },
        { label: "Exam Body", key: "body", width: 15 },
        { label: "Series", key: "series", width: 15 },
        { label: "Level", key: "level", width: 10 }, // Added Level header
        { label: "Fee (KES)", key: "fee", width: 15 },
        { label: "Payment Status", key: "status", width: 15 }
    ];

    generateExcelReport(data, headers, "External_Exams_Nominal_Roll", "External Exams Nominal Roll");
}

// --- EVENT LISTENERS ---

document.addEventListener('DOMContentLoaded', () => {
    // Attach listeners to filters
    ['extExamSearch', 'extExamBodyFilter', 'extSeriesFilter', 'extLevelFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', renderExternalExams);
            el.addEventListener('change', renderExternalExams);
        }
    });

    // Attach listener to form submit
    const form = $('externalExamForm');
    if(form) form.addEventListener('submit', submitExternalExam);

    // Attach listener to Student Search
    const searchInput = $('extStudentSearch');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => searchExtStudent(e.target.value));
    }

    // Attach listener for Autocomplete Selection
    const resultsDiv = $('extStudentResults');
    if(resultsDiv) {
        resultsDiv.addEventListener('click', (e) => {
            const item = e.target.closest('.autocomplete-item');
            if(item && item.dataset.extId) {
                $('extStudentId').value = item.dataset.extId;
                $('extStudentSearch').value = item.innerText;
                resultsDiv.style.display = 'none';
            }
        });
    }
    
    // Attach listener for Table Actions (Delegation)
    const tableBody = $('externalExamsTableBody');
    if(tableBody) {
        tableBody.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if(!btn) return;
            
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            
            switch(action) {
                case 'viewExtExam': viewExtExam(id); break;
                case 'editExtExam': editExtExam(id); break;
                case 'deleteExtExam': deleteExtExam(id); break;
                case 'viewAttachments': 
                    // Assuming you have a viewAttachments function or similar
                    showToast('View Attachments feature clicked for ID: ' + id); 
                    break; 
            }
        });
    }

    // Initial Render
    renderExternalExams();
});
// ==========================================================================
//   STAFF SECTION (FULL FIX)
// ==========================================================================

function validateStaffName(input) { 
    if (!input) return false; 
    const regex = /^[A-Za-z\s]+$/; 
    if (!regex.test(input.value) && input.value !== '') { 
        input.classList.add('error'); 
        return false; 
    } 
    input.classList.remove('error'); 
    return true; 
}

function validateStaffID(input) { 
    if (!input) return false; 
    input.value = input.value.replace(/\D/g, ''); 
    const val = input.value; 
    const isValid = val.length === 8; 
    const editId = $('staffEditId')?.value; 
    const isDuplicate = StaffRepo.getAll().some(s => s.idNo === val && s.id !== editId); 
    
    if (val.length > 0 && (!isValid || isDuplicate)) { 
        input.classList.add('error'); 
        if (isDuplicate) showToast('Staff ID must be unique!', 'error'); 
        return false; 
    } 
    input.classList.remove('error'); 
    return isValid; 
}

function validateStaffDob(input) { 
    if (!input || !input.value) return false; 
    const dob = new Date(input.value); 
    const today = new Date(); 
    let age = today.getFullYear() - dob.getFullYear(); 
    const m = today.getMonth() - dob.getMonth(); 
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) { age--; } 
    
    if (age < 18) { 
        input.classList.add('error'); 
        showToast('Staff must be at least 18 years old.', 'error'); 
        return false; 
    } 
    if (age > 70) { 
        input.classList.add('error'); 
        showToast('Age seems incorrect (over 70).', 'error'); 
        return false; 
    } 
    input.classList.remove('error'); 
    return true; 
}

function validateStaffStep(stepNumber) { 
    // Clear errors first
    const inputs = document.querySelectorAll('#staffForm .form-control');
    inputs.forEach(i => i.classList.remove('error'));

    let isValid = true; 
    let focusSet = false; 
    
    const setError = (input, message) => { 
        input.classList.add('error'); 
        if (!focusSet) { 
            input.focus(); 
            focusSet = true; 
        } 
        if (message) showToast(message, 'error'); 
        isValid = false; 
    }; 
    
    if (stepNumber === 1) { 
        const surname = $('staffSurname'); 
        const firstName = $('staffFirstName'); 
        const gender = $('staffGender'); 
        const dob = $('staffDob'); 
        const idNo = $('staffIdNo'); 
        const phone = $('staffPhone'); 
        
        if (!surname.value.trim() || !validateStaffName(surname)) setError(surname, 'Valid Surname required.'); 
        if (!firstName.value.trim() || !validateStaffName(firstName)) setError(firstName, 'Valid First Name required.'); 
        if (!gender.value) setError(gender, 'Gender is required.'); 
        if (!dob.value || !validateStaffDob(dob)) setError(dob, 'Valid DOB required.'); 
        if (!idNo.value || idNo.value.length !== 8) { 
            setError(idNo, 'ID Number must be 8 digits.'); 
        } else { 
            const editId = $('staffEditId')?.value; 
            const isDuplicate = StaffRepo.getAll().some(s => s.idNo === idNo.value && s.id !== editId); 
            if (isDuplicate) setError(idNo, 'Duplicate Staff ID detected!'); 
        } 
        if (!phone.value || !validatePhone(phone)) setError(phone, 'Valid Phone required.'); 
    } 
    else if (stepNumber === 2) { 
        const role = $('staffRole'); 
        const dept = $('staffDept'); 
        const terms = $('staffTerms'); 
        const doa = $('staffDOA'); 
        
        if (!role.value) setError(role, 'Role is required.'); 
        if (!dept.value) setError(dept, 'Department is required.'); 
        if (!terms.value) setError(terms, 'Terms of service required.'); 
        if (!doa.value) setError(doa, 'Date of Appointment required.'); 
        if (doa.value && new Date(doa.value) > new Date()) { 
            setError(doa, 'Appointment Date cannot be in the future.'); 
        } 
    } 
    else if (stepNumber === 3) { 
        const qual = $('staffQual'); 
        if (!qual.value) setError(qual, 'Qualification is required.'); 
    } 
    else if (stepNumber === 4) { 
        const gName = $('staffGuardianName'); 
        const gPhone = $('staffGuardianPhone'); 
        
        if (!gName.value.trim()) setError(gName, 'Guardian Name is required.'); 
        if (!gPhone.value || !validatePhone(gPhone)) setError(gPhone, 'Valid Guardian Phone required.'); 
    } 
    
    if (!isValid) showToast('Please correct the highlighted fields.', 'error'); 
    return isValid; 
}
function nextStaffStep(current, next) { 
    if (!validateStaffStep(current)) return; 
    $(`staff-form-step-${current}`).classList.remove('active'); 
    $(`staff-form-step-${next}`).classList.add('active'); 
    const stepIndicators = document.querySelectorAll('#staffModal .stepper .step'); 
    stepIndicators.forEach((step, index) => { 
        step.classList.remove('active'); 
        if (index + 1 < next) step.classList.add('completed'); 
        else if (index + 1 === next) step.classList.add('active'); 
    }); 
}

function prevStaffStep(current, prev) { 
    $(`staff-form-step-${current}`).classList.remove('active'); 
    $(`staff-form-step-${prev}`).classList.add('active'); 
    const stepIndicators = document.querySelectorAll('#staffModal .stepper .step'); 
    stepIndicators.forEach((step, index) => { 
        step.classList.remove('active'); 
        if (index + 1 === prev) { 
            step.classList.add('active'); 
            step.classList.remove('completed'); 
        } 
    }); 
}

/**
 * Resets the staff form to its default state (Clears inputs, resets stepper).
 * Also resets the Submit button text to "Complete Registration".
 */
function resetStaffForm() {
    const form = $('staffForm');
    if (!form) return;
    
    form.reset();
    
    // Reset Hidden ID
    if ($('staffEditId')) $('staffEditId').value = "";
    
    // Reset Photo
    const photoPreview = $('staffPhotoPreview');
    if (photoPreview) photoPreview.src = DEFAULT_AVATAR;
    
    // Reset Stepper UI (Steps 1-4)
    document.querySelectorAll('#staffForm .form-step').forEach(s => s.classList.remove('active'));
    const step1 = $('staff-form-step-1');
    if (step1) step1.classList.add('active');
    
    const stepIndicators = document.querySelectorAll('#staffModal .stepper .step');
    stepIndicators.forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index === 0) step.classList.add('active');
    });

    // Remove validation errors
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => input.classList.remove('error'));

    // Reset Submit Button Text
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerHTML = `<i class="fa-solid fa-check" aria-hidden="true"></i> Complete Registration`;
        submitBtn.classList.remove('btn-warning');
        submitBtn.classList.add('btn-success');
    }

    // Reset Modal Title
    const modalTitle = $('staffModalTitle');
    if (modalTitle) modalTitle.innerText = "Add New Staff";
}

/**
 * Opens the Staff Modal.
 * If an ID is provided, it opens in Edit Mode.
 * If no ID, it opens in Add Mode.
 */
function openStaffModal(id = null) {
    // 1. Always reset the form first
    resetStaffForm();
    
    // 2. Open the modal visually
    openModal('staffModal');

    // 3. If an ID is provided, we are in EDIT mode
    if (id) {
        // Use setTimeout to ensure the modal is fully rendered (display: block)
        setTimeout(() => {
            editStaff(id);
        }, 50); 
    }
}

function editStaff(id) {
    const s = StaffRepo.getById(id);
    if (!s) {
        showToast('Staff record not found', 'error');
        return;
    }

    // 1. Update UI Titles and Buttons for Edit Mode
    if ($('staffModalTitle')) $('staffModalTitle').innerText = "Edit Staff Details";
    
    const submitBtn = document.querySelector('#staffForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerHTML = `<i class="fa-solid fa-save" aria-hidden="true"></i> Update Staff Details`;
        submitBtn.classList.remove('btn-success');
        submitBtn.classList.add('btn-warning');
    }

    // 2. Set Hidden ID
    $('staffEditId').value = id;

    // 3. Populate Fields - Helper function to avoid repetition
    const setVal = (id, val) => { const el = $(id); if (el) el.value = val; };
    const getVal = (id) => { const el = $(id); return el ? el.value : ''; };

    // Populate Step 1: Bio Data
    setVal('staffSurname', s.name.split(' ')[0] || '');
    setVal('staffFirstName', s.name.split(' ')[1] || '');
    setVal('staffOtherNames', s.name.split(' ').slice(2).join(' ') || '');
    setVal('staffGender', s.gender || 'Male');
    setVal('staffDob', s.dob || '');
    setVal('staffIdNo', s.idNo || '');
    setVal('staffPhone', s.phone || '');
    setVal('staffEmail', s.email || '');
    setVal('staffPwdNo', s.pwdNo || '');

    const photoPreview = $('staffPhotoPreview');
    if (photoPreview) photoPreview.src = s.photo || DEFAULT_AVATAR;

    // Populate Step 2: Employment
    setVal('staffEmpNo', s.empNo || '');
    setVal('staffTsc', s.tsc || '');
    setVal('staffRole', s.role || 'Trainer');
    setVal('staffDept', s.dept || '');
    setVal('staffTerms', s.terms || 'Permanent');
    setVal('staffDOA', s.doa || '');
    setVal('staffInitialJobGroup', s.initialJobGroup || 'G');
    setVal('staffPromotionDate', s.promotionDate || '');
    setVal('staffCurrentJobGroup', s.currentJobGroup || '');
    
    // Auto-calculate retirement date
    calculateRetirement();

    // Populate Step 3: Academic
    setVal('staffQual', s.qualification || 'Diploma');
    setVal('staffSpecialization', s.specialization || '');
    setVal('staffInstitution', s.institution || '');
    setVal('staffQualYear', s.qualificationYear || '');
    setVal('staffRegBody', s.regBody || '');

    // Populate Step 4: Guardian
    setVal('staffGuardianName', s.guardianName || '');
    setVal('staffGuardianRel', s.guardianRel || '');
    setVal('staffGuardianPhone', s.guardianPhone || '');
    setVal('staffGuardianAddress', s.guardianAddress || '');

    // Reset Stepper Visuals to Step 1
    document.querySelectorAll('#staffForm .form-step').forEach(s => s.classList.remove('active'));
    const step1 = $('staff-form-step-1');
    if (step1) step1.classList.add('active');
    
    const stepIndicators = document.querySelectorAll('#staffModal .stepper .step');
    stepIndicators.forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index === 0) step.classList.add('active');
    });

    showToast('Editing: ' + s.name, 'info');
}

function submitStaff(e) {
    e.preventDefault();

    // Simple validation check (last step)
    // In a multi-step form, we usually validate the last step before allowing submit
    if (!validateStaffStep(4)) {
        return;
    }

    const names = [getVal('staffSurname'), getVal('staffFirstName'), getVal('staffOtherNames')].filter(Boolean).join(' ');
    const editId = $('staffEditId')?.value;

    const staffData = {
        name: names,
        gender: getVal('staffGender'),
        dob: getVal('staffDob'),
        idNo: getVal('staffIdNo'),
        phone: getVal('staffPhone'),
        email: getVal('staffEmail'),
        pwdNo: getVal('staffPwdNo'),
        // Employment
        role: getVal('staffRole'),
        dept: getVal('staffDept'),
        terms: getVal('staffTerms'),
        doa: getVal('staffDOA'),
        empNo: getVal('staffEmpNo'),
        tsc: getVal('staffTsc'),
        initialJobGroup: getVal('staffInitialJobGroup'),
        promotionDate: getVal('staffPromotionDate'),
        currentJobGroup: getVal('staffCurrentJobGroup'),
        retirementDate: getVal('staffRetirementDate'),
        // Academic
        qualification: getVal('staffQual'),
        specialization: getVal('staffSpecialization'),
        institution: getVal('staffInstitution'),
        qualificationYear: getVal('staffQualYear'),
        regBody: getVal('staffRegBody'),
        // Guardian
        guardianName: getVal('staffGuardianName'),
        guardianRel: getVal('staffGuardianRel'),
        guardianPhone: getVal('staffGuardianPhone'),
        guardianAddress: getVal('staffGuardianAddress'),
        // Media
        photo: $('staffPhotoPreview')?.src || DEFAULT_AVATAR
    };

    if (editId) {
        // UPDATE MODE
        const success = StaffRepo.update(editId, staffData);
        if (success) {
            showToast('Staff Updated Successfully!');
        } else {
            showToast('Error updating staff record.', 'error');
        }
    } else {
        // CREATE MODE
        StaffRepo.create(staffData);
        showToast('Staff Added Successfully!');
    }

    closeModal('staffModal');
    renderStaff();
    renderDashboard(); // Updates dashboard stats if needed
}


function previewStaffPhoto(input) { 
    if (input.files && input.files[0]) { 
        const file = input.files[0]; 
        if (!file.type.startsWith('image/')) { 
            showToast('Invalid file type.', 'error'); 
            return; 
        } 
        const reader = new FileReader(); 
        reader.onload = function (e) { 
            if ($('staffPhotoPreview')) $('staffPhotoPreview').src = e.target.result; 
        }; 
        reader.readAsDataURL(input.files[0]); 
    } 
}

function calculateRetirement() { 
    const dob = getVal('staffDob'); 
    if (dob) { 
        const dobDate = new Date(dob); 
        dobDate.setFullYear(dobDate.getFullYear() + 60); 
        setVal('staffRetirementDate', dobDate.toISOString().split('T')[0]); 
    } 
}

function deleteStaff(id) { 
    if (confirm('Are you sure you want to delete this staff member?')) { 
        if (StaffRepo.delete(id)) { 
            renderStaff(); 
            renderDashboard(); 
            showToast('Staff Deleted'); 
        } 
    } 
}

function initStaffSection() { 
    setView('grid', 'staff'); 
    renderStaff(); 
}

function updateStaffStats(data) { 
    if ($('staffCountTotal')) $('staffCountTotal').textContent = data.length; 
    if ($('staffCountMale')) $('staffCountMale').textContent = data.filter(s => s.gender === 'Male').length; 
    if ($('staffCountFemale')) $('staffCountFemale').textContent = data.filter(s => s.gender === 'Female').length; 
    if ($('staffCountPWD')) $('staffCountPWD').textContent = data.filter(s => s.pwdNo).length; 
}

function renderStaff() {
    const container = $('staffContainer');
    if (!container) return;
    
    const search = getVal('staffSearch').toLowerCase();
    const dept = getVal('staffDeptFilter');
    const terms = getVal('staffTermsFilter');
    
    let data = StaffRepo.getAll();

    // Apply Filters
    if (search) {
        data = data.filter(s => 
            s.name.toLowerCase().includes(search) || 
            (s.empNo && s.empNo.toLowerCase().includes(search))
        );
    }
    if (dept !== 'all') {
        data = data.filter(s => s.dept === dept);
    }
    if (terms !== 'all') {
        data = data.filter(s => s.terms === terms);
    }

    updateStaffStats(data);

    // Empty State
    if (data.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-user-slash"></i><p>No staff found.</p></div>`;
        return;
    }

    // Render based on current view (Grid or List)
    if (currentView.staff === 'grid') {
        container.className = 'staff-grid-container';
        container.innerHTML = data.map(s => {
            // Determine styling
            let statusClass = 'status-permanent';
            if (s.terms === 'Contract') statusClass = 'status-contract';
            
            return `
            <div class="staff-card ${statusClass}">
                <div class="staff-card-header">
                    <img src="${s.photo || DEFAULT_AVATAR}" class="staff-avatar" onerror="this.src='${DEFAULT_AVATAR}'">
                    <div class="staff-info">
                        <h4>${escapeHtml(s.name)}</h4>
                        <span class="staff-role-text">${s.role || 'Staff'}</span>
                    </div>
                </div>
                <div class="staff-card-body">
                    <div class="detail-item"><label>Department</label><span>${s.dept || 'N/A'}</span></div>
                    <div class="detail-item"><label>Terms</label>
                        <span class="badge ${s.terms === 'Permanent' ? 'badge-success' : 'badge-warning'}">${s.terms || 'N/A'}</span>
                    </div>
                    <div class="detail-item" style="grid-column: span 2;">
                        <label>Contact</label>
                        <span>${s.phone || 'N/A'}</span>
                    </div>
                </div>
                <div class="staff-card-footer">
                    <!-- Added type="button" to prevent form submission inside form -->
                    <button type="button" class="action-btn" data-action="edit" data-type="staff" data-id="${s.id}" title="Edit">
                        <i class="fa-solid fa-edit"></i>
                    </button>
                    <button type="button" class="action-btn danger" data-action="delete" data-type="staff" data-id="${s.id}" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>`;
        }).join('');
    } else {
        // List View
        container.className = 'table-container';
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Department</th>
                        <th>Terms</th>
                        <th>Contact</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(s => `
                        <tr>
                            <td>
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <img src="${s.photo || DEFAULT_AVATAR}" style="width:35px; height:35px; border-radius:50%; object-fit:cover;">
                                    <div>
                                        <div style="font-weight:600;">${escapeHtml(s.name)}</div>
                                        <div style="font-size:0.75rem; color:var(--text-muted);">${s.email || 'No Email'}</div>
                                    </div>
                                </div>
                            </td>
                            <td>${s.role || '-'}</td>
                            <td>${s.dept || '-'}</td>
                            <td><span class="badge ${s.terms === 'Permanent' ? 'badge-success' : 'badge-warning'}">${s.terms || 'N/A'}</span></td>
                            <td>${s.phone || '-'}</td>
                            <td>
                                <div class="btn-group">
                                    <button type="button" class="btn btn-sm btn-ghost" data-action="edit" data-type="staff" data-id="${s.id}">
                                        <i class="fa-solid fa-edit"></i>
                                    </button>
                                    <button type="button" class="btn btn-sm btn-ghost text-danger" data-action="delete" data-type="staff" data-id="${s.id}">
                                        <i class="fa-solid fa-trash" style="color:var(--danger)"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
}
// ==========================================================================
//   FINANCE SECTION
// ==========================================================================

// ==========================================================================
//   PAYMENT METHOD TOGGLER (Student Fees)
// ==========================================================================
function setPayMethod(method, btn) {
    currentPayMethod = method;
    // Update UI buttons
    btn.parentElement.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Handle dynamic fields
    const dyn = $('payDynamicFields');
    if (!dyn) return;
    dyn.innerHTML = '';
    
    if (method === 'M-Pesa') {
        dyn.innerHTML = `<div class="form-group"><label>Transaction Code</label><input type="text" id="payTransCode" class="form-control"></div>`;
    } else if (method === 'Bank') {
        dyn.innerHTML = `<div class="form-group"><label>Bank Name</label><input type="text" id="payBankName" class="form-control"></div><div class="form-group"><label>Slip No</label><input type="text" id="payBankSlip" class="form-control"></div>`;
    }
}

function renderFinance(filterSource = null) {
    const feesCollected = FinanceRepo.getAll().reduce((a, b) => a + (b.amount || 0), 0);
    const capitationReceived = CapitationRepo.getAll().reduce((a, b) => a + (b.amount || 0), 0);
    const totalExpenditure = ExpenditureRepo.getAll().reduce((a, b) => a + (b.amount || 0), 0);
    const balance = (feesCollected + capitationReceived) - totalExpenditure;

    if ($('finFeesTotal')) $('finFeesTotal').innerText = formatCurrency(feesCollected);
    if ($('finCapitation')) $('finCapitation').innerText = formatCurrency(capitationReceived);
    if ($('finExpenditure')) $('finExpenditure').innerText = formatCurrency(totalExpenditure);
    if ($('finBalance')) $('finBalance').innerText = formatCurrency(balance);

    const totalIncome = feesCollected + capitationReceived;
    const balancePercent = totalIncome > 0 ? Math.min((balance / totalIncome) * 100, 100) : 0;
    if ($('finBalanceBar')) $('finBalanceBar').style.width = balancePercent + '%';

    let data = FinanceRepo.getAll();
    if (filterSource) data = data.filter(f => f.source === filterSource);
    data.sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / financePerPage);
    if (financePage > totalPages && totalPages > 0) financePage = totalPages;
    if (financePage < 1) financePage = 1;

    const start = (financePage - 1) * financePerPage;
    const end = start + financePerPage;
    const paginatedData = data.slice(start, end);

    const tbody = $('financeSourcesTable');
    if (tbody) {
        tbody.innerHTML = paginatedData.length === 0 ? `<tr><td colspan="6" class="text-center">No records found.</td></tr>` :
        paginatedData.map(f => `<tr><td>${new Date(f.date).toLocaleDateString()}</td><td>${escapeHtml(f.studentName || 'N/A')}</td><td>${f.source}</td><td>${f.details || '-'}</td><td>${f.method}</td><td>${formatCurrency(f.amount)}</td></tr>`).join('');
    }

    const finPageInfo = $('financePageInfo');
    if (finPageInfo) finPageInfo.innerHTML = `Showing ${totalItems === 0 ? 0 : start + 1} to ${Math.min(end, totalItems)} of ${totalItems}`;
    if ($('btnFinPrev')) $('btnFinPrev').disabled = financePage === 1;
    if ($('btnFinNext')) $('btnFinNext').disabled = financePage >= totalPages;

    const capData = CapitationRepo.getAll().slice().reverse();
    const capTotalItems = capData.length;
    const capTotalPages = Math.ceil(capTotalItems / capitationPerPage);
    if (capitationPage > capTotalPages && capTotalPages > 0) capitationPage = capTotalPages;
    if (capitationPage < 1) capitationPage = 1;
    const capStart = (capitationPage - 1) * capitationPerPage;
    const capEnd = capStart + capitationPerPage;
    const paginatedCapData = capData.slice(capStart, capEnd);

    const capTable = $('capitationTable');
    if (capTable) {
        capTable.innerHTML = paginatedCapData.length === 0 ? `<tr><td colspan="4" class="text-center">No capitation records.</td></tr>` :
        paginatedCapData.map(c => `<tr><td>${new Date(c.date).toLocaleDateString()}</td><td>${c.ref || '-'}</td><td>${c.source}</td><td>${formatCurrency(c.amount)}</td></tr>`).join('');
    }
    const capPageInfo = $('capPageInfo');
    if (capPageInfo) capPageInfo.innerText = `Showing ${capTotalItems === 0 ? 0 : capStart + 1} to ${Math.min(capEnd, capTotalItems)} of ${capTotalItems}`;
    if ($('btnCapPrev')) $('btnCapPrev').disabled = capitationPage === 1;
    if ($('btnCapNext')) $('btnCapNext').disabled = capitationPage >= capTotalPages;

    if ($('capTotalReceived')) $('capTotalReceived').innerText = formatCurrency(capitationReceived);
    if ($('capTotalSpent')) $('capTotalSpent').innerText = formatCurrency(totalExpenditure);

    renderVoteheadBreakdown();
    renderExpenditureList();
}

function renderVoteheadBreakdown() {
    const container = $('voteheadBreakdown');
    if (!container) return;
    const breakdown = {};
    ExpenditureRepo.getAll().forEach(exp => {
        if (exp.allocation) { Object.keys(exp.allocation).forEach(vh => { if (!breakdown[vh]) breakdown[vh] = 0; breakdown[vh] += exp.allocation[vh]; }); }
        else if (exp.votehead) { if (!breakdown[exp.votehead]) breakdown[exp.votehead] = 0; breakdown[exp.votehead] += exp.amount; }
    });
    const budget = {};
    CapitationRepo.getAll().forEach(cap => {
        if (cap.allocation) { Object.keys(cap.allocation).forEach(vh => { if (!budget[vh]) budget[vh] = 0; budget[vh] += cap.allocation[vh]; }); }
    });
    const allVoteheads = new Set([...Object.keys(breakdown), ...Object.keys(budget)]);
    container.innerHTML = allVoteheads.size === 0 ? '<p style="color:var(--text-muted);">No expenditure data yet.</p>' :
    [...allVoteheads].map(vh => {
        const spent = breakdown[vh] || 0;
        const budgeted = budget[vh] || 0;
        const percent = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0;
        return `<div style="margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;"><div style="display:flex; justify-content:space-between;"><span>${vh}</span><strong>${formatCurrency(spent)}</strong></div><div style="height:4px; background:var(--border-color); border-radius:2px; margin-top:5px;"><div style="height:100%; width:${percent}%; background:var(--primary); border-radius:2px;"></div></div><small style="color:var(--text-muted);">Budget: ${formatCurrency(budgeted)}</small></div>`;
    }).join('');
}

function renderExpenditureList() {
    const tbody = $('expenditureTableBody');
    if (!tbody) return;
    let data = ExpenditureRepo.getAll().slice().reverse();
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / expenditurePerPage);
    if (expenditurePage > totalPages && totalPages > 0) expenditurePage = totalPages;
    if (expenditurePage < 1) expenditurePage = 1;
    const start = (expenditurePage - 1) * expenditurePerPage;
    const end = start + expenditurePerPage;
    const paginatedData = data.slice(start, end);

    if (paginatedData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No expenditures recorded.</td></tr>`;
    } else {
        tbody.innerHTML = paginatedData.map(exp => {
            let voteheadDisplay = exp.votehead;
            if (exp.allocation && Object.keys(exp.allocation).length > 0) {
                voteheadDisplay = Object.entries(exp.allocation).map(([name, amount]) => `<span class="badge bg-light text-dark" style="margin:2px;">${name}: ${formatCurrency(amount)}</span>`).join(' ');
            }
            return `<tr>
                <td>${new Date(exp.date).toLocaleDateString()}</td>
                <td>${escapeHtml(exp.payee || 'N/A')}</td>
                <td><div style="display:flex; flex-wrap:wrap;">${voteheadDisplay}</div></td>
                <td>${exp.method}</td>
                <td><strong>${formatCurrency(exp.amount)}</strong></td>
                <td>
                    <div class="btn-group">
                        <!-- UPDATED: Used data-action and data-id to match your app's architecture -->
                        <button class="btn btn-sm btn-ghost" data-action="editExp" data-id="${exp.id}">
                            <i class="fa-solid fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-ghost" data-action="deleteExp" data-id="${exp.id}" style="color:var(--danger)">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    const expPageInfo = $('expPageInfo');
    if (expPageInfo) expPageInfo.innerHTML = `Showing ${totalItems === 0 ? 0 : start + 1} to ${Math.min(end, totalItems)} of ${totalItems}`;
    if ($('btnExpPrev')) $('btnExpPrev').disabled = expenditurePage === 1;
    if ($('btnExpNext')) $('btnExpNext').disabled = expenditurePage >= totalPages;
}
function addVoteheadEditorRow(name = '', weight = 0) {
    const grid = $('voteheadEditorGrid');
    if (!grid) return;
    
    const row = document.createElement('div');
    row.className = 'votehead-editor-row';
    row.style.cssText = 'display: flex; gap: 10px; margin-bottom: 8px; align-items: center;';
    
    // NOTE: No 'readonly' attribute in the inputs below
    row.innerHTML = `
        <input type="text" 
               class="form-control vhe-name" 
               value="${name}" 
               placeholder="Votehead Name" 
               style="flex: 2;">
               
        <input type="number" 
               class="form-control vhe-weight" 
               value="${weight}" 
               placeholder="Weight" 
               style="flex: 1;" 
               min="0" max="100" step="0.1">
               
        <span style="color: var(--text-muted);">%</span>
        
        <button type="button" 
                class="btn btn-sm btn-ghost btn-remove-votehead-row" 
                style="color: var(--danger);">
            <i class="fa-solid fa-times"></i>
        </button>
    `;
    
    grid.appendChild(row);
    
    // Listen for changes to update the total percentage immediately
    const weightInput = row.querySelector('.vhe-weight');
    weightInput.addEventListener('input', updateVoteheadEditorTotal);
}

// --- CAPITATION LOGIC (UPDATED FOR DYNAMIC VOTEHEADS) ---

function initializeCapitationForm() {
    const container = $('capitationAllocationGrid');
    if (!container) return;
    container.innerHTML = '';
    
    // CHANGE 1: Use store.voteheads if available, otherwise fallback to the constant list
    const activeVoteheads = store.voteheads || CAPITATION_VOTEHEADS;

    activeVoteheads.forEach(vh => { 
        addAllocationRow(vh.name, 0, false); 
    });
    
    updateAllocationTotals();
}

function addAllocationRow(name = '', amount = 0, removable = true) {
    const container = $('capitationAllocationGrid');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'allocation-row';
    row.innerHTML = `
        <input type="text" class="form-control alloc-name" value="${name}" placeholder="Votehead Name" ${name && !removable ? 'readonly' : ''}>
        <input type="number" class="form-control alloc-amount" value="${amount}" placeholder="0">
        ${removable ? '<button type="button" class="btn btn-sm btn-ghost btn-remove-row"><i class="fa-solid fa-times"></i></button>' : '<div></div>'}
    `;
    container.appendChild(row);
}

function addCustomVoteheadRow() {
    addAllocationRow('', 0, true);
    const inputs = $('capitationAllocationGrid')?.querySelectorAll('.alloc-name');
    if (inputs.length > 0) inputs[inputs.length - 1].focus();
}

function autoAllocateCapitation(totalAmount) {
    if (totalAmount <= 0) return;
    
    // CHANGE 2: Calculate weights dynamically based on the current active list
    const activeVoteheads = store.voteheads || CAPITATION_VOTEHEADS;
    const currentTotalWeight = activeVoteheads.reduce((sum, v) => sum + v.weight, 0);

    const rows = $('capitationAllocationGrid')?.querySelectorAll('.allocation-row');
    if (!rows) return;

    rows.forEach(row => {
        const nameInput = row.querySelector('.alloc-name');
        const amountInput = row.querySelector('.alloc-amount');
        const name = nameInput.value;
        
        // Find the votehead in the dynamic list
        const standard = activeVoteheads.find(v => v.name === name);
        
        if (standard) { 
            // Calculate using the dynamic total weight
            amountInput.value = Math.round((standard.weight / currentTotalWeight) * totalAmount); 
        }
    });
    updateAllocationTotals();
    showToast('Voteheads auto-allocated based on standard weights');
}

function clearAllocationInputs() {
    const inputs = $('capitationAllocationGrid')?.querySelectorAll('.alloc-amount');
    inputs.forEach(inp => inp.value = '');
    updateAllocationTotals();
}

function updateAllocationTotals() {
    const rows = $('capitationAllocationGrid')?.querySelectorAll('.allocation-row');
    let sum = 0;
    rows.forEach(row => { sum += parseFloat(row.querySelector('.alloc-amount').value) || 0; });
    if ($('allocatedTotalDisplay')) $('allocatedTotalDisplay').innerText = formatCurrency(sum);
}

function submitCapitation(e) {
    e.preventDefault();
    const amount = parseFloat(getVal('capAmount'));
    if (!amount || amount <= 0) return showToast('Enter a valid total amount', 'error');
    
    const allocation = {};
    let sumAllocated = 0;
    
    $('capitationAllocationGrid').querySelectorAll('.allocation-row').forEach(row => {
        const name = row.querySelector('.alloc-name').value.trim();
        const amt = parseFloat(row.querySelector('.alloc-amount').value) || 0;
        if (name && amt > 0) { 
            allocation[name] = amt; 
            sumAllocated += amt; 
        }
    });
    
    // We allow a small margin of error (1 KES) due to rounding
    if (Math.abs(sumAllocated - amount) > 1) { 
        console.warn(`Allocation Mismatch: Total ${amount} vs Allocated ${sumAllocated}`); 
    }
    
    CapitationRepo.create({ 
        date: getVal('capDate') || new Date().toISOString(), 
        source: getVal('capSource'), 
        amount: amount, 
        ref: getVal('capRef'), 
        allocation: allocation 
    });
    
    closeModal('capitationModal');
    renderFinance();
    renderDashboard();
    showToast('Capitation Recorded & Allocated');
}

// ==========================================================================
//   CURRICULA MANAGEMENT
// ==========================================================================
function renderCurricula() {
    const container = $('curriculaGrid');
    if (!container) return;
    if (store.trades.length === 0) { container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-book"></i><p>No courses found.</p></div>`; return; }
    container.innerHTML = store.trades.map(course => {
        const unitCount = course.units ? course.units.length : 0;
        return `<div class="curriculum-card"><div class="curriculum-header"><h3>${course.name}</h3><span class="badge">${course.code}</span></div><div class="curriculum-body"><div class="curriculum-stats"><div class="stat"><strong>${unitCount}</strong><span>Units</span></div><div class="stat"><strong>${formatCurrency(course.fee)}</strong><span>Fee</span></div></div><div style="font-size: 0.85rem; color: var(--text-muted);">Levels: ${course.levels ? course.levels.join(', ') : 'N/A'}</div></div><div class="curriculum-footer"><button class="btn btn-sm btn-secondary" data-action="manage-units" data-id="${course.id}" style="flex:1;"><i class="fa-solid fa-list-check"></i> Manage Units</button><button class="btn btn-sm btn-ghost" data-action="edit-curriculum" data-id="${course.id}" title="Edit Course"><i class="fa-solid fa-edit"></i></button></div></div>`;
    }).join('');
}
function openUnitsModal(courseId) { const course = store.trades.find(t => t.id === courseId); if (!course) return; $('editingCourseId').value = courseId; $('unitsModalTitle').innerText = `Units for ${course.name}`; renderUnitsTable(course); openModal('unitsModal'); }
function renderUnitsTable(course) { const tbody = $('unitsTableBody'); if (!tbody) return; const units = course.units || []; tbody.innerHTML = units.length === 0 ? `<tr><td colspan="3" class="text-center">No units defined.</td></tr>` : units.map(unit => `<tr><td><strong>${unit.code}</strong></td><td>${unit.name}</td><td><button class="btn btn-sm btn-ghost" data-action="edit-unit" data-course-id="${course.id}" data-code="${unit.code}"><i class="fa-solid fa-edit"></i></button><button class="btn btn-sm btn-ghost" data-action="delete-unit" data-course-id="${course.id}" data-code="${unit.code}" style="color:var(--danger)"><i class="fa-solid fa-trash"></i></button></td></tr>`).join(''); }
function simulateExtract() { const courseId = $('editingCourseId')?.value; if (!courseId) return showToast('No course selected.', 'error'); const course = store.trades.find(t => t.id === courseId); if (!course) return showToast('Error finding course.', 'error'); const btn = $('btnMockExtract'); const originalText = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing...'; btn.disabled = true; setTimeout(() => { let generatedUnits = []; const baseName = course.name.toLowerCase(); if (baseName.includes('electrical')) generatedUnits = [{ code: 'EIE101', name: 'Electrical Safety and Regulations' }, { code: 'EIE102', name: 'DC Circuit Analysis' }, { code: 'EIE103', name: 'AC Machines and Transformers' }, { code: 'EIE104', name: 'Industrial Installation Practices' }]; else if (baseName.includes('motor') || baseName.includes('automotive')) generatedUnits = [{ code: 'MVE101', name: 'Workshop Safety and Tools' }, { code: 'MVE102', name: 'Internal Combustion Engines' }, { code: 'MVE103', name: 'Vehicle Transmission Systems' }, { code: 'MVE104', name: 'Automotive Electrical Systems' }]; else generatedUnits = [{ code: 'GEN101', name: 'Introduction to ' + course.name }, { code: 'GEN102', name: 'Core Theory and Principles' }, { code: 'GEN103', name: 'Practical Applications' }]; course.units = generatedUnits; saveData(); renderUnitsTable(course); btn.innerHTML = originalText; btn.disabled = false; showToast(`Success! ${generatedUnits.length} units extracted for ${course.name}.`, 'success'); }, 1500); }
function extractViaAI() { showToast('Opening AI Assistant. Copy the JSON result and paste it here if implemented, or manually add the units.', 'info'); }
function editCourseSettings(id) { editCourse(id); openModal('courseModal'); }
function editUnit(courseId, unitCode) { const course = store.trades.find(t => t.id === courseId); if (!course) return; const unit = course.units.find(u => u.code === unitCode); if (!unit) return; $('unitModalTitle').innerText = "Edit Unit"; $('unitEditId').value = unitCode; $('unitCourseId').value = courseId; setVal('unitCode', unit.code); setVal('unitName', unit.name); closeModal('unitsModal'); openModal('unitModal'); }
function deleteUnit(courseId, unitCode) { if (!confirm('Are you sure you want to delete this unit?')) return; const course = store.trades.find(t => t.id === courseId); if (!course) return; course.units = course.units.filter(u => u.code !== unitCode); saveData(); renderUnitsTable(course); showToast('Unit deleted'); }

// ==========================================================================
//   ADVANCED DATA VISUALIZATION ENGINE (SVG)
// ==========================================================================

/**
 * Generates a mini sparkline SVG string for KPI cards
 */
function generateSparkline(data, color = '#3b82f6', width = 100, height = 30) {
    if (!data || data.length < 2) return '';
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    // Generate points
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    // Generate area fill (closed path)
    const areaPoints = `0,${height} ${points} ${width},${height}`;

    return `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;">
            <defs>
                <linearGradient id="grad-${color.replace('#', '')}" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:${color};stop-opacity:0.2" />
                    <stop offset="100%" style="stop-color:${color};stop-opacity:0" />
                </linearGradient>
            </defs>
            <polygon points="${areaPoints}" fill="url(#grad-${color.replace('#', '')})" />
            <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="${width}" cy="${height - ((data[data.length-1] - min) / range) * height}" r="3" fill="${color}" />
        </svg>
    `;
}

/**
 * Main Chart Renderer - Handles Bar, Line, and Donut charts using SVG
 */
function renderAdvancedChart(type) {
    const container = $('tradeDistributionChartBars');
    if (!container) return;
    container.innerHTML = ''; // Clear previous

    const chartHeight = 250;
    const chartWidth = container.clientWidth || 600;
    
    // 1. LINE CHART (Revenue Trends)
    if (type === 'finance' || type === 'revenue') {
        const financeData = FinanceRepo.getAll();
        // Group by Month
        const monthlyData = {};
        financeData.forEach(f => {
            const date = new Date(f.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[monthKey] = (monthlyData[monthKey] || 0) + (f.amount || 0);
        });

        const sortedKeys = Object.keys(monthlyData).sort().slice(-6); // Last 6 months
        const dataPoints = sortedKeys.map(k => monthlyData[k]);
        const labels = sortedKeys.map(k => {
            const [y, m] = k.split('-');
            return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'short' });
        });

        if (dataPoints.length === 0) {
            container.innerHTML = `<div class="empty-state" style="grid-column:1/-1; padding:3rem;">No financial data to visualize.</div>`;
            return;
        }

        const maxVal = Math.max(...dataPoints) || 1;
        const padding = 40;
        const usableWidth = chartWidth - (padding * 2);
        const usableHeight = chartHeight - (padding * 2);
        
        // Generate Path
        let pathD = "";
        let areaD = `M${padding},${chartHeight - padding} `;
        const points = [];

        dataPoints.forEach((val, i) => {
            const x = padding + (i / (dataPoints.length - 1 || 1)) * usableWidth;
            const y = (chartHeight - padding) - (val / maxVal) * usableHeight;
            points.push({x, y, val, label: labels[i]});
            if (i === 0) {
                pathD += `M${x},${y}`;
                areaD += `L${x},${y} `;
            } else {
                pathD += ` L${x},${y}`;
                areaD += `L${x},${y} `;
            }
        });
        areaD += `L${chartWidth - padding},${chartHeight - padding} Z`;

        // Build SVG
        let svgHtml = `<svg width="100%" height="${chartHeight + 40}" viewBox="0 0 ${chartWidth} ${chartHeight + 40}">`;
        
        // Grid lines
        for(let i=0; i<=4; i++) {
            const y = (chartHeight - padding) - (i/4) * usableHeight;
            svgHtml += `<line x1="${padding}" y1="${y}" x2="${chartWidth-padding}" y2="${y}" stroke="#e5e7eb" stroke-dasharray="4" />`;
        }

        // Area & Line
        svgHtml += `<path d="${areaD}" fill="rgba(16, 185, 129, 0.1)" />`;
        svgHtml += `<path d="${pathD}" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" />`;

        // Points & Tooltips
        points.forEach(p => {
            svgHtml += `
                <circle cx="${p.x}" cy="${p.y}" r="5" fill="#fff" stroke="#10b981" stroke-width="2" 
                    onmouseover="this.setAttribute('r', '7'); this.nextElementSibling.style.display='block'" 
                    onmouseout="this.setAttribute('r', '5'); this.nextElementSibling.style.display='none'" />
                <g style="display:none; pointer-events:none;">
                    <rect x="${p.x - 40}" y="${p.y - 40}" width="80" height="30" rx="4" fill="#1f2937" />
                    <text x="${p.x}" y="${p.y - 21}" fill="white" font-size="10" text-anchor="middle" font-family="sans-serif">${formatCurrency(p.val)}</text>
                    <text x="${p.x}" y="${p.y - 10}" fill="#9ca3af" font-size="8" text-anchor="middle" font-family="sans-serif">${p.label}</text>
                    <polygon points="${p.x},-10 ${p.x-5},-16 ${p.x+5},-16" fill="#1f2937" transform="translate(0, ${p.y})" />
                </g>
                <text x="${p.x}" y="${chartHeight - padding + 20}" fill="#6b7280" font-size="10" text-anchor="middle" font-family="sans-serif">${p.label}</text>
            `;
        });
        svgHtml += `</svg>`;
        container.innerHTML = svgHtml;
        return;
    }

    // 2. DONUT CHART (Gender Distribution)
    if (type === 'gender') {
        const maleCount = StudentRepo.findBy('gender', 'Male').length;
        const femaleCount = StudentRepo.findBy('gender', 'Female').length;
        const total = maleCount + femaleCount;
        
        if (total === 0) {
            container.innerHTML = `<div class="empty-state">No gender data available.</div>`;
            return;
        }

        const malePct = (maleCount / total) * 100;
        const femalePct = (femaleCount / total) * 100;
        
        // Conic gradient trick for donut
        const gradient = `conic-gradient(#3b82f6 0% ${malePct}%, #ec4899 ${malePct}% 100%)`;
        
        container.innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; height:100%; flex-direction:column; gap:20px;">
                <div style="
                    width: 200px; 
                    height: 200px; 
                    border-radius: 50%; 
                    background: ${gradient};
                    position: relative;
                    display: flex; 
                    justify-content: center; 
                    align-items: center;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                ">
                    <div style="width: 140px; height: 140px; background: white; border-radius: 50%; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                        <span style="font-size: 2rem; font-weight: bold; color: #1f2937;">${total}</span>
                        <span style="font-size: 0.8rem; color: #6b7280;">Total Trainees</span>
                    </div>
                </div>
                <div style="display:flex; gap:20px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="width:12px; height:12px; background:#3b82f6; border-radius:2px;"></span>
                        <span class="text-sm">Male (${maleCount})</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="width:12px; height:12px; background:#ec4899; border-radius:2px;"></span>
                        <span class="text-sm">Female (${femaleCount})</span>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    // 3. BAR CHART (Enrollment by Trade) - Default
    const data = store.trades.map(t => ({
        label: t.code || t.name.split(' ')[0],
        value: StudentRepo.findBy('tradeId', t.id).length
    }));

    const totalStudents = data.reduce((sum, d) => sum + d.value, 0);
    const maxVal = Math.max(...data.map(d => d.value), 1);

    container.innerHTML = data.map((d, i) => {
        const heightPercent = (d.value / maxVal) * 100;
        // Color palette
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];
        const color = colors[i % colors.length];
        
        return `
        <div class="bar-group" style="flex:1; display:flex; flex-direction:column; align-items:center; gap:8px; cursor:pointer; transition: transform 0.2s;" 
             onclick="router('students'); setTimeout(() => { if($('courseFilter')) $('courseFilter').value = '${store.trades[i].id}'; applyFilters(); }, 100);">
            
            <div style="font-size:0.9rem; font-weight:700; color:var(--text-primary); transition:all 0.3s;" class="bar-val">${d.value}</div>
            
            <div style="height:200px; width:40px; background:#f3f4f6; border-radius:20px; position:relative; overflow:hidden;">
                <div class="bar-anim" style="
                    position:absolute; bottom:0; left:0; right:0; 
                    height:0%; 
                    background: linear-gradient(180deg, ${color}, ${color}cc); 
                    border-radius: 0 0 20px 20px;
                    transition: height 1s cubic-bezier(0.4, 0, 0.2, 1);
                " data-height="${heightPercent}%"></div>
            </div>
            
            <div class="bar-label" style="font-size:0.75rem; font-weight:600; color:var(--text-muted); text-align:center; line-height:1.2;">${d.label}</div>
        </div>`;
    }).join('');

    // Trigger animation after render
    setTimeout(() => {
        document.querySelectorAll('.bar-anim').forEach(el => {
            el.style.height = el.getAttribute('data-height');
        });
    }, 100);
}


// ==========================================================================
//   ENHANCED DASHBOARD
// ==========================================================================
function renderDashboard() {
    if (!store?.students) return;
    const students = StudentRepo.getAll();
    const staffList = StaffRepo.getAll();
    const financeRecords = FinanceRepo.getAll();
    
    // --- KPI 1: ENROLLMENT ---
    const totalEnrollment = students.length;
    animateValue('statEnrollment', 0, totalEnrollment, 800);
    makeElementClickable('statEnrollment', 'students');
    
    // Add sparkline for enrollment (simulated monthly trend based on Levels)
    // In a real app with history, you'd query dates. Here we simulate with Level distribution for visualization
    const levels = ['Level 3', 'Level 4', 'Level 5'];
    const levelData = levels.map(l => students.filter(s => s.level === l).length);
    const sparkEl = document.querySelector('#statEnrollment').closest('.kpi-card-modern').querySelector('.sparkline');
    if (sparkEl) sparkEl.innerHTML = generateSparkline(levelData, '#3b82f6');

    // --- KPI 2: REVENUE ---
    const collectedRevenue = financeRecords.reduce((sum, f) => sum + (f.amount || 0), 0);
    const revEl = $('statRevenue');
    if (revEl) revEl.textContent = formatCurrency(collectedRevenue);
    makeElementClickable('statRevenue', 'finance');

    // Revenue Trend: Calculate Last Month vs This Month (Approximation)
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    const thisMonthRev = financeRecords
        .filter(f => new Date(f.date).getMonth() === thisMonth && new Date(f.date).getFullYear() === thisYear)
        .reduce((s, f) => s + (f.amount || 0), 0);
        
    const prevMonthRev = financeRecords
        .filter(f => {
            const d = new Date(f.date);
            return d.getMonth() === (thisMonth === 0 ? 11 : thisMonth - 1) && 
                   d.getFullYear() === (thisMonth === 0 ? thisYear - 1 : thisYear);
        })
        .reduce((s, f) => s + (f.amount || 0), 0);

    // Revenue Sparkline (last 6 months aggregated)
    const revenueTrendData = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = d.getMonth();
        const y = d.getFullYear();
        const sum = financeRecords
            .filter(f => new Date(f.date).getMonth() === m && new Date(f.date).getFullYear() === y)
            .reduce((acc, curr) => acc + (curr.amount || 0), 0);
        revenueTrendData.push(sum);
    }
    
    const revSparkEl = document.querySelector('#statRevenue').closest('.kpi-card-modern').querySelector('.sparkline');
    if (revSparkEl) revSparkEl.innerHTML = generateSparkline(revenueTrendData, '#10b981');

    // Revenue Badge Logic
    const trendEl = document.querySelector('#statRevenue').closest('.kpi-card-modern').querySelector('.trend-badge');
    if (trendEl) {
        if (prevMonthRev > 0) {
            const diff = ((thisMonthRev - prevMonthRev) / prevMonthRev) * 100;
            const isUp = diff >= 0;
            trendEl.innerHTML = `<i class="fa-solid fa-arrow-${isUp ? 'up' : 'down'}"></i> ${Math.abs(diff).toFixed(1)}% vs last month`;
            trendEl.className = `trend-badge ${isUp ? 'text-success' : 'text-danger'}`;
        } else {
            trendEl.innerHTML = "No previous data";
            trendEl.className = "trend-badge text-muted";
        }
    }

    // --- KPI 3: COMPETENCY (Exams) ---
    const competentStudentIds = new Set(store.exams.filter(e => parseInt(e.score) >= 50).map(e => e.studentId));
    const competentCount = competentStudentIds.size;
    animateValue('statCompetent', 0, competentCount, 800);
    makeElementClickable('statCompetent', 'exams');

    // --- KPI 4: STAFF ---
    animateValue('statStaff', 0, staffList.length, 800);
    makeElementClickable('statStaff', 'staff');

    // --- MAIN VISUALIZATION ---
    renderAdvancedChart(currentDashChartType);

    // --- WIDGETS ---
    renderRecentAdmissionsTable();
    
    // Fee Alert Logic
    const defaulters = students.filter(s => s.fees > 0);
    renderFeeAlertsWidget(defaulters, defaulters.length);
    
    renderUpcomingEvents();
    renderRecentActivityFeed();
    renderExternalExamTrends();
}
function renderRecentAdmissionsTable() {
    const tbody = $('recentAdmissionsTable');
    if (!tbody) return;
    const recent = StudentRepo.getAll().slice(0, 5);
    tbody.innerHTML = recent.length === 0
        ? `<tr><td colspan="5" class="text-center text-muted" style="padding:2rem;">No recent admissions yet.</td></tr>`
        : recent.map(s => `
            <tr>
                <td><strong>${s.reg}</strong></td>
                <td>${escapeHtml(s.name)}</td>
                <td>${s.trade}</td>
                <td style="font-size:0.8rem; color:var(--text-muted);">Just now</td>
                <td style="text-align:right;"><button class="btn btn-sm btn-ghost" data-action="view" data-id="${s.id}" title="View"><i class="fa-solid fa-eye"></i></button></td>
            </tr>
        `).join('');
}

function renderFeeAlertsWidget(defaulters, count) {
    const countEl = $('metricArrearsCount');
    const listContainer = document.querySelector('.widget-alert .alert-list');
    if (countEl) countEl.textContent = count;
    if (!listContainer) return;

    if (count === 0) {
        listContainer.innerHTML = '<li style="padding:1rem; text-align:center; color:var(--success); font-size:0.85rem; font-weight:500;"><i class="fa-solid fa-circle-check" style="margin-right:4px;"></i> All students are fee clear!</li>';
        return;
    }

    listContainer.innerHTML = defaulters
        .sort((a, b) => b.fees - a.fees)
        .slice(0, 3)
        .map(s => `
            <li>
                <span class="name">${escapeHtml(s.name)}</span>
                <span class="amount">${formatCurrency(s.fees)}</span>
            </li>
        `).join('');
}

function renderUpcomingEvents() {
    const container = document.querySelector('.event-timeline');
    if (!container) return;
    const today = new Date();
    const events = [
        { date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5), title: 'Mid-Term Exams', desc: 'Assessment Period' },
        { date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 12), title: 'Board Meeting', desc: 'Finance Review' }
    ];
    container.innerHTML = events.map(e => `
        <li class="event-item">
            <div class="event-date">
                <span class="day">${e.date.getDate()}</span>
                <span class="month">${e.date.toLocaleString('default', { month: 'short' })}</span>
            </div>
            <div class="event-info">
                <h4>${e.title}</h4>
                <p>${e.desc}</p>
            </div>
        </li>
    `).join('');
}

function renderRecentActivityFeed() {
    const container = $('dashboardActivity');
    if (!container) return;

    const activities = [
        ...StudentRepo.getAll().slice(0, 2).map(s => ({
            type: 'student', text: `Admitted: <strong>${s.name}</strong>`, icon: 'fa-user-plus', color: 'blue'
        })),
        ...FinanceRepo.getAll().slice(0, 2).map(f => ({
            type: 'finance', text: `Fee Paid: <strong>${f.studentName}</strong>`, icon: 'fa-coins', color: 'green'
        })),
        ...store.exams.slice(0, 1).map(e => {
            const student = StudentRepo.getById(e.studentId);
            return {
                type: 'exam', text: `Assessment: <strong>${student ? student.name : 'Student'}</strong> — ${e.status}`, icon: 'fa-award', color: 'orange'
            };
        })
    ];

    if (activities.length === 0) {
        container.innerHTML = `<div class="feed-item"><div class="feed-icon bg-blue"><i class="fa-solid fa-info"></i></div><div class="feed-text">No recent activity</div></div>`;
        return;
    }

    container.innerHTML = activities.slice(0, 5).map(act => `
        <div class="feed-item">
            <div class="feed-icon bg-${act.color}"><i class="fa-solid ${act.icon}"></i></div>
            <div class="feed-text">${act.text}</div>
        </div>
    `).join('');
}

function renderDashboardChart(type) {
    const chartContainer = $('tradeDistributionChartBars');
    if (!chartContainer) return;
    chartContainer.innerHTML = '';

    let data = [];
    if (type === 'enrollment' || type === 'trade') {
        data = store.trades.map(t => ({
            label: t.code || t.name.split(' ')[0],
            value: StudentRepo.findBy('tradeId', t.id).length
        }));
    } else if (type === 'finance' || type === 'revenue') {
        data = store.trades.map(t => ({
            label: t.code || t.name.split(' ')[0],
            value: StudentRepo.findBy('tradeId', t.id).reduce((sum, s) =>
                sum + FinanceRepo.getAll().filter(f => f.studentId === s.id).reduce((fSum, f) => fSum + (f.amount || 0), 0), 0)
        }));
    } else if (type === 'gender') {
        data = [
            { label: 'Male', value: StudentRepo.findBy('gender', 'Male').length },
            { label: 'Female', value: StudentRepo.findBy('gender', 'Female').length }
        ];
    }

    const total = data.reduce((sum, d) => sum + d.value, 0);
    const max = Math.max(...data.map(d => d.value), 1);

    if (total === 0) {
        chartContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:3rem 1rem; color:var(--text-muted);"><i class="fa-solid fa-chart-bar" style="font-size:2rem; margin-bottom:0.5rem; opacity:0.3;"></i><p>No data available</p></div>`;
        return;
    }

    // Color palette for bars
    const barColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];

    data.forEach((d, i) => {
        const heightPercent = (d.value / max) * 100;
        const color = barColors[i % barColors.length];
        const barGroup = document.createElement('div');
        barGroup.className = 'bar-group';
        barGroup.style.cssText = 'flex:1; display:flex; flex-direction:column; align-items:center; gap:6px; cursor:pointer; transition: transform 0.15s;';
        barGroup.onclick = () => router('students');
        barGroup.onmouseover = () => barGroup.style.transform = 'scale(1.05)';
        barGroup.onmouseout = () => barGroup.style.transform = '';
        barGroup.innerHTML = `
            <div style="font-size:0.75rem; font-weight:700; color:var(--text-primary);">${d.value}</div>
            <div class="bar" style="height:${Math.max(heightPercent, d.value > 0 ? 5 : 0)}%; background:linear-gradient(180deg, ${color}, ${color}cc); border-radius:6px 6px 2px 2px; width:100%; max-width:48px; min-height:4px; transition: height 0.4s ease;"></div>
            <div class="bar-label" style="font-size:0.7rem; font-weight:600; color:var(--text-muted); white-space:nowrap;">${d.label}</div>
        `;
        chartContainer.appendChild(barGroup);
    });
}
// ==========================================================================
//   EXTERNAL EXAM DASHBOARD WIDGET
// ==========================================================================

/**
 * Parses a series string like "Dec 2023" or "July 2024" into a Date object
 * for chronological sorting.
 */
function parseSeriesDate(seriesStr) {
    if (!seriesStr) return new Date(0);
    const parts = seriesStr.trim().split(' ');
    if (parts.length < 2) return new Date(0);
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIndex = monthNames.indexOf(parts[0]);
    const year = parseInt(parts[1]) || 2024;
    
    if (monthIndex === -1) return new Date(year, 0, 1); // Default to Jan if month unknown
    return new Date(year, monthIndex, 1);
}

/**
 * Renders the External Exam Trend Chart
 */
function renderExternalExamTrends() {
    const container = $('externalExamTrendChart');
    if (!container) return;

    // 1. Get Data
    const filterBody = $('dashExtExamFilter') ? $('dashExtExamFilter').value : 'all';
    let data = ExternalExamRepo.getAll();

    // Apply Filter if selected
    if (filterBody !== 'all') {
        data = data.filter(e => e.examBody === filterBody);
    }

    // 2. Group and Count by Series
    const seriesCounts = {};
    data.forEach(exam => {
        const series = exam.series || 'Unknown';
        seriesCounts[series] = (seriesCounts[series] || 0) + 1;
    });

    // 3. Convert to Array and Sort Chronologically
    const chartData = Object.keys(seriesCounts)
        .map(series => ({
            series: series,
            count: seriesCounts[series],
            dateObj: parseSeriesDate(series)
        }))
        .sort((a, b) => a.dateObj - b.dateObj);

    // 4. Render SVG Chart
    if (chartData.length === 0) {
        container.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--text-muted);">
            <i class="fa-solid fa-chart-line" style="font-size:2rem; margin-bottom:0.5rem; opacity:0.3;"></i>
            <p>No external exam data recorded yet.</p>
        </div>`;
        return;
    }

    // Chart Config
    const width = container.clientWidth || 800;
    const height = 240;
    const padding = { top: 20, right: 30, bottom: 40, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxVal = Math.max(...chartData.map(d => d.count)) || 1;
    // Add some headroom (20%)
    const yMax = Math.ceil(maxVal * 1.2);

    // Generate Points
    let points = "";
    let areaPoints = `M${padding.left},${height - padding.bottom} `; // Start bottom-left for area fill
    let pointCoords = [];

    chartData.forEach((d, i) => {
        const x = padding.left + (i / (chartData.length - 1 || 1)) * chartWidth;
        const y = (height - padding.bottom) - (d.count / yMax) * chartHeight;
        
        pointCoords.push({ x, y, label: d.series, value: d.count });
        
        if (i === 0) {
            points += `M${x},${y}`;
            areaPoints += `L${x},${y} `;
        } else {
            points += ` L${x},${y}`;
            areaPoints += `L${x},${y} `;
        }
    });
    
    // Close area path
    areaPoints += `L${padding.left + chartWidth},${height - padding.bottom} Z`;

    // Build SVG
    let svgHtml = `<svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">`;

    // 1. Grid Lines (Horizontal)
    const gridCount = 5;
    for (let i = 0; i <= gridCount; i++) {
        const y = (height - padding.bottom) - (i / gridCount) * chartHeight;
        svgHtml += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e5e7eb" stroke-dasharray="4" />`;
        // Y-Axis Labels
        const labelVal = Math.round((yMax / gridCount) * i);
        svgHtml += `<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" font-size="10" fill="#6b7280" font-family="sans-serif">${labelVal}</text>`;
    }

    // 2. Area Fill (Gradient)
    svgHtml += `<defs>
        <linearGradient id="extExamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:0.0" />
        </linearGradient>
    </defs>`;
    svgHtml += `<path d="${areaPoints}" fill="url(#extExamGrad)" />`;

    // 3. Line
    svgHtml += `<path d="${points}" fill="none" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`;

    // 4. Points, Tooltips, and X-Axis Labels
    pointCoords.forEach((p, i) => {
        // The Dot
        svgHtml += `<circle cx="${p.x}" cy="${p.y}" r="5" fill="#fff" stroke="#8b5cf6" stroke-width="2" 
            class="chart-point" style="cursor:pointer;"
            onmouseover="showTooltip(this, '${p.series}', ${p.value})"
            onmouseout="hideTooltip(this)" />`;
        
        // X-Axis Label (Skip some if too many)
        const skip = Math.ceil(chartData.length / 6);
        if (i % skip === 0) {
            svgHtml += `<text x="${p.x}" y="${height - padding.bottom + 20}" text-anchor="middle" font-size="10" fill="#374151" font-family="sans-serif" font-weight="500">${p.label}</text>`;
        }
    });

    svgHtml += `</svg>`;

    // Tooltip Container (Absolute positioned overlay)
    svgHtml += `
        <div id="extExamTooltip" style="position:absolute; display:none; background:#1f2937; color:#fff; padding:4px 8px; border-radius:4px; font-size:12px; pointer-events:none; z-index:10; box-shadow:0 4px 6px rgba(0,0,0,0.1); transform:translate(-50%, -120%); white-space:nowrap;">
            <div style="font-weight:bold;" id="tooltipSeries"></div>
            <div style="font-size:10px; color:#d1d5db;">Candidates: <span id="tooltipCount"></span></div>
            <div style="position:absolute; bottom:-4px; left:50%; transform:translateX(-50%); width:0; height:0; border-left:4px solid transparent; border-right:4px solid transparent; border-top:4px solid #1f2937;"></div>
        </div>
    `;

    container.innerHTML = svgHtml;
}

// Helper functions for tooltips (attached to window or inside script)
window.showTooltip = function(el, series, count) {
    const tooltip = $('extExamTooltip');
    const seriesEl = $('tooltipSeries');
    const countEl = $('tooltipCount');
    if (tooltip && seriesEl && countEl) {
        seriesEl.textContent = series;
        countEl.textContent = count;
        
        // Position tooltip above the dot
        const rect = el.getBoundingClientRect();
        const containerRect = $('externalExamTrendChart').getBoundingClientRect();
        
        // Calculate position relative to container
        const left = rect.left - containerRect.left + (rect.width / 2);
        const top = rect.top - containerRect.top;

        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        tooltip.style.display = 'block';
    }
};

window.hideTooltip = function() {
    const tooltip = $('extExamTooltip');
    if (tooltip) tooltip.style.display = 'none';
};
function makeElementClickable(id, targetView) {
    const el = $(id);
    const card = el ? el.closest('.kpi-card-modern, .stat-card-modern') : null;
    if (!card || card.dataset.listenerAttached === 'true') return;
    card.style.cursor = 'pointer';
    card.onclick = () => router(targetView);
    card.dataset.listenerAttached = 'true';
}

function setText(id, text) { const el = $(id); if (el) el.textContent = text; }

function animateValue(id, start, end, duration) {
    const el = $(id);
    if (!el || el.dataset.animating === 'true') return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        // Ease-out quad
        const eased = 1 - (1 - progress) * (1 - progress);
        el.textContent = Math.floor(eased * (end - start) + start).toLocaleString();
        if (progress < 1) {
            el.dataset.animating = 'true';
            window.requestAnimationFrame(step);
        } else {
            el.dataset.animating = 'false';
        }
    };
    window.requestAnimationFrame(step);
}

// ==========================================================================
//   DROPDOWNS, PAYMENTS, INVENTORY, SETTINGS, REPORTS & PDF
// ==========================================================================

function populateDropdowns() {
    [$('courseFilter'), $('reportCourse'), $('feeReportCourse')].forEach(sel => {
        if (!sel) return;
        sel.innerHTML = `<option value="all">All Courses</option>`;
        store.trades.forEach(t => { sel.innerHTML += `<option value="${t.id}">${t.name}</option>`; });
    });
    [$('regTrade'), $('examTradeSelect')].forEach(sel => {
        if (!sel) return;
        sel.innerHTML = `<option value="">Select Course...</option>`;
        store.trades.forEach(t => { sel.innerHTML += `<option value="${t.id}">${t.name}</option>`; });
    });
    const wardSelect = $('ward');
    if (wardSelect) { wardSelect.innerHTML = '<option value="">Select Ward...</option>'; store.wards.forEach(w => { wardSelect.innerHTML += `<option>${w}</option>`; }); }
    const reportLevel = $('reportLevel');
    if (reportLevel) {
        const allLevels = new Set();
        store.trades.forEach(t => t.levels.forEach(l => allLevels.add(l)));
        reportLevel.innerHTML = '<option value="all">All Levels</option>';
        [...allLevels].sort().forEach(l => { reportLevel.innerHTML += `<option value="${l}">${l}</option>`; });
    }
}

function openPaymentFor(id) {
    const s = StudentRepo.getById(id);
    if (!s) return;
    openModal('paymentModal');
    toggleFundingFields('Parent');
    if ($('payStudentId')) $('payStudentId').value = id;
    if ($('paySearch')) $('paySearch').value = `${s.name} (${s.reg})`;
    if ($('payAmount')) $('payAmount').value = s.fees;
    if ($('payResults')) $('payResults').style.display = 'none';
    // --- FIX START: Force Payment Method to 'Cash' ---
    currentPayMethod = 'Cash'; // Set variable
    
    // Find the Cash button and trigger the UI update
    const cashBtn = document.querySelector('#payMethodGroup .btn[data-method="Cash"]');
    if (cashBtn) {
        setPayMethod('Cash', cashBtn);
    } else {
        // Fallback: If we can't find the specific button, just ensure the variable is set
        console.warn("Cash button not found, defaulting variable to Cash");
    }
    // --- FIX END ---
}

function searchPayStudent(val) {
    const resultsDiv = $('payResults');
    if (!val || !resultsDiv) return;
    const found = StudentRepo.getAll().filter(s => s.name.toLowerCase().includes(val.toLowerCase())).slice(0, 5);
    if (found.length === 0) { resultsDiv.style.display = 'none'; return; }
    resultsDiv.innerHTML = found.map(s => `<div class="autocomplete-item" data-pay-id="${s.id}">${escapeHtml(s.name)}</div>`).join('');
    resultsDiv.style.display = 'block';
}

function toggleFundingFields(source) {
    const parentGroup = $('parentFeeTypeGroup');
    const sponsorGroup = $('sponsorNameGroup');
    const bursaryGroup = $('bursaryDetailsGroup');
    if (parentGroup) parentGroup.style.display = 'none';
    if (sponsorGroup) sponsorGroup.style.display = 'none';
    if (bursaryGroup) bursaryGroup.style.display = 'none';
    if (source === 'Parent' && parentGroup) parentGroup.style.display = 'block';
    else if (source === 'Sponsor' && sponsorGroup) sponsorGroup.style.display = 'block';
    else if (source === 'Bursary' && bursaryGroup) bursaryGroup.style.display = 'block';
}

// ==========================================================================
//   PAYMENT METHOD TOGGLER (Student Fees)
// ==========================================================================
function setPayMethod(method, btn) {
    currentPayMethod = method;
    // Update UI buttons
    btn.parentElement.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Handle dynamic fields
    const dyn = $('payDynamicFields');
    if (!dyn) return;
    dyn.innerHTML = '';
    
    if (method === 'M-Pesa') {
        dyn.innerHTML = `<div class="form-group"><label>Transaction Code</label><input type="text" id="payTransCode" class="form-control"></div>`;
    } else if (method === 'Bank') {
        dyn.innerHTML = `<div class="form-group"><label>Bank Name</label><input type="text" id="payBankName" class="form-control"></div><div class="form-group"><label>Slip No</label><input type="text" id="payBankSlip" class="form-control"></div>`;
    }
}

// ==========================================================================
//   SUBMIT PAYMENT (Student Fees)
// ==========================================================================
function submitPayment(e) {
    e.preventDefault();
    
    // --- SAFETY CHECK: Default to Cash if undefined ---
    if (!currentPayMethod) {
        currentPayMethod = 'Cash';
    }
    // --------------------------------------------------

    const source = getVal('payFundingSource');
    const amount = parseFloat(getVal('payAmount'));
    
    if (!source || !amount) return showToast('Check fields', 'error');

    const studentId = $('payStudentId')?.value;
    const studentObj = StudentRepo.getById(studentId);
    
    let details = '';
    
    // Now we are sure currentPayMethod is not undefined
    if (currentPayMethod === 'M-Pesa') {
        details = getVal('payTransCode');
    } else if (currentPayMethod === 'Bank') {
        details = `${getVal('payBankName')} - ${getVal('payBankSlip')}`;
    }

    const feeType = getVal('payFeeType') || 'Tuition';
    let fullDetails = feeType;
    
    if (source === 'Sponsor' && getVal('paySponsorName')) fullDetails += ` - ${getVal('paySponsorName')}`;
    if (source === 'Bursary' && getVal('payBursaryType')) fullDetails += ` (${getVal('payBursaryType')})`;
    if (details) fullDetails += ` | ${details}`;

    FinanceRepo.create({
        studentId, 
        studentName: studentObj ? studentObj.name : 'N/A', 
        source, 
        amount,
        method: currentPayMethod, 
        details: fullDetails, 
        paidInBy: getVal('payPaidInBy') || 'N/A',
        date: new Date().toISOString(), 
        receiptNo: `RCP-${Date.now().toString().slice(-6)}`
    });

    if (studentObj) {
        StudentRepo.update(studentId, { fees: Math.max(0, studentObj.fees - amount) });
    }

    closeModal('paymentModal');
    renderFinance();
    if (studentObj) applyFilters();
    renderDashboard();
    
    const lastTx = FinanceRepo.getAll()[0];
    if (lastTx) generateOfficialReceipt(lastTx.id);
    
    showToast('Transaction Recorded');
}
// ==========================================================================
//   EXPENDITURE PAYMENT METHOD TOGGLER (UPDATED)
// ==========================================================================
function setPayMethod(method, btn) {
    // 1. Update Global Variable
    currentPayMethod = method;
    
    // 2. Update UI Buttons
    if (btn && btn.parentElement) {
        btn.parentElement.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    // 3. Find the Container
    const dyn = $('payDynamicFields');
    if (!dyn) {
        console.error("CRITICAL: Cannot find element with ID 'payDynamicFields'. Check your HTML.");
        return;
    }

    // 4. Inject Content
    if (method === 'M-Pesa') {
        dyn.innerHTML = `<div class="form-group"><label>Transaction Code</label><input type="text" id="payTransCode" class="form-control" placeholder="e.g. QWE123456"></div>`;
    } else if (method === 'Bank') {
        dyn.innerHTML = `<div class="form-group"><label>Bank Name</label><input type="text" id="payBankName" class="form-control" placeholder="e.g. Equity Bank"></div><div class="form-group"><label>Slip No</label><input type="text" id="payBankSlip" class="form-control" placeholder="e.g. 001234"></div>`;
    } else {
        // Cash: Clear the fields
        dyn.innerHTML = '';
    }

    // 5. FORCE VISIBILITY (This fixes the issue)
    // We set it to block explicitly. Even if CSS says none, this overrides it.
    if (method !== 'Cash') {
        dyn.style.display = 'block';
        
        // Optional: Check if parent is hidden and unhide it
        let parent = dyn.parentElement;
        while (parent) {
            if (parent.style.display === 'none') {
                parent.style.display = 'block';
            }
            parent = parent.parentElement;
        }
    } else {
        // For Cash, we can hide the container to keep the UI clean
        dyn.style.display = 'none';
    }
}

function generateOfficialReceipt(id) {
    const tx = FinanceRepo.getById(id);
    if (!tx) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let yPos = addDocHeader(doc, "OFFICIAL RECEIPT");
    doc.setFontSize(12);
    doc.text(`Receipt No: ${tx.receiptNo || id}`, 14, yPos);
    doc.text(`Date: ${new Date(tx.date).toLocaleString()}`, 14, yPos + 7);
    doc.setDrawColor(200);
    doc.line(14, yPos + 12, 196, yPos + 12);
    yPos += 20;
    doc.setFontSize(14).setFont(undefined, 'bold');
    doc.text(`Received From: ${tx.studentName}`, 14, yPos);
    yPos += 10;
    doc.setFontSize(11).setFont(undefined, 'normal');
    doc.text(`The sum of: ${numberToWords(tx.amount)} Shillings Only`, 14, yPos);
    yPos += 7;
    doc.text(`Amount: ${formatCurrency(tx.amount)}`, 14, yPos);
    yPos += 7;
    doc.text(`Payment For: ${tx.details || tx.source}`, 14, yPos);
    yPos += 7;
    doc.text(`Method: ${tx.method}`, 14, yPos);
    addDocFooter(doc);
    doc.save(`Receipt_${tx.receiptNo || id}.pdf`);
}

function numberToWords(num) {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    if ((num = num.toString()).length > 9) return 'Overflow';
    let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return;
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Only ' : 'Only';
    return str;
}

// --- Inventory ---
function openInventoryModal(id = null) {
    resetInventoryModal();
    if (id) {
        const item = InventoryRepo.getById(id);
        if (item) {
            $('inventoryModalTitle').innerText = "Edit Inventory Item";
            $('invEditId').value = id;
            setVal('invName', item.name);
            setVal('invCat', item.category);
            setVal('invQty', item.qty);
            setVal('invPrice', item.price);
            setVal('invSerial', item.serial || '');
            setVal('invCondition', item.condition || 'Good');
            setVal('invLocation', item.location || '');
            setVal('invSupplier', item.supplier || '');
            setVal('invNotes', item.notes || '');
            updateInvTotalDisplay();
        }
    }
    openModal('inventoryModal');
}
function resetInventoryModal() {
    $('inventoryForm')?.reset();
    $('inventoryModalTitle').innerText = "Add Inventory Item";
    $('invEditId').value = '';
    updateInvTotalDisplay();
}
function updateInvTotalDisplay() {
    const qty = parseFloat(getVal('invQty')) || 0;
    const price = parseFloat(getVal('invPrice')) || 0;
    if ($('invTotalDisplay')) $('invTotalDisplay').value = formatCurrency(qty * price);
}
function submitInventory(e) {
    e.preventDefault();
    const id = $('invEditId')?.value || generateId();
    const data = {
        id, name: getVal('invName'), category: getVal('invCat'), qty: parseInt(getVal('invQty')),
        price: parseFloat(getVal('invPrice')), serial: getVal('invSerial'), condition: getVal('invCondition'),
        location: getVal('invLocation'), supplier: getVal('invSupplier'), notes: getVal('invNotes')
    };
    if ($('invEditId')?.value) InventoryRepo.update(id, data);
    else InventoryRepo.create(data);
    closeModal('inventoryModal');
    renderInventory();
    showToast('Item Saved!');
}
function renderInventory() {
    const container = $('inventoryContainer');
    if (!container) return;
    const search = getVal('invSearch').toLowerCase();
    const cat = getVal('invCatFilter');
    const cond = getVal('invCondFilter');
    let data = InventoryRepo.getAll();
    if (search) data = data.filter(i => i.name.toLowerCase().includes(search) || (i.serial && i.serial.toLowerCase().includes(search)));
    if (cat !== 'all') data = data.filter(i => i.category === cat);
    if (cond !== 'all') data = data.filter(i => i.condition === cond);
    const totalItems = data.reduce((a, b) => a + b.qty, 0);
    const totalValue = data.reduce((a, b) => a + (b.qty * b.price), 0);
    if ($('invCountTotal')) $('invCountTotal').innerText = totalItems;
    if ($('invTotalValue')) $('invTotalValue').innerText = formatCurrency(totalValue);
    if (data.length === 0) { container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-box-open"></i><p>No inventory found.</p></div>`; return; }
    container.className = currentView.inventory === 'grid' ? 'inventory-grid-container' : 'table-container';
    container.innerHTML = currentView.inventory === 'grid'
        ? data.map(i => `<div class="inventory-card"><div class="inventory-card-header"><h4>${escapeHtml(i.name)}</h4><span>${i.category}</span></div><div class="inventory-card-body"><div>Qty: ${i.qty}</div><div>Value: ${formatCurrency(i.qty * i.price)}</div><div class="badge ${i.condition === 'New' ? 'badge-success' : 'badge-info'}">${i.condition}</div></div><div class="inventory-card-footer"><button class="btn btn-sm btn-secondary" data-action="editInv" data-id="${i.id}">Edit</button></div></div>`).join('')
        : `<table class="data-table"><thead><tr><th>Item</th><th>Category</th><th>Qty</th><th>Unit Price</th><th>Total</th><th>Condition</th><th>Actions</th></tr></thead><tbody>${data.map(i => `<tr><td>${escapeHtml(i.name)}</td><td>${i.category}</td><td>${i.qty}</td><td>${formatCurrency(i.price)}</td><td>${formatCurrency(i.qty * i.price)}</td><td><span class="badge badge-info">${i.condition}</span></td><td><button class="btn btn-sm btn-ghost" data-action="editInv" data-id="${i.id}"><i class="fa-solid fa-edit"></i></button></td></tr>`).join('')}</tbody></table>`;
}

// ==========================================================================
//   SETTINGS TAB SWITCHING
// ==========================================================================
function switchSettingsTab(index) {
    const settingsView = $('settings');
    if (!settingsView) return;

    settingsView.querySelectorAll('#settingsTabs .tab-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i === index);
        btn.setAttribute('aria-selected', i === index ? 'true' : 'false');
    });

    settingsView.querySelectorAll('.settings-tab-content').forEach((content, i) => {
        if (i === index) {
            content.classList.add('active');
            content.removeAttribute('hidden');
            content.style.display = 'block';
        } else {
            content.classList.remove('active');
            content.setAttribute('hidden', '');
            content.style.display = 'none';
        }
    });

    if (index === 1) renderCourseSettings();
}

function saveInstitutionDetails(e) {
    e.preventDefault();
    store.settings.schoolName = getVal('setSchoolName');
    store.settings.schoolCode = getVal('setSchoolCode');
    store.settings.motto = getVal('setMotto');
    store.settings.vision = getVal('setVision');
    store.settings.mission = getVal('setMission');
    store.settings.address = getVal('setAddress');
    store.settings.phone = getVal('setPhone');
    store.settings.email = getVal('setEmail');
    store.settings.website = getVal('setWebsite');
    store.settings.principal = getVal('setPrincipal');
    store.settings.examsOfficer = getVal('setExamsOfficer');
    store.settings.academicYear = getVal('setAcademicYear');
    store.settings.currentTerm = getVal('setCurrentTerm');
    saveData();
    updateHeaderAndDashboard();
    showToast('Settings Saved Successfully!');
}

function updateSettingsForm() {
    setVal('setSchoolName', store.settings.schoolName);
    setVal('setSchoolCode', store.settings.schoolCode);
    setVal('setMotto', store.settings.motto);
    setVal('setVision', store.settings.vision || '');
    setVal('setMission', store.settings.mission || '');
    setVal('setAddress', store.settings.address);
    setVal('setPhone', store.settings.phone);
    setVal('setEmail', store.settings.email);
    setVal('setWebsite', store.settings.website);
    setVal('setPrincipal', store.settings.principal);
    setVal('setExamsOfficer', store.settings.examsOfficer);
    setVal('setAcademicYear', store.settings.academicYear || '');
    setVal('setCurrentTerm', store.settings.currentTerm || 'Term 1');
    const logoPreview = $('settingsLogoPreview');
    if (store.settings.logo && logoPreview) logoPreview.innerHTML = `<img src="${store.settings.logo}" alt="Logo" style="width:100%; height:100%; object-fit:contain;">`;
    else if (logoPreview) logoPreview.innerHTML = '<i class="fa-solid fa-image"></i>';
    const stampPreview = $('stampPreview');
    const sideStamp = $('previewStampIcon');
    if (store.settings.stamp) {
        if (stampPreview) stampPreview.innerHTML = `<img src="${store.settings.stamp}" alt="Stamp" style="width: 100%; height: 100%; object-fit: contain;">`;
        if (sideStamp) { sideStamp.src = store.settings.stamp; sideStamp.style.display = 'block'; }
    } else {
        if (stampPreview) stampPreview.innerHTML = '<i class="fa-solid fa-stamp"></i>';
        if (sideStamp) sideStamp.style.display = 'none';
    }
}

function updateHeaderAndDashboard() {
    if ($('dashSchoolName')) $('dashSchoolName').innerText = store.settings.schoolName;
    if ($('dashAdminName')) $('dashAdminName').innerText = store.settings.principal;
    if ($('brandName')) $('brandName').innerText = store.settings.schoolName;
    if ($('prevName')) $('prevName').innerText = store.settings.schoolName;
    if ($('prevMotto')) $('prevMotto').innerText = store.settings.motto;
    if ($('prevCode')) $('prevCode').innerText = `Code: ${store.settings.schoolCode}`;
    if ($('prevEmail')) $('prevEmail').innerHTML = `<i class="fa-solid fa-envelope"></i> ${store.settings.email}`;
    if ($('prevPhone')) $('prevPhone').innerHTML = `<i class="fa-solid fa-phone"></i> ${store.settings.phone}`;
}

function saveCourseSettings(e) {
    e.preventDefault();
    const editId = $('courseEditId')?.value;
    const courseData = {
        id: editId || generateId(), name: getVal('courseName'), code: getVal('courseCode'),
        fee: parseFloat(getVal('courseFee')),
        levels: getVal('courseLevels').split(',').map(l => l.trim()),
        units: store.trades.find(t => t.id === editId)?.units || []
    };
    if (editId) { const idx = store.trades.findIndex(t => t.id === editId); if (idx !== -1) store.trades[idx] = courseData; }
    else store.trades.push(courseData);
    saveData();
    closeModal('courseModal');
    renderCourseSettings();
    populateDropdowns();
    showToast('Course Saved!');
}

function renderCourseSettings() {
    const tbody = $('courseSettingsTable');
    if (!tbody) return;
    tbody.innerHTML = store.trades.map(t => `
        <tr>
            <td>${t.code}</td><td>${t.name}</td><td>${t.levels.join(', ')}</td>
            <td>${formatCurrency(t.fee)}</td><td>${t.units ? t.units.length : 0}</td>
            <td><div class="btn-group">
                <!-- EDIT BUTTON: Now uses data-action -->
                <button class="btn btn-ghost btn-sm" data-action="edit-curriculum" data-id="${t.id}"><i class="fa-solid fa-edit"></i></button>
                <!-- DELETE BUTTON: Now uses data-action -->
                <button class="btn btn-ghost btn-sm text-danger" data-action="delete-course" data-id="${t.id}"><i class="fa-solid fa-trash"></i></button>
            </div></td>
        </tr>
    `).join('');
}

function editCourse(id) {
    const course = store.trades.find(t => t.id === id);
    if (!course) return;
    openModal('courseModal');
    $('courseModalTitle').innerText = "Edit Course";
    $('courseEditId').value = id;
    setVal('courseName', course.name);
    setVal('courseCode', course.code);
    setVal('courseFee', course.fee);
    setVal('courseLevels', course.levels.join(', '));
}

function deleteCourse(id) {
    if (confirm('Are you sure?')) {
        store.trades = store.trades.filter(t => t.id !== id);
        saveData();
        renderCourseSettings();
        populateDropdowns();
        showToast('Course Deleted');
    }
}

function exportBackup() {
    const dataStr = JSON.stringify(store, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tvet_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Backup Exported');
}

function importBackup(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (importedData.students && importedData.settings) {
                Object.assign(store, importedData);
                saveData();
                initApp();
                showToast('Backup Imported Successfully');
            } else showToast('Invalid backup file structure', 'error');
        } catch (err) { showToast('Error Importing File', 'error'); }
    };
    reader.readAsText(file);
    input.value = '';
}

function handleGlobalSearch(val) {
    if (val.length > 2) {
        if ($('studentSearch')) $('studentSearch').value = val;
        router('students');
        applyFilters();
    }
}

function previewLogo(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const preview = $('settingsLogoPreview');
            if (preview) preview.innerHTML = `<img src="${e.target.result}" alt="Logo" style="width:100%; height:100%; object-fit:contain;">`;
            const brandIcon = $('brandIcon');
            if (brandIcon) brandIcon.innerHTML = `<img src="${e.target.result}" alt="Logo" style="width:100%; height:100%; border-radius:6px;">`;
            store.settings.logo = e.target.result;
            saveData();
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function previewStamp(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const preview = $('stampPreview');
            if (preview) preview.innerHTML = `<img src="${e.target.result}" alt="Stamp" style="width: 100%; height: 100%; object-fit: contain;">`;
            const sidePreview = $('previewStampIcon');
            if (sidePreview) { sidePreview.src = e.target.result; sidePreview.style.display = 'block'; }
            store.settings.stamp = e.target.result;
            saveData();
            showToast('Rubber stamp uploaded successfully', 'success');
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// ==========================================================================
//   EXCEL REPORTING ENGINE
// ==========================================================================
function generateExcelReport(data, headers, filename, title) {
    if (!window.XLSX) return showToast('Excel library not loaded.', 'error');

    const wb = XLSX.utils.book_new();
    const wsData = [];

    // School details
    wsData.push([store.settings.schoolName.toUpperCase()]);
    wsData.push([store.settings.motto]);
    wsData.push([`${store.settings.address} | Tel: ${store.settings.phone}`]);
    wsData.push([]);
    wsData.push([title.toUpperCase()]);
    wsData.push([`Generated On: ${new Date().toLocaleString()}`]);
    wsData.push([]);
    wsData.push(headers.map(h => h.label));

    // Table rows
    data.forEach(row => {
        wsData.push(
            headers.map(h =>
                h.type === 'currency'
                    ? (parseFloat(row[h.key]) || 0)
                    : (row[h.key] || '')
            )
        );
    });

    // Convert to worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Merge cells for header/title
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
        { s: { r: 4, c: 0 }, e: { r: 4, c: headers.length - 1 } }
    ];

    // Column widths
    ws['!cols'] = headers.map(h => ({ wch: h.width || 15 }));

    // Apply borders to all cells
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = { c: C, r: R };
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            if (!ws[cell_ref]) continue;

            if (!ws[cell_ref].s) ws[cell_ref].s = {};
            ws[cell_ref].s.border = {
                top:    { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left:   { style: "thin", color: { rgb: "000000" } },
                right:  { style: "thin", color: { rgb: "000000" } }
            };
        }
    }

    // Append worksheet and save
    XLSX.utils.book_append_sheet(wb, ws, 'Official Report');
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);

    showToast('Official Excel Report Downloaded');
}



function generateStudentExcel() {
    generateExcelReport(StudentRepo.getAll(), [
        { label: "Name", key: "name", width: 30 }, { label: "Reg No", key: "reg", width: 15 },
        { label: "Gender", key: "gender", width: 10 }, { label: "Trade", key: "trade", width: 25 },
        { label: "Balance (KES)", key: "fees", type: 'currency', width: 15 }
    ], "Student_List", "Official Student List");
}

function generateFinanceExcel() {
    generateExcelReport(FinanceRepo.getAll().map(f => ({ ...f, date: new Date(f.date).toLocaleString() })), [
        { label: "Date", key: "date", width: 20 }, { label: "Student", key: "studentName", width: 25 },
        { label: "Method", key: "method", width: 10 }, { label: "Amount (KES)", key: "amount", type: 'currency', width: 15 }
    ], "Finance_Ledger", "Official Finance Record");
}

function generateStaffExcel() {
    generateExcelReport(StaffRepo.getAll(), [
        { label: "Name", key: "name", width: 30 }, { label: "ID No", key: "idNo", width: 15 },
        { label: "Role", key: "role", width: 20 }, { label: "Department", key: "dept", width: 20 },
        { label: "Phone", key: "phone", width: 15 }
    ], "Staff_Establishment", "Detailed Staff List");
}

// ==========================================================================
//   REPORTS & PDF GENERATION
// ==========================================================================

// --- Global Helper: Format Currency ---
function formatCurrency(amount) {
    const val = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(val);
}

function renderReportStats() {
    const collected = FinanceRepo.getAll().reduce((a, b) => a + (b.amount || 0), 0);
    if ($('repStatStudents')) $('repStatStudents').innerText = StudentRepo.count();
    if ($('repStatRevenue')) $('repStatRevenue').innerText = formatCurrency(collected);
    // Note: Reports Generated badge is static in HTML, but you could make it dynamic here.
}

function addDocHeader(doc, title) {
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 15;
    if (store.settings.logo) { try { doc.addImage(store.settings.logo, 'PNG', (pageWidth - 25) / 2, yPos, 25, 25); yPos += 28; } catch (e) { } }
    doc.setFontSize(22).setTextColor(30, 41, 59).setFont(undefined, 'bold');
    doc.text(store.settings.schoolName, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    if (store.settings.motto) { doc.setFontSize(10).setTextColor(100).setFont(undefined, 'italic'); doc.text(store.settings.motto, pageWidth / 2, yPos, { align: 'center' }); yPos += 6; }
    doc.setFontSize(8).setTextColor(150).setFont(undefined, 'normal');
    doc.text(`${store.settings.address || ''} | Tel: ${store.settings.phone || ''} | Email: ${store.settings.email || ''}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    doc.setDrawColor(37, 99, 235).setLineWidth(0.8);
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 5;
    if (title) { doc.setFontSize(16).setTextColor(37, 99, 235).setFont(undefined, 'bold'); doc.text(title, pageWidth / 2, yPos + 8, { align: 'center' }); yPos += 15; }
    return yPos + 5;
}

function addDocFooter(doc) {
    const pageCount = doc.internal.getNumberOfPages();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8).setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        if (store.settings.stamp) { try { doc.addImage(store.settings.stamp, 'PNG', pageWidth - 54, pageHeight - 45, 40, 25); } catch (e) { } }
    }
}

// ==========================================================================
//   STANDARD REPORTS (Mapped to your HTML)
// ==========================================================================

// 1. ACADEMIC REPORTS
function generateOfficialStudentReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    let yPos = addDocHeader(doc, "Official Student List");
    let data = StudentRepo.getAll();
    
    // Check for filters in modal
    const filters = { course: $('reportCourse')?.value, level: $('reportLevel')?.value, gender: $('reportGender')?.value, status: $('reportStatus')?.value };
    if (filters.course !== 'all') data = data.filter(s => s.tradeId === filters.course);
    if (filters.level !== 'all') data = data.filter(s => s.level === filters.level);
    if (filters.gender !== 'all') data = data.filter(s => s.gender === filters.gender);
    if (filters.status === 'Clear') data = data.filter(s => s.fees <= 0);
    if (filters.status === 'Arrears') data = data.filter(s => s.fees > 0);

    doc.autoTable({
        startY: yPos, 
        head: [['#', 'Name', 'Reg No', 'Course', 'Level', 'Gender', 'Phone', 'Balance']],
        body: data.map((s, i) => [
            i + 1, s.name, s.reg, s.trade, s.level, s.gender, s.phone, 
            { content: formatCurrency(s.fees), styles: { textColor: s.fees > 0 ? [220, 38, 38] : [22, 163, 74] } }
        ]),
        theme: 'grid', headStyles: { fillColor: [37, 99, 235] }
    });
    addDocFooter(doc);
    doc.save(`Student_Report.pdf`);
    closeModal('studentReportModal');
}

function generateFeeDefaultersPDF() {
    const defaulters = StudentRepo.getAll().filter(s => s.fees > 0);
    if (defaulters.length === 0) return showToast('No defaulters found', 'info');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let yPos = addDocHeader(doc, "Fee Defaulters List");
    
    // Add Summary Box
    const totalArrears = defaulters.reduce((sum, s) => sum + s.fees, 0);
    doc.setFillColor(254, 226, 226);
    doc.rect(15, yPos, 180, 15, 'F');
    doc.setTextColor(127, 29, 29).setFontSize(12).setFont('helvetica', 'bold');
    doc.text(`TOTAL OUTSTANDING: ${formatCurrency(totalArrears)}`, 105, yPos + 10, { align: 'center' });
    yPos += 20;

    doc.autoTable({
        startY: yPos, 
        head: [['#', 'Name', 'Reg No', 'Phone', 'Balance']],
        body: defaulters.map((s, i) => [i + 1, s.name, s.reg, s.phone, formatCurrency(s.fees)]),
        theme: 'grid', headStyles: { fillColor: [220, 38, 38] }
    });
    addDocFooter(doc);
    doc.save('Fee_Defaulters.pdf');
}

function generateEnrolmentSummary() {
    try {
        const groupBy = $('enrolGroupBy')?.value || 'trade';
        const formatBtn = document.querySelector('#enrolmentSummaryModal .btn-group .btn.active');
        const format = formatBtn && formatBtn.dataset.reportFormat ? formatBtn.dataset.reportFormat : 'pdf';
        const students = StudentRepo.getAll();
        if (!students || students.length === 0) return showToast('No student data available.', 'error');

        const summaryData = {};
        students.forEach(s => {
            let key = 'N/A';
            if (groupBy === 'trade') key = s.trade || 'N/A';
            else if (groupBy === 'level') key = s.level || 'N/A';
            else if (groupBy === 'gender') key = s.gender || 'N/A';
            else if (s[groupBy]) key = s[groupBy];

            if (!summaryData[key]) summaryData[key] = { male: 0, female: 0, total: 0 };
            summaryData[key].total++;
            if (s.gender === 'Male') summaryData[key].male++;
            if (s.gender === 'Female') summaryData[key].female++;
        });

        const reportRows = Object.entries(summaryData).map(([key, val]) => ({ 
            category: key, male: val.male, female: val.female, total: val.total 
        })).sort((a, b) => b.total - a.total);

        const totals = { 
            male: reportRows.reduce((s, r) => s + r.male, 0), 
            female: reportRows.reduce((s, r) => s + r.female, 0), 
            total: reportRows.reduce((s, r) => s + r.total, 0) 
        };

        if (format === 'excel') {
            if (!window.XLSX) return showToast('Excel library not loaded.', 'error');
            // Simple Excel generation logic
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(reportRows);
            XLSX.utils.book_append_sheet(wb, ws, "Enrolment");
            XLSX.writeFile(wb, "Enrolment_Summary.xlsx");
        } else {
            const { jsPDF } = window.jspdf;
            if (!jsPDF) return showToast('PDF Library not loaded.', 'error');
            
            const doc = new jsPDF();
            let yPos = addDocHeader(doc, "Enrolment Summary Report");
            doc.autoTable({
                startY: yPos, 
                head: [[groupBy, 'Male', 'Female', 'Total', '% Share']],
                body: [
                    ...reportRows.map(r => [
                        r.category, r.male, r.female, r.total, ((r.total / totals.total) * 100).toFixed(1) + '%'
                    ]),
                    [
                        { content: 'GRAND TOTAL', styles: { fontStyle: 'bold', fillColor: [226, 232, 240] } }, 
                        { content: totals.male, styles: { fontStyle: 'bold', fillColor: [226, 232, 240] } }, 
                        { content: totals.female, styles: { fontStyle: 'bold', fillColor: [226, 232, 240] } }, 
                        { content: totals.total, styles: { fontStyle: 'bold', fillColor: [226, 232, 240] } }, 
                        { content: '100%', styles: { fontStyle: 'bold', fillColor: [226, 232, 240] } }
                    ]
                ],
                theme: 'grid', 
                headStyles: { fillColor: [37, 99, 235], textColor: 255 }
            });
            addDocFooter(doc);
            doc.save(`Enrolment_Summary.pdf`);
        }
        closeModal('enrolmentSummaryModal');
    } catch (error) {
        console.error("Error generating enrolment summary:", error);
        showToast('Error generating report.', 'error');
    }
}

function generateFeeStatusPDF() {
    // This can reuse the Defaulters logic or be specific to a modal
    // For simplicity in this unified script, we'll map it to Defaulters if no specific modal exists
    generateFeeDefaultersPDF();
}

// --- NEW: Excel Exports ---
function exportStudentExcel() {
    if (!window.XLSX) return showToast('Excel library not loaded.', 'error');
    const students = StudentRepo.getAll().map(s => ({
        "Reg No": s.reg,
        "Name": s.name,
        "Course": s.trade,
        "Level": s.level,
        "Gender": s.gender,
        "Phone": s.phone,
        "Fee Balance": s.fees
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(students), "Students");
    XLSX.writeFile(wb, "Student_Master_Data.xlsx");
}

// 2. FINANCE REPORTS
function generateCollectionPDF(period) {
    try {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) return showToast('PDF Library not loaded.', 'error');
        const doc = new jsPDF();
        let yPos = addDocHeader(doc, "Collection Report");

        // Date Calculation
        const now = new Date();
        let startDate, endDate, periodText;
        const normalize = (d) => {
            if (!d) return '';
            const dateObj = new Date(d);
            const userTimezoneOffset = dateObj.getTimezoneOffset() * 60000;
            return new Date(dateObj.getTime() + userTimezoneOffset).toISOString().split('T')[0];
        };

        if (period === 'daily') {
            startDate = endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            periodText = `Daily: ${startDate.toLocaleDateString()}`;
        } else if (period === 'weekly') {
            const day = now.getDay() || 7; 
            if(day !== 1) now.setHours(-24 * (day - 1)); 
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(startDate); endDate.setDate(startDate.getDate() + 6);
            periodText = `Weekly: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
        } else if (period === 'monthly') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            periodText = `Monthly: ${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
        }

        const startStr = normalize(startDate);
        const endStr = normalize(endDate);
        const allTransactions = FinanceRepo.getAll() || [];
        const transactions = allTransactions.filter(tx => {
            const txDate = normalize(tx.date);
            return txDate >= startStr && txDate <= endStr;
        });

        let totalCash = 0, totalBank = 0, grandTotal = 0;
        const tableBody = transactions.map((tx, index) => {
            const amount = parseFloat(tx.amount) || 0;
            grandTotal += amount;
            if (tx.method === 'Cash') totalCash += amount;
            else totalBank += amount;

            return [
                index + 1,
                new Date(tx.date).toLocaleDateString(),
                tx.receiptNo || 'N/A',
                tx.studentName || 'N/A',
                tx.details || tx.source || 'Fees',
                tx.method,
                { content: formatCurrency(amount), styles: { halign: 'right' } }
            ];
        });

        doc.setFontSize(10).setTextColor(50);
        doc.text(`Period: ${periodText}`, 14, yPos);
        yPos += 10;

        if (tableBody.length === 0) {
            doc.text("No transactions found for this period.", 14, yPos);
        } else {
            doc.autoTable({
                startY: yPos,
                head: [['#', 'Date', 'Receipt', 'Student', 'Description', 'Method', 'Amount']],
                body: tableBody,
                foot: [
                    ['', '', '', '', 'Total Cash:', { content: formatCurrency(totalCash), styles: { halign: 'right', fontStyle: 'bold' } }],
                    ['', '', '', '', 'Total Bank:', { content: formatCurrency(totalBank), styles: { halign: 'right', fontStyle: 'bold' } }],
                    ['', '', '', '', 'GRAND TOTAL:', { content: formatCurrency(grandTotal), styles: { halign: 'right', fontStyle: 'bold', fillColor: [220, 220, 220] } }]
                ],
                theme: 'grid',
                headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 8 },
                styles: { fontSize: 8, cellPadding: 2 },
                columnStyles: {
                    0: { cellWidth: 10 }, 1: { cellWidth: 25 }, 2: { cellWidth: 25 },
                    3: { cellWidth: 50 }, 4: { cellWidth: 40 }, 5: { cellWidth: 20 }, 6: { cellWidth: 30 }
                }
            });
        }
        addDocFooter(doc);
        doc.save(`Collection_Report_${period}_${startStr}.pdf`);
        showToast('Collection Report generated successfully.');
    } catch (error) { console.error(error); showToast('Error generating Collection Report.', 'error'); }
}

function exportFinanceExcel() {
    if (!window.XLSX) return showToast('Excel library not loaded.', 'error');
    const tx = FinanceRepo.getAll() || [];
    const data = tx.map(t => ({
        Date: t.date, Receipt: t.receiptNo, Student: t.studentName, 
        Source: t.source, Method: t.method, Amount: t.amount
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Finance");
    XLSX.writeFile(wb, "Finance_Ledger.xlsx");
}

// --- NEW: Votehead Utilization Report ---
function generateVoteheadUtilizationReport() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) return;
    
    const voteheads = store.voteheads || [];
    const expenditures = ExpenditureRepo.getAll() || [];

    const doc = new jsPDF();
    let yPos = addDocHeader(doc, "Votehead Utilization Report");

    // Calculate spending per votehead
    const rows = voteheads.map(vh => {
        const spent = expenditures
            .filter(e => e.allocation && e.allocation[vh.name])
            .reduce((sum, e) => sum + parseFloat(e.allocation[vh.name]), 0);
        
        return [
            vh.name,
            { content: '0.00', styles: { textColor: 150 } }, // Budget placeholder
            formatCurrency(spent),
            { content: formatCurrency(0 - spent), styles: { textColor: [220, 38, 38], fontStyle: 'bold' } } // Variance
        ];
    });

    doc.autoTable({
        startY: yPos,
        head: [['Votehead', 'Budget (Allocated)', 'Spent', 'Balance']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] }
    });

    addDocFooter(doc);
    doc.save('Votehead_Utilization.pdf');
}

function handleFinanceReportAction() {
    const type = $('reportType') ? $('reportType').value : 'daily';
    
    if (type === 'collection') {
        const period = $('collectionPeriod') ? $('collectionPeriod').value : 'daily';
        generateCollectionPDF(period);
        closeModal('reportFilterModal');
        return;
    }

    if (type === 'daily') {
        const date = getVal('reportDate');
        if (!date) return showToast('Please select a date.', 'error');
        const manualOpeningCash = parseFloat(getVal('openingCashBalance')) || 0;
        const manualOpeningBank = parseFloat(getVal('openingBankBalance')) || 0;
        const scope = $('cashbookScope') ? $('cashbookScope').value : 'daily';
        generateCashbookPDF(date, manualOpeningCash, manualOpeningBank, scope);
    } else if (type === 'monthly') {
        const month = getVal('reportMonth');
        const bankBalance = parseFloat(getVal('reportBankBalance')) || 0;
        if (!month) return showToast('Please select a month for the report.', 'error');
        generateMonthlyReconciliationPDF(month, bankBalance);
    }
    closeModal('reportFilterModal');
}

// 3. INVENTORY REPORTS
function generateInventoryPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    let yPos = addDocHeader(doc, "Inventory Report");

    const items = InventoryRepo.getAll();
    const totalValue = items.reduce((s, i) => s + (i.qty * i.price), 0);

    // Add Total Value Summary
    yPos = 15; // Reset for summary box
    doc.setFillColor(22, 163, 74);
    doc.roundedRect(15, yPos, 80, 20, 2, 2, 'F');
    doc.setTextColor(255).setFont('helvetica', 'bold').setFontSize(14);
    doc.text(`TOTAL VALUE: ${formatCurrency(totalValue)}`, 55, yPos + 13, { align: 'center' });
    doc.setTextColor(0);
    yPos = addDocHeader(doc, "Inventory Report"); // Re-run header for table

    doc.autoTable({
        startY: yPos,
        head: [['#', 'Item Name', 'Category', 'Serial', 'Qty', 'Unit Price', 'Total Value', 'Condition']],
        body: items.map((item, i) => [
            i + 1, item.name, item.category, item.serial || 'N/A', item.qty, 
            formatCurrency(item.price), 
            formatCurrency(item.qty * item.price), 
            item.condition
        ]),
        theme: 'grid', 
        headStyles: { fillColor: [37, 99, 235] }
    });
    addDocFooter(doc);
    doc.save(`Inventory_Report.pdf`);
}

// --- NEW: Low Stock Report ---
function generateLowStockReport() {
    const items = InventoryRepo.getAll().filter(i => i.qty <= i.reorder);
    if (items.length === 0) return showToast('No low stock items', 'info');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let yPos = addDocHeader(doc, "Low Stock Alert List");

    doc.autoTable({
        startY: yPos,
        head: [['#', 'Item Name', 'Current Qty', 'Reorder Level', 'Supplier']],
        body: items.map((i, idx) => [idx + 1, i.name, i.qty, i.reorder, i.supplier]),
        theme: 'grid',
        headStyles: { fillColor: [249, 115, 22] }
    });

    addDocFooter(doc);
    doc.save('Low_Stock_Report.pdf');
}

// --- NEW: Stock Movement (Simplified for now as full logs might require a separate repo) ---
function generateStockMovementReport() {
    // Re-using valuation report for now as "Movement" implies current status if history isn't tracked
    generateInventoryPDF();
}

// 4. HR & ADMIN REPORTS
function generateStaffListPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    let yPos = addDocHeader(doc, "Staff Establishment Report");

    const staff = StaffRepo.getAll();
    doc.autoTable({
        startY: yPos,
        head: [['#', 'Name', 'ID No', 'Gender', 'Role', 'Dept', 'Phone', 'Terms']],
        body: staff.map((s, i) => [i + 1, s.name, s.idNo || 'N/A', s.gender, s.role, s.dept, s.phone, s.terms]),
        theme: 'grid', 
        headStyles: { fillColor: [37, 99, 235], fontSize: 8 }, 
        styles: { fontSize: 7, cellPadding: 1.5 }
    });
    addDocFooter(doc);
    doc.save('Staff_Establishment.pdf');
}

function exportStaffExcel() {
    if (!window.XLSX) return showToast('Excel library not loaded.', 'error');
    const staff = StaffRepo.getAll().map(s => ({
        Name: s.name, ID: s.idNo, Gender: s.gender, Role: s.role, Dept: s.dept, Phone: s.phone
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(staff), "Staff");
    XLSX.writeFile(wb, "Staff_Data.xlsx");
}

function generateSchoolProfile() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let yPos = addDocHeader(doc, "Institution Profile");
    doc.setFontSize(12).setTextColor(50);
    const labels = { 
        schoolName: "Institution Name", schoolCode: "Code", motto: "Motto", 
        address: "Address", phone: "Phone", email: "Email", website: "Website", 
        principal: "Principal", examsOfficer: "Exams Officer" 
    };
    
    let currentY = yPos;
    Object.keys(store.settings).forEach(key => {
        if (labels[key] && typeof store.settings[key] === 'string' && !['logo', 'stamp'].includes(key)) {
            doc.setFont('helvetica', 'bold');
            doc.text(`${labels[key]}:`, 20, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(store.settings[key], 80, currentY);
            currentY += 10;
        }
    });
    addDocFooter(doc);
    doc.save('School_Profile.pdf');
}

// --- NEW: Exam Analysis Report ---
function generateExamAnalysisReport() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) return showToast('PDF Library not loaded.', 'error');

    const exams = store.exams || [];
    if (exams.length === 0) return showToast('No exam data found', 'info');

    const doc = new jsPDF();
    let yPos = addDocHeader(doc, "CBET Exam Analysis Report");

    // Analysis Logic
    const analysis = {};
    exams.forEach(e => {
        if (!analysis[e.unitCode]) {
            analysis[e.unitCode] = { 
                total: 0, sum: 0, pass: 0, fail: 0, 
                name: e.unitName || e.unitCode 
            };
        }
        const score = parseFloat(e.score);
        analysis[e.unitCode].total++;
        analysis[e.unitCode].sum += score;
        // Assuming 50 is the pass mark for CbET
        if (score >= 50) analysis[e.unitCode].pass++;
        else analysis[e.unitCode].fail++;
    });

    const rows = Object.entries(analysis).map(([code, data]) => [
        code, data.name, data.total, 
        (data.sum / data.total).toFixed(1) + '%', 
        data.pass, data.fail,
        { 
            content: ((data.pass / data.total) * 100).toFixed(0) + '%', 
            styles: { 
                textColor: (data.pass / data.total) > 0.5 ? [22, 163, 74] : [220, 38, 38] 
            }
        }
    ]);

    doc.autoTable({
        startY: yPos,
        head: [['Unit Code', 'Unit Name', 'Assessed', 'Avg Score', 'Competent', 'Not Yet', 'Pass Rate']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] }
    });

    addDocFooter(doc);
    doc.save('Exam_Analysis_Report.pdf');
}

// ==========================================================================
//   SPECIALIZED REPORTS (Preserving your complex logic)
// ==========================================================================

function generateCashbookPDF(date, manualOpeningCash, manualOpeningBank, reportType = 'daily') {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape' });
        // ... (Your exact Cashbook Logic Here) ...
        let rangeStart = new Date('1970-01-01T00:00:00');
        let rangeEnd = new Date('2099-12-31T00:00:00');
        let displayPeriodText = "Full Transaction History (All Records)";
        const rangeStartStr = rangeStart.toISOString().split('T')[0];
        const rangeEndStr = rangeEnd.toISOString().split('T')[0];

        let yPos = addDocHeader(doc, "Cashbook - Detailed Transactions");
        doc.setFontSize(11).setFont(undefined, 'bold');
        doc.text(`Period: ${displayPeriodText}`, 14, yPos);
        yPos += 10;

        const normalizeDate = (d) => d ? d.split('T')[0] : '';
        const formatDateShort = (dateStr) => { 
            if (!dateStr) return '-'; 
            const parts = dateStr.split('-'); 
            if (parts.length !== 3) return '-'; 
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; 
            return `${parts[2]} ${months[parseInt(parts[1], 10) - 1]}`; 
        };

        let openingCash = manualOpeningCash || 0;
        let openingBank = manualOpeningBank || 0;

        const allFinanceHist = FinanceRepo.getAll() || [];
        const allCapHist = CapitationRepo.getAll() || [];
        const allExpHist = ExpenditureRepo.getAll() || [];

        const sortDate = (a, b) => normalizeDate(a.date).localeCompare(normalizeDate(b.date));
        allFinanceHist.sort(sortDate);
        allCapHist.sort(sortDate);
        allExpHist.sort(sortDate);

        const activeVoteheads = store.voteheads || [];
        const vhMap = {};
        const VH_LABELS = activeVoteheads.length > 0 ? activeVoteheads.map((vh, i) => { 
            vhMap[vh.name] = i; 
            return vh.name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 4); 
        }) : ['N/A'];

        const parseVoteheads = (allocation) => { 
            const arr = Array(activeVoteheads.length).fill(0); 
            if (!allocation) return arr; 
            if (typeof allocation === 'object' && !Array.isArray(allocation)) { 
                Object.entries(allocation).forEach(([key, val]) => { 
                    if (vhMap[key] !== undefined) arr[vhMap[key]] = val || 0; 
                }); 
            } 
            return arr; 
        };
        
        const fmt = (val) => (val || 0) === 0 ? '-' : (val || 0).toFixed(0); 
        const fmtBal = (val) => { 
            if ((val || 0) === 0) return '-'; 
            const parts = Math.abs(val || 0).toFixed(2).split('.'); 
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ","); 
            return (val || 0) < 0 ? `(${parts.join('.')})` : parts.join('.'); 
        };

        let totalCashR = 0, totalBankR = 0, totalCashP = 0, totalBankP = 0;
        const vhTotalsR = Array(activeVoteheads.length).fill(0);
        const vhTotalsP = Array(activeVoteheads.length).fill(0);

        const receiptRows = [];
        const paymentRows = [];

        receiptRows.push([
            formatDateShort(rangeStartStr), 
            { content: 'Balance b/f (Opening)', styles: { fontStyle: 'italic', textColor: 80, fontSize: 6 } }, 
            '', 
            { content: fmtBal(openingCash), styles: { textColor: 80, halign: 'right', fontSize: 6 } }, 
            { content: fmtBal(openingBank), styles: { textColor: 80, halign: 'right', fontSize: 6 } }, 
            ...VH_LABELS.map(() => ({ content: '-', styles: { fontSize: 6, textColor: 200 } }))
        ]);

        allFinanceHist.forEach(r => { 
            const isCash = r.method === 'Cash'; 
            if (isCash) totalCashR += (r.amount || 0); else totalBankR += (r.amount || 0); 
            const vhArr = parseVoteheads(r.allocation); 
            vhArr.forEach((v, i) => vhTotalsR[i] += v); 
            receiptRows.push([
                formatDateShort(normalizeDate(r.date)), 
                (r.studentName || r.source || '').substring(0, 20), 
                r.receiptNo || '-', 
                isCash ? fmt(r.amount) : '-', 
                !isCash ? fmt(r.amount) : '-', 
                ...vhArr.map(v => ({ content: v > 0 ? v : '-', styles: { halign: 'center', fontSize: 6 } }))
            ]); 
        });

        allCapHist.forEach(c => { 
            totalBankR += (c.amount || 0); 
            const vhArr = parseVoteheads(c.allocation); 
            vhArr.forEach((v, i) => vhTotalsR[i] += v); 
            receiptRows.push([
                formatDateShort(normalizeDate(c.date)), 
                (c.source || 'Capitation').substring(0, 20), 
                c.ref || '-', 
                '-', 
                fmt(c.amount), 
                ...vhArr.map(v => ({ content: v > 0 ? v : '-', styles: { halign: 'center', fontSize: 6, fontStyle: 'bold', textColor: 40 } }))
            ]); 
        });

        allExpHist.forEach(p => { 
            const isCash = p.method === 'Cash'; 
            if (isCash) totalCashP += (p.amount || 0); else totalBankP += (p.amount || 0); 
            const vhArr = parseVoteheads(p.allocation); 
            vhArr.forEach((v, i) => vhTotalsP[i] += v); 
            paymentRows.push([
                formatDateShort(normalizeDate(p.date)), 
                (p.payee || '').substring(0, 20), 
                p.voucher || '-', 
                ...vhArr.map(v => ({ content: v > 0 ? v : '-', styles: { halign: 'center', fontSize: 6 } })),
                isCash ? fmt(p.amount) : '-', 
                !isCash ? fmt(p.amount) : '-'
            ]); 
        });

        const totalCashIn = openingCash + totalCashR;
        const totalBankIn = openingBank + totalBankR;
        const closingCash = totalCashIn - totalCashP;
        const closingBank = totalBankIn - totalBankP;

        if (receiptRows.length > 1) {
            receiptRows.push([
                { content: '-', styles: { fontStyle: 'bold', fillColor: [34, 197, 94], textColor: 255, fontSize: 6, halign: 'center' } },
                { content: 'TOTAL IN', styles: { fontStyle: 'bold', fillColor: [34, 197, 94], textColor: 255, fontSize: 6 } },
                { content: '-', styles: { fontStyle: 'bold', fillColor: [34, 197, 94], textColor: 255, fontSize: 6, halign: 'center' } },
                { content: fmtBal(totalCashIn), styles: { fontStyle: 'bold', fillColor: [34, 197, 94], textColor: 255, halign: 'right' } },
                { content: fmtBal(totalBankIn), styles: { fontStyle: 'bold', fillColor: [34, 197, 94], textColor: 255, halign: 'right' } },
                ...vhTotalsR.map(v => ({ content: v > 0 ? v : '-', styles: { fontStyle: 'bold', fillColor: [34, 197, 94], textColor: 255, halign: 'center' } }))
            ]);
        }

        if (paymentRows.length > 0) {
            const pVHTotalCells = vhTotalsP.map(v => ({ content: v > 0 ? v : '-', styles: { fontStyle: 'bold', fillColor: [254, 202, 202], textColor: 60, halign: 'center' } }));
            paymentRows.push([
                { content: '-', styles: { fontStyle: 'bold', fillColor: [254, 202, 202], textColor: 60, fontSize: 6, halign: 'center' } },
                { content: 'TOTAL OUT', styles: { fontStyle: 'bold', fillColor: [254, 202, 202], textColor: 60, fontSize: 6 } },
                { content: '-', styles: { fontStyle: 'bold', fillColor: [254, 202, 202], textColor: 60, fontSize: 6, halign: 'center' } },
                ...pVHTotalCells,
                { content: fmtBal(totalCashP), styles: { fontStyle: 'bold', fillColor: [254, 202, 202], textColor: 60, halign: 'right' } },
                { content: fmtBal(totalBankP), styles: { fontStyle: 'bold', fillColor: [254, 202, 202], textColor: 60, halign: 'right' } }
            ]);
            paymentRows.push([
                { content: '-', styles: { fontStyle: 'bold', fillColor: [37, 99, 235], textColor: 255, fontSize: 6, halign: 'center' } },
                { content: 'CLOSING BAL (c/f)', styles: { fontStyle: 'bold', fillColor: [37, 99, 235], textColor: 255, fontSize: 6 } },
                { content: '-', styles: { fontStyle: 'bold', fillColor: [37, 99, 235], textColor: 255, fontSize: 6, halign: 'center' } },
                ...Array(activeVoteheads.length).fill(null).map(() => ({ content: '', styles: { fillColor: [37, 99, 235] } })),
                { content: fmtBal(closingCash), styles: { fontStyle: 'bold', fillColor: [37, 99, 235], textColor: 255, halign: 'right' } },
                { content: fmtBal(closingBank), styles: { fontStyle: 'bold', fillColor: [37, 99, 235], textColor: 255, halign: 'right' } }
            ]);
        }

        const maxRows = Math.max(receiptRows.length, paymentRows.length);
        while (receiptRows.length < maxRows) receiptRows.push(Array(5 + activeVoteheads.length).fill(''));
        while (paymentRows.length < maxRows) paymentRows.push(Array(5 + activeVoteheads.length).fill(''));

        const pageW = doc.internal.pageSize.getWidth();
        const margin = 8; const gap = 2; const halfW = (pageW - margin * 2 - gap) / 2;

        doc.autoTable({
            startY: yPos, theme: 'grid',
            head: [[{ content: 'RECEIPTS (Debit)', colSpan: 5 + activeVoteheads.length, styles: { fillColor: [22, 163, 74], fontSize: 7, halign: 'center', textColor: 255 } }], ['Date', 'Particulars', 'Ref', 'Cash', 'Bank', ...VH_LABELS]],
            body: receiptRows, margin: { left: margin, right: pageW - margin - halfW }, tableWidth: halfW,
            headStyles: { fontSize: 6, cellPadding: 1, halign: 'center' }, bodyStyles: { fontSize: 6, lineColor: [200, 200, 200], lineWidth: 0.1 }
        });

        doc.autoTable({
            startY: yPos, theme: 'grid',
            head: [[{ content: 'PAYMENTS (Credit)', colSpan: 5 + activeVoteheads.length, styles: { fillColor: [239, 68, 68], fontSize: 7, halign: 'center', textColor: 255 } }], ['Date', 'Particulars', 'Ref', ...VH_LABELS, 'Cash', 'Bank']],
            body: paymentRows, margin: { left: margin + halfW + gap, right: margin }, tableWidth: halfW,
            headStyles: { fontSize: 6, cellPadding: 1, halign: 'center' }, bodyStyles: { fontSize: 6, lineColor: [200, 200, 200], lineWidth: 0.1 }
        });

        const sumAllocations = (records) => {
            const totals = Array(activeVoteheads.length).fill(0);
            records.forEach(rec => {
                const arr = parseVoteheads(rec.allocation);
                arr.forEach((v, i) => totals[i] += v);
            });
            return totals;
        };

        const totalAllocatedArr = sumAllocations(allCapHist);
        const totalSpentArr = sumAllocations(allExpHist);

        const summaryRows = activeVoteheads.map((vh, i) => {
            const allocated = totalAllocatedArr[i];
            const spent = totalSpentArr[i];
            const balance = allocated - spent;
            return [
                vh.name,
                { content: fmt(allocated), styles: { halign: 'right', fontStyle: 'bold' } },
                { content: fmt(spent), styles: { halign: 'right' } },
                { content: fmt(balance), styles: { halign: 'right', fontStyle: 'bold' } }
            ];
        });

        summaryRows.push([
            { content: 'GRAND TOTAL', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
            { content: fmt(totalAllocatedArr.reduce((a,b)=>a+b, 0)), styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } },
            { content: fmt(totalSpentArr.reduce((a,b)=>a+b, 0)), styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } },
            { content: fmt(totalAllocatedArr.reduce((a,b)=>a+b,0) - totalSpentArr.reduce((a,b)=>a+b,0)), styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } }
        ]);

        doc.addPage();
        yPos = addDocHeader(doc, "Votehead Analysis Summary");
        doc.setFontSize(10).setTextColor(80);
        doc.text("Summary of Total Allocated Budget vs. Total Actual Expenditure (All Time)", 14, yPos);
        yPos += 10;

        doc.autoTable({
            startY: yPos,
            head: [['Votehead', 'Total Allocated', 'Total Spent', 'Remaining Balance']],
            body: summaryRows,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 9 },
            styles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 50, halign: 'right' },
                2: { cellWidth: 50, halign: 'right' },
                3: { cellWidth: 50, halign: 'right' }
            }
        });

        addDocFooter(doc);
        doc.save(`Cashbook_Full_History.pdf`);
    } catch (error) { console.error("Error generating Cashbook PDF:", error); showToast('PDF generation failed. Check console (F12).', 'error'); }
}

function generateMonthlyReconciliationPDF(month, bankBalance) {
    // ... (Your existing Reconciliation Logic Here) ...
    try {
        const { jsPDF } = window.jspdf; const doc = new jsPDF(); let yPos = addDocHeader(doc, "Bank Reconciliation Statement");
        const normalizeDate = (d) => d ? d.split('T')[0] : '';
        const monthStartDate = `${month}-01`;
        const tempDate = new Date(monthStartDate + 'T00:00:00');
        const monthEndDate = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 0).toISOString().split('T')[0];
        const allFinance = FinanceRepo.getAll() || []; const allCap = CapitationRepo.getAll() || []; const allExp = ExpenditureRepo.getAll() || [];
        let openingBank = 0, currentBankReceipts = 0, currentBankPayments = 0;
        allFinance.filter(f => normalizeDate(f.date) && normalizeDate(f.date) < monthStartDate && f.method !== 'Cash').forEach(r => openingBank += (r.amount || 0));
        allCap.filter(c => normalizeDate(c.date) && normalizeDate(c.date) < monthStartDate).forEach(c => openingBank += (c.amount || 0));
        allExp.filter(p => normalizeDate(p.date) && normalizeDate(p.date) < monthStartDate && p.method !== 'Cash').forEach(p => openingBank -= (p.amount || 0));
        allFinance.filter(f => normalizeDate(f.date) >= monthStartDate && normalizeDate(f.date) <= monthEndDate && f.method !== 'Cash').forEach(r => currentBankReceipts += (r.amount || 0));
        allCap.filter(c => normalizeDate(c.date) >= monthStartDate && normalizeDate(c.date) <= monthEndDate).forEach(c => currentBankReceipts += (c.amount || 0));
        allExp.filter(p => normalizeDate(p.date) >= monthStartDate && normalizeDate(p.date) <= monthEndDate && p.method !== 'Cash').forEach(p => currentBankPayments += (p.amount || 0));
        const cashBookBalance = openingBank + currentBankReceipts - currentBankPayments;
        const periodStr = new Date(monthStartDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        doc.setFontSize(12).setTextColor(50); doc.text(`Period: ${periodStr}`, 14, yPos); yPos += 10;
        doc.autoTable({
            startY: yPos, head: [['Summary', 'Amount']],
            body: [['Balance as per Bank Statement', formatCurrency(bankBalance)], ['Balance as per Cash Book', formatCurrency(cashBookBalance)],
            [{ content: 'Difference (Variance)', styles: { fontStyle: 'bold', textColor: Math.abs(cashBookBalance - bankBalance) < 1 ? [22, 163, 74] : [239, 68, 68] } }, { content: formatCurrency(Math.abs(cashBookBalance - bankBalance)), styles: { fontStyle: 'bold', textColor: Math.abs(cashBookBalance - bankBalance) < 1 ? [22, 163, 74] : [239, 68, 68], halign: 'right' } }]],
            theme: 'grid', headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' }, styles: { cellPadding: 5 }, columnStyles: { 0: { cellWidth: 130 }, 1: { halign: 'right', cellWidth: 50 } }, margin: { left: 25, right: 25 }
        });
        yPos = doc.lastAutoTable.finalY + 20; doc.setFontSize(11).setFont(undefined, 'bold').setTextColor(0); doc.text("Reconciliation Adjustments:", 25, yPos); yPos += 5;
        doc.autoTable({
            startY: yPos,
            body: [[{ content: 'Balance as per Bank Statement', styles: { fontStyle: 'bold' } }, formatCurrency(bankBalance)],
            [{ content: 'Add: Unpresented Cheques', styles: { fontStyle: 'italic', textColor: 80, fontSize: 8 } }, { content: fmtRec(currentBankPayments), styles: { textColor: 80, halign: 'right' } }],
            [{ content: 'Less: Uncredited Deposits', styles: { fontStyle: 'italic', textColor: 80, fontSize: 8 } }, { content: `(${fmtRec(currentBankReceipts)})`, styles: { textColor: 80, halign: 'right' } }],
            [{ content: 'Adjusted Bank Balance', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } }, { content: formatCurrency(bankBalance + currentBankPayments - currentBankReceipts), styles: { fontStyle: 'bold', fillColor: [245, 245, 245], halign: 'right' } }],
            [{ content: 'Balance as per Cash Book', styles: { fontStyle: 'bold', fillColor: [226, 232, 240] } }, { content: formatCurrency(cashBookBalance), styles: { fontStyle: 'bold', fillColor: [226, 232, 240], halign: 'right' } }]],
            theme: 'plain', styles: { cellPadding: 5, lineWidth: 0.1, lineColor: [200, 200, 200] }, columnStyles: { 0: { cellWidth: 130 }, 1: { halign: 'right', cellWidth: 50 } }, margin: { left: 25, right: 25 }
        });
        yPos = doc.lastAutoTable.finalY + 20;
        const isReconciled = Math.abs(cashBookBalance - bankBalance) < 1;
        doc.setFontSize(14).setFont(undefined, 'bold'); doc.setTextColor(isReconciled ? 22 : 239, isReconciled ? 163 : 68, isReconciled ? 74 : 68);
        doc.text(isReconciled ? "STATUS: FULLY RECONCILED \u2713" : "STATUS: UNRECONCILED - REVIEW OUTSTANDING ITEMS", 25, yPos);
        addDocFooter(doc); doc.save(`Bank_Reconciliation_${month}.pdf`);
    } catch (error) { console.error("Error generating Reconciliation PDF:", error); showToast('Failed to generate Reconciliation PDF.', 'error'); }
}

function generateTrialBalancePDF() {
    // ... (Your existing Trial Balance Logic Here) ...
    try {
        const { jsPDF } = window.jspdf; const doc = new jsPDF('landscape'); let yPos = addDocHeader(doc, "Trial Balance");
        const activeVoteheads = store.voteheads || []; const allFinance = FinanceRepo.getAll() || []; const allExp = ExpenditureRepo.getAll() || [];
        const normalizeDate = (d) => d ? d.split('T')[0] : '';
        let latestDateRaw = 'No Transactions'; try { const allDates = [...allFinance.map(f => f.date), ...allExp.map(e => e.date)].filter(Boolean).sort().reverse(); if (allDates.length > 0) latestDateRaw = normalizeDate(allDates[0]); } catch (e) { }
        const safeFees = allFinance.filter(f => f.source !== 'Capitation' && normalizeDate(f.date) && normalizeDate(f.date) <= latestDateRaw);
        const safeCap = allFinance.filter(f => f.source === 'Capitation' && normalizeDate(f.date) && normalizeDate(f.date) <= latestDateRaw);
        const safeExp = allExp.filter(exp => normalizeDate(exp.date) && normalizeDate(exp.date) <= latestDateRaw);
        const vhMap = {}; activeVoteheads.forEach((vh, i) => { vhMap[vh.name] = i; });
        const parseVoteheads = (allocation) => { const arr = Array(activeVoteheads.length).fill(0); if (!allocation) return arr; if (typeof allocation === 'object' && !Array.isArray(allocation)) { Object.entries(allocation).forEach(([key, val]) => { if (vhMap[key] !== undefined) arr[vhMap[key]] = val || 0; }); } return arr; };
        let totalCredits = 0, totalDebits = 0; const creditRows = []; const debitRows = [];
        const feeVHTotals = Array(activeVoteheads.length).fill(0); const capVHTotals = Array(activeVoteheads.length).fill(0); const expVHTotals = Array(activeVoteheads.length).fill(0);
        let unallocatedFees = 0, unallocatedCap = 0, unallocatedExp = 0;
        safeFees.forEach(f => { const vhArr = parseVoteheads(f.allocation); if (vhArr.some(v => v > 0.001)) { vhArr.forEach((v, i) => feeVHTotals[i] += v); } else { unallocatedFees += (f.amount || 0); } });
        safeCap.forEach(c => { const vhArr = parseVoteheads(c.allocation); if (vhArr.some(v => v > 0.001)) { vhArr.forEach((v, i) => capVHTotals[i] += v); } else { unallocatedCap += (c.amount || 0); } });
        safeExp.forEach(exp => { const vhArr = parseVoteheads(exp.allocation); if (vhArr.some(v => v > 0.001)) { vhArr.forEach((v, i) => expVHTotals[i] += v); } else { unallocatedExp += (exp.amount || 0); } });
        activeVoteheads.forEach((vh, i) => { if (feeVHTotals[i] > 0.001) { creditRows.push([`  Fee: ${vh.name}`, feeVHTotals[i]]); totalCredits += feeVHTotals[i]; } if (capVHTotals[i] > 0.001) { creditRows.push([`  Cap: ${vh.name}`, capVHTotals[i]]); totalCredits += capVHTotals[i]; } if (expVHTotals[i] > 0.001) { debitRows.push([`  ${vh.name}`, expVHTotals[i]]); totalDebits += expVHTotals[i]; } });
        if (unallocatedFees > 0.001) { creditRows.push(['  Fee Collection (Unallocated)', unallocatedFees]); totalCredits += unallocatedFees; }
        if (unallocatedCap > 0.001) { creditRows.push(['  Capitation (Unallocated)', unallocatedCap]); totalCredits += unallocatedCap; }
        if (unallocatedExp > 0.001) { debitRows.push(['  Expenditure (Unallocated)', unallocatedExp]); totalDebits += unallocatedExp; }
        let variance = totalCredits - totalDebits; let suspenseAccount = 0;
        if (Math.abs(variance) > 1) { suspenseAccount = variance; if (variance < 0) totalCredits += Math.abs(variance); else totalDebits += variance; }
        const fmt = (val) => { if (val === 0 || val === null || isNaN(val)) return '-'; const parts = Math.abs(val).toFixed(2).split('.'); parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ","); return val < 0 ? `(${parts.join('.')})` : parts.join('.'); };
        doc.setFontSize(10).setTextColor(100); doc.text(`Cumulative Totals as at: ${new Date(latestDateRaw + 'T00:00:00').toLocaleDateString()}`, 14, yPos); yPos += 10;
        const tableBody = [];
        tableBody.push([{ content: 'INCOME ACCOUNTS (Credits)', styles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: 50 } }, { content: '', styles: { fillColor: [240, 240, 240] } }, { content: '', styles: { fillColor: [240, 240, 240] } }]);
        creditRows.forEach(row => { tableBody.push([row[0], { content: '', styles: { halign: 'right' } }, { content: fmt(row[1]), styles: { halign: 'right' } }]); });
        tableBody.push(['', '', '']);
        tableBody.push([{ content: 'EXPENDITURE ACCOUNTS (Debits)', styles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: 50 } }, { content: '', styles: { fillColor: [240, 240, 240] } }, { content: '', styles: { fillColor: [240, 240, 240] } }]);
        debitRows.forEach(row => { tableBody.push([row[0], { content: fmt(row[1]), styles: { halign: 'right' } }, { content: '', styles: { halign: 'right' } }]); });
        tableBody.push(['', '', '']);
        const isBalanced = Math.abs(totalCredits - totalDebits) < 1;
        tableBody.push([{ content: 'TOTALS', styles: { fontStyle: 'bold', fillColor: [226, 232, 240], textColor: 30 } }, { content: fmt(totalDebits), styles: { fontStyle: 'bold', fillColor: [226, 232, 240], textColor: 30, halign: 'right' } }, { content: fmt(totalCredits), styles: { fontStyle: 'bold', fillColor: [226, 232, 240], textColor: 30, halign: 'right' } }]);
        doc.autoTable({
            startY: yPos, head: [['Account Name', 'Debit (KES)', 'Credit (KES)']], body: tableBody, theme: 'grid',
            styles: { cellPadding: 4, lineColor: [220, 220, 220], lineWidth: 0.1, fontSize: 9 },
            headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', halign: 'center' },
            columnStyles: { 0: { cellWidth: 140, overflow: 'linebreak' }, 1: { cellWidth: 60, halign: 'right' }, 2: { cellWidth: 60, halign: 'right' } },
            margin: { left: 20, right: 20 }
        });
        yPos = doc.lastAutoTable.finalY + 20;
        doc.setFontSize(12).setFont(undefined, 'bold'); doc.setTextColor(isBalanced ? 22 : 239, isBalanced ? 163 : 68, isBalanced ? 74 : 68);
        doc.text(isBalanced ? "STATUS: ACCOUNTS BALANCED \u2713" : "WARNING: DEBITS DO NOT EQUAL CREDITS - CHECK SUSPENSE ACCOUNT", 20, yPos);
        addDocFooter(doc); doc.save(`Trial_Balance.pdf`);
    } catch (error) { console.error("Error generating Trial Balance PDF:", error); showToast(`PDF Error: ${error.message}`, 'error'); }
}

function fmtRec(val) { if (val === 0) return '-'; const parts = Math.abs(val).toFixed(2).split('.'); parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ","); return val < 0 ? `(${parts.join('.')})` : parts.join('.'); }

function generatePaymentVoucher(record) {
    // ... (Your existing Voucher Logic Here) ...
    if (typeof window.jspdf === 'undefined') return showToast('PDF Library not loaded', 'error');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    if (store.settings.logo) {
        try {
            const logoWidth = 30, logoHeight = 30;
            const logoX = (pageWidth - logoWidth) / 2;
            doc.addImage(store.settings.logo, 'PNG', logoX, y, logoWidth, logoHeight);
            y += logoHeight + 5;
        } catch (e) {}
    }

    doc.setFont("helvetica", "bold").setFontSize(16);
    doc.text(store.settings.schoolName || "MINDHINE YOUTH POLYTECHNIC", pageWidth / 2, y, { align: 'center' });
    y += 10;
    doc.setFontSize(14);
    doc.text("PAYMENT VOUCHER", pageWidth / 2, y + 10, { align: 'center' });
    y += 25;

    const pvNo = record.voucher || `PV-${Date.now().toString().slice(-6)}`;
    const dateStr = new Date(record.date).toLocaleDateString('en-GB');

    doc.setFont("helvetica", "normal").setFontSize(11);
    doc.text(`PAYEE’S NAME: ${record.payee || "………………"}`, margin, y);
    doc.text(`PV NO: ${pvNo}`, pageWidth - 80, y);
    y += 8;
    doc.text(`ADDRESS: ${record.address || "………………"}`, margin, y);
    doc.text(`Phone: ${store.settings.phone || "………………"}`, pageWidth - 80, y);
    y += 8;
    doc.text(`Date: ${dateStr}`, margin, y);
    y += 12;

    const colDate = margin, colInv = 50, colPart = 90, colShs = 160, colCts = 185, colEnd = pageWidth - margin;
    const rowHeight = 10;
    const tableTopY = y;

    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text("Date", colDate + 2, y);
    doc.text("Invoice No.", colInv + 2, y);
    doc.text("Particulars", colPart + 2, y);
    doc.text("Shs.", colShs + 2, y);
    doc.text("Cts.", colCts + 2, y);
    y += rowHeight;

    doc.setFont("helvetica", "normal").setFontSize(9);
    let totalShs = 0, totalCts = 0;
    const formatAmountParts = amt => ({ shs: Math.floor(amt), cts: Math.round((amt % 1) * 100) });

    const allocations = record.allocation && typeof record.allocation === 'object'
        ? Object.entries(record.allocation)
        : [["Payment", record.amount]];

    allocations.forEach(([particular, amount]) => {
        const { shs, cts } = formatAmountParts(amount);
        totalShs += shs; totalCts += cts;

        doc.text(dateStr, colDate + 2, y);
        doc.text(pvNo, colInv + 2, y);
        doc.text(particular, colPart + 2, y);
        doc.text(String(shs), colShs + 2, y);
        doc.text(String(cts), colCts + 2, y);
        y += rowHeight;
    });

    doc.setFont("helvetica", "bold");
    doc.text("Totals in words:", colDate + 2, y);
    doc.text(String(totalShs), colShs + 2, y);
    doc.text(String(totalCts), colCts + 2, y);
    y += rowHeight;

    const tableBottomY = y;
    const columns = [colDate, colInv, colPart, colShs, colCts, colEnd];
    doc.setLineWidth(0.5);
    columns.forEach(x => doc.line(x, tableTopY - rowHeight, x, tableBottomY));
    for (let lineY = tableTopY - rowHeight; lineY <= tableBottomY; lineY += rowHeight) {
        doc.line(colDate, lineY, colEnd, lineY);
    }

    y += 10;
    const totalAmount = totalShs + totalCts / 100;
    const words = `Totals in words: ${numberToWords(totalAmount)} Shillings Only`;
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(words, pageWidth - margin * 2), margin, y);
    y += 20;

    if (record.method === 'Bank') {
        doc.setFont("helvetica", "bold");
        doc.text(`CHEQUE NO: ${record.chequeNo || "…………"} (${record.bankName || "…………"})`, margin, y);
        y += 15;
    }

    const votesTopY = y + 20;
    const votesCols = [margin, margin + 40, margin + 80, pageWidth - margin];
    const votesRowHeight = 10;

    doc.setFont("helvetica", "bold");
    doc.text("VOTE", votesCols[0] + 2, votesTopY + 7);
    doc.text("Kshs.", votesCols[1] + 2, votesTopY + 7);
    doc.text("Cts.", votesCols[2] + 2, votesTopY + 7);
    doc.text("Prepared by: …………………………. Acc. Clerk/ Bursar.\nAuthorized by: ……………………….. Principal.", votesCols[2] + 20, votesTopY + 7);

    const votesBottomY = votesTopY + votesRowHeight * 6;
    votesCols.forEach(x => doc.line(x, votesTopY, x, votesBottomY));
    for (let lineY = votesTopY; lineY <= votesBottomY; lineY += votesRowHeight) {
        doc.line(margin, lineY, pageWidth - margin, lineY);
    }

    doc.setFont("helvetica", "bold");
    doc.text("TOTAL", votesCols[0] + 2, votesBottomY - 3);
    doc.text(String(totalShs), votesCols[1] + 2, votesBottomY - 3);
    doc.text(String(totalCts), votesCols[2] + 2, votesBottomY - 3);

    if (record.method === 'Cash') {
        const receiptY = votesBottomY + 20;
        doc.setFont("helvetica", "bold");
        doc.text("RECEIPT FOR CASH PAYMENTS:", pageWidth / 2, receiptY, { align: 'center' });
        const receiptText = `I have received the sum of Kenya Shillings (In words) ${numberToWords(totalAmount)} (In figures) ${formatCurrency(totalAmount)}`;
        doc.setFont("helvetica", "normal");
        doc.text(doc.splitTextToSize(receiptText, pageWidth - margin * 2), margin, receiptY + 10);
        doc.text("Signature: ………………………………… ID. NO: ………………………………..", margin, receiptY + 25);
    }

    doc.save(`Voucher_${pvNo}.pdf`);
    showToast('Official Voucher Generated', 'success');
}

function generateCertificatePDF() {
    // ... (Your existing Certificate Logic Here) ...
    const studentId = currentExamContext.studentId;
    if (!studentId) return showToast('Select student in Exams section', 'error');
    const student = StudentRepo.getById(studentId);
    if (!student) return;

    const trade = store.trades.find(t => t.id === student.tradeId);
    const tradeName = trade ? trade.name : student.trade || "Trade Program"; 
    
    let gradeText = "COMPLETED";
    let gradeColor = [100, 100, 100];
    
    if (trade && trade.units) {
        let totalScore = 0, assessedCount = 0;
        trade.units.forEach(u => {
            const exam = store.exams.find(e => e.studentId === studentId && e.unitCode === u.code);
            if (exam) {
                totalScore += parseInt(exam.score);
                assessedCount++;
            }
        });
        if (assessedCount > 0) {
            const avg = totalScore / assessedCount;
            const merit = getOverallRemark(avg);
            gradeText = merit.text; 
            gradeColor = merit.color;
        }
    }

    const { jsPDF } = window.jspdf; 
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    doc.setTextColor(240, 240, 240).setFontSize(80).setFont("times", "bold");
    doc.text("MERIT", pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
    doc.text("CERTIFICATE", pageWidth / 2, (pageHeight / 2) + 40, { align: 'center', angle: 45 });

    doc.setDrawColor(0, 51, 102).setLineWidth(4).rect(10, 10, pageWidth - 20, pageHeight - 20);
    doc.setDrawColor(212, 175, 55).setLineWidth(1.5).rect(16, 16, pageWidth - 32, pageHeight - 32);

    const headerY = 25;
    const frameSize = 50; 

    if (store.settings.logo) {
        try { doc.addImage(store.settings.logo, 'PNG', 20, headerY + 5, 40, 40); } catch (e) { }
    }

    const photoX = pageWidth - 30 - frameSize; 
    const photoY = headerY;
    const photoRadius = frameSize / 2; 
    const centerX = photoX + photoRadius;
    const centerY = photoY + photoRadius;

    doc.setFillColor(0, 51, 102); 
    doc.circle(centerX, centerY, photoRadius, 'F');
    doc.setFillColor(255, 255, 255);
    doc.circle(centerX, centerY, photoRadius - 4, 'F');
    const imgSize = 38; 
    const imgOffset = (frameSize - imgSize) / 2; 
    try { 
        doc.addImage(student.photo || DEFAULT_AVATAR, 'JPEG', photoX + imgOffset, photoY + imgOffset, imgSize, imgSize); 
    } catch (e) { }

    doc.setDrawColor(212, 175, 55).setLineWidth(4);
    doc.circle(centerX, centerY, photoRadius, 'S');
    doc.setDrawColor(0, 51, 102).setLineWidth(4.5);
    doc.circle(centerX, centerY, photoRadius - 4, 'S');

    doc.setFont("times", "bold").setFontSize(28).setTextColor(0, 51, 102);
    doc.text(store.settings.schoolName || "Institution Name", pageWidth / 2, headerY + 10, { align: 'center', maxWidth: 140 });
    
    doc.setFont("helvetica", "italic").setFontSize(10).setTextColor(80);
    if (store.settings.motto) {
        doc.text(`"${store.settings.motto}"`, pageWidth / 2, headerY + 25, { align: 'center', maxWidth: 140 });
    }
    doc.setFontSize(9);
    doc.text(store.settings.schoolCode || "", pageWidth / 2, headerY + 35, { align: 'center' });

    let yPos = 80; 
    doc.setFont("times", "bolditalic").setFontSize(36).setTextColor(212, 175, 55); 
    doc.text("CERTIFICATE OF MERIT", pageWidth / 2, yPos, { align: 'center' });

    yPos += 15; 
    doc.setFont("times", "normal").setFontSize(14).setTextColor(50);
    doc.text("This is to certify that", pageWidth / 2, yPos, { align: 'center' });

    yPos += 10; 
    doc.setFont("times", "bold").setFontSize(32).setTextColor(0, 0, 0);
    doc.text(student.name.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });

    yPos += 10; 
    doc.setFont("times", "normal").setFontSize(14).setTextColor(50);
    doc.text("Has successfully completed the training in", pageWidth / 2, yPos, { align: 'center' });

    yPos += 8; 
    doc.setFont("times", "bold").setFontSize(22).setTextColor(37, 99, 235);
    doc.text(tradeName.toUpperCase(), pageWidth / 2, yPos, { align: 'center', maxWidth: 200 });

    yPos += 12; 
    
    const sealX = pageWidth / 2;
    const sealY = yPos;
    const sealRadius = 15;

    doc.setFillColor(...gradeColor); 
    doc.circle(sealX, sealY, sealRadius, 'F'); 
    doc.setDrawColor(212, 175, 55).setLineWidth(1); 
    doc.circle(sealX, sealY, sealRadius, 'S'); 

    doc.setTextColor(255, 255, 255).setFont("helvetica", "bold").setFontSize(8);
    doc.text("AWARDED", sealX, sealY - 4, { align: 'center' });
    doc.setFontSize(12);
    doc.text(gradeText, sealX, sealY + 6, { align: 'center' });

    yPos = pageHeight - 45; 

    const today = new Date().toLocaleDateString();
    doc.setFont("times", "normal").setFontSize(12).setTextColor(50);
    doc.text(`Date: ${today}`, pageWidth - 30, yPos, { align: 'right' });

    const signY = yPos + 20;
    
    doc.setDrawColor(0, 0, 0).setLineWidth(1);
    doc.line(60, signY, 130, signY);
    doc.text("Principal", 95, signY + 10, { align: 'center' });

    doc.line(160, signY, 230, signY);
    doc.text("Exams Officer", 195, signY + 10, { align: 'center' });

    if (store.settings.stamp) {
        try { doc.addImage(store.settings.stamp, 'PNG', 130, signY - 30, 35, 35); } catch (e) { }
    }

    doc.save(`Merit_Certificate_${student.name}.pdf`);
}

// --- Certificate & Transcript Helpers ---
function getLetterGrade(score) {
    if (score >= 90) return { grade: 'EE1', points: 8, remarks: 'Outstanding Mastery' };
    if (score >= 75) return { grade: 'EE2', points: 7, remarks: 'Exceeds Expectations' };
    if (score >= 58) return { grade: 'ME1', points: 6, remarks: 'High Proficiency' };
    if (score >= 41) return { grade: 'ME2', points: 5, remarks: 'Satisfactory Competence' };
    if (score >= 31) return { grade: 'AE1', points: 4, remarks: 'Developing Competence' };
    if (score >= 21) return { grade: 'AE2', points: 3, remarks: 'Below Standard' };
    if (score >= 11) return { grade: 'BE1', points: 2, remarks: 'Insufficient Evidence' };
    if (score >= 1)  return { grade: 'BE2', points: 1, remarks: 'Not Yet Competent' };
    return { grade: 'NG', points: 0, remarks: 'No Grade Awarded' };
}

function getOverallRemark(avg) {
    if (avg >= 90) return { text: "Distinction", color: [16, 185, 129] };
    if (avg >= 75) return { text: "Credit", color: [34, 197, 94] };
    if (avg >= 58) return { text: "Proficient", color: [59, 130, 246] };
    if (avg >= 41) return { text: "Competent", color: [99, 102, 241] };
    if (avg >= 31) return { text: "Developing", color: [249, 115, 22] };
    if (avg >= 21) return { text: "Below Standard", color: [239, 68, 68] };
    if (avg >= 11) return { text: "Not Competent", color: [185, 28, 28] };
    return { text: "Incomplete", color: [127, 29, 29] };
}

function generateTranscriptPDF(previewStudentId, isPreview = false) {
    // ... (Your existing Transcript Logic Here) ...
    let studentId = previewStudentId || $('reportStudentSelect')?.value || $('analysisStudentSelect')?.value || currentExamContext.studentId || currentStudentId;
    if (!studentId) return showToast('Please select a learner first.', 'error');
    const student = StudentRepo.getById(studentId);
    if (!student) return showToast('Learner not found.', 'error');
    if (!window.jspdf) return showToast('PDF Library not loaded', 'error');
    const trade = store.trades.find(t => t.id === student.tradeId);
    if (!trade) return showToast('Trade/Program not assigned to learner.', 'error');
    const { jsPDF } = window.jspdf; const doc = new jsPDF(); const pageWidth = doc.internal.pageSize.getWidth(); const pageHeight = doc.internal.pageSize.getHeight(); const margin = 15; let yPos = 10;
    
    doc.setFillColor(0, 51, 102); doc.rect(0, 0, pageWidth, 32, 'F');
    if (store.settings.logo) { try { doc.addImage(store.settings.logo, 'PNG', margin, 6, 20, 20); } catch (e) {} }
    doc.setTextColor(255, 255, 255); doc.setFontSize(18).setFont(undefined, 'bold'); doc.text(store.settings.schoolName || "Institution Name", pageWidth / 2, 13, { align: 'center' });
    if (store.settings.motto) { doc.setFontSize(7).setFont(undefined, 'italic'); doc.text(store.settings.motto, pageWidth / 2, 19, { align: 'center' }); }
    doc.setFontSize(8).setFont(undefined, 'normal'); doc.text(`KNEC/TVET: ${store.settings.schoolCode || 'N/A'} | Tel: ${store.settings.phone || 'N/A'}`, pageWidth / 2, 27, { align: 'center' });
    
    yPos = 38;
    doc.setDrawColor(220); doc.setFillColor(250, 250, 252); doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 26, 2, 2, 'FD');
    try { doc.addImage(student.photo || DEFAULT_AVATAR, 'JPEG', margin + 3, yPos + 3, 20, 20); } catch (e) {}
    doc.setTextColor(30, 41, 59); doc.setFontSize(12).setFont(undefined, 'bold'); doc.text(student.name, margin + 28, yPos + 9);
    doc.setFontSize(8).setFont(undefined, 'normal').setTextColor(80); doc.text(`Adm: ${student.reg} | Prog: ${trade.name} (${trade.code || ''}) | G: ${student.gender}`, margin + 28, yPos + 16);
    doc.text(`Term: ${store.settings.currentTerm} ${store.settings.academicYear}`, margin + 28, yPos + 22); yPos += 30;
    
    doc.setTextColor(0, 51, 102); doc.setFontSize(12).setFont(undefined, 'bold'); doc.text("ACADEMIC TRANSCRIPT & PROGRESS REPORT", pageWidth / 2, yPos, { align: 'center' }); yPos += 8;
    
    const units = trade.units || []; let totalScore = 0, totalPoints = 0, assessedCount = 0;
    let topUnit = { name: 'N/A', score: 0 }, lowUnit = { name: 'N/A', score: 100 };

    const tableData = units.map(u => {
        const exam = store.exams.find(e => e.studentId === studentId && e.unitCode === u.code);
        let score, grade, points, remarks;
        if (exam) {
            score = parseInt(exam.score);
            const gradeInfo = getLetterGrade(score); 
            grade = gradeInfo.grade;
            points = gradeInfo.points;
            remarks = gradeInfo.remarks;
            if (score > topUnit.score) { topUnit = { name: u.name, score }; }
            if (score < lowUnit.score) { lowUnit = { name: u.name, score }; }
            totalScore += score;
            totalPoints += gradeInfo.points;
            assessedCount++;
        } else {
            score = 'NM'; grade = 'NG'; points = 'NP'; remarks = 'No Assessment';
        }
        return [u.code, u.name, score, grade, points, remarks];
    });

    const avg = assessedCount > 0 ? (totalScore / assessedCount) : 0;
    const totalUnitsCount = units.length; const allTradeStudents = StudentRepo.findBy('tradeId', student.tradeId);
    const ranked = allTradeStudents.map(s => { let sTotal = 0, sCount = 0; units.forEach(u => { const e = store.exams.find(ex => ex.studentId === s.id && ex.unitCode === u.code); if (e) { sTotal += parseInt(e.score); sCount++; } }); return { id: s.id, avg: sCount > 0 ? (sTotal / sCount) : 0 }; }).sort((a, b) => b.avg - a.avg);
    const rank = ranked.findIndex(s => s.id === studentId) + 1;

    const boxW = 50, gapB = 4, totalW = (boxW * 3) + (gapB * 2), startX = (pageWidth - totalW) / 2;
    doc.setFillColor(37, 99, 235); doc.roundedRect(startX, yPos, boxW, 18, 2, 2, 'F'); doc.setTextColor(255); doc.setFontSize(16).setFont(undefined, 'bold'); doc.text(`${avg.toFixed(1)}%`, startX + (boxW / 2), yPos + 9, { align: 'center' }); doc.setFontSize(7).setFont(undefined, 'normal'); doc.text("MEAN SCORE", startX + (boxW / 2), yPos + 15, { align: 'center' });
    doc.setFillColor(22, 163, 74); doc.roundedRect(startX + boxW + gapB, yPos, boxW, 18, 2, 2, 'F'); doc.setTextColor(255); doc.setFontSize(16).setFont(undefined, 'bold'); doc.text(`${rank}/${allTradeStudents.length}`, (startX + boxW + gapB) + (boxW / 2), yPos + 9, { align: 'center' }); doc.setFontSize(7).setFont(undefined, 'normal'); doc.text("TRADE RANK", (startX + boxW + gapB) + (boxW / 2), yPos + 15, { align: 'center' });
    doc.setFillColor(249, 115, 22); doc.roundedRect(startX + (boxW * 2) + (gapB * 2), yPos, boxW, 18, 2, 2, 'F'); doc.setTextColor(255); doc.setFontSize(16).setFont(undefined, 'bold'); doc.text(`${assessedCount}/${totalUnitsCount}`, (startX + (boxW * 2) + (gapB * 2)) + (boxW / 2), yPos + 9, { align: 'center' }); doc.setFontSize(7).setFont(undefined, 'normal'); doc.text("UNITS DONE", (startX + (boxW * 2) + (gapB * 2)) + (boxW / 2), yPos + 15, { align: 'center' });
    
    yPos += 23;

    const overallData = getOverallRemark(avg);
    doc.setFillColor(...overallData.color); 
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 14, 3, 3, 'F');
    doc.setTextColor(255); doc.setFontSize(10).setFont(undefined, 'bold');
    doc.text("Overall Performance: " + overallData.text.toUpperCase(), pageWidth / 2, yPos + 9, { align: 'center' });
    
    yPos += 18; 

    doc.setTextColor(30, 41, 59); doc.setFontSize(10).setFont(undefined, 'bold'); doc.text("Module / Unit Breakdown", margin, yPos); yPos += 2;

    doc.autoTable({
        startY: yPos,
        head: [['Code', 'Unit Name', 'Score', 'Grd', 'Pts', 'Remarks']],
        body: tableData,
        foot: [
            ['TOTALS', '', `${totalScore} / ${totalUnitsCount * 100}`, '', `${totalPoints.toFixed(1)} / ${(totalUnitsCount * 8).toFixed(1)}`, '']
        ],
        theme: 'grid',
        headStyles: { fillColor: [0, 51, 102], textColor: 255, fontSize: 8, fontStyle: 'bold', cellPadding: 2 },
        footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold', fontSize: 8, cellPadding: 2 },
        styles: { fontSize: 8, lineColor: [0, 51, 102], lineWidth: 0.1, cellPadding: 2, font: 'helvetica', overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 22 }, 1: { cellWidth: 50 }, 2: { halign: 'center', cellWidth: 14 }, 3: { halign: 'center', cellWidth: 10 }, 4: { halign: 'center', cellWidth: 10 }, 5: { cellWidth: 74, fontStyle: 'italic', fontSize: 7.5 }
        },
        margin: { left: margin, right: margin },
        didParseCell: function (data) {
            if (data.section === 'body' && data.column.index >= 2 && data.column.index <= 4) {
                const cellText = data.cell.raw;
                if (typeof cellText === 'string' && (cellText === 'NM' || cellText === 'NG' || cellText === 'NP')) {
                    data.cell.styles.textColor = [150, 150, 150];
                    data.cell.styles.fontStyle = 'italic';
                }
            }
        }
    });

    let finalY = doc.lastAutoTable.finalY + 5;
    const bottomMargin = 25; const gradeKeyHeight = 15; const remarksHeight = 16; const remarksGap = 5; const totalBottomContent = gradeKeyHeight + remarksHeight + remarksGap + 10;
    const availableSpace = pageHeight - bottomMargin - finalY - totalBottomContent;
    if (availableSpace > 30) { finalY += (availableSpace * 0.4); }
    
    doc.setFontSize(7).setTextColor(100); doc.text("Grading Key:", margin, finalY); finalY += 3;
    doc.setFillColor(245, 247, 250); doc.roundedRect(margin, finalY, pageWidth - (margin * 2), 10, 1, 1, 'F');
    doc.setFontSize(6).setTextColor(50);
    const keys = [
        "90-100: EE1 (Outstanding)", "75-89: EE2 (Exceeds)", 
        "58-74: ME1 (Proficient)", "41-57: ME2 (Competent)", 
        "31-40: AE1 (Developing)", "21-30: AE2 (Below Std)", 
        "11-20: BE1 (Insufficient)", "01-10: BE2 (Not Competent)"
    ];
    const colW = (pageWidth - (margin * 2)) / 4;
    keys.forEach((k, i) => { const col = i % 4; const row = Math.floor(i / 4); doc.text(k, margin + 2 + (col * colW), finalY + 4 + (row * 3)); });
    finalY += 15;
    
    const isMale = student.gender === 'Male' || student.gender === 'M'; const pronoun = isMale ? 'He' : 'She'; const possessive = isMale ? 'His' : 'Her'; const fName = student.name.split(' ')[0];
    let ctRemark = "", hoiRemark = "";
    if (avg >= 80) { ctRemark = `${fName} has displayed exceptional mastery of the trade modules this term. ${pronoun} excels practically in ${topUnit.name}. Keep up the outstanding work!`; hoiRemark = `An exemplary performance by ${fName}. ${pronoun} sets a very high standard for the ${trade.name} cohort. Highly commended.`; }
    else if (avg >= 58) { ctRemark = `A good effort by ${fName}. ${pronoun} shows great strength in ${topUnit.name}. However, ${possessive.toLowerCase()} performance in ${lowUnit.name} requires more focused workshop practice.`; hoiRemark = `${fName} is progressing well in the ${trade.name} program. With targeted hands-on revision in weak modules, ${pronoun.toLowerCase()} is capable of achieving top honors.`; }
    else if (avg >= 41) { ctRemark = `${fName} is making steady progress. While ${possessive.toLowerCase()} understanding of ${topUnit.name} is commendable, ${pronoun.toLowerCase()} struggled with ${lowUnit.name}. Encourage more practice.`; hoiRemark = `Satisfactory performance. ${fName} needs to put in extra workshop hours, especially in ${lowUnit.name}, to fully grasp the required competencies.`; }
    else if (avg >= 21) { ctRemark = `${fName} has faced significant challenges this term. ${pronoun} needs urgent remedial sessions and extra practice in ${lowUnit.name}.`; hoiRemark = `Performance below expected trade standards. ${fName} requires close mentorship and attendance monitoring to improve competency acquisition.`; }
    else { ctRemark = `This has been a difficult term for ${fName}. ${pronoun} requires specialized attention across multiple modules, particularly ${lowUnit.name}.`; hoiRemark = `Critical attention needed. The department and parents must collaborate closely to support ${fName}'s technical training journey.`; }
    
    const remHeight = 16;
    doc.setFontSize(8).setFont(undefined, 'bold').setTextColor(30, 41, 59); doc.text("Instructor's Remarks:", margin, finalY); finalY += 1;
    doc.setDrawColor(200).setFillColor(254, 254, 254); doc.roundedRect(margin, finalY, pageWidth - (margin * 2), remHeight, 1, 1, 'FD');
    doc.setFontSize(6.5).setTextColor(50).setFont(undefined, 'normal'); doc.text(ctRemark, margin + 2, finalY + 4, { maxWidth: pageWidth - margin * 2 - 55 });
    doc.line(pageWidth - margin - 50, finalY + remHeight - 3, pageWidth - margin - 5, finalY + remHeight - 3); doc.setFontSize(6).setTextColor(120); doc.text("Sign/Stamp", pageWidth - margin - 27, finalY + remHeight - 1, { align: 'center' });
    finalY += remHeight + 3;
    doc.setFontSize(8).setFont(undefined, 'bold').setTextColor(30, 41, 59); doc.text("Head of Institution's Remarks:", margin, finalY); finalY += 1;
    doc.setDrawColor(200); doc.roundedRect(margin, finalY, pageWidth - (margin * 2), remHeight, 1, 1, 'D');
    doc.setFontSize(6.5).setTextColor(50).setFont(undefined, 'normal'); doc.text(hoiRemark, margin + 2, finalY + 4, { maxWidth: pageWidth - margin * 2 - 55 });
    doc.line(pageWidth - margin - 50, finalY + remHeight - 3, pageWidth - margin - 5, finalY + remHeight - 3); doc.setFontSize(6).setTextColor(120); doc.text("Sign/Stamp", pageWidth - margin - 27, finalY + remHeight - 1, { align: 'center' });
    addDocFooter(doc, false);
    
    if (isPreview) { window.open(URL.createObjectURL(doc.output('blob')), '_blank'); showToast('Transcript opened in new tab.'); if (typeof closeModal === 'function') closeModal('individualReportModal'); }
    else { doc.save(`Transcript_${student.name}_${trade.name}.pdf`); if (typeof closeModal === 'function') closeModal('individualReportModal'); }
}

// ==========================================================================
//   HELPER FUNCTIONS (AI & UI)
// ==========================================================================
function initAIAssistant() { runLocalAnalysis(); }
function runLocalAnalysis() {
    const container = $('aiInsightsBar');
    if (!container) return;
    container.innerHTML = '';
    const highRisk = StudentRepo.getAll().filter(s => s.fees > 15000);
    container.innerHTML += highRisk.length > 0 ? `<div class="insight-card danger" onclick="showHighRisk()"><div class="title">High Risk</div><div class="value">${highRisk.length} critical balances.</div></div>` : `<div class="insight-card success"><div class="title">Fee Health</div><div class="value">No critical defaulters.</div></div>`;
}
function showHighRisk() { router('students'); setTimeout(() => { if ($('statusFilter')) $('statusFilter').value = 'Arrears'; applyFilters(); }, 100); }

async function sendAIQuery() {
    const input = $('aiUserInput');
    const query = input.value.trim();
    if (!query) return;
    const container = $('aiChatContainer');
    if (!container) return;
    container.insertAdjacentHTML('beforeend', `<div class="ai-message user">${query.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>`);
    input.value = '';
    container.insertAdjacentHTML('beforeend', `<div class="ai-message bot ai-thinking" id="thinking-${Date.now()}"><span></span><span></span><span></span></div>`);
    setTimeout(() => {
        container.querySelector('.ai-thinking')?.remove();
        const lowerQuery = query.toLowerCase();
        let text = `I am in <strong>Offline Mode</strong>.`;
        if (lowerQuery.includes('fee')) text = `Collected: <strong>${formatCurrency(FinanceRepo.getAll().reduce((a, b) => a + (b.amount || 0), 0))}</strong>. Defaulters: <strong>${StudentRepo.getAll().filter(s => s.fees > 0).length}</strong>.`;
        else if (lowerQuery.includes('student')) text = `Active trainees: <strong>${StudentRepo.count()}</strong>.`;
        container.insertAdjacentHTML('beforeend', `<div class="ai-message bot">${text}</div>`);
        container.scrollTop = container.scrollHeight;
    }, 1000);
}

function togglePasswordVisibility() {
    const input = $('adminPassword');
    const icon = $('passwordToggleIcon');
    if (!input || !icon) return;
    if (input.type === 'password') { input.type = 'text'; icon.className = 'fa-solid fa-eye-slash'; }
    else { input.type = 'password'; icon.className = 'fa-solid fa-eye'; }
}

function toggleAllocationView() { const container = $('voteheadBreakdown'); if (container) container.style.display = 'block'; }

function router(viewId, navEl) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    const targetSection = $(viewId);
    if (targetSection) targetSection.classList.add('active');
    const titleMap = { 'dashboard': 'Dashboard', 'intake': 'Admissions', 'students': 'Trainees', 'exams': 'CBET Assess', 'curricula': 'Curricula', 'external-exams': 'External Exams', 'finance': 'Finance', 'inventory': 'Inventory', 'staff': 'Staff', 'reports': 'Reports', 'settings': 'Settings' };
    if ($('pageTitle')) $('pageTitle').innerText = titleMap[viewId] || viewId.charAt(0).toUpperCase() + viewId.slice(1);
    if (navEl) { document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active')); navEl.classList.add('active'); }
    if (viewId === 'dashboard') renderDashboard();
    if (viewId === 'students') initStudentSection();
    if (viewId === 'staff') initStaffSection();
    if (viewId === 'exams') resetExamView();
    if (viewId === 'intake') { resetIntakeForm(); if ($('intakeFormTitle')) $('intakeFormTitle').innerText = "Student Admissions"; switchAdmissionMode('single'); }
    if (viewId === 'settings') { updateSettingsForm(); renderCourseSettings(); switchSettingsTab(0); }
    if (viewId === 'reports') renderReportStats();
    if (viewId === 'inventory') renderInventory();
    if (viewId === 'finance') renderFinance();
    if (viewId === 'curricula') renderCurricula();
    if (viewId === 'external-exams') renderExternalExams();
    if (window.innerWidth < 768) $('sidebar')?.classList.remove('open');
    window.scrollTo(0, 0);
}

function toggleSidebar() { $('sidebar')?.classList.toggle('open'); }

