// Task Planner PWA - Main Application Logic

class TaskPlanner {
    constructor() {
        this.db = null;
        this.currentDate = new Date();
        this.currentTask = null;
        this.init();
    }

    async init() {
        await this.initDB();
        this.setupEventListeners();
        this.setupTabs();
        this.populateHourOptions();
        this.checkNotificationPermission();
        this.loadTasks();
        this.setupServiceWorker();
    }

    // Initialize IndexedDB
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('TaskPlannerDB', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('tasks')) {
                    const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
                    taskStore.createIndex('date', 'date', { unique: false });
                    taskStore.createIndex('hour', 'hour', { unique: false });
                    taskStore.createIndex('isCompleted', 'isCompleted', { unique: false });
                }
            };
        });
    }

    // Setup Service Worker
    async setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('service-worker.js');
                console.log('Service Worker registered:', registration);
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    // Setup Event Listeners
    setupEventListeners() {
        // Date picker
        const datePicker = document.getElementById('date-picker');
        const today = new Date().toISOString().split('T')[0];
        datePicker.value = today;
        datePicker.max = '2099-12-31';
        datePicker.addEventListener('change', (e) => {
            this.currentDate = new Date(e.target.value);
            this.loadTasks();
        });

        // Task form
        document.getElementById('task-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTask();
        });

        // Hour checkbox
        document.getElementById('has-hour').addEventListener('change', (e) => {
            document.getElementById('hour-group').style.display = e.target.checked ? 'block' : 'none';
        });

        // Reminder checkbox
        document.getElementById('has-reminder').addEventListener('change', (e) => {
            document.getElementById('reminder-group').style.display = e.target.checked ? 'block' : 'none';
        });

        // Filter
        document.getElementById('filter-select').addEventListener('change', (e) => {
            this.loadTasks();
        });

        // Add task button
        document.getElementById('add-task-btn').addEventListener('click', () => {
            showAddTaskModal();
        });
    }

    // Setup Tabs
    setupTabs() {
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                const tab = button.dataset.tab;
                
                // Update buttons
                document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Update views
                document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
                document.getElementById(`${tab}-view`).classList.add('active');
                
                this.loadTasks();
            });
        });
    }

    // Populate hour options
    populateHourOptions() {
        const hourSelect = document.getElementById('task-hour');
        for (let i = 0; i < 24; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i.toString().padStart(2, '0')}:00`;
            hourSelect.appendChild(option);
        }
    }

    // Check Notification Permission
    checkNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            document.getElementById('notification-banner').style.display = 'flex';
        }
    }

    // Request Notification Permission
    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                document.getElementById('notification-banner').style.display = 'none';
            }
        }
    }

    // Load Tasks
    async loadTasks() {
        const activeView = document.querySelector('.view.active').id;
        
        if (activeView === 'day-view') {
            await this.loadDayView();
        } else {
            await this.loadListView();
        }
    }

    // Load Day View
    async loadDayView() {
        const tasks = await this.getTasksForDate(this.currentDate);
        
        // Tasks without hour
        const tasksWithoutHour = tasks.filter(t => t.hour === null || t.hour === -1);
        const withoutHourContainer = document.getElementById('tasks-without-time');
        const withoutHourList = document.getElementById('tasks-without-time-list');
        
        if (tasksWithoutHour.length > 0) {
            withoutHourContainer.style.display = 'block';
            withoutHourList.innerHTML = tasksWithoutHour.map(task => this.renderTaskCard(task)).join('');
        } else {
            withoutHourContainer.style.display = 'none';
        }

        // Hourly tasks
        const hourlyContainer = document.getElementById('hourly-tasks');
        hourlyContainer.innerHTML = '';
        
        let hasTasks = tasksWithoutHour.length > 0;
        
        for (let hour = 0; hour < 24; hour++) {
            const hourTasks = tasks.filter(t => t.hour === hour);
            if (hourTasks.length > 0) {
                hasTasks = true;
                const hourSection = document.createElement('div');
                hourSection.className = 'hourly-section';
                hourSection.innerHTML = `
                    <div class="hourly-header">
                        <div class="hour-title">${hour.toString().padStart(2, '0')}:00</div>
                        <div class="hour-count">${hourTasks.length} משימות</div>
                    </div>
                    <div class="tasks-list">
                        ${hourTasks.map(task => this.renderTaskCard(task)).join('')}
                    </div>
                `;
                hourlyContainer.appendChild(hourSection);
            }
        }

        // Empty state
        const emptyState = document.getElementById('empty-state');
        emptyState.style.display = hasTasks ? 'none' : 'flex';
    }

    // Load List View
    async loadListView() {
        const filter = document.getElementById('filter-select').value;
        let tasks = [];

        if (filter === 'all') {
            tasks = await this.getAllTasks();
        } else if (filter === 'incomplete') {
            tasks = await this.getIncompleteTasks();
        } else if (filter === 'today') {
            tasks = await this.getTasksForDate(new Date());
        }

        const tasksList = document.getElementById('tasks-list');
        const emptyState = document.getElementById('empty-list-state');

        if (tasks.length === 0) {
            tasksList.innerHTML = '';
            emptyState.style.display = 'flex';
        } else {
            emptyState.style.display = 'none';
            tasksList.innerHTML = tasks.map(task => this.renderTaskCard(task)).join('');
        }
    }

    // Render Task Card
    renderTaskCard(task) {
        const date = new Date(task.date);
        const dateStr = date.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' });
        const hourStr = task.hour !== null && task.hour !== -1 ? `${task.hour.toString().padStart(2, '0')}:00` : '';
        
        return `
            <div class="task-card ${task.isCompleted ? 'completed' : ''}" data-task-id="${task.id}">
                <div class="task-header">
                    <div class="task-checkbox ${task.isCompleted ? 'checked' : ''}" 
                         onclick="taskPlanner.toggleTask('${task.id}')"></div>
                    <div class="task-content">
                        <div class="task-title ${task.isCompleted ? 'completed' : ''}">${this.escapeHtml(task.title)}</div>
                        <div class="task-meta">
                            <span>📅 ${dateStr}</span>
                            ${hourStr ? `<span class="task-hour">🕐 ${hourStr}</span>` : ''}
                        </div>
                        ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                    </div>
                </div>
                <div class="task-actions">
                    ${!task.isCompleted ? `<button class="btn-secondary" onclick="taskPlanner.rescheduleTask('${task.id}')" style="flex: 1; padding: 8px;">תכנן מחדש</button>` : ''}
                    <button class="btn-danger" onclick="taskPlanner.deleteTask('${task.id}')" style="flex: 1; padding: 8px;">מחק</button>
                </div>
            </div>
        `;
    }

    // Get Tasks for Date
    async getTasksForDate(date) {
        return new Promise((resolve, reject) => {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const transaction = this.db.transaction(['tasks'], 'readonly');
            const store = transaction.objectStore('tasks');
            const index = store.index('date');
            const range = IDBKeyRange.bound(startOfDay.getTime(), endOfDay.getTime());
            const request = index.getAll(range);

            request.onsuccess = () => {
                const tasks = request.result.sort((a, b) => {
                    if (a.hour !== b.hour) {
                        return (a.hour || -1) - (b.hour || -1);
                    }
                    return new Date(a.createdAt) - new Date(b.createdAt);
                });
                resolve(tasks);
            };

            request.onerror = () => reject(request.error);
        });
    }

    // Get All Tasks
    async getAllTasks() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tasks'], 'readonly');
            const store = transaction.objectStore('tasks');
            const request = store.getAll();

            request.onsuccess = () => {
                const tasks = request.result.sort((a, b) => {
                    const dateA = new Date(a.date);
                    const dateB = new Date(b.date);
                    if (dateA.getTime() !== dateB.getTime()) {
                        return dateA - dateB;
                    }
                    return (a.hour || -1) - (b.hour || -1);
                });
                resolve(tasks);
            };

            request.onerror = () => reject(request.error);
        });
    }

    // Get Incomplete Tasks
    async getIncompleteTasks() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tasks'], 'readonly');
            const store = transaction.objectStore('tasks');
            const index = store.index('isCompleted');
            const request = index.getAll(false);

            request.onsuccess = () => {
                const tasks = request.result.sort((a, b) => {
                    return new Date(a.date) - new Date(b.date);
                });
                resolve(tasks);
            };

            request.onerror = () => reject(request.error);
        });
    }

    // Save Task
    async saveTask() {
        const title = document.getElementById('task-title').value.trim();
        if (!title) return;

        const description = document.getElementById('task-description').value.trim() || null;
        const date = new Date(document.getElementById('task-date').value);
        const hasHour = document.getElementById('has-hour').checked;
        const hour = hasHour ? parseInt(document.getElementById('task-hour').value) : null;
        const hasReminder = document.getElementById('has-reminder').checked;
        const reminderDate = hasReminder ? new Date(document.getElementById('reminder-date').value) : null;

        const task = {
            id: this.currentTask ? this.currentTask.id : this.generateId(),
            title,
            description,
            date: date.getTime(),
            hour: hour !== null ? hour : -1,
            // If rescheduling (date changed), mark as incomplete
            isCompleted: this.currentTask && this.currentTask.date === date.getTime() ? this.currentTask.isCompleted : false,
            reminderDate: reminderDate ? reminderDate.getTime() : null,
            createdAt: this.currentTask ? this.currentTask.createdAt : Date.now(),
            originalDate: this.currentTask && this.currentTask.originalDate ? this.currentTask.originalDate : date.getTime()
        };

        // Cancel old notification if editing
        if (this.currentTask && this.currentTask.reminderDate) {
            this.cancelNotification(this.currentTask.id);
        }

        // Save to database
        await this.saveTaskToDB(task);

        // Schedule notification if needed
        if (reminderDate) {
            this.scheduleNotification(task);
        }

        closeTaskModal();
        this.loadTasks();
    }

    // Save Task to DB
    async saveTaskToDB(task) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tasks'], 'readwrite');
            const store = transaction.objectStore('tasks');
            const request = store.put(task);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Toggle Task
    async toggleTask(taskId) {
        const task = await this.getTask(taskId);
        if (!task) return;

        task.isCompleted = !task.isCompleted;
        await this.saveTaskToDB(task);
        this.loadTasks();
    }

    // Delete Task
    async deleteTask(taskId) {
        if (!confirm('האם אתה בטוח שברצונך למחוק את המשימה?')) return;

        // Cancel notification
        this.cancelNotification(taskId);

        // Delete from DB
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tasks'], 'readwrite');
            const store = transaction.objectStore('tasks');
            const request = store.delete(taskId);

            request.onsuccess = () => {
                this.loadTasks();
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Reschedule Task
    rescheduleTask(taskId) {
        this.getTask(taskId).then(task => {
            if (!task) return;
            
            // Use modal for better UX
            this.currentTask = task;
            document.getElementById('modal-title').textContent = 'תכנן מחדש';
            document.getElementById('task-title').value = task.title;
            document.getElementById('task-description').value = task.description || '';
            document.getElementById('task-date').value = new Date(task.date).toISOString().split('T')[0];
            
            const hasHour = task.hour !== null && task.hour !== -1;
            document.getElementById('has-hour').checked = hasHour;
            document.getElementById('hour-group').style.display = hasHour ? 'block' : 'none';
            if (hasHour) {
                document.getElementById('task-hour').value = task.hour;
            }
            
            document.getElementById('has-reminder').checked = false;
            document.getElementById('reminder-group').style.display = 'none';
            document.getElementById('delete-task-section').style.display = 'none';
            
            document.getElementById('task-modal').style.display = 'flex';
        });
    }

    // Get Task
    async getTask(taskId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tasks'], 'readonly');
            const store = transaction.objectStore('tasks');
            const request = store.get(taskId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Schedule Notification
    scheduleNotification(task) {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }

        if (!task.reminderDate) return;

        const reminderTime = new Date(task.reminderDate).getTime();
        const now = Date.now();

        if (reminderTime <= now) return;

        // Schedule notification
        const timeout = reminderTime - now;
        
        setTimeout(() => {
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('תזכורת משימה', {
                    body: task.title,
                    icon: 'icon-192.png',
                    badge: 'icon-192.png',
                    tag: task.id
                });
            }
        }, timeout);
    }

    // Cancel Notification
    cancelNotification(taskId) {
        // Notifications API doesn't support cancellation, but we can track it
        // In a real app, you'd use Service Worker notifications
    }

    // Generate ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global Functions
let taskPlanner;

function showAddTaskModal() {
    taskPlanner.currentTask = null;
    document.getElementById('modal-title').textContent = 'משימה חדשה';
    document.getElementById('task-form').reset();
    document.getElementById('has-hour').checked = false;
    document.getElementById('has-reminder').checked = false;
    document.getElementById('hour-group').style.display = 'none';
    document.getElementById('reminder-group').style.display = 'none';
    document.getElementById('delete-task-section').style.display = 'none';
    document.getElementById('task-date').value = taskPlanner.currentDate.toISOString().split('T')[0];
    document.getElementById('task-modal').style.display = 'flex';
}

function showEditTaskModal(taskId) {
    taskPlanner.getTask(taskId).then(task => {
        if (!task) return;
        
        taskPlanner.currentTask = task;
        document.getElementById('modal-title').textContent = 'ערוך משימה';
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-date').value = new Date(task.date).toISOString().split('T')[0];
        
        const hasHour = task.hour !== null && task.hour !== -1;
        document.getElementById('has-hour').checked = hasHour;
        document.getElementById('hour-group').style.display = hasHour ? 'block' : 'none';
        if (hasHour) {
            document.getElementById('task-hour').value = task.hour;
        }
        
        const hasReminder = task.reminderDate !== null;
        document.getElementById('has-reminder').checked = hasReminder;
        document.getElementById('reminder-group').style.display = hasReminder ? 'block' : 'none';
        if (hasReminder) {
            document.getElementById('reminder-date').value = new Date(task.reminderDate).toISOString().slice(0, 16);
        }
        
        document.getElementById('delete-task-section').style.display = 'block';
        document.getElementById('task-modal').style.display = 'flex';
    });
}

function closeTaskModal() {
    document.getElementById('task-modal').style.display = 'none';
    taskPlanner.currentTask = null;
}

function deleteCurrentTask() {
    if (taskPlanner.currentTask && confirm('האם אתה בטוח שברצונך למחוק את המשימה?')) {
        taskPlanner.deleteTask(taskPlanner.currentTask.id);
        closeTaskModal();
    }
}

function requestNotificationPermission() {
    taskPlanner.requestNotificationPermission();
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    taskPlanner = new TaskPlanner();
});

// Make task cards clickable to edit
document.addEventListener('click', (e) => {
    const taskCard = e.target.closest('.task-card');
    if (taskCard && !e.target.closest('.task-checkbox') && !e.target.closest('.task-actions')) {
        const taskId = taskCard.dataset.taskId;
        showEditTaskModal(taskId);
    }
});
