const API_BASE = 'http://localhost:5000/api/todos';
let currentFilter = 'all';

// DOM Elements
const todoList = document.getElementById('todoList');
const loading = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const todoTitle = document.getElementById('todoTitle');
const todoDescription = document.getElementById('todoDescription');
const todoPriority = document.getElementById('todoPriority');
const todoDueDate = document.getElementById('todoDueDate');

// Settings Elements
const settingsButton = document.getElementById('settingsButton');
const settingsPanel = document.getElementById('settingsPanel');
const themeSelect = document.getElementById('themeSelect');
const primaryColor = document.getElementById('primaryColor');
const fontFamily = document.getElementById('fontFamily');
const fontSize = document.getElementById('fontSize');
const closeSettings = document.getElementById('closeSettings');

// Set minimum date to today
todoDueDate.min = new Date().toISOString().split('T')[0];

// Load todos when page loads
document.addEventListener('DOMContentLoaded', loadTodos);

// Initialize UI settings and handlers
initConfig();

function initConfig() {
    // load saved settings
    loadSettings();

    // panel toggle
    if (settingsButton) settingsButton.addEventListener('click', () => toggleSettings(true));
    if (closeSettings) closeSettings.addEventListener('click', () => toggleSettings(false));

    // form controls
    if (themeSelect) themeSelect.addEventListener('change', () => applyAndSave());
    if (primaryColor) primaryColor.addEventListener('input', () => applyAndSave());
    if (fontFamily) fontFamily.addEventListener('change', () => applyAndSave());
    if (fontSize) fontSize.addEventListener('input', () => applyAndSave());

    function applyAndSave() {
        const s = {
            theme: themeSelect ? themeSelect.value : 'dark',
            color: primaryColor ? primaryColor.value : getComputedStyle(document.documentElement).getPropertyValue('--primary') || '#4CAF50',
            font: fontFamily ? fontFamily.value : document.body.style.fontFamily,
            size: fontSize ? fontSize.value : window.getComputedStyle(document.body).fontSize.replace('px', '')
        };
        applySettings(s);
        localStorage.setItem('todoUISettings', JSON.stringify(s));
    }
}

function toggleSettings(open) {
    if (!settingsPanel) return;
    settingsPanel.style.display = open ? 'block' : 'none';
    settingsPanel.setAttribute('aria-hidden', (!open).toString());
}

function loadSettings() {
    try {
        const raw = localStorage.getItem('todoUISettings');
        const s = raw ? JSON.parse(raw) : null;
        if (s) {
            if (themeSelect) themeSelect.value = s.theme || 'dark';
            if (primaryColor) primaryColor.value = s.color || '#4CAF50';
            if (fontFamily) fontFamily.value = s.font || 'Poppins';
            if (fontSize) fontSize.value = s.size || '16';
            applySettings(s);
        } else {
            // apply defaults
            applySettings({ theme: 'dark', color: '#4CAF50', font: 'Poppins', size: 16 });
        }
    } catch (e) {
        console.error('Failed to load settings', e);
    }
}

function applySettings(s) {
    if (!s) return;
    // theme
    if (s.theme === 'light') document.body.classList.add('light-theme'); else document.body.classList.remove('light-theme');

    // primary color
    if (s.color) document.documentElement.style.setProperty('--primary', s.color);

    // font
    if (s.font) document.body.style.fontFamily = s.font + ', system-ui, -apple-system';

    // font size
    if (s.size) document.body.style.fontSize = (s.size + 'px');
}

async function loadTodos() {
    try {
        loading.style.display = 'block';
        errorDiv.style.display = 'none';

        const response = await fetch(API_BASE);
        const todos = await response.json();

        displayTodos(todos);
    } catch (error) {
        showError('Failed to load todos: ' + error.message);
    } finally {
        loading.style.display = 'none';
    }
}

function displayTodos(todos) {
    const filteredTodos = todos.filter(todo => {
        switch (currentFilter) {
            case 'active': return !todo.completed;
            case 'completed': return todo.completed;
            default: return true;
        }
    });

    todoList.innerHTML = '';

    if (filteredTodos.length === 0) {
        todoList.innerHTML = '<div class="todo-item" style="text-align: center; justify-content: center;">No todos found</div>';
        return;
    }

    filteredTodos.forEach(todo => {
        const todoElement = createTodoElement(todo);
        todoList.appendChild(todoElement);
    });
}

function createTodoElement(todo) {
    const div = document.createElement('div');
    div.className = `todo-item ${todo.completed ? 'completed' : ''}`;

    const dueDate = todo.dueDate ? new Date(todo.dueDate).toLocaleDateString() : 'No due date';

    div.innerHTML = `
        <div class="todo-content">
            <div class="todo-title">${todo.title}</div>
            ${todo.description ? `<div class="todo-description">${todo.description}</div>` : ''}
            <div class="todo-meta">
                <span class="priority priority-${todo.priority}">${todo.priority.toUpperCase()}</span>
                <span>Due: ${dueDate}</span>
                <span>Created: ${new Date(todo.createdAt).toLocaleDateString()}</span>
            </div>
        </div>
        <div class="todo-actions">
            <button class="btn-complete" onclick="toggleTodo('${todo._id}', ${!todo.completed})">
                ${todo.completed ? 'Undo' : 'Complete'}
            </button>
            <button class="btn-edit" onclick="editTodo('${todo._id}')">Edit</button>
            <button class="btn-delete" onclick="deleteTodo('${todo._id}')">Delete</button>
        </div>
    `;

    return div;
}

async function addTodo() {
    const title = todoTitle.value.trim();
    if (!title) {
        showError('Title is required');
        return;
    }

    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: title,
                description: todoDescription.value.trim(),
                priority: todoPriority.value,
                dueDate: todoDueDate.value || null
            })
        });

        if (response.ok) {
            todoTitle.value = '';
            todoDescription.value = '';
            todoDueDate.value = '';
            loadTodos();
        } else {
            throw new Error('Failed to create todo');
        }
    } catch (error) {
        showError('Failed to add todo: ' + error.message);
    }
}

async function toggleTodo(id, completed) {
    try {
        const response = await fetch(`${API_BASE}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ completed })
        });

        if (response.ok) {
            loadTodos();
        } else {
            throw new Error('Failed to update todo');
        }
    } catch (error) {
        showError('Failed to update todo: ' + error.message);
    }
}

async function deleteTodo(id) {
    if (!confirm('Are you sure you want to delete this todo?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadTodos();
        } else {
            throw new Error('Failed to delete todo');
        }
    } catch (error) {
        showError('Failed to delete todo: ' + error.message);
    }
}

async function editTodo(id) {
    // Simple edit implementation - you can enhance this with a modal
    const newTitle = prompt('Enter new title:');
    if (newTitle) {
        try {
            const response = await fetch(`${API_BASE}/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title: newTitle })
            });

            if (response.ok) {
                loadTodos();
            } else {
                throw new Error('Failed to update todo');
            }
        } catch (error) {
            showError('Failed to edit todo: ' + error.message);
        }
    }
}

function filterTodos(filter) {
    currentFilter = filter;

    // Update active filter button
    document.querySelectorAll('.filters button').forEach(btn => btn.classList.remove('active'));
    // if called from inline handler, second arg can be the button element
    const btn = arguments[1];
    if (btn && btn.classList) btn.classList.add('active');
    loadTodos();
}

function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Add todo on Enter key press
todoTitle.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        addTodo();
    }
});
