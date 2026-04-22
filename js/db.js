import { db as firestoreDb } from './firebase.js';
import { collection, doc, setDoc, onSnapshot } from "firebase/firestore";

const DB_PREFIX = "diciplinaria_";

class Database {
    constructor() {
        this.cache = {
            teachers: [],
            students: [],
            incidents: [],
            documents: []
        };
        this.ready = false;
        this.onReadyCallbacks = [];
        this.init();
    }

    init() {
        // Cargar desde LocalStorage inicialmente para que la UI sea rápida
        this.cache.teachers = JSON.parse(localStorage.getItem(`${DB_PREFIX}teachers`)) || [
            { id: 1, username: 'disciplina', password: 'disciplina2026', name: 'Administrador Principal' }
        ];
        this.cache.students = JSON.parse(localStorage.getItem(`${DB_PREFIX}students`)) || [];
        this.cache.incidents = JSON.parse(localStorage.getItem(`${DB_PREFIX}incidents`)) || [];
        this.cache.documents = JSON.parse(localStorage.getItem(`${DB_PREFIX}documents`)) || [];

        // Sincronizar con Firebase en segundo plano
        if (firestoreDb) {
            try {
                this._setupListeners('teachers');
                this._setupListeners('students');
                this._setupListeners('incidents');
                this._setupListeners('documents');
            } catch (error) {
                console.error("Error setting up Firebase listeners:", error);
            }
        }

        this.ready = true;
        this.onReadyCallbacks.forEach(cb => cb());
    }

    _setupListeners(table) {
        onSnapshot(collection(firestoreDb, table), (snapshot) => {
            const data = [];
            snapshot.forEach(docSnap => data.push(docSnap.data()));
            if (data.length > 0) {
                this.cache[table] = data;
                localStorage.setItem(`${DB_PREFIX}${table}`, JSON.stringify(data));

                // Disparar evento para que la UI se actualice si está escuchando
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

    // --- GENERIC ---
    _getTable(table) {
        return this.cache[table] || [];
    }

    _saveTable(table, data) {
        this.cache[table] = data;
        localStorage.setItem(`${DB_PREFIX}${table}`, JSON.stringify(data));
    }

    async _syncToFirebase(table, dataItem) {
        if (!firestoreDb) return;
        try {
            await setDoc(doc(firestoreDb, table, String(dataItem.id)), dataItem);
        } catch (e) {
            console.error(`Error syncing to Firebase ${table}:`, e);
        }
    }

    _generateId(table) {
        const data = this._getTable(table);
        return data.length > 0 ? Math.max(...data.map(i => parseInt(i.id) || 0)) + 1 : 1;
    }

    // --- AUTH ---
    login(username, password) {
        const teachers = this._getTable('teachers');
        const user = teachers.find(t => t.username === username && t.password === password);
        if (user) {
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            return user;
        }
        return null;
    }

    logout() {
        sessionStorage.removeItem('currentUser');
    }

    getCurrentUser() {
        const user = sessionStorage.getItem('currentUser');
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
        const students = this.getStudents();
        const newStudent = { ...student, id: this._generateId('students'), createdAt: new Date().toISOString() };
        students.push(newStudent);
        this._saveTable('students', students);
        this._syncToFirebase('students', newStudent);
        return newStudent;
    }

    updateStudent(id, updatedData) {
        const students = this.getStudents();
        const index = students.findIndex(s => s.id === parseInt(id));
        if (index !== -1) {
            students[index] = { ...students[index], ...updatedData };
            this._saveTable('students', students);
            this._syncToFirebase('students', students[index]);
            return students[index];
        }
        return null;
    }

    // --- INCIDENTS ---
    getIncidents() {
        return this._getTable('incidents');
    }

    getIncidentsByStudent(studentId) {
        return this.getIncidents().filter(i => i.studentId === parseInt(studentId));
    }

    addIncident(incident) {
        const incidents = this.getIncidents();
        const newIncident = { ...incident, id: this._generateId('incidents'), createdAt: new Date().toISOString() };
        incidents.push(newIncident);
        this._saveTable('incidents', incidents);
        this._syncToFirebase('incidents', newIncident);
        return newIncident;
    }

    updateIncident(id, updatedData) {
        const incidents = this.getIncidents();
        const index = incidents.findIndex(i => i.id === parseInt(id));
        if (index !== -1) {
            incidents[index] = { ...incidents[index], ...updatedData };
            this._saveTable('incidents', incidents);
            this._syncToFirebase('incidents', incidents[index]);
            return incidents[index];
        }
        return null;
    }

    getIncidentById(id) {
        return this.getIncidents().find(i => i.id === parseInt(id));
    }

    // --- DOCUMENTS ---
    getDocuments() {
        return this._getTable('documents');
    }

    getDocumentsByStudent(studentId) {
        return this.getDocuments().filter(d => d.studentId === parseInt(studentId));
    }

    addDocument(document) {
        const documents = this.getDocuments();
        const newDocument = { ...document, id: this._generateId('documents'), createdAt: new Date().toISOString() };
        documents.push(newDocument);
        this._saveTable('documents', documents);
        this._syncToFirebase('documents', newDocument);
        return newDocument;
    }
}

export const db = new Database();
