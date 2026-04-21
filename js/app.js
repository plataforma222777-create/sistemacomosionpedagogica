import { db } from './db.js';
window.db = db;

import { ACADEMIC_AREAS, COURSES, PARALLELS } from './config/constants.js';

document.addEventListener('DOMContentLoaded', () => {
    const authSection = document.getElementById('auth-section');
    const appSection = document.getElementById('app-section');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');
    const mainContent = document.getElementById('main-content');
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a');

    // Chart Instance
    let dashboardChartInstance = null;

    function checkAuth() {
        const user = window.db.getCurrentUser();
        if (user) {
            authSection.classList.add('hidden');
            appSection.classList.remove('hidden');
            document.querySelectorAll('.institution-name-display').forEach(el => el.textContent = window.db.getSettings().unitName || 'Unidad Educativa');
            loadView('dashboard');
        } else {
            authSection.classList.remove('hidden');
            appSection.classList.add('hidden');
        }
    }

    const togglePasswordBtn = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('login-password');
    const iconEyeClosed = document.getElementById('icon-eye-closed');
    const iconEyeOpen = document.getElementById('icon-eye-open');

    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
            if (isPassword) {
                iconEyeClosed.classList.add('hidden');
                iconEyeOpen.classList.remove('hidden');
            } else {
                iconEyeClosed.classList.remove('hidden');
                iconEyeOpen.classList.add('hidden');
            }
        });
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = loginForm.username.value;
        const password = loginForm.password.value;
        const user = window.db.login(username, password);
        if (user) {
            loginError.classList.add('hidden');
            checkAuth();
        } else {
            loginError.textContent = 'Usuario o contraseña incorrectos';
            loginError.classList.remove('hidden');
        }
    });

    const handleLogout = () => {
        window.db.logout();
        loginForm.reset();
        checkAuth();
    };

    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    const mobileLogoutBtn = document.getElementById('logout-btn-mobile');
    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', (e) => { e.preventDefault(); handleLogout(); });

    // Lógica para Menú y Responsividad
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('active');
                sidebarOverlay.classList.toggle('active');
            } else {
                sidebar.classList.toggle('collapsed');
            }
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }

    sidebarLinks.forEach(link => {
        if (link.id === 'logout-btn-mobile' || link.classList.contains('menu-dropdown-toggle')) return;
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = e.currentTarget.dataset.view;
            if (!view) return;
            document.querySelectorAll('.sidebar-menu a').forEach(el => el.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            // Cerrar menú en móviles al seleccionar una vista
            if (window.innerWidth <= 768 && sidebar && sidebarOverlay) {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
            }
            
            loadView(view);
        });
    });

    document.querySelectorAll('.menu-dropdown-toggle').forEach(toggleBtn => {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const submenuId = toggleBtn.id.replace('toggle-', 'submenu-');
            const submenu = document.getElementById(submenuId);
            const chevron = toggleBtn.querySelector('.chevron');
            if (submenu) {
                submenu.classList.toggle('hidden');
                if (chevron) {
                    chevron.style.transform = submenu.classList.contains('hidden') ? "rotate(0deg)" : "rotate(180deg)";
                }
            }
        });
    });

    const viewsMap = {
        'dashboard': renderDashboard,
        'students': renderStudents,
        'add-student': renderAddStudent,
        'add-course': renderAddCourse,
        'preliminary': renderPreliminary,
        'grades': renderGrades,
        'general-grades': renderGeneralGrades,
        'view-grades': renderViewGrades,
        'performance': renderPerformance,
        'settings': renderSettings,
        'annual-grades': renderAnnualGrades,
        'annual-performance': renderAnnualPerformance,
        'best-averages': renderBestAverages
    };

    function loadView(viewName, params = {}) {
        const titleMap = {
            'dashboard': 'Panel Principal',
            'students': 'Gestión de Estudiantes',
            'add-student': 'Registro Individual',
            'add-course': 'Registro Masivo (Curso)',
            'preliminary': 'Rendimiento Académico (Preliminar)',
            'grades': 'Áreas de bajo rendimiento',
            'general-grades': 'Registro General de Calificaciones',
            'performance': 'Rendimiento Académico Consolidado',
            'settings': 'Configuración',
            'annual-grades': 'Calificaciones Anuales Centralizadas',
            'annual-performance': 'Rendimiento Anual Consolidado',
            'best-averages': 'Mejores Promedios Académicos'
        };

        document.getElementById('view-title').textContent = titleMap[viewName] || 'Ver Calificaciones Trimestrales';
        if (viewsMap[viewName]) {
            viewsMap[viewName](params);
        }
    }

    function sortStudents(arr) {
        const courseOrder = { "1ro": 1, "2do": 2, "3ro": 3, "4to": 4, "5to": 5, "6to": 6 };
        return arr.sort((a, b) => {
            const courseA = courseOrder[a.course] || 99;
            const courseB = courseOrder[b.course] || 99;
            if (courseA !== courseB) return courseA - courseB;

            const parallelA = a.parallel || "";
            const parallelB = b.parallel || "";
            if (parallelA !== parallelB) return parallelA.localeCompare(parallelB);

            return a.fullName.localeCompare(b.fullName);
        });
    }

    // --- DASHBOARD ---
    function renderDashboard() {
        const students = window.db.getStudents();
        const records = window.db.getRecords();

        let zeroFail = 0, oneFail = 0, twoFail = 0, threePlusFail = 0;
        const failuresByCourse = {};

        students.forEach(s => {
            const studentRecords = records.filter(r => r.studentId === s.id && (r.preliminary || (r.grade && r.grade < 51)));

            // Count unique failing areas across any trimester (or maybe total failures, prompt doesn't specify, we'll use unique areas)
            const uniqueFailedAreas = new Set(studentRecords.map(r => r.area)).size;

            if (uniqueFailedAreas === 0) zeroFail++;
            else if (uniqueFailedAreas === 1) oneFail++;
            else if (uniqueFailedAreas === 2) twoFail++;
            else threePlusFail++;

            const cName = `${s.course} "${s.parallel}"`;
            if (!failuresByCourse[cName]) failuresByCourse[cName] = { totalStudents: 0, totalFailures: 0 };
            failuresByCourse[cName].totalStudents++;
            failuresByCourse[cName].totalFailures += uniqueFailedAreas > 0 ? 1 : 0;
        });

        mainContent.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card" style="background: linear-gradient(145deg, #ffffff, #e0e7ff);">
                    <h3>Total Estudiantes</h3>
                    <p class="stat-num">${students.length}</p>
                </div>
                <div class="stat-card" style="background: linear-gradient(145deg, #ffffff, #dcfce7);">
                    <h3>Sin Áreas Reprobadas</h3>
                    <p class="stat-num" style="color: #059669;">${zeroFail}</p>
                </div>
                <div class="stat-card" style="background: linear-gradient(145deg, #ffffff, #fef9c3);">
                    <h3>1 a 2 Áreas Reprobadas</h3>
                    <p class="stat-num" style="color: #d97706;">${oneFail + twoFail}</p>
                </div>
                <div class="stat-card" style="background: linear-gradient(145deg, #ffffff, #fee2e2);">
                    <h3>Mas de 3 Áreas Reprobadas</h3>
                    <p class="stat-num" style="color: #dc2626;">${threePlusFail}</p>
                </div>
            </div>

            <div class="card">
                <h3 class="mb-1">Estudiantes con Riesgo Académico por Curso</h3>
                <div style="height: 300px; width: 100%;">
                    <canvas id="dashboardChart"></canvas>
                </div>
            </div>
        `;

        if (dashboardChartInstance) dashboardChartInstance.destroy();

        const ctx = document.getElementById('dashboardChart').getContext('2d');
        const labels = Object.keys(failuresByCourse).sort();
        const dataFails = labels.map(l => failuresByCourse[l].totalFailures);

        dashboardChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.length ? labels : ['Sin datos'],
                datasets: [{
                    label: 'Estudiantes c/ áreas reprobadas',
                    data: labels.length ? dataFails : [0],
                    backgroundColor: 'rgba(99, 102, 241, 0.7)',
                    borderColor: 'rgba(99, 102, 241, 1)',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });
    }

    // --- STUDENTS ---
    function renderStudents() {
        const students = sortStudents(window.db.getStudents());

        let html = `
            <div class="actions-bar">
                <input type="text" id="search-student" class="input flex-1" placeholder="Buscar estudiante por nombre...">
                <button id="btn-add-student" class="btn btn-secondary">
                   Registro Individual
                </button>
                <button id="btn-add-course" class="btn btn-primary ml-1">
                   Registro Masivo
                </button>
            </div>
            <div class="card">
                <table class="table" id="students-table">
                    <thead>
                        <tr>
                            <th style="width: 5%">N°</th>
                            <th style="width: 30%">Apellidos y Nombres</th>
                            <th style="width: 10%">Curso</th>
                            <th style="width: 10%">Paralelo</th>
                            <th style="width: 25%">Asesor / Observación</th>
                            <th style="width: 20%; text-align: center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (students.length === 0) {
            html += `<tr><td colspan="6" class="text-center text-muted">No hay estudiantes registrados.</td></tr>`;
        }

        let currentGroup = '';
        let listNumber = 1;
        students.forEach(s => {
            const groupCode = `${s.course}-${s.parallel}`;
            const groupName = `${s.course} "${s.parallel}"`;
            if (currentGroup !== groupCode) {
                currentGroup = groupCode;
                listNumber = 1;
                html += `
                <tr class="bg-gray-100 group-header" data-group="${groupCode}">
                    <td colspan="5" class="font-bold text-primary" style="background-color: #f1f5f9; padding: 0.5rem; vertical-align: middle;">Curso: ${groupName}</td>
                    <td style="background-color: #f1f5f9; padding: 0.5rem; text-align: right;">
                        <button class="btn btn-sm btn-secondary btn-toggle-group" data-group="${groupCode}">Mostrar Lista</button>
                    </td>
                </tr>`;
            }
            let obsText = (s.observations && s.observations.trim() !== '-' && s.observations.trim() !== '') ? s.observations : 'Ninguna';
            let obsStyle = obsText === 'Ninguna' ? 'color: #94a3b8; font-style: italic;' : 'color: #0f172a; font-weight: 500;';
            let advHtml = (s.advisorName && s.advisorName.trim() !== '') ? `<div style="font-size: 0.70rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Asesor: ${s.advisorName}</div>` : '';

            html += `
                <tr data-name="${s.fullName.toLowerCase()}" data-group="${groupCode}" class="student-row" style="display: none;">
                    <td class="text-center text-muted font-bold">${listNumber++}</td>
                    <td class="font-bold" style="padding-left: 1rem;">${s.fullName}</td>
                    <td>${s.course}</td>
                    <td>${s.parallel}</td>
                    <td>
                        ${advHtml}
                        <div style="font-size: 0.85rem; line-height: 1.2; padding-top: 2px; ${obsStyle}">${obsText}</div>
                    </td>
                    <td style="text-align: center;">
                        <button class="btn btn-sm btn-profile-student" data-id="${s.id}" style="margin-right: 4px; background-color: #0ea5e9; color: white; padding: 0.4rem; font-size: 1.1rem; border-radius: 6px;" title="Ver perfil">👤</button>
                        <button class="btn btn-sm btn-primary btn-edit-student" data-id="${s.id}" style="margin-right: 4px; padding: 0.4rem; font-size: 1.1rem; border-radius: 6px;" title="Editar">✏️</button>
                        <button class="btn btn-sm btn-danger btn-del-student" data-id="${s.id}" style="padding: 0.4rem; font-size: 1.1rem; border-radius: 6px;" title="Eliminar">🗑️</button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
        mainContent.innerHTML = html;

        document.getElementById('btn-add-student').addEventListener('click', () => loadView('add-student'));
        document.getElementById('btn-add-course').addEventListener('click', () => loadView('add-course'));

        document.querySelectorAll('.btn-profile-student').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const student = window.db.getStudentById(id);
                if (student) {
                    const records = window.db.getRecordsByStudent(id);
                    let tableRows = '';
                    let sumAverages = 0;
                    let countAverages = 0;
                    let failedAreasCount = 0;

                    ACADEMIC_AREAS.forEach(area => {
                        const r1 = records.find(r => r.area === area && r.trimester === 1);
                        const r2 = records.find(r => r.area === area && r.trimester === 2);
                        const r3 = records.find(r => r.area === area && r.trimester === 3);

                        const g1 = (r1 && r1.grade !== undefined && r1.grade !== "") ? parseInt(r1.grade) : '-';
                        const g2 = (r2 && r2.grade !== undefined && r2.grade !== "") ? parseInt(r2.grade) : '-';
                        const g3 = (r3 && r3.grade !== undefined && r3.grade !== "") ? parseInt(r3.grade) : '-';

                        let finalAdv = '-';
                        if (g1 !== '-' && g2 !== '-' && g3 !== '-') {
                            finalAdv = Math.round((g1 + g2 + g3) / 3);
                            sumAverages += finalAdv;
                            countAverages++;
                            if (finalAdv < 51) failedAreasCount++;
                        }

                        const styleG1 = (g1 !== '-' && g1 < 51) ? 'color: #dc2626; font-weight: bold;' : '';
                        const styleG2 = (g2 !== '-' && g2 < 51) ? 'color: #dc2626; font-weight: bold;' : '';
                        const styleG3 = (g3 !== '-' && g3 < 51) ? 'color: #dc2626; font-weight: bold;' : '';
                        const styleAdv = (finalAdv !== '-' && finalAdv < 51) ? 'color: #dc2626; font-weight: bold; background-color: #fef2f2;' : 'font-weight: bold; color: #0284c7; background-color: #f0f9ff;';

                        tableRows += `
                            <tr>
                                <td style="text-align: left; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 0.85rem; font-weight: 500;">${area}</td>
                                <td style="text-align: center; padding: 10px 8px; border-bottom: 1px solid #e2e8f0; ${styleG1}">${g1}</td>
                                <td style="text-align: center; padding: 10px 8px; border-bottom: 1px solid #e2e8f0; ${styleG2}">${g2}</td>
                                <td style="text-align: center; padding: 10px 8px; border-bottom: 1px solid #e2e8f0; ${styleG3}">${g3}</td>
                                <td style="text-align: center; padding: 10px 8px; border-bottom: 1px solid #e2e8f0; ${styleAdv}">${finalAdv}</td>
                            </tr>
                        `;
                    });

                    let finalGeneralAvg = countAverages > 0 ? parseFloat((sumAverages / countAverages).toFixed(2)) : 0;

                    const profileHtml = `
                        <div style="text-align: left; font-family: 'Inter', sans-serif;">
                            <div style="display: flex; flex-wrap: wrap; gap: 20px; background-color: #f8fafc; padding: 18px; border-radius: 12px; margin-bottom: 24px; border-left: 5px solid #0ea5e9; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
                                <div style="flex: 1; min-width: 250px;">
                                    <h4 style="margin: 0 0 8px 0; color: #0f172a; font-size: 1.25rem; font-weight: 700;">${student.fullName}</h4>
                                    <div style="font-size: 0.95rem; color: #475569; line-height: 1.5;">
                                        <div style="margin-bottom: 4px;"><strong>Curso:</strong> <span style="color: #1e293b; font-weight: 500;">${student.course} "${student.parallel}"</span></div>
                                        <div style="margin-bottom: 4px;"><strong>Asesor:</strong> <span style="color: #1e293b; font-weight: 500;">${student.advisorName && student.advisorName !== '' ? student.advisorName : 'No asignado'}</span></div>
                                        <div><strong>Observación:</strong> <span style="color: #64748b; font-style: italic;">${student.observations && student.observations !== '-' ? student.observations : 'Ninguna'}</span></div>
                                    </div>
                                </div>
                                <div style="display: flex; gap: 15px; align-items: stretch;">
                                    <div style="text-align: center; background: white; padding: 15px 20px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.06); min-width: 110px; display: flex; flex-direction: column; justify-content: center;">
                                        <div style="font-size: 0.70rem; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Prom. General</div>
                                        <div style="font-size: 2.2rem; font-weight: 900; color: #0ea5e9; line-height: 1;">${finalGeneralAvg > 0 ? finalGeneralAvg : '-'}</div>
                                    </div>
                                    <div style="text-align: center; background: white; padding: 15px 20px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.06); min-width: 110px; display: flex; flex-direction: column; justify-content: center;">
                                        <div style="font-size: 0.70rem; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Reprobadas</div>
                                        <div style="font-size: 2.2rem; font-weight: 900; color: ${failedAreasCount > 0 ? '#ef4444' : '#10b981'}; line-height: 1;">${failedAreasCount}</div>
                                    </div>
                                </div>
                            </div>
                            
                            <h4 style="margin: 0 0 16px 0; color: #1e293b; font-size: 1.15rem; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="color: #0ea5e9;"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                                Historial de Calificaciones
                            </h4>
                            <div style="max-height: 380px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.02);">
                                <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem;">
                                    <thead style="position: sticky; top: 0; background-color: #f8fafc; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
                                        <tr>
                                            <th style="text-align: left; padding: 12px 14px; color: #475569; border-bottom: 2px solid #cbd5e1; font-weight: 700;">Área Académica</th>
                                            <th style="text-align: center; padding: 12px 8px; color: #475569; border-bottom: 2px solid #cbd5e1; font-weight: 700;">1er Trim</th>
                                            <th style="text-align: center; padding: 12px 8px; color: #475569; border-bottom: 2px solid #cbd5e1; font-weight: 700;">2do Trim</th>
                                            <th style="text-align: center; padding: 12px 8px; color: #475569; border-bottom: 2px solid #cbd5e1; font-weight: 700;">3er Trim</th>
                                            <th style="text-align: center; padding: 12px 8px; color: #0f172a; font-weight: 800; border-bottom: 2px solid #94a3b8; background-color: #f1f5f9;">Pro. Anual</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${tableRows}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `;

                    Swal.fire({
                        title: '',
                        html: profileHtml,
                        width: '800px',
                        showCloseButton: true,
                        showConfirmButton: false,
                        customClass: {
                            popup: 'rounded-xl shadow-2xl'
                        }
                    });
                }
            });
        });

        document.querySelectorAll('.btn-edit-student').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const student = window.db.getStudentById(id);
                if (student) {
                    Swal.fire({
                        title: 'Editar Estudiante',
                        html: `
                            <div style="text-align: left;">
                                <div class="form-group" style="margin-bottom: 12px;">
                                    <label class="text-sm font-bold">Nombres y Apellidos</label>
                                    <input id="edit-fullname" class="input" value="${student.fullName}" style="width: 100%;">
                                </div>
                                <div style="display: flex; gap: 15px; margin-bottom: 12px;">
                                    <div class="form-group" style="flex: 1; margin-bottom: 0;">
                                        <label class="text-sm font-bold">Curso</label>
                                        <select id="edit-course" class="input" style="width: 100%;">
                                            ${COURSES.map(c => `<option value="${c}" ${student.course === c ? 'selected' : ''}>${c}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div class="form-group" style="flex: 1; margin-bottom: 0;">
                                        <label class="text-sm font-bold">Paralelo</label>
                                        <select id="edit-parallel" class="input" style="width: 100%;">
                                            ${PARALLELS.map(p => `<option value="${p}" ${student.parallel === p ? 'selected' : ''}>${p}</option>`).join('')}
                                        </select>
                                    </div>
                                </div>
                                <div class="form-group" style="margin-bottom: 12px;">
                                    <label class="text-sm font-bold">Asesor</label>
                                    <input id="edit-advisor" class="input" value="${student.advisorName || ''}" style="width: 100%;">
                                </div>
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label class="text-sm font-bold">Observación</label>
                                    <input id="edit-observations" class="input" value="${student.observations && student.observations !== '-' ? student.observations : ''}" placeholder="Ej. TDAH, TDA, DISLEXIA, Retirado, Nuevo, etc." style="width: 100%;">
                                </div>
                            </div>
                        `,
                        showCancelButton: true,
                        confirmButtonText: 'Guardar cambios',
                        cancelButtonText: 'Cancelar',
                        preConfirm: () => {
                            const fullName = document.getElementById('edit-fullname').value.trim();
                            if (!fullName) {
                                Swal.showValidationMessage('El nombre es requerido');
                                return false;
                            }
                            return {
                                fullName: fullName,
                                course: document.getElementById('edit-course').value,
                                parallel: document.getElementById('edit-parallel').value,
                                advisorName: document.getElementById('edit-advisor').value.trim(),
                                observations: document.getElementById('edit-observations').value.trim() || '-'
                            }
                        }
                    }).then((result) => {
                        if (result.isConfirmed) {
                            try {
                                window.db.updateStudent(id, result.value);
                                Swal.fire('Guardado', 'Los datos han sido actualizados con seguridad.', 'success').then(() => renderStudents());
                            } catch(e) {
                                Swal.fire('Acción Denegada', e.message, 'error').then(() => btn.click());
                            }
                        }
                    });
                }
            });
        });

        document.querySelectorAll('.btn-del-student').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                Swal.fire({
                    title: '¿Eliminar estudiante?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, eliminar'
                }).then((t) => {
                    if (t.isConfirmed) {
                        window.db.deleteStudent(id);
                        renderStudents();
                    }
                });
            });
        });

        document.getElementById('search-student').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#students-table tbody tr.student-row');
            const headers = document.querySelectorAll('#students-table tbody tr.group-header');

            if (term === '') {
                rows.forEach(r => r.style.display = 'none');
                headers.forEach(h => {
                    h.style.display = '';
                    const btn = h.querySelector('.btn-toggle-group');
                    if (btn) btn.textContent = 'Mostrar Lista';
                });
                return;
            }

            headers.forEach(h => h.style.display = 'none');

            rows.forEach(row => {
                const isMatch = row.dataset.name.includes(term);
                row.style.display = isMatch ? '' : 'none';
                if (isMatch) {
                    const group = row.dataset.group;
                    const header = document.querySelector(`#students-table tbody tr.group-header[data-group="${group}"]`);
                    if (header) {
                        header.style.display = '';
                        const btn = header.querySelector('.btn-toggle-group');
                        if (btn) btn.textContent = 'Ocultar Lista';
                    }
                }
            });
        });

        document.querySelectorAll('.btn-toggle-group').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const group = e.target.dataset.group;
                const rows = document.querySelectorAll(`#students-table tbody tr.student-row[data-group="${group}"]`);
                const isShowing = e.target.textContent === 'Ocultar Lista';

                rows.forEach(r => {
                    r.style.display = isShowing ? 'none' : '';
                });

                e.target.textContent = isShowing ? 'Mostrar Lista' : 'Ocultar Lista';
            });
        });
    }

    function renderAddStudent() {
        mainContent.innerHTML = `
            <div class="card max-w-2xl mx-auto">
                <form id="form-single">
                    <div class="form-group">
                        <label>Apellidos y Nombres</label>
                        <input type="text" name="fullName" class="input" required>
                    </div>
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label>Curso</label>
                            <select name="course" class="input" required>
                                <option value="" disabled selected>Seleccione</option>
                                ${COURSES.map(c => `<option value="${c}">${c}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Paralelo</label>
                            <select name="parallel" class="input" required>
                                <option value="" disabled selected>Seleccione</option>
                                ${PARALLELS.map(p => `<option value="${p}">${p}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Observación</label>
                        <input type="text" name="observations" class="input">
                    </div>
                    <div class="flex justify-end mt-1">
                        <button type="button" class="btn btn-gray mr-1" onclick="document.querySelector('[data-view=students]').click()">Cancelar</button>
                        <button type="submit" class="btn btn-secondary">Registrar Estudiante</button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('form-single').addEventListener('submit', (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            try {
                window.db.addStudent({
                    fullName: fd.get('fullName').trim(),
                    course: fd.get('course'),
                    parallel: fd.get('parallel'),
                    observations: fd.get('observations') || '-'
                });
                Swal.fire('Éxito', 'Estudiante registrado de forma segura', 'success').then(() => loadView('students'));
            } catch(e) {
                Swal.fire('Error de Seguridad', e.message, 'error');
            }
        });
    }

    function renderAddCourse() {
        mainContent.innerHTML = `
            <div class="card max-w-2xl mx-auto">
                <form id="form-mass">
                    <div class="grid grid-2">
                        <div class="form-group">
                            <label>Curso</label>
                            <select name="course" class="input" required>
                                <option value="" disabled selected>Seleccione</option>
                                ${COURSES.map(c => `<option value="${c}">${c}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Paralelo</label>
                            <select name="parallel" class="input" required>
                                <option value="" disabled selected>Seleccione</option>
                                ${PARALLELS.map(p => `<option value="${p}">${p}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Nombre del Asesor de Curso</label>
                        <input type="text" name="advisorName" class="input" required>
                    </div>
                    <div class="form-group">
                        <label>Lista de Estudiantes</label>
                        <textarea name="studentsList" class="input" rows="10" placeholder="Un estudiante por línea..." required></textarea>
                    </div>
                    <div class="flex justify-end mt-1">
                        <button type="button" class="btn btn-gray mr-1" onclick="document.querySelector('[data-view=students]').click()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Registrar Lista</button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('form-mass').addEventListener('submit', (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const course = fd.get('course');
            const parallel = fd.get('parallel');
            const advisorName = fd.get('advisorName').trim();
            const list = fd.get('studentsList').split(/\r?\n/).filter(l => l.trim().length > 0);

            try {
                list.forEach(name => {
                    window.db.addStudent({ fullName: name.trim(), course, parallel, advisorName, observations: '-' });
                });
                Swal.fire('Éxito', `Se registraron ${list.length} estudiantes correctamente.`, 'success').then(() => loadView('students'));
            } catch(e) {
                Swal.fire('Error de Seguridad', e.message, 'error');
            }
        });
    }

    // --- PRELIMINARY (X MARKING) ---
    function renderPreliminary() {
        mainContent.innerHTML = `
            <div class="card mb-2">
                <div class="grid grid-3 items-end">
                    <div class="form-group mb-0">
                        <label>Área Académica</label>
                        <select id="sel-area" class="input">
                            <option value="">Seleccione Área</option>
                            ${ACADEMIC_AREAS.map(a => `<option value="${a}">${a}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group mb-0">
                        <label>Curso</label>
                        <select id="sel-course" class="input">
                            <option value="">Seleccione Curso</option>
                            ${COURSES.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group mb-0">
                        <label>Paralelo</label>
                        <select id="sel-parallel" class="input">
                            <option value="">Seleccione Paralelo</option>
                            ${PARALLELS.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="mt-1">
                    <button class="btn btn-primary" id="btn-load-preliminary" style="width: 100%;">Cargar Lista</button>
                </div>
            </div>
            <div id="preliminary-container"></div>
        `;

        document.getElementById('btn-load-preliminary').addEventListener('click', () => {
            const area = document.getElementById('sel-area').value;
            const course = document.getElementById('sel-course').value;
            const parallel = document.getElementById('sel-parallel').value;

            if (!area || !course || !parallel) return Swal.fire('Error', 'Seleccione área, curso y paralelo', 'error');

            const allStudents = window.db.getStudents();
            const students = sortStudents(allStudents.filter(s => s.course === course && s.parallel === parallel));
            const prelims = window.db.getPreliminaries();

            if (students.length === 0) {
                document.getElementById('preliminary-container').innerHTML = `<div class="card text-center text-muted">No hay estudiantes en este curso.</div>`;
                return;
            }

            let html = `
                <div class="card">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 10px;">
                        <h3 class="text-primary" style="margin: 0;">Rendimiento Preliminar - ${course} "${parallel}"</h3>
                        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 8px 16px; border-radius: 8px; font-weight: 800; font-size: 1.1rem; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3); text-align: right;">
                            <span style="opacity: 0.85; font-size: 0.75rem; display: block; line-height: 1; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px;">Área Seleccionada</span>
                            ${area}
                        </div>
                    </div>
                    <p class="text-sm text-muted mb-1">Marque con "X" a los estudiantes que presentan bajo rendimiento en el trimestre correspondiente. <span class="badge badge-warning">Auto-guardado independiente</span></p>
                    <table class="table">
                        <thead>
                            <tr>
                                <th style="width: 5%">N°</th>
                                <th style="width: 35%">Estudiante</th>
                                <th style="width: 20%; text-align: center;">1er Trimestre</th>
                                <th style="width: 20%; text-align: center;">2do Trimestre</th>
                                <th style="width: 20%; text-align: center;">3er Trimestre</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            students.forEach((s, idx) => {
                const getRec = (trim) => prelims.find(p => p.studentId === s.id && p.area === area && p.trimester === trim);
                const r1 = getRec(1) || {};
                const r2 = getRec(2) || {};
                const r3 = getRec(3) || {};

                html += `
                    <tr>
                        <td>${idx + 1}</td>
                        <td class="font-bold">${s.fullName}</td>
                        <td class="text-center">
                            <input type="checkbox" class="cb-prelim" data-id="${s.id}" data-trim="1" style="transform: scale(1.5)" ${r1.preliminary ? 'checked' : ''}>
                        </td>
                        <td class="text-center">
                            <input type="checkbox" class="cb-prelim" data-id="${s.id}" data-trim="2" style="transform: scale(1.5)" ${r2.preliminary ? 'checked' : ''}>
                        </td>
                        <td class="text-center">
                            <input type="checkbox" class="cb-prelim" data-id="${s.id}" data-trim="3" style="transform: scale(1.5)" ${r3.preliminary ? 'checked' : ''}>
                        </td>
                    </tr>
                `;
            });

            html += `</tbody></table></div>`;
            document.getElementById('preliminary-container').innerHTML = html;

            document.querySelectorAll('.cb-prelim').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const studentId = e.target.dataset.id;
                    const trim = e.target.dataset.trim;
                    const isChecked = e.target.checked;

                    window.db.upsertPreliminary({
                        studentId: parseInt(studentId),
                        area: area,
                        trimester: parseInt(trim),
                        preliminary: isChecked
                    });
                });
            });
        });
    }

    // --- GRADES ---
    function renderGrades() {
        mainContent.innerHTML = `
            <div class="card mb-2">
                <div class="grid grid-3 items-end">
                    <div class="form-group mb-0">
                        <label>Curso</label>
                        <select id="grade-course" class="input">
                            <option value="">Seleccione Curso</option>
                            ${COURSES.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group mb-0">
                        <label>Paralelo</label>
                        <select id="grade-parallel" class="input">
                            <option value="">Seleccione Paralelo</option>
                            ${PARALLELS.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group mb-0">
                        <label>Trimestre</label>
                        <select id="grade-trimester" class="input">
                            <option value="1" selected>1er Trimestre</option>
                            <option value="2">2do Trimestre</option>
                            <option value="3">3er Trimestre</option>
                        </select>
                    </div>
                </div>
                <div class="mt-1">
                    <button class="btn btn-secondary" id="btn-load-grades" style="width: 100%;">Visualizar Gráfica del Curso</button>
                </div>
            </div>
            <div id="grades-container"></div>
        `;

        document.getElementById('btn-load-grades').addEventListener('click', () => {
            const course = document.getElementById('grade-course').value;
            const parallel = document.getElementById('grade-parallel').value;
            const trimester = document.getElementById('grade-trimester').value;

            if (!course || !parallel || !trimester) return Swal.fire('Error', 'Seleccione curso, paralelo y trimestre', 'error');

            const students = sortStudents(window.db.getStudents().filter(s => s.course === course && s.parallel === parallel));
            const records = window.db.getRecords();
            const prelims = window.db.getPreliminaries();

            if (students.length === 0) {
                document.getElementById('grades-container').innerHTML = `<div class="card text-center">No hay alumnos.</div>`;
                return;
            }

            const AREA_COLORS = {
                "Comunicación y Lenguajes": "#ef4444",
                "Lengua Extranjera": "#3b82f6",
                "Ciencias Sociales": "#22c55e",
                "Música": "#a855f7",
                "Artes Plásticas": "#f97316",
                "Educación Física": "#8b0174ff",
                "Matemáticas": "#14b8a6",
                "Tecnología": "#6366f1",
                "Física": "#06b6d4",
                "Química": "#ec4899",
                "Ciencias Naturales Biología": "#10b981",
                "Filosofía / Psicología": "#f43f5e",
                "Valores y Religiones": "#f59e0b"
            };

            let html = `
                <style>
                    .area-block-hover {
                        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
                        z-index: 1;
                        cursor: crosshair;
                    }
                    .area-block-hover:hover {
                        transform: scale(1.15);
                        box-shadow: 0 6px 12px rgba(0,0,0,0.3) !important;
                        z-index: 10;
                    }
                    .trim-highlight {
                        color: #ffffff;
                        background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
                        padding: 4px 12px;
                        border-radius: 8px;
                        font-size: 1.1em;
                        font-weight: 900;
                        box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
                        display: inline-block;
                        margin-left: 10px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                </style>
                <div class="card" style="overflow-x: auto;">
                    <h3 class="mb-1 text-secondary" style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px;">
                        <span>Áreas de Bajo Rendimiento Reportadas - ${course} "${parallel}"</span>
                        <span class="trim-highlight">${trimester}° Trimestre</span>
                    </h3>
                    <p class="text-sm text-muted mb-1">Las áreas con bajo rendimiento o marcadas preliminarmente en riesgo se visualizan interactivamente mediante bloques proporcionales. Pase el cursor sobre cada área para enfocarla.</p>
                    <table class="table" style="width: 100%; min-width: 100%; table-layout: fixed;">
                        <thead>
                            <tr>
                                <th style="width: 5%">N°</th>
                                <th style="width: 20%">Estudiante</th>
                                <th style="width: 65%">Gráfica de Áreas Reportadas</th>
                                <th style="width: 10%" class="text-center">Total</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            students.forEach((s, idx) => {
                const sRecords = records.filter(r => r.studentId === s.id && r.trimester === parseInt(trimester) && (r.grade !== undefined && r.grade !== "" && r.grade < 51));
                const sPrelims = prelims.filter(p => p.studentId === s.id && p.trimester === parseInt(trimester) && p.preliminary === true);

                let combinedAreas = Array.from(new Set([...sRecords.map(r => r.area), ...sPrelims.map(p => p.area)]));
                combinedAreas.sort((a, b) => ACADEMIC_AREAS.indexOf(a) - ACADEMIC_AREAS.indexOf(b));

                let barsHtml = `<div style="display: flex; gap: 4px; flex-wrap: wrap; min-height: 48px; border-left: 2px solid #cbd5e1; padding-left: 8px;">`;

                if (combinedAreas.length === 0) {
                    barsHtml += `<span class="text-muted text-xs" style="display: flex; align-items: center; padding-left: 8px;">No registrado o Sin áreas reprobadas</span>`;
                } else {
                    combinedAreas.forEach(areaName => {
                        const bg = AREA_COLORS[areaName] || '#64748b';
                        barsHtml += `
                            <div class="area-block-hover" style="flex: 0 0 90px; width: 90px; background-color: ${bg}; color: white; padding: 6px 4px; border-radius: 6px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; position: relative; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
                                <div style="font-size: 0.70rem; font-weight: bold; line-height: 1.15; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-shadow: 0 1px 1px rgba(0,0,0,0.4);" title="${areaName}">${areaName}</div>
                            </div>
                        `;
                    });
                }
                barsHtml += `</div>`;

                html += `
                    <tr>
                        <td class="text-center" style="vertical-align: middle;">${idx + 1}</td>
                        <td class="font-bold" style="vertical-align: middle; font-size: 1.05rem;">${s.fullName}</td>
                        <td style="vertical-align: middle; padding: 6px 12px;">${barsHtml}</td>
                        <td class="text-center font-bold" style="vertical-align: middle;">
                            <span class="badge ${combinedAreas.length > 2 ? 'badge-danger' : (combinedAreas.length > 0 ? 'badge-warning' : 'badge-success')}" style="font-size: 1.3rem; padding: 6px 12px; border-radius: 8px;">${combinedAreas.length}</span>
                        </td>
                    </tr>
                `;
            });

            html += `</tbody></table></div>`;
            document.getElementById('grades-container').innerHTML = html;


        });
    }

    // --- VER CALIFICACIONES (TRIMESTRAL) ---
    function renderViewGrades() {
        mainContent.innerHTML = `
            <div class="card mb-2">
                <div class="grid grid-3 items-end">
                    <div class="form-group mb-0">
                        <label>Curso</label>
                        <select id="vg-course" class="input">
                            <option value="">Seleccione Curso</option>
                            ${COURSES.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group mb-0">
                        <label>Paralelo</label>
                        <select id="vg-parallel" class="input">
                            <option value="">Seleccione Paralelo</option>
                            ${PARALLELS.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group mb-0">
                        <label>Trimestre</label>
                        <select id="vg-trimester" class="input">
                            <option value="1" selected>1er Trimestre</option>
                            <option value="2">2do Trimestre</option>
                            <option value="3">3er Trimestre</option>
                        </select>
                    </div>
                </div>
                <div class="mt-1">
                    <button class="btn btn-primary" id="btn-load-vg" style="width: 100%;">Cargar Cuadro de Calificaciones</button>
                </div>
            </div>
            <div id="vg-container"></div>
        `;

        document.getElementById('btn-load-vg').addEventListener('click', () => {
            const course = document.getElementById('vg-course').value;
            const parallel = document.getElementById('vg-parallel').value;
            const trimester = document.getElementById('vg-trimester').value;

            if (!course || !parallel || !trimester) return Swal.fire('Error', 'Seleccione curso, paralelo y trimestre', 'error');

            const allStudents = window.db.getStudents();
            const students = sortStudents(allStudents.filter(s => s.course === course && s.parallel === parallel));
            const records = window.db.getRecords();

            if (students.length === 0) {
                document.getElementById('vg-container').innerHTML = `<div class="card text-center text-muted">No hay estudiantes registrados.</div>`;
                return;
            }

            let html = `
                <style>
                    .table-vg th.vertical-text {
                        writing-mode: vertical-rl;
                        transform: rotate(180deg);
                        white-space: nowrap;
                        vertical-align: bottom;
                        max-height: 250px;
                        height: 220px;
                        font-size: 0.75rem;
                        padding: 10px 4px !important;
                        text-align: left;
                    }
                    .table-vg td, .table-vg th {
                        border: 1px solid #e2e8f0;
                        padding: 6px 4px;
                    }
                    .table-vg th.header-group {
                        background-color: #f1f5f9;
                        text-align: center;
                        letter-spacing: 1px;
                        font-size: 0.8rem;
                        font-weight: 700;
                    }
                </style>
                <div class="card" style="overflow-x: auto; padding: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 class="text-primary" style="margin: 0;">Cuadro Centralizador de Calificaciones - ${course} "${parallel}" | ${trimester}° Trimestre</h3>
                        <button class="btn btn-warning btn-sm" id="btn-top-students"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg> Estudiantes Sobresalientes</button>
                    </div>
                    <table class="table table-vg" style="width: 100%; min-width: 1000px; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th rowspan="2" style="width: 3%; text-align: center;">N°</th>
                                <th rowspan="2" style="width: 25%; font-size: 0.85rem;">APELLIDOS Y NOMBRES</th>
                                <th colspan="${ACADEMIC_AREAS.length}" class="header-group">ÁREAS DE SABERES Y CONOCIMIENTOS</th>
                                <th rowspan="2" class="vertical-text" style="font-weight: bold; background-color: #e0f2fe; text-align: center;">PROMEDIO DEL TRIMESTRE</th>
                                <th rowspan="2" class="vertical-text" style="font-weight: bold; background-color: #fef2f2; text-align: center;">ÁREAS REPROBADAS</th>
                            </tr>
                            <tr>
                                ${ACADEMIC_AREAS.map(a => `<th class="vertical-text">${a}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
            `;

            let studentsWithAverages = [];

            students.forEach((s, idx) => {
                let sHtml = `<tr>
                                <td class="text-center">${idx + 1}</td>
                                <td class="font-bold whitespace-nowrap" style="font-size: 0.85rem;">${s.fullName}</td>`;

                let totalSuma = 0;
                let countAreas = 0;
                let areasReprobadas = 0;

                ACADEMIC_AREAS.forEach(area => {
                    const rec = records.find(r => r.studentId === s.id && r.area === area && r.trimester === parseInt(trimester));
                    const grade = (rec && rec.grade !== undefined && rec.grade !== "") ? parseInt(rec.grade) : "";

                    if (grade !== "") {
                        totalSuma += grade;
                        countAreas++;
                        if (grade < 51) areasReprobadas++;
                    }

                    const colorStyle = (grade !== "" && grade < 51) ? "color: red; font-weight: bold;" : "";
                    sHtml += `<td class="text-center" style="${colorStyle}">${grade !== "" ? grade : '-'}</td>`;
                });

                let promGeneralNum = countAreas > 0 ? Math.round(totalSuma / countAreas) : 0;
                let promGeneral = promGeneralNum > 0 ? promGeneralNum : "-";

                studentsWithAverages.push({ name: s.fullName, average: promGeneralNum });

                sHtml += `<td class="text-center font-bold" style="background-color: #f0f9ff; color: #0284c7;">${promGeneral}</td>
                        <td class="text-center font-bold" style="background-color: #fef2f2; color: ${areasReprobadas > 0 ? '#dc2626' : '#94a3b8'};">${areasReprobadas > 0 ? areasReprobadas : ''}</td>
                    </tr>`;

                html += sHtml;
            });

            html += `</tbody></table></div>`;
            document.getElementById('vg-container').innerHTML = html;

            document.getElementById('btn-top-students').addEventListener('click', () => {
                const top5 = studentsWithAverages
                    .filter(s => s.average > 0)
                    .sort((a, b) => b.average - a.average)
                    .slice(0, 5);

                if (top5.length === 0) {
                    return Swal.fire('Sin Datos', 'No existen calificaciones suficientes para calcular el listado de sobresalientes.', 'info');
                }

                let listHtml = `<div style="display: flex; flex-direction: column; gap: 12px; margin-top: 20px; text-align: left;">`;
                top5.forEach((student, index) => {
                    const bgColors = ['rgba(251, 191, 36, 0.15)', 'rgba(148, 163, 184, 0.15)', 'rgba(180, 83, 9, 0.15)', 'rgba(241, 245, 249, 1)', 'rgba(248, 250, 252, 1)'];
                    const borderColors = ['#fbbf24', '#cbd5e1', '#b45309', '#e2e8f0', '#e2e8f0'];
                    const fontColors = ['#d97706', '#475569', '#92400e', '#334155', '#475569'];
                    const icons = index === 0 ? '🏆' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : '🎖️'));

                    const bg = bgColors[index] || bgColors[4];
                    const border = borderColors[index] || borderColors[4];
                    const fontColor = fontColors[index] || fontColors[4];

                    listHtml += `
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; background: ${bg}; border-left: 5px solid ${border}; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: transform 0.2s;">
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <span style="font-size: 1.8rem; line-height: 1;">${icons}</span>
                                <div style="display: flex; flex-direction: column;">
                                    <span style="font-weight: 700; font-size: 1.05rem; color: #0f172a;">${student.name}</span>
                                    <span style="font-size: 0.80rem; font-weight: 600; color: ${fontColor}; text-transform: uppercase; letter-spacing: 0.5px;">Top ${index + 1}</span>
                                </div>
                            </div>
                            <div style="display: flex; align-items: baseline; gap: 4px; background: white; padding: 6px 14px; border-radius: 9999px; font-weight: 800; color: ${fontColor}; font-size: 1.25rem; border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                                ${student.average} <span style="font-size: 0.70rem; font-weight: 700; opacity: 0.7; letter-spacing: 0.5px;">Pts</span>
                            </div>
                        </div>
                    `;
                });
                listHtml += `</div>`;

                Swal.fire({
                    title: `<span style="font-size: 1.6rem; color: #1e293b; font-weight: 700;">Cuadro de Honor</span>`,
                    html: `<p style="color: #64748b; font-size: 1rem; margin-top: -10px;">¡Felicitaciones a los promedios más altos del ${trimester}° Trimestre!</p>${listHtml}`,
                    icon: 'none', // Remove the default big star since we have nice emojis
                    width: '500px',
                    confirmButtonText: 'Cerrar',
                    confirmButtonColor: '#6366f1',
                    customClass: {
                        popup: 'rounded-lg' // Try to inject softer curves
                    }
                });
            });
        });
    }

    // --- PERFORMANCE DASHBOARD ---
    function renderPerformance() {
        mainContent.innerHTML = `
            <div class="card mb-2">
                <div class="grid grid-3 items-end">
                    <div class="form-group mb-0">
                        <label>Curso</label>
                        <select id="perf-course" class="input">
                            <option value="">Seleccione Curso</option>
                            ${COURSES.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group mb-0">
                        <label>Paralelo</label>
                        <select id="perf-parallel" class="input">
                            <option value="">Seleccione Paralelo</option>
                            ${PARALLELS.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group mb-0">
                        <label>Trimestre</label>
                        <select id="perf-trimester" class="input">
                            <option value="1">1er Trimestre</option>
                            <option value="2">2do Trimestre</option>
                            <option value="3">3er Trimestre</option>
                        </select>
                    </div>
                </div>
                <div class="mt-1">
                    <button class="btn btn-primary" id="btn-load-perf" style="width: 100%;">Generar Dashboard de Rendimiento</button>
                </div>
            </div>
            <div id="perf-container"></div>
        `;

        document.getElementById('btn-load-perf').addEventListener('click', () => {
            const course = document.getElementById('perf-course').value;
            const parallel = document.getElementById('perf-parallel').value;
            const trimester = document.getElementById('perf-trimester').value;

            if (!course || !parallel || !trimester) return Swal.fire('Error', 'Seleccione curso, paralelo y trimestre', 'error');

            const students = sortStudents(window.db.getStudents().filter(s => s.course === course && s.parallel === parallel));
            const records = window.db.getRecords();

            if (students.length === 0) {
                document.getElementById('perf-container').innerHTML = `<div class="card text-center">No hay alumnos en el curso.</div>`;
                return;
            }

            const AREA_COLORS = {
                "Comunicación y Lenguajes": "#ef4444",
                "Lengua Extranjera": "#3b82f6",
                "Ciencias Sociales": "#22c55e",
                "Música": "#a855f7",
                "Artes Plásticas": "#f97316",
                "Educación Física": "#017732ff",
                "Matemáticas": "#14b8a6",
                "Tecnología": "#6366f1",
                "Física": "#06b6d4",
                "Química": "#ec4899",
                "Ciencias Naturales Biología": "#10b981",
                "Filosofía / Psicología": "#f43f5e",
                "Valores y Religiones": "#f59e0b"
            };

            let html = `
                <style>
                    .area-block-hover {
                        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
                        z-index: 1;
                        cursor: crosshair;
                    }
                    .area-block-hover:hover {
                        transform: scale(1.15);
                        box-shadow: 0 6px 12px rgba(0,0,0,0.3) !important;
                        z-index: 10;
                    }
                    .trim-highlight {
                        color: #ffffff;
                        background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
                        padding: 4px 12px;
                        border-radius: 8px;
                        font-size: 1.1em;
                        font-weight: 900;
                        box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
                        display: inline-block;
                        margin-left: 10px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                </style>
                <div class="card" style="overflow-x: auto;">
                    <h3 class="mb-1 text-secondary" style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px;">
                        <span>Rendimiento Estudiantil (Notas < 51) - ${course} "${parallel}"</span>
                        <span class="trim-highlight">${trimester}° Trimestre</span>
                    </h3>
                    <p class="text-sm text-muted mb-1">Este análisis identifica de manera automática las calificaciones ya consolidadas que indican un bajo rendimiento. Pase el cursor para enfocar la materia.</p>
                    <table class="table" style="width: 100%; min-width: 100%; table-layout: fixed;">
                        <thead>
                            <tr>
                                <th style="width: 5%">N°</th>
                                <th style="width: 20%">Estudiante</th>
                                <th style="width: 65%">Áreas Evaluadas en Bajo Rendimiento</th>
                                <th style="width: 10%" class="text-center">Total</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            students.forEach((s, idx) => {
                const sRecords = records.filter(r => r.studentId === s.id && r.trimester === parseInt(trimester) && (r.grade !== undefined && r.grade !== "" && r.grade < 51));

                sRecords.sort((a, b) => ACADEMIC_AREAS.indexOf(a.area) - ACADEMIC_AREAS.indexOf(b.area));

                let barsHtml = `<div style="display: flex; gap: 6px; flex-wrap: wrap; min-height: 48px; border-left: 2px solid #cbd5e1; padding-left: 8px; white-space: normal;">`;

                if (sRecords.length === 0) {
                    barsHtml += `<span class="text-muted text-xs" style="display: flex; align-items: center; padding-left: 8px;">Sin notas reprobadas en este trimestre</span>`;
                } else {
                    sRecords.forEach(rec => {
                        const bg = AREA_COLORS[rec.area] || '#64748b';
                        barsHtml += `
                            <div class="area-block-hover" style="flex: 0 0 90px; width: 90px; background-color: ${bg}; color: white; padding: 6px 4px; border-radius: 6px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; position: relative; box-shadow: 0 2px 4px rgba(0,0,0,0.15); white-space: normal; overflow: hidden;">
                                <div style="font-size: 0.65rem; font-weight: bold; line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-shadow: 0 1px 1px rgba(0,0,0,0.4); word-break: break-word; width: 100%; white-space: pre-wrap;" title="${rec.area}">${rec.area}</div>
                                <div style="font-size: 1.1rem; font-weight: 900; background: rgba(0,0,0,0.25); border-radius: 4px; padding: 1px 12px; margin-top: 4px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.3);">${rec.grade}</div>
                            </div>
                        `;
                    });
                }
                barsHtml += `</div>`;

                html += `
                    <tr>
                        <td class="text-center" style="vertical-align: middle;">${idx + 1}</td>
                        <td class="font-bold" style="vertical-align: middle; font-size: 1.05rem;">${s.fullName}</td>
                        <td style="vertical-align: middle; padding: 6px 12px;">${barsHtml}</td>
                        <td class="text-center font-bold" style="vertical-align: middle;">
                            <span class="badge ${sRecords.length > 2 ? 'badge-danger' : (sRecords.length > 0 ? 'badge-warning' : 'badge-success')}" style="font-size: 1.3rem; padding: 6px 12px; border-radius: 8px;">${sRecords.length}</span>
                        </td>
                    </tr>
                `;
            });

            html += `</tbody></table></div>`;
            document.getElementById('perf-container').innerHTML = html;
        });
    }

    // --- GENERAL GRADES ---
    function renderGeneralGrades() {
        mainContent.innerHTML = `
            <div class="card mb-2">
                <div class="grid grid-3 items-end">
                    <div class="form-group mb-0">
                        <label>Área Académica</label>
                        <select id="gg-area" class="input">
                            <option value="">Seleccione Área</option>
                            ${ACADEMIC_AREAS.map(a => `<option value="${a}">${a}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group mb-0">
                        <label>Curso</label>
                        <select id="gg-course" class="input">
                            <option value="">Seleccione Curso</option>
                            ${COURSES.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group mb-0">
                        <label>Paralelo</label>
                        <select id="gg-parallel" class="input">
                            <option value="">Seleccione Paralelo</option>
                            ${PARALLELS.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="mt-1">
                    <button class="btn btn-purple" id="btn-load-gg" style="width: 100%;">Cargar Registro General</button>
                </div>
            </div>
            <div id="gg-container"></div>
        `;

        document.getElementById('btn-load-gg').addEventListener('click', () => {
            const area = document.getElementById('gg-area').value;
            const course = document.getElementById('gg-course').value;
            const parallel = document.getElementById('gg-parallel').value;

            if (!area || !course || !parallel) return Swal.fire('Error', 'Seleccione área, curso y paralelo', 'error');

            const students = sortStudents(window.db.getStudents().filter(s => s.course === course && s.parallel === parallel));
            const records = window.db.getRecords();

            if (students.length === 0) {
                document.getElementById('gg-container').innerHTML = `<div class="card text-center">No hay alumnos.</div>`;
                return;
            }

            let html = `
                <div class="card">
                    <div style="margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 15px; margin-bottom: 10px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <h3 style="color: #1e293b; margin: 0; padding-bottom: 2px; border-bottom: 2px solid #8b5cf6;">Registro General de Calificaciones</h3>
                                <span style="font-size: 1rem; color: #475569; margin-left: 10px;">Curso: <strong>${course}</strong></span>
                                <span style="font-size: 1rem; color: #475569; margin-left: 5px;">Paralelo: <strong>"${parallel}"</strong></span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 15px; flex-grow: 1; justify-content: flex-end;">
                                <span style="background-color: #8b5cf6; color: white; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 0.95em; box-shadow: 0 4px 6px rgba(139, 92, 246, 0.3); border: 1px solid #7c3aed;">
                                    ${area}
                                </span>
                                <button id="btn-save-gg" class="btn btn-secondary flex items-center justify-center gap-1" style="font-size: 1.05rem; padding: 8px 15px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.25); min-width: max-content;">
                                    <svg width="20" height="20" fill="none" class="mr-1" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                                   Guardar 
                                </button>
                            </div>
                        </div>
                        <p class="text-sm text-muted mb-0 mt-1">Permite registrar notas completas de todos los estudiantes. Puedes <strong>pegar calificaciones directamente desde Excel</strong> seleccionando la primera celda.</p>
                    </div>
                    <table class="table">
                        <thead>
                            <tr>
                                <th style="width: 5%">N°</th>
                                <th style="width: 35%">Estudiante</th>
                                <th style="width: 15%; text-align: center;">1er Trim.</th>
                                <th style="width: 15%; text-align: center;">2do Trim.</th>
                                <th style="width: 15%; text-align: center;">3er Trim.</th>
                                <th style="width: 15%; text-align: center;">Prom. Final</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            students.forEach((s, i) => {
                const sRecords = records.filter(r => r.studentId === s.id && r.area === area);
                const r1 = sRecords.find(r => r.trimester === 1) || {};
                const r2 = sRecords.find(r => r.trimester === 2) || {};
                const r3 = sRecords.find(r => r.trimester === 3) || {};

                const getGradeInput = (trim, rObj) => {
                    const gradeVal = (rObj.grade !== undefined && rObj.grade !== "") ? rObj.grade : "";
                    const warningStyle = gradeVal !== "" && gradeVal < 51 ? "border-color: #dc2626; color: #dc2626; font-weight: bold;" : "";
                    return `<input type="number" class="input input-grade-gg" data-row-index="${i}" data-sid="${s.id}" data-trim="${trim}" value="${gradeVal}" style="${warningStyle} text-align: center; padding: 4px; border-radius: 4px; width: 60px;" min="1" max="100">`;
                };

                let initAvg = "-";
                if (r1.grade && r2.grade && r3.grade) {
                    initAvg = Math.round((parseInt(r1.grade) + parseInt(r2.grade) + parseInt(r3.grade)) / 3);
                }
                const avgStyle = initAvg !== "-" && initAvg < 51 ? "color: #dc2626;" : "color: #4F46E5;";

                html += `
                    <tr>
                        <td>${i + 1}</td>
                        <td class="font-bold">${s.fullName}</td>
                        <td class="text-center">${getGradeInput(1, r1)}</td>
                        <td class="text-center">${getGradeInput(2, r2)}</td>
                        <td class="text-center">${getGradeInput(3, r3)}</td>
                        <td class="text-center"><span id="avg-${s.id}" class="avg-label" style="font-size: 1.1rem; font-weight: bold; ${avgStyle}">${initAvg}</span></td>
                    </tr>
                `;
            });

            html += `</tbody></table>
            <div class="flex justify-end mt-2" style="gap: 12px;">
                <button id="btn-print-gg" class="btn btn-primary" style="background-color: #0284c7; border-color: #0284c7; display: flex; align-items: center; gap: 8px;">
                    <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                    Imprimir Calificaciones
                </button>
            </div>
            </div>`;
            document.getElementById('gg-container').innerHTML = html;

            const updateAverageForStudent = (sid) => {
                const stdInputs = document.querySelectorAll(`.input-grade-gg[data-sid="${sid}"]`);
                let total = 0;
                let count = 0;
                stdInputs.forEach(inp => {
                    const val = parseInt(inp.value);
                    if (!isNaN(val) && inp.value !== "") { total += val; count++; }
                });
                const avgSpan = document.getElementById(`avg-${sid}`);
                if (avgSpan) {
                    if (count === 3) {
                        const avg = Math.round(total / 3);
                        avgSpan.textContent = avg;
                        avgSpan.style.color = avg < 51 ? "#dc2626" : "#4F46E5";
                    } else {
                        avgSpan.textContent = "-";
                        avgSpan.style.color = "#4F46E5";
                    }
                }
            };

            const inputs = document.querySelectorAll('.input-grade-gg');

            inputs.forEach(input => {
                input.addEventListener('input', (e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val < 51 && e.target.value !== "") {
                        e.target.style.borderColor = "#dc2626";
                        e.target.style.color = "#dc2626";
                        e.target.style.fontWeight = "bold";
                    } else {
                        e.target.style.borderColor = "";
                        e.target.style.color = "";
                        e.target.style.fontWeight = "";
                    }
                    updateAverageForStudent(e.target.dataset.sid);
                });

                input.addEventListener('paste', (e) => {
                    e.preventDefault();
                    const paste = (e.clipboardData || window.clipboardData).getData('text');
                    const rows = paste.split(/\r?\n/);

                    const startRow = parseInt(e.target.dataset.rowIndex);
                    const startCol = parseInt(e.target.dataset.trim);

                    rows.forEach((rowRaw, rIdx) => {
                        if (!rowRaw.trim()) return;
                        const cols = rowRaw.split('\t');
                        cols.forEach((colVal, cIdx) => {
                            const targetRow = startRow + rIdx;
                            const targetCol = startCol + cIdx;
                            const targetInput = document.querySelector(`.input-grade-gg[data-row-index="${targetRow}"][data-trim="${targetCol}"]`);

                            if (targetInput) {
                                let pastedVal = colVal.trim();
                                // Si Excel exporta '0' debido a fórmulas o celdas vacías, lo forzamos a nulo/vacío
                                if (pastedVal === "0") pastedVal = "";

                                targetInput.value = pastedVal;
                                targetInput.dispatchEvent(new Event('input'));
                            }
                        });
                    });
                });
            });

            document.getElementById('btn-save-gg').addEventListener('click', () => {
                const inputs = document.querySelectorAll('.input-grade-gg');
                inputs.forEach(input => {
                    const sid = parseInt(input.dataset.sid);
                    const trim = parseInt(input.dataset.trim);
                    const val = input.value;

                    // Save the grade if valid, or save as an empty string to clear the grade. Treat "0" as empty.
                    let finalVal = (val === "" || val === "0") ? "" : parseInt(val);

                    window.db.upsertRecord({
                        studentId: sid,
                        area: area,
                        trimester: trim,
                        grade: finalVal
                    });
                });

                Swal.fire('Guardado', 'Las calificaciones han sido guardadas correctamente.', 'success').then(() => {
                    document.getElementById('gg-area').value = "";
                    document.getElementById('gg-container').innerHTML = "";
                });
            });

            document.getElementById('btn-print-gg').addEventListener('click', () => {
                let printContent = `
                    <style>
                        @page { size: letter portrait; margin: 12mm; }
                        @media print { 
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
                            table { page-break-inside: auto; zoom: 95%; }
                            tr { page-break-inside: avoid; page-break-after: auto; }
                        }
                        body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; font-size: 11px; margin: 0; color: #1e293b; background: white; line-height: 1.2; }
                        h2 { text-align: center; text-transform: uppercase; margin: 0 0 10px 0; font-size: 16px; color: #0f172a; letter-spacing: 0.5px; font-weight: 800; }
                        .header-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #cbd5e1; }
                        .header-col { display: flex; flex-direction: column; gap: 4px; }
                        .info-text { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        th, td { border: 1px solid #94a3b8; padding: 5px 4px; text-align: center; }
                        th.header-group { background-color: #e2e8f0; font-weight: 800; padding: 6px; color: #0f172a; font-size: 11px; text-transform: uppercase; }
                        td.student-name { text-align: left; font-weight: 700; white-space: nowrap; padding-left: 8px; font-size: 11.5px; }
                    </style>
                    <div style="padding: 0;">
                        <h2>Boletín General de Calificaciones</h2>
                        <div class="header-row">
                            <div class="header-col">
                                <span class="info-text">Unidad Educativa: ${document.querySelector('.institution-name-display') ? document.querySelector('.institution-name-display').textContent : 'No definida'}</span>
                                <span class="info-text" style="color: #0f172a; font-weight: 800;">Curso: ${course} "${parallel}"</span>
                            </div>
                            <div class="header-col" style="text-align: right;">
                                <span class="info-text">Fecha de Impresión: ${new Date().toLocaleDateString('es-ES')}</span>
                                <span class="info-text" style="color: #0f172a; font-weight: 800; border-bottom: 1px solid #0f172a; display: inline-block;">Área: ${area}</span>
                            </div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 4%;" class="header-group">N°</th>
                                    <th style="width: 46%; text-align: left;" class="header-group">APELLIDOS Y NOMBRES</th>
                                    <th style="width: 12.5%;" class="header-group">1er Trim.</th>
                                    <th style="width: 12.5%;" class="header-group">2do Trim.</th>
                                    <th style="width: 12.5%;" class="header-group">3er Trim.</th>
                                    <th style="width: 12.5%; background-color: #e0f2fe; color: #0369a1;" class="header-group">Prom. Final</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                students.forEach((s, idx) => {
                    const stdInputs = document.querySelectorAll('.input-grade-gg[data-sid="' + s.id + '"]');
                    const t1 = stdInputs[0] ? stdInputs[0].value : '-';
                    const t2 = stdInputs[1] ? stdInputs[1].value : '-';
                    const t3 = stdInputs[2] ? stdInputs[2].value : '-';
                    const avgSpan = document.getElementById('avg-' + s.id);
                    const avg = avgSpan ? avgSpan.textContent : '-';

                    const avgColor = (avg !== '-' && parseInt(avg) < 51) ? 'color: #dc2626; font-weight: 800;' : 'font-weight: 800; color: #0f172a;';
                    const t1Color = (t1 !== '' && t1 !== '-' && parseInt(t1) < 51) ? 'color: #dc2626; font-weight: 800;' : '';
                    const t2Color = (t2 !== '' && t2 !== '-' && parseInt(t2) < 51) ? 'color: #dc2626; font-weight: 800;' : '';
                    const t3Color = (t3 !== '' && t3 !== '-' && parseInt(t3) < 51) ? 'color: #dc2626; font-weight: 800;' : '';

                    printContent += `
                        <tr>
                            <td style="color: #64748b;">${idx + 1}</td>
                            <td class="student-name" style="color: #0f172a;">${s.fullName}</td>
                            <td style="${t1Color}">${t1 || '-'}</td>
                            <td style="${t2Color}">${t2 || '-'}</td>
                            <td style="${t3Color}">${t3 || '-'}</td>
                            <td style="background-color: #f8fafc; ${avgColor}">${avg}</td>
                        </tr>
                    `;
                });

                printContent += `
                            </tbody>
                        </table>
                        <div style="margin-top: 50px; text-align: center; width: 100%;">
                            <p style="margin-bottom: 5px; color: #0f172a;">_____________________________________</p>
                            <p style="color: #475569; font-size: 11px; font-weight: 700; text-transform: uppercase;">Firma del Docente / Profesor</p>
                        </div>
                    </div>
                `;

                const printWindow = window.open('', '_blank');
                if (printWindow) {
                    printWindow.document.write('<html><head><title>Boletín de Calificaciones - ' + course + ' ' + parallel + '</title></head><body style="margin:0;">');
                    printWindow.document.write(printContent);
                    printWindow.document.write('</body></html>');
                    printWindow.document.close();

                    // Delaying print slightly to ensure render
                    setTimeout(() => {
                        printWindow.focus();
                        printWindow.print();
                    }, 500);
                } else {
                    Swal.fire('Error', 'No se pudo abrir la ventana de impresión. Verifique los bloqueadores de ventanas emergentes (Pop-ups).', 'error');
                }
            });
        });
    }

    // --- SETTINGS ---
    function renderSettings() {
        mainContent.innerHTML = `
            <div class="card max-w-2xl mx-auto">
                <h3 class="mb-1">Configuración del Sistema</h3>
                <p class="text-muted text-sm mb-2">Configure los detalles de la Unidad Educativa para la Comisión Pedagógica.</p>
                
                <form id="form-settings">
                    <div class="form-group">
                        <label>Nombre de la Institución</label>
                        <input type="text" name="institutionName" class="input" value="${window.db.getSettings().unitName || 'Unidad Educativa'}">
                    </div>
                    <button type="submit" class="btn btn-primary">Guardar Configuración</button>
                </form>
            </div>
        `;

        document.getElementById('form-settings').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = new FormData(e.target).get('institutionName').trim();
            const newConfig = window.db.updateSettings({ unitName: name });
            document.querySelectorAll('.institution-name-display').forEach(el => el.textContent = newConfig.unitName);
            Swal.fire('Guardado', 'Configuración actualizada para esta institución', 'success');
        });

        // Initialize display across app
        const currentName = window.db.getSettings().unitName;
        if (currentName) {
            document.querySelectorAll('.institution-name-display').forEach(el => el.textContent = currentName);
        }
    }

    // --- ANNUAL DASHBOARD ---
    function renderAnnualGrades() {
        mainContent.innerHTML = `
            <div class="card mb-2">
                <div class="grid grid-2 items-end">
                    <div class="form-group mb-0">
                        <label>Curso</label>
                        <select id="ag-course" class="input">
                            <option value="">Seleccione Curso</option>
                            ${COURSES.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group mb-0">
                        <label>Paralelo</label>
                        <select id="ag-parallel" class="input">
                            <option value="">Seleccione Paralelo</option>
                            ${PARALLELS.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="mt-1">
                    <button class="btn btn-primary" id="btn-load-ag" style="width: 100%;">Centralizar Calificaciones Anuales</button>
                </div>
            </div>
            <div id="ag-container"></div>
        `;

        document.getElementById('btn-load-ag').addEventListener('click', () => {
            const course = document.getElementById('ag-course').value;
            const parallel = document.getElementById('ag-parallel').value;

            if (!course || !parallel) return Swal.fire('Error', 'Seleccione curso y paralelo', 'error');

            const students = sortStudents(window.db.getStudents().filter(s => s.course === course && s.parallel === parallel));
            const records = window.db.getRecords();

            if (students.length === 0) {
                document.getElementById('ag-container').innerHTML = `<div class="card text-center">No hay alumnos.</div>`;
                return;
            }

            let html = `
                <style>
                    .table-annual th.vertical-text {
                        writing-mode: vertical-rl;
                        transform: rotate(180deg);
                        white-space: nowrap;
                        vertical-align: bottom;
                        padding: 10px 5px !important;
                        text-align: left;
                        max-height: 250px;
                        font-size: 0.8rem;
                        background-color: #f8fafc;
                        border: 1px solid #cbd5e1;
                        color: #1e293b;
                    }
                    .table-annual td, .table-annual th {
                        border: 1px solid #cbd5e1;
                        padding: 6px 4px;
                    }
                    .table-annual th.header-group {
                        background-color: #e2e8f0;
                        text-align: center;
                        font-weight: bold;
                        border: 1px solid #cbd5e1;
                        padding: 8px;
                    }
                </style>
                <div class="card" style="overflow-x: auto;">
                    <div class="flex justify-between items-center mb-1">
                        <h3 style="color: #0f172a;">Calificaciones Finales Anuales - ${course} "${parallel}"</h3>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-warning btn-sm" id="btn-top-students-ag"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg> Estudiantes Sobresalientes</button>
                            <button id="btn-print-ag" class="btn btn-sm btn-secondary flex items-center gap-1">
                                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                                Imprimir
                            </button>
                        </div>
                    </div>
                    <table class="table table-annual" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th rowspan="2" style="width: 3%; text-align: center; background-color: #f8fafc;">N°</th>
                                <th rowspan="2" style="width: 20%; background-color: #f8fafc; text-align: center; vertical-align: middle;">APELLIDOS Y NOMBRES</th>
                                <th colspan="${ACADEMIC_AREAS.length}" class="header-group">ÁREAS</th>
                                <th rowspan="2" class="vertical-text" style="background-color: #e0f2fe; color: #0369a1; font-weight: bold;">PROMEDIO ANUAL</th>
                                <th rowspan="2" class="vertical-text" style="background-color: #fef2f2; color: #b91c1c; font-weight: bold;">ÁREAS REPROBADAS</th>
                            </tr>
                            <tr>
                                ${ACADEMIC_AREAS.map(a => `<th class="vertical-text">${a}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
            `;

            let studentsWithAverages = [];

            students.forEach((s, idx) => {
                let sHtml = `<tr>
                    <td class="text-center">${idx + 1}</td>
                    <td class="font-bold whitespace-nowrap">${s.fullName}</td>`;

                let totalSuma = 0;
                let countAreas = 0;
                let areasReprobadas = 0;

                ACADEMIC_AREAS.forEach(area => {
                    const sRecords = records.filter(r => r.studentId === s.id && r.area === area);
                    const r1 = sRecords.find(r => r.trimester === 1) || {};
                    const r2 = sRecords.find(r => r.trimester === 2) || {};
                    const r3 = sRecords.find(r => r.trimester === 3) || {};

                    let promArea = "";
                    if (r1.grade && r2.grade && r3.grade && r1.grade !== "" && r2.grade !== "" && r3.grade !== "") {
                        promArea = Math.round((parseInt(r1.grade) + parseInt(r2.grade) + parseInt(r3.grade)) / 3);
                        totalSuma += promArea;
                        countAreas++;
                        if (promArea < 51) {
                            areasReprobadas++;
                        }
                    }

                    const colorStyle = (promArea !== "" && promArea < 51) ? "color: #dc2626; font-weight: bold;" : "";
                    sHtml += `<td class="text-center" style="${colorStyle}">${promArea}</td>`;
                });

                let promGeneralNum = countAreas > 0 ? parseFloat((totalSuma / countAreas).toFixed(2)) : 0;
                let promGeneral = promGeneralNum > 0 ? promGeneralNum : "-";

                studentsWithAverages.push({ name: s.fullName, average: promGeneralNum });

                sHtml += `<td class="text-center font-bold" style="background-color: #f0f9ff; color: #0284c7;">${promGeneral}</td>
                        <td class="text-center font-bold" style="background-color: #fef2f2; color: ${areasReprobadas > 0 ? '#dc2626' : '#94a3b8'};">${areasReprobadas > 0 ? areasReprobadas : ''}</td>
                    </tr>`;

                html += sHtml;
            });

            html += `</tbody></table></div>`;
            document.getElementById('ag-container').innerHTML = html;

            document.getElementById('btn-top-students-ag').addEventListener('click', () => {
                const top5 = studentsWithAverages
                    .filter(s => s.average > 0)
                    .sort((a, b) => b.average - a.average)
                    .slice(0, 5);

                if (top5.length === 0) {
                    return Swal.fire('Sin Datos', 'No existen calificaciones suficientes para calcular el listado de sobresalientes anual.', 'info');
                }

                let listHtml = `<div style="display: flex; flex-direction: column; gap: 12px; margin-top: 20px; text-align: left;">`;
                top5.forEach((student, index) => {
                    const bgColors = ['rgba(251, 191, 36, 0.15)', 'rgba(148, 163, 184, 0.15)', 'rgba(180, 83, 9, 0.15)', 'rgba(241, 245, 249, 1)', 'rgba(248, 250, 252, 1)'];
                    const borderColors = ['#fbbf24', '#cbd5e1', '#b45309', '#e2e8f0', '#e2e8f0'];
                    const fontColors = ['#d97706', '#475569', '#92400e', '#334155', '#475569'];
                    const icons = index === 0 ? '🏆' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : '🎖️'));

                    const bg = bgColors[index] || bgColors[4];
                    const border = borderColors[index] || borderColors[4];
                    const fontColor = fontColors[index] || fontColors[4];

                    listHtml += `
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; background: ${bg}; border-left: 5px solid ${border}; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: transform 0.2s;">
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <span style="font-size: 1.8rem; line-height: 1;">${icons}</span>
                                <div style="display: flex; flex-direction: column;">
                                    <span style="font-weight: 700; font-size: 1.05rem; color: #0f172a;">${student.name}</span>
                                    <span style="font-size: 0.80rem; font-weight: 600; color: ${fontColor}; text-transform: uppercase; letter-spacing: 0.5px;">Top ${index + 1}</span>
                                </div>
                            </div>
                            <div style="display: flex; align-items: baseline; gap: 4px; background: white; padding: 6px 14px; border-radius: 9999px; font-weight: 800; color: ${fontColor}; font-size: 1.25rem; border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                                ${student.average} <span style="font-size: 0.70rem; font-weight: 700; opacity: 0.7; letter-spacing: 0.5px;">Pts</span>
                            </div>
                        </div>
                    `;
                });
                listHtml += `</div>`;

                Swal.fire({
                    title: `<span style="font-size: 1.6rem; color: #1e293b; font-weight: 700;">Cuadro de Honor Anual</span>`,
                    html: `<p style="color: #64748b; font-size: 1rem; margin-top: -10px;">¡Felicitaciones a los mejores promedios generales del año!</p>${listHtml}`,
                    icon: 'none',
                    width: '500px',
                    confirmButtonText: 'Cerrar',
                    confirmButtonColor: '#6366f1',
                    customClass: {
                        popup: 'rounded-lg'
                    }
                });
            });

            document.getElementById('btn-print-ag').addEventListener('click', () => {
                const advisorName = students.length > 0 && students[0].advisorName && students[0].advisorName !== '-' ? students[0].advisorName : 'Sin Asignar';
                const printWindow = window.open('', '_blank');
                let printContent = `
                    <html><head>
                    <title>Reporte Anual - ${course} "${parallel}"</title>
                    <style>
                        @page { size: letter landscape; margin: 8mm; }
                        @media print { 
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
                            table { page-break-inside: auto; }
                            tr { page-break-inside: avoid; page-break-after: auto; }
                        }
                        body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; font-size: 8.5px; margin: 0; color: #1e293b; background: white; line-height: 1.1; }
                        h2 { text-align: center; text-transform: uppercase; margin: 0 0 6px 0; font-size: 15px; color: #0f172a; letter-spacing: 0.5px; font-weight: 800; }
                        .header-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 2px solid #cbd5e1; }
                        .header-col { display: flex; flex-direction: column; gap: 3px; }
                        .info-text { font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                        th, td { border: 1px solid #94a3b8; padding: 2px; text-align: center; line-height: 1.1; }
                        th.header-group { background-color: #e2e8f0; font-weight: 800; padding: 4px; color: #0f172a; font-size: 9px; text-transform: uppercase; }
                        th.vertical-text {
                            writing-mode: vertical-rl;
                            transform: rotate(180deg);
                            white-space: nowrap;
                            height: 100px;
                            max-height: 100px;
                            font-size: 8px;
                            padding: 3px 0 !important;
                            background-color: #f8fafc;
                            color: #334155;
                            font-weight: 800;
                        }
                        td.student-name { text-align: left; font-weight: 700; white-space: nowrap; padding-left: 4px; font-size: 8.5px; }
                        .rojo { color: #dc2626 !important; font-weight: 800; }
                    </style>
                    </head><body>
                    <h2>Cuadro Centralizador Final de Calificaciones Anuales</h2>
                    <div class="header-row">
                        <div class="header-col">
                            <span class="info-text">Unidad Educativa: ${localStorage.getItem('instName') || 'No definida'}</span>
                            <span class="info-text" style="color: #0f172a; font-weight: 800;">Curso: ${course} "${parallel}"</span>
                        </div>
                        <div class="header-col" style="text-align: right;">
                            <span class="info-text">Gestión: ${new Date().getFullYear()}</span>
                            <span class="info-text" style="color: #0f172a; font-weight: 800; border-bottom: 1px solid #0f172a; display: inline-block;">Asesor de Curso: ${advisorName}</span>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th rowspan="2" style="width: 2%;">N°</th>
                                <th rowspan="2" style="width: 22%; font-size: 10px;">APELLIDOS Y NOMBRES</th>
                                <th colspan="${ACADEMIC_AREAS.length}" class="header-group">ÁREAS DE SABERES Y CONOCIMIENTOS</th>
                                <th rowspan="2" class="vertical-text" style="background-color: #e0f2fe; color: #0369a1;">PROMEDIO ANUAL</th>
                                <th rowspan="2" class="vertical-text" style="background-color: #fef2f2; color: #b91c1c;">ÁREAS REPROBADAS</th>
                            </tr>
                            <tr>
                                ${ACADEMIC_AREAS.map(a => `<th class="vertical-text">${a}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                `;

                students.forEach((s, idx) => {
                    let rHtml = `<tr><td>${idx + 1}</td><td class="student-name">${s.fullName}</td>`;
                    let totalSuma = 0;
                    let countAreas = 0;
                    let areasReprobadas = 0;

                    ACADEMIC_AREAS.forEach(area => {
                        const sRecords = records.filter(r => r.studentId === s.id && r.area === area);
                        const r1 = sRecords.find(r => r.trimester === 1) || {};
                        const r2 = sRecords.find(r => r.trimester === 2) || {};
                        const r3 = sRecords.find(r => r.trimester === 3) || {};

                        let promArea = "";
                        if (r1.grade && r2.grade && r3.grade && r1.grade !== "" && r2.grade !== "" && r3.grade !== "") {
                            promArea = Math.round((parseInt(r1.grade) + parseInt(r2.grade) + parseInt(r3.grade)) / 3);
                            totalSuma += promArea;
                            countAreas++;
                            if (promArea < 51) areasReprobadas++;
                        }

                        const colorClass = (promArea !== "" && promArea < 51) ? "rojo" : "";
                        rHtml += `<td class="${colorClass}">${promArea}</td>`;
                    });

                    let promGeneral = countAreas > 0 ? (totalSuma / countAreas).toFixed(2) : "-";
                    rHtml += `<td style="font-weight: bold; background-color: #f8fafc;">${promGeneral}</td>
                              <td class="${areasReprobadas > 0 ? 'rojo' : ''}" style="background-color: #f8fafc;">${areasReprobadas > 0 ? areasReprobadas : ''}</td>
                            </tr>`;
                    printContent += rHtml;
                });

                printContent += `</tbody></table>
                    <div style="margin-top: 60px; text-align: center; width: 100%;">
                        <p style="margin-bottom: 5px;">_____________________________________</p>
                        <p>Firma y Sello</p>
                    </div>
                </body></html>`;

                if (printWindow) {
                    printWindow.document.write(printContent);
                    printWindow.document.close();
                    setTimeout(() => {
                        printWindow.focus();
                        printWindow.print();
                    }, 500);
                } else {
                    Swal.fire('Error', 'Debe permitir ventanas emergentes.', 'error');
                }
            });
        });
    }

    function renderAnnualPerformance() {
        mainContent.innerHTML = `
            <div class="card mb-2">
                <div class="grid grid-2 items-end">
                    <div class="form-group mb-0">
                        <label>Curso</label>
                        <select id="aperf-course" class="input">
                            <option value="">Seleccione Curso</option>
                            ${COURSES.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group mb-0">
                        <label>Paralelo</label>
                        <select id="aperf-parallel" class="input">
                            <option value="">Seleccione Paralelo</option>
                            ${PARALLELS.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="mt-1">
                    <button class="btn btn-primary" id="btn-load-aperf" style="width: 100%;">Generar Dashboard Consolidado Anual</button>
                </div>
            </div>
            <div id="aperf-container"></div>
        `;

        document.getElementById('btn-load-aperf').addEventListener('click', () => {
            const course = document.getElementById('aperf-course').value;
            const parallel = document.getElementById('aperf-parallel').value;

            if (!course || !parallel) return Swal.fire('Error', 'Seleccione curso y paralelo', 'error');

            const students = sortStudents(window.db.getStudents().filter(s => s.course === course && s.parallel === parallel));
            const records = window.db.getRecords();

            if (students.length === 0) {
                document.getElementById('aperf-container').innerHTML = `<div class="card text-center">No hay alumnos en el curso.</div>`;
                return;
            }

            const AREA_COLORS = {
                "Comunicación y Lenguajes": "#ef4444",
                "Lengua Extranjera": "#3b82f6",
                "Ciencias Sociales": "#22c55e",
                "Música": "#a855f7",
                "Artes Plásticas": "#f97316",
                "Educación Física": "#eab308",
                "Matemáticas": "#14b8a6",
                "Tecnología": "#6366f1",
                "Física": "#06b6d4",
                "Química": "#ec4899",
                "Ciencias Naturales Biología": "#10b981",
                "Filosofía / Psicología": "#f43f5e",
                "Valores y Religiones": "#f59e0b"
            };

            let html = `
                <style>
                    .area-block-hover {
                        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
                        z-index: 1;
                        cursor: crosshair;
                    }
                    .area-block-hover:hover {
                        transform: scale(1.15);
                        box-shadow: 0 6px 12px rgba(0,0,0,0.3) !important;
                        z-index: 10;
                    }
                    .trim-highlight {
                        color: #ffffff;
                        background: linear-gradient(135deg, #1e3a8a 0%, #172554 100%);
                        padding: 4px 12px;
                        border-radius: 8px;
                        font-size: 1.1em;
                        font-weight: 900;
                        box-shadow: 0 2px 6px rgba(30, 58, 138, 0.4);
                        display: inline-block;
                        margin-left: 10px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                </style>
                <div class="card" style="overflow-x: auto;">
                    <h3 class="mb-1 text-secondary" style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px;">
                        <span>Rendimiento Estudiantil (Notas < 51) - ${course} "${parallel}"</span>
                        <span class="trim-highlight">FINAL ANUAL</span>
                    </h3>
                    <p class="text-sm text-muted mb-1">Este análisis identifica áreas reprobadas en base a las calificaciones finales anuales.</p>
                    <table class="table" style="width: 100%; min-width: 100%; table-layout: fixed;">
                        <thead>
                            <tr>
                                <th style="width: 5%">N°</th>
                                <th style="width: 20%">Estudiante</th>
                                <th style="width: 65%">Áreas Reprobadas (Anual)</th>
                                <th style="width: 10%" class="text-center">Total</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            students.forEach((s, idx) => {
                let failingAreas = [];

                ACADEMIC_AREAS.forEach(area => {
                    const sRecords = records.filter(r => r.studentId === s.id && r.area === area);
                    const r1 = sRecords.find(r => r.trimester === 1) || {};
                    const r2 = sRecords.find(r => r.trimester === 2) || {};
                    const r3 = sRecords.find(r => r.trimester === 3) || {};

                    if (r1.grade && r2.grade && r3.grade && r1.grade !== "" && r2.grade !== "" && r3.grade !== "") {
                        const promArea = Math.round((parseInt(r1.grade) + parseInt(r2.grade) + parseInt(r3.grade)) / 3);
                        if (promArea < 51) {
                            failingAreas.push({ area: area, grade: promArea });
                        }
                    }
                });

                let barsHtml = `<div style="display: flex; gap: 4px; flex-wrap: wrap; min-height: 48px; border-left: 2px solid #cbd5e1; padding-left: 8px;">`;

                if (failingAreas.length === 0) {
                    barsHtml += `<div style="display:flex; align-items:center; color:#94a3b8; font-style:italic;">Ninguna (Sin Riesgo)</div>`;
                } else {
                    failingAreas.forEach(fa => {
                        const bg = AREA_COLORS[fa.area] || '#64748b';
                        barsHtml += `
                            <div class="area-block-hover" style="background-color: ${bg}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 500; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.1); width: 220px; height: 32px; flex-shrink: 0;">
                                <span style="margin-right: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-grow: 1; text-align: left;" title="${fa.area}">${fa.area}</span>
                                <span style="background-color: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; font-weight: bold; min-width: 32px; text-align: center; flex-shrink: 0;">${fa.grade}</span>
                            </div>
                        `;
                    });
                }
                barsHtml += `</div>`;

                html += `
                    <tr>
                        <td class="text-center" style="vertical-align: middle;">${idx + 1}</td>
                        <td class="font-bold" style="vertical-align: middle; font-size: 1.05rem;">${s.fullName}</td>
                        <td style="vertical-align: middle; padding: 6px 12px;">${barsHtml}</td>
                        <td class="text-center font-bold" style="vertical-align: middle;">
                            <span class="badge ${failingAreas.length > 2 ? 'badge-danger' : (failingAreas.length > 0 ? 'badge-warning' : 'badge-success')}" style="font-size: 1.3rem; padding: 6px 12px; border-radius: 8px;">${failingAreas.length}</span>
                        </td>
                    </tr>
                `;
            });

            html += `</tbody></table></div>`;
            document.getElementById('aperf-container').innerHTML = html;
        });
    }
    // --- MEJORES PROMEDIOS ---
    function renderBestAverages() {
        mainContent.innerHTML = `
            <div class="card mb-2">
                <div class="grid grid-2 items-end">
                    <div class="form-group mb-0">
                        <label>Curso</label>
                        <select id="ba-course" class="input">
                            <option value="">Toda la Institución</option>
                            ${COURSES.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group mb-0">
                        <label>Paralelo</label>
                        <select id="ba-parallel" class="input">
                            <option value="">Todos los Paralelos</option>
                            ${PARALLELS.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="mt-1">
                    <button class="btn btn-primary" id="btn-load-ba" style="width: 100%;">Generar Rankings de Excelencia</button>
                </div>
            </div>
            <div id="ba-container"></div>
        `;

        document.getElementById('btn-load-ba').addEventListener('click', () => {
            const course = document.getElementById('ba-course').value;
            const parallel = document.getElementById('ba-parallel').value;

            let students = window.db.getStudents();
            if (course) students = students.filter(s => s.course === course);
            if (parallel) students = students.filter(s => s.parallel === parallel);

            const records = window.db.getRecords();

            if (students.length === 0) {
                document.getElementById('ba-container').innerHTML = `<div class="card text-center text-muted">No hay estudiantes en los criterios seleccionados.</div>`;
                return;
            }

            let stats = students.map(s => {
                let sumP1 = 0, countP1 = 0;
                let sumP2 = 0, countP2 = 0;
                let sumP3 = 0, countP3 = 0;

                ACADEMIC_AREAS.forEach(area => {
                    const sRecords = records.filter(r => r.studentId === s.id && r.area === area);
                    const r1 = sRecords.find(r => r.trimester === 1) || {};
                    const r2 = sRecords.find(r => r.trimester === 2) || {};
                    const r3 = sRecords.find(r => r.trimester === 3) || {};

                    let g1 = (r1.grade && r1.grade !== "") ? parseInt(r1.grade) : null;
                    let g2 = (r2.grade && r2.grade !== "") ? parseInt(r2.grade) : null;
                    let g3 = (r3.grade && r3.grade !== "") ? parseInt(r3.grade) : null;

                    if (g1 !== null) {
                        sumP1 += g1;
                        countP1++;
                    }
                    if (g1 !== null && g2 !== null) {
                        sumP2 += Math.round((g1 + g2) / 2);
                        countP2++;
                    }
                    if (g1 !== null && g2 !== null && g3 !== null) {
                        sumP3 += Math.round((g1 + g2 + g3) / 3);
                        countP3++;
                    }
                });

                return {
                    name: s.fullName,
                    course: `${s.course} "${s.parallel}"`,
                    p1: countP1 > 0 ? Math.round(sumP1 / countP1) : 0,
                    p2: countP2 > 0 ? Math.round(sumP2 / countP2) : 0,
                    p3: countP3 > 0 ? parseFloat((sumP3 / countP3).toFixed(2)) : 0
                };
            });

            const topP1 = [...stats].filter(s => s.p1 > 0).sort((a, b) => b.p1 - a.p1).slice(0, 5);
            const topP2 = [...stats].filter(s => s.p2 > 0).sort((a, b) => b.p2 - a.p2).slice(0, 5);
            const topP3 = [...stats].filter(s => s.p3 > 0).sort((a, b) => b.p3 - a.p3).slice(0, 5);

            function renderTop5List(list, title, subtitle, scoreKey) {
                if (list.length === 0) {
                    return `<div class="card" style="flex: 1;"><h3 class="text-primary" style="font-size: 1.1rem; line-height: 1.2; margin-bottom: 4px;">${title}</h3><p class="text-muted text-sm mb-1">${subtitle}</p><div class="text-center text-muted" style="padding: 30px; background: #f8fafc; border-radius: 8px; margin-top: 15px; font-style: italic;">Sin suficientes datos registrados...</div></div>`;
                }

                let listHtml = `<div style="display: flex; flex-direction: column; gap: 12px; margin-top: 15px;">`;
                list.forEach((student, index) => {
                    const bgColors = ['rgba(251, 191, 36, 0.15)', 'rgba(148, 163, 184, 0.15)', 'rgba(180, 83, 9, 0.15)', 'rgba(241, 245, 249, 1)', 'rgba(248, 250, 252, 1)'];
                    const borderColors = ['#fbbf24', '#cbd5e1', '#b45309', '#e2e8f0', '#e2e8f0'];
                    const fontColors = ['#d97706', '#475569', '#92400e', '#334155', '#475569'];
                    const icons = index === 0 ? '🏆' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : '🎖️'));

                    const bg = bgColors[index] || bgColors[4];
                    const border = borderColors[index] || borderColors[4];
                    const fontColor = fontColors[index] || fontColors[4];

                    listHtml += `
                          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: ${bg}; border-left: 5px solid ${border}; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: transform 0.2s;">
                              <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
                                  <span style="font-size: 1.6rem; line-height: 1; min-width: 30px; text-align: center;">${icons}</span>
                                  <div style="display: flex; flex-direction: column; overflow: hidden;">
                                      <span style="font-weight: 700; font-size: 0.90rem; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${student.name}">${student.name}</span>
                                      <span style="font-size: 0.70rem; font-weight: 700; color: ${fontColor}; text-transform: uppercase;">${student.course}</span>
                                  </div>
                              </div>
                              <div style="display: flex; flex-shrink: 0; align-items: baseline; gap: 2px; background: white; padding: 4px 10px; border-radius: 9999px; font-weight: 800; color: ${fontColor}; font-size: 1.05rem; border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                                  ${student[scoreKey]} <span style="font-size: 0.65rem; font-weight: 700; opacity: 0.7;">Pts</span>
                              </div>
                          </div>
                      `;
                });
                listHtml += `</div>`;
                return `<div class="card" style="flex: 1; display: flex; flex-direction: column; justify-content: flex-start;"><h3 class="text-primary mb-0" style="font-size: 1.1rem; line-height: 1.2; margin-bottom: 4px;">${title}</h3><p class="text-muted text-sm mb-1">${subtitle}</p>${listHtml}</div>`;
            }

            document.getElementById('ba-container').innerHTML = `
                <div class="grid grid-3" style="align-items: stretch; gap: 15px;">
                    ${renderTop5List(topP1, 'Top 5: 1er Trimestre', 'Promedios obtenidos estrictamente en el 1er trimestre', 'p1')}
                    ${renderTop5List(topP2, 'Top 5: Mitad de Gestión', 'Promedio consolidado del 1er y 2do trimestre', 'p2')}
                    ${renderTop5List(topP3, 'Top 5: Promedio Anual', 'Promedio global final (3 trimestres)', 'p3')}
                </div>
            `;
        });
    }

    // INIT
    db.onReady(() => {
        const instName = localStorage.getItem('instName');
        if (instName) document.querySelector('.institution-name-display').textContent = instName;
        checkAuth();
    });
});
