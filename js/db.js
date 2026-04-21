import { db as firestoreDb } from './firebase.js';
import { collection, doc, setDoc, onSnapshot } from "firebase/firestore";
import { Security } from './utils/security.js';

const DB_PREFIX = "pedagogico_";

class Database {
    constructor() {
        this.cache = {
            teachers: [],
            students: [],
            records: [], // Contains { studentId, area, trimester, grade: number }
            preliminaries: [] // Contains { studentId, area, trimester, preliminary: boolean }
        };
        this.ready = false;
        this.onReadyCallbacks = [];
        this.init();
    }

    init() {
        this.cache.teachers = JSON.parse(localStorage.getItem(`${DB_PREFIX}teachers`)) || [
            { id: 1, username: 'maestro', password: 'aula2026', name: 'Institución 1', role: 'admin', id_institucion: 1 },
            { id: 2, username: 'maestro', password: 'docente5', name: 'Institución 2', role: 'admin', id_institucion: 2 },
            { id: 3, username: 'maestro', password: 'sis345', name: 'Institución 3', role: 'admin', id_institucion: 3 },
            { id: 4, username: 'maestro', password: 'edu2026', name: 'Institución 4', role: 'admin', id_institucion: 4 },
            { id: 5, username: 'maestro', password: 'aula78', name: 'Institución 5', role: 'admin', id_institucion: 5 },
            { id: 6, username: 'maestro', password: 'aula125', name: 'Institución 6', role: 'admin', id_institucion: 6 },
            { id: 7, username: 'maestro', password: 'aula77', name: 'Institución 7', role: 'admin', id_institucion: 7 },
            { id: 8, username: 'maestro', password: 'profe245', name: 'Institución 8', role: 'admin', id_institucion: 8 },
            { id: 9, username: 'maestro', password: 'profe57', name: 'Institución 9', role: 'admin', id_institucion: 9 },
            { id: 10, username: 'maestro', password: 'control7', name: 'Institución 10', role: 'admin', id_institucion: 10 },
            { id: 11, username: 'maestro', password: 'aula456', name: 'Institución 11', role: 'admin', id_institucion: 11 },
            { id: 12, username: 'maestro', password: 'control55', name: 'Institución 12', role: 'admin', id_institucion: 12 },
            { id: 13, username: 'maestro', password: 'profe89', name: 'Institución 13', role: 'admin', id_institucion: 13 },
            { id: 14, username: 'maestro', password: 'aula11', name: 'Institución 14', role: 'admin', id_institucion: 14 },
            { id: 15, username: 'maestro', password: 'sis555', name: 'Institución 15', role: 'admin', id_institucion: 15 },
            { id: 16, username: 'maestro', password: 'sistema5', name: 'Institución 16', role: 'admin', id_institucion: 16 }
        ];

        this.currentInstId = null;
        const user = this.getCurrentUser();
        
        if (user) {
            this.loadUserContext(user);
        } else {
            this.cache.students = [];
            this.cache.records = [];
            this.cache.preliminaries = [];
            this.cache.settings = { unitName: 'Unidad Educativa' };
        }

        if (firestoreDb && this.currentInstId) {
            try {
                this._setupListeners('students');
                this._setupListeners('records');
                this._setupListeners('preliminaries');
            } catch (error) {
                console.error("Error setting up Firebase listeners:", error);
            }
        }

        this.ready = true;
        this.onReadyCallbacks.forEach(cb => cb());
    }

    loadUserContext(user) {
        this.currentInstId = user.id_institucion;
        const pfx = `${DB_PREFIX}${this.currentInstId}_`;
        
        this.cache.students = JSON.parse(localStorage.getItem(`${pfx}students`)) || [];
        this.cache.records = JSON.parse(localStorage.getItem(`${pfx}records`)) || [];
        this.cache.preliminaries = JSON.parse(localStorage.getItem(`${pfx}preliminaries`)) || [];
        this.cache.settings = JSON.parse(localStorage.getItem(`${pfx}settings`)) || { unitName: `Unidad Educativa ${this.currentInstId}` };
    }

    _setupListeners(table) {
        if (!this.currentInstId) return;
        const instPath = `institutions/${this.currentInstId}/${table}`;
        onSnapshot(collection(firestoreDb, instPath), (snapshot) => {
            const data = [];
            snapshot.forEach(docSnap => data.push(docSnap.data()));
            if (data.length > 0) {
                this.cache[table] = data;
                localStorage.setItem(`${DB_PREFIX}${this.currentInstId}_${table}`, JSON.stringify(data));
                window.dispatchEvent(new CustomEvent('db-updated', { detail: { table } }));
            }
        }, (error) => {
            console.warn(`Error escuchando cambios de ${table}:`, error);
        });
    }

    onReady(cb) {
        if (this.ready) cb();
        else this.onReadyCallbacks.push(cb);
    }

    _getTable(table) {
        return this.cache[table] || [];
    }

    _saveTable(table, data) {
        this.cache[table] = data;
        if (table === 'teachers') {
             localStorage.setItem(`${DB_PREFIX}teachers`, JSON.stringify(data));
        } else if (this.currentInstId) {
             localStorage.setItem(`${DB_PREFIX}${this.currentInstId}_${table}`, JSON.stringify(data));
        }
    }

