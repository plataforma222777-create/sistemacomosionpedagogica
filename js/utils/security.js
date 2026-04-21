export class Security {
    /**
     * Evita inyección de código (XSS) al sanitizar el texto antes de insertarlo en el HTML.
     */
    static sanitizeHTML(str) {
        if (str === null || str === undefined) return '';
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    /**
     * Valida que una nota esté dentro de un rango permitido (0 a 100).
     */
    static validateGrade(gradeStr) {
        if (!gradeStr || gradeStr === "" || gradeStr === "-") return { valid: true, value: null };
        const val = parseInt(gradeStr);
        if (isNaN(val) || val < 0 || val > 100) return { valid: false, error: 'Nota de 0 a 100.' };
        return { valid: true, value: val };
    }

    /**
     * Valida y sanitiza los datos de ingreso de un nuevo estudiante o edición.
     */
    static validateStudentData(data) {
        let errors = [];
        if (!data.fullName || data.fullName.trim().length <= 2) {
            errors.push('El nombre completo debe tener al menos 3 caracteres.');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            sanitized: {
                ...data,
                fullName: this.sanitizeHTML(data.fullName.trim()),
                observation: this.sanitizeHTML(data.observation ? data.observation.trim() : ''),
                advisorName: this.sanitizeHTML(data.advisorName ? data.advisorName.trim() : '-')
            }
        };
    }

    /**
     * Comprueba que la sesión actual siga activa.
     */
    static isSessionValid() {
        if (!window.db) return false;
        const user = window.db.getCurrentUser();
        return user !== null;
    }
}