    async _syncToFirebase(table, dataItem) {
        if (!firestoreDb || !this.currentInstId) return;
        try {
            await setDoc(doc(firestoreDb, `institutions/${this.currentInstId}/${table}`, String(dataItem.id)), dataItem);
        } catch (e) {
            console.error(`Error syncing to Firebase ${table}:`, e);
        }
    }

    _generateId(table) {
        const data = this._getTable(table);
        return data.length > 0 ? Math.max(...data.map(i => parseInt(i.id) || 0)) + 1 : 1;
    }

    login(username, password) {
        const teachers = this._getTable('teachers');
        const user = teachers.find(t => t.username === username && t.password === password);
        if (user) {
            sessionStorage.setItem('pedagogico_currentUser', JSON.stringify(user));
            this.loadUserContext(user);
            return user;
        }
        return null;
    }

    logout() {
        sessionStorage.removeItem('pedagogico_currentUser');
        this.currentInstId = null;
    }

    getCurrentUser() {
        const user = sessionStorage.getItem('pedagogico_currentUser');
        return user ? JSON.parse(user) : null;
    }

    // --- STUDENTS ---
    getStudents() {
        return this._getTable('students');
    }

    getStudentById(id) {
        return this._getTable('students').find(s => s.id === parseInt(id));
    }

    addStudent(student) {
        const securityCheck = Security.validateStudentData(student);
        if (!securityCheck.isValid) throw new Error(securityCheck.errors.join(' '));

        const students = this.getStudents();
        const newStudent = { ...securityCheck.sanitized, id: this._generateId('students'), createdAt: new Date().toISOString() };
        students.push(newStudent);
        this._saveTable('students', students);
        this._syncToFirebase('students', newStudent);
        return newStudent;
    }

    updateStudent(id, updatedData) {
        const students = this.getStudents();
        const index = students.findIndex(s => s.id === parseInt(id));
        if (index !== -1) {
            const securityCheck = Security.validateStudentData({ ...students[index], ...updatedData });
            if (!securityCheck.isValid) throw new Error(securityCheck.errors.join(' '));

            students[index] = { ...securityCheck.sanitized };
            this._saveTable('students', students);
            this._syncToFirebase('students', students[index]);
            return students[index];
        }
        return null;
    }

    deleteStudent(id) {
       const students = this.getStudents();
       const newStudents = students.filter(s => s.id !== parseInt(id));
       this._saveTable('students', newStudents);
       // Syncing deletion implies hitting Firebase. We will skip deep delete sync for simplicity if not set up,
       // but typically one would call deleteDoc. Assuming local state reflection for now.
    }

    // --- RECORDS ---
    getRecords() {
        return this._getTable('records');
    }

    getRecordsByStudent(studentId) {
        return this.getRecords().filter(r => r.studentId === parseInt(studentId));
    }

    upsertRecord(recordData) {
        // recordData needs { studentId, area, trimester } (composite key essentially)
        const records = this.getRecords();
        const existingIndex = records.findIndex(r => 
            r.studentId === parseInt(recordData.studentId) && 
            r.area === recordData.area && 
            r.trimester === parseInt(recordData.trimester)
        );

        let finalRecord;
        if (existingIndex !== -1) {
            records[existingIndex] = { ...records[existingIndex], ...recordData, updatedAt: new Date().toISOString() };
            finalRecord = records[existingIndex];
        } else {
            finalRecord = { ...recordData, id: this._generateId('records'), createdAt: new Date().toISOString() };
            records.push(finalRecord);
        }

        this._saveTable('records', records);
        this._syncToFirebase('records', finalRecord);
        return finalRecord;
    }

    // --- PRELIMINARIES ---
    getPreliminaries() {
        return this._getTable('preliminaries');
    }

    upsertPreliminary(prelimData) {
        const prelims = this.getPreliminaries();
        const existingIndex = prelims.findIndex(p => 
            p.studentId === parseInt(prelimData.studentId) && 
            p.area === prelimData.area && 
            p.trimester === parseInt(prelimData.trimester)
        );

        let finalPrelim;
        if (existingIndex !== -1) {
            prelims[existingIndex] = { ...prelims[existingIndex], ...prelimData, updatedAt: new Date().toISOString() };
            finalPrelim = prelims[existingIndex];
        } else {
            finalPrelim = { ...prelimData, id: this._generateId('preliminaries'), createdAt: new Date().toISOString() };
            prelims.push(finalPrelim);
        }

        this._saveTable('preliminaries', prelims);
        this._syncToFirebase('preliminaries', finalPrelim);
        return finalPrelim;
    }

    // --- SETTINGS (PER INSTITUTION) ---
    getSettings() {
        return this.cache.settings || { unitName: 'Unidad Educativa' };
    }

    updateSettings(config) {
        this.cache.settings = { ...this.cache.settings, ...config };
        
        let safeConfig = Security.sanitizeHTML ? { unitName: Security.sanitizeHTML(this.cache.settings.unitName) } : this.cache.settings;
        this.cache.settings = safeConfig;

        if (this.currentInstId) {
             localStorage.setItem(`${DB_PREFIX}${this.currentInstId}_settings`, JSON.stringify(this.cache.settings));
        }
        return this.cache.settings;
    }
}

export const db = new Database();
