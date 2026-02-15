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
        this.populateCategoryOptions();
        this.checkNotificationPermission();
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
        this.loadTasks();
        this.setupServiceWorker();
    }

    // Initialize IndexedDB
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('TaskPlannerDB', 2); // Version 2 for new schema

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;
                
                if (!db.objectStoreNames.contains('tasks')) {
                    // Create new store
                    const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
                    taskStore.createIndex('date', 'date', { unique: false });
                    taskStore.createIndex('hour', 'hour', { unique: false });
                    taskStore.createIndex('isCompleted', 'isCompleted', { unique: false });
                    taskStore.createIndex('category', 'category', { unique: false });
                    taskStore.createIndex('priority', 'priority', { unique: false });
                    taskStore.createIndex('isUnscheduled', 'isUnscheduled', { unique: false });
                } else if (oldVersion < 2) {
                    // Upgrade existing store
                    const transaction = event.target.transaction;
                    const taskStore = transaction.objectStore('tasks');
                    
                    // Add new indexes
                    if (!taskStore.indexNames.contains('category')) {
                        taskStore.createIndex('category', 'category', { unique: false });
                    }
                    if (!taskStore.indexNames.contains('priority')) {
                        taskStore.createIndex('priority', 'priority', { unique: false });
                    }
                    if (!taskStore.indexNames.contains('isUnscheduled')) {
                        taskStore.createIndex('isUnscheduled', 'isUnscheduled', { unique: false });
                    }
                    
                    // Migrate existing tasks - convert hour to minutes
                    taskStore.openCursor().onsuccess = (e) => {
                        const cursor = e.target.result;
                        if (cursor) {
                            const task = cursor.value;
                            // Convert old hour format (0-23) to minutes (0-1439)
                            if (task.hour !== null && task.hour !== undefined && task.hour !== -1 && task.hour < 60) {
                                task.hour = task.hour * 60; // Convert hours to minutes
                            }
                            // Add new fields with defaults
                            if (!task.category) task.category = null;
                            if (!task.priority) task.priority = null;
                            if (!task.color) task.color = null;
                            if (task.isUnscheduled === undefined) task.isUnscheduled = false;
                            cursor.update(task);
                            cursor.continue();
                        }
                    };
                }
            };
        });
    }
    
    // Category definitions with colors
    getCategories() {
        return {
            'מטבח': { color: '#FFB74D', icon: '🍽️' },
            'סלון': { color: '#4FC3F7', icon: '🛋️' },
            'חדר שינה ראשי': { color: '#F48FB1', icon: '🛏️' },
            'חדר שינה': { color: '#F48FB1', icon: '🛏️' },
            'חדר ילדים': { color: '#90CAF9', icon: '🧸' },
            'ממ"ד': { color: '#A5D6A7', icon: '🛡️' },
            'שירותים': { color: '#81C784', icon: '🚿' },
            'חדר אוכל': { color: '#FFCC80', icon: '🍴' },
            'משימות כלליות': { color: '#CE93D8', icon: '🏠' },
            'אחר': { color: '#B0BEC5', icon: '📋' }
        };
    }
    
    // Priority definitions
    getPriorities() {
        return {
            'גבוהה': { color: '#FF3B30', icon: '🔴' },
            'בינונית': { color: '#FF9500', icon: '🟡' },
            'נמוכה': { color: '#34C759', icon: '🟢' }
        };
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
        
        // Category and priority filters
        document.getElementById('category-filter')?.addEventListener('change', (e) => {
            this.loadTasks();
        });
        document.getElementById('priority-filter')?.addEventListener('change', (e) => {
            this.loadTasks();
        });
        
        // Unscheduled checkbox
        document.getElementById('task-unscheduled')?.addEventListener('change', (e) => {
            const dateInput = document.getElementById('task-date');
            if (e.target.checked) {
                dateInput.disabled = true;
                dateInput.required = false;
            } else {
                dateInput.disabled = false;
                dateInput.required = true;
            }
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

    // Populate hour options - now with minutes (HH:MM)
    populateHourOptions() {
        const hourSelect = document.getElementById('task-hour');
        hourSelect.innerHTML = '<option value="">בחר שעה</option>';
        
        // Create options for every 15 minutes (00, 15, 30, 45)
        for (let hour = 0; hour < 24; hour++) {
            for (let minute = 0; minute < 60; minute += 15) {
                const option = document.createElement('option');
                const minutes = hour * 60 + minute;
                option.value = minutes;
                option.textContent = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                hourSelect.appendChild(option);
            }
        }
    }
    
    // Format minutes to HH:MM
    formatMinutes(minutes) {
        if (minutes === null || minutes === undefined || minutes === -1) return '';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
    
    // Populate category options
    populateCategoryOptions() {
        const categorySelect = document.getElementById('task-category');
        const categoryFilter = document.getElementById('category-filter');
        const categories = this.getCategories();
        
        Object.keys(categories).forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = `${categories[category].icon} ${category}`;
            categorySelect?.appendChild(option.cloneNode(true));
            categoryFilter?.appendChild(option);
        });
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
        const activeView = document.querySelector('.view.active');
        if (!activeView) return;
        
        // Show loading state
        let container;
        if (activeView.id === 'day-view') {
            container = document.getElementById('hourly-tasks');
        } else if (activeView.id === 'month-view') {
            container = document.getElementById('month-calendar');
        } else if (activeView.id === 'kanban-view') {
            container = document.getElementById('kanban-container');
        } else {
            container = document.getElementById('tasks-list');
        }
        
        if (container) {
            container.style.opacity = '0.5';
        }
        
        try {
            if (activeView.id === 'day-view') {
                await this.loadDayView();
            } else if (activeView.id === 'month-view') {
                await this.loadMonthView();
            } else if (activeView.id === 'kanban-view') {
                await this.loadKanbanView();
            } else {
                await this.loadListView();
            }
        } finally {
            if (container) {
                container.style.opacity = '1';
            }
        }
    }

    // Load Day View
    async loadDayView() {
        const tasks = await this.getTasksForDate(this.currentDate);
        
        // Tasks without hour (including unscheduled)
        const tasksWithoutHour = tasks.filter(t => (t.hour === null || t.hour === -1) && !t.isUnscheduled);
        const withoutHourContainer = document.getElementById('tasks-without-time');
        const withoutHourList = document.getElementById('tasks-without-time-list');
        
        if (tasksWithoutHour.length > 0) {
            withoutHourContainer.style.display = 'block';
            withoutHourList.innerHTML = tasksWithoutHour.map(task => this.renderTaskCard(task)).join('');
        } else {
            withoutHourContainer.style.display = 'none';
        }

        // Hourly tasks - group by hour (round down to nearest hour for display)
        const hourlyContainer = document.getElementById('hourly-tasks');
        hourlyContainer.innerHTML = '';
        
        let hasTasks = tasksWithoutHour.length > 0;
        
        // Group tasks by hour (0-23)
        const tasksByHour = {};
        tasks.forEach(task => {
            if (task.hour !== null && task.hour !== undefined && task.hour !== -1) {
                const hour = Math.floor(task.hour / 60);
                if (!tasksByHour[hour]) tasksByHour[hour] = [];
                tasksByHour[hour].push(task);
            }
        });
        
        // Sort tasks within each hour by minutes
        Object.keys(tasksByHour).forEach(hour => {
            tasksByHour[hour].sort((a, b) => (a.hour || 0) - (b.hour || 0));
        });
        
        // Display hourly sections
        for (let hour = 0; hour < 24; hour++) {
            if (tasksByHour[hour] && tasksByHour[hour].length > 0) {
                hasTasks = true;
                const hourSection = document.createElement('div');
                hourSection.className = 'hourly-section';
                hourSection.innerHTML = `
                    <div class="hourly-header">
                        <div class="hour-title">${hour.toString().padStart(2, '0')}:00</div>
                        <div class="hour-count">${tasksByHour[hour].length} משימות</div>
                    </div>
                    <div class="tasks-list">
                        ${tasksByHour[hour].map(task => this.renderTaskCard(task, false)).join('')}
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
        } else if (filter === 'unscheduled') {
            tasks = await this.getUnscheduledTasks();
        }

        // Apply category filter
        const categoryFilter = document.getElementById('category-filter')?.value;
        if (categoryFilter) {
            tasks = tasks.filter(t => t.category === categoryFilter);
        }

        // Apply priority filter
        const priorityFilter = document.getElementById('priority-filter')?.value;
        if (priorityFilter) {
            tasks = tasks.filter(t => t.priority === priorityFilter);
        }

        const tasksList = document.getElementById('tasks-list');
        const emptyState = document.getElementById('empty-list-state');

        if (tasks.length === 0) {
            tasksList.innerHTML = '';
            emptyState.style.display = 'flex';
        } else {
            emptyState.style.display = 'none';
            tasksList.innerHTML = tasks.map(task => this.renderTaskCard(task, false)).join('');
        }
    }
    
    // Load Month View
    async loadMonthView() {
        const tasks = await this.getTasksForMonth(this.currentYear, this.currentMonth);
        const calendar = document.getElementById('month-calendar');
        
        // Update month title
        const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 
                           'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
        document.getElementById('month-title').textContent = 
            `${monthNames[this.currentMonth]} ${this.currentYear}`;
        
        // Group tasks by date
        const tasksByDate = {};
        tasks.forEach(task => {
            const date = new Date(task.date);
            const dateKey = date.toISOString().split('T')[0];
            if (!tasksByDate[dateKey]) tasksByDate[dateKey] = [];
            tasksByDate[dateKey].push(task);
        });
        
        // Generate calendar
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDay = firstDay.getDay(); // 0 = Sunday, 6 = Saturday
        
        let html = '<div class="calendar-grid">';
        
        // Day headers
        const dayNames = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
        html += '<div class="calendar-week">';
        dayNames.forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });
        html += '</div>';
        
        // Calendar days
        let currentDate = 1;
        let week = 0;
        
        while (currentDate <= daysInMonth) {
            html += '<div class="calendar-week">';
            
            for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
                if (week === 0 && dayOfWeek < startDay) {
                    html += '<div class="calendar-day empty"></div>';
                } else if (currentDate > daysInMonth) {
                    html += '<div class="calendar-day empty"></div>';
                } else {
                    const dateKey = new Date(this.currentYear, this.currentMonth, currentDate).toISOString().split('T')[0];
                    const dayTasks = tasksByDate[dateKey] || [];
                    const taskCount = dayTasks.length;
                    const completedCount = dayTasks.filter(t => t.isCompleted).length;
                    
                    // Determine load level
                    let loadLevel = 'free';
                    if (taskCount > 5) loadLevel = 'busy';
                    else if (taskCount > 2) loadLevel = 'medium';
                    
                    const isToday = dateKey === new Date().toISOString().split('T')[0];
                    
                    html += `
                        <div class="calendar-day ${loadLevel} ${isToday ? 'today' : ''}" 
                             onclick="taskPlanner.selectDateFromCalendar('${dateKey}')">
                            <div class="calendar-day-number">${currentDate}</div>
                            ${taskCount > 0 ? `
                                <div class="calendar-day-tasks">
                                    <span class="task-count">${taskCount}</span>
                                    ${completedCount > 0 ? `<span class="completed-count">✓${completedCount}</span>` : ''}
                                </div>
                            ` : ''}
                        </div>
                    `;
                    currentDate++;
                }
            }
            
            html += '</div>';
            week++;
        }
        
        html += '</div>';
        calendar.innerHTML = html;
    }
    
    // Load Kanban View
    async loadKanbanView() {
        const container = document.getElementById('kanban-container');
        const today = new Date();
        const columns = [];
        
        // Create 7 columns (today + 6 days ahead)
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            columns.push(date);
        }
        
        let html = '<div class="kanban-board">';
        
        for (const date of columns) {
            const dateKey = date.toISOString().split('T')[0];
            const tasks = await this.getTasksForDate(date);
            const dateStr = date.toLocaleDateString('he-IL', { 
                weekday: 'short', 
                day: 'numeric', 
                month: 'numeric' 
            });
            const isToday = dateKey === today.toISOString().split('T')[0];
            
            html += `
                <div class="kanban-column ${isToday ? 'today-column' : ''}" 
                     data-date="${dateKey}"
                     ondragover="event.preventDefault(); event.currentTarget.classList.add('drag-over');"
                     ondragleave="event.currentTarget.classList.remove('drag-over');"
                     ondrop="taskPlanner.handleKanbanDrop(event, '${dateKey}')">
                    <div class="kanban-column-header">
                        <div class="kanban-date">${dateStr}</div>
                        <div class="kanban-count">${tasks.length} משימות</div>
                    </div>
                    <div class="kanban-tasks">
                        ${tasks.map(task => this.renderTaskCard(task, false)).join('')}
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        container.innerHTML = html;
    }
    
    // Month navigation
    previousMonth() {
        this.currentMonth--;
        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        this.loadTasks();
    }
    
    nextMonth() {
        this.currentMonth++;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        }
        this.loadTasks();
    }
    
    // Select date from calendar
    selectDateFromCalendar(dateKey) {
        const date = new Date(dateKey);
        this.currentDate = date;
        document.getElementById('date-picker').value = dateKey;
        
        // Switch to day view
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-tab="day"]').classList.add('active');
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.getElementById('day-view').classList.add('active');
        
        this.loadTasks();
    }
    
    // Handle Kanban drop
    async handleKanbanDrop(event, dateKey) {
        event.preventDefault();
        const taskId = event.dataTransfer.getData('text/plain');
        const task = await this.getTask(taskId);
        
        if (task) {
            const newDate = new Date(dateKey);
            task.date = newDate.getTime();
            task.isUnscheduled = false;
            await this.saveTaskToDB(task);
            await this.loadTasks();
            this.showFeedback('המשימה נדחתה בהצלחה');
        }
        
        // Reset dragging state
        document.querySelectorAll('.task-card').forEach(card => {
            card.classList.remove('dragging');
        });
        
        // Reset column drag-over state
        document.querySelectorAll('.kanban-column').forEach(col => {
            col.classList.remove('drag-over');
        });
    }

    // Render Task Card
    renderTaskCard(task, showDelete = false) {
        const dateStr = task.date && !task.isUnscheduled 
            ? new Date(task.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' })
            : null;
        const hourStr = this.formatMinutes(task.hour);
        
        // Category and priority badges
        const categoryInfo = task.category ? this.getCategories()[task.category] : null;
        const priorityInfo = task.priority ? this.getPriorities()[task.priority] : null;
        const taskColor = task.color || (categoryInfo ? categoryInfo.color : null);
        
        return `
            <div class="task-card ${task.isCompleted ? 'completed' : ''} ${task.isUnscheduled ? 'unscheduled' : ''}" 
                 data-task-id="${task.id}" 
                 draggable="true"
                 style="${taskColor ? `border-left: 4px solid ${taskColor};` : ''}"
                 ondragstart="taskPlanner.handleDragStart(event, '${task.id}')"
                 ondragend="event.currentTarget.classList.remove('dragging')">
                <div class="task-header">
                    <div class="task-checkbox ${task.isCompleted ? 'checked' : ''}" 
                         onclick="taskPlanner.toggleTask('${task.id}')"></div>
                    <div class="task-content">
                        <div class="task-title-row">
                            <div class="task-title ${task.isCompleted ? 'completed' : ''}">${this.escapeHtml(task.title)}</div>
                            ${categoryInfo ? `<span class="category-badge" style="background: ${categoryInfo.color}20; color: ${categoryInfo.color}; border: 1px solid ${categoryInfo.color};">${categoryInfo.icon}</span>` : ''}
                            ${priorityInfo ? `<span class="priority-badge" style="color: ${priorityInfo.color};">${priorityInfo.icon}</span>` : ''}
                        </div>
                        <div class="task-meta">
                            ${task.isUnscheduled ? '<span>⏳ מחכה לשיבוץ</span>' : ''}
                            ${dateStr ? `<span>📅 ${dateStr}</span>` : ''}
                            ${hourStr ? `<span class="task-hour">🕐 ${hourStr}</span>` : ''}
                        </div>
                        ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                    </div>
                </div>
                ${showDelete ? `
                <div class="task-actions">
                    ${!task.isCompleted ? `<button class="btn-base btn-secondary" onclick="taskPlanner.rescheduleTask('${task.id}')">תכנן מחדש</button>` : ''}
                </div>
                ` : ''}
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
                // Filter out unscheduled tasks
                const tasks = request.result
                    .filter(t => !t.isUnscheduled)
                    .sort((a, b) => {
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
    
    // Get Unscheduled Tasks
    async getUnscheduledTasks() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tasks'], 'readonly');
            const store = transaction.objectStore('tasks');
            const index = store.index('isUnscheduled');
            const request = index.getAll(true);

            request.onsuccess = () => {
                const tasks = request.result.sort((a, b) => {
                    return new Date(a.createdAt) - new Date(b.createdAt);
                });
                resolve(tasks);
            };

            request.onerror = () => reject(request.error);
        });
    }
    
    // Get Tasks for Month
    async getTasksForMonth(year, month) {
        return new Promise((resolve, reject) => {
            const startOfMonth = new Date(year, month, 1);
            startOfMonth.setHours(0, 0, 0, 0);
            const endOfMonth = new Date(year, month + 1, 0);
            endOfMonth.setHours(23, 59, 59, 999);

            const transaction = this.db.transaction(['tasks'], 'readonly');
            const store = transaction.objectStore('tasks');
            const index = store.index('date');
            const range = IDBKeyRange.bound(startOfMonth.getTime(), endOfMonth.getTime());
            const request = index.getAll(range);

            request.onsuccess = () => {
                const tasks = request.result.filter(t => !t.isUnscheduled);
                resolve(tasks);
            };

            request.onerror = () => reject(request.error);
        });
    }
    
    // Drag and Drop handlers
    handleDragStart(event, taskId) {
        event.dataTransfer.setData('text/plain', taskId);
        event.dataTransfer.effectAllowed = 'move';
        event.currentTarget.classList.add('dragging');
    }
    
    async handleDrop(event, targetTaskId) {
        event.preventDefault();
        // This is for dropping on another task card - not used in current implementation
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
        if (!title) {
            // Visual feedback for empty title
            const titleInput = document.getElementById('task-title');
            titleInput.style.borderColor = 'var(--danger-color)';
            setTimeout(() => {
                titleInput.style.borderColor = '';
            }, 2000);
            return;
        }
        
        // Show loading state
        const submitBtn = document.querySelector('#task-form button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        submitBtn.textContent = 'שומר...';

        const description = document.getElementById('task-description').value.trim() || null;
        const date = new Date(document.getElementById('task-date').value);
        const hasHour = document.getElementById('has-hour').checked;
        const hour = hasHour ? parseInt(document.getElementById('task-hour').value) : null;
        const hasReminder = document.getElementById('has-reminder').checked;
        const reminderDate = hasReminder ? new Date(document.getElementById('reminder-date').value) : null;
        const category = document.getElementById('task-category')?.value || null;
        const priority = document.getElementById('task-priority')?.value || null;
        const isUnscheduled = document.getElementById('task-unscheduled')?.checked || false;
        
        // Get color from category
        const categoryInfo = category ? this.getCategories()[category] : null;
        const color = categoryInfo ? categoryInfo.color : null;

        const task = {
            id: this.currentTask ? this.currentTask.id : this.generateId(),
            title,
            description,
            date: isUnscheduled ? null : date.getTime(),
            hour: hour !== null ? hour : -1,
            // If rescheduling (date changed), mark as incomplete
            isCompleted: this.currentTask && this.currentTask.date === date.getTime() ? this.currentTask.isCompleted : false,
            reminderDate: reminderDate ? reminderDate.getTime() : null,
            createdAt: this.currentTask ? this.currentTask.createdAt : Date.now(),
            originalDate: this.currentTask && this.currentTask.originalDate ? this.currentTask.originalDate : (isUnscheduled ? null : date.getTime()),
            category,
            priority,
            color,
            isUnscheduled
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

        // Reset button state
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        submitBtn.textContent = originalText;
        
        closeTaskModal();
        await this.loadTasks();
        
        // Visual feedback - show success
        this.showFeedback('המשימה נשמרה בהצלחה!');
    }
    
    // Show feedback message
    showFeedback(message, type = 'success') {
        const feedback = document.createElement('div');
        feedback.textContent = message;
        const bgColor = type === 'error' ? 'var(--danger-color)' : 'var(--success-color)';
        feedback.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            left: 20px;
            background: ${bgColor};
            color: white;
            padding: 16px;
            border-radius: 10px;
            text-align: center;
            font-weight: 600;
            z-index: 2000;
            animation: slideIn 0.3s ease-out;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        `;
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => feedback.remove(), 300);
        }, 2000);
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
        await this.loadTasks();
        
        // Visual feedback
        const message = task.isCompleted ? 'משימה הושלמה! ✓' : 'משימה בוטלה';
        this.showFeedback(message);
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

            request.onsuccess = async () => {
                await this.loadTasks();
                this.showFeedback('המשימה נמחקה');
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
            
            // Set category and priority
            if (document.getElementById('task-category')) {
                document.getElementById('task-category').value = task.category || '';
            }
            if (document.getElementById('task-priority')) {
                document.getElementById('task-priority').value = task.priority || '';
            }
            if (document.getElementById('task-unscheduled')) {
                document.getElementById('task-unscheduled').checked = task.isUnscheduled || false;
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
    
    // Import Passover Tasks
    async importPassoverTasks() {
        const fileInput = document.getElementById('import-file');
        const file = fileInput.files[0];
        
        if (!file) {
            this.showFeedback('אנא בחר קובץ לייבוא', 'error');
            return;
        }
        
        try {
            const text = await file.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            
            // Find all room cards
            const roomCards = doc.querySelectorAll('.room-card');
            let importedCount = 0;
            
            for (const roomCard of roomCards) {
                const roomTitleElement = roomCard.querySelector('.room-title');
                if (!roomTitleElement) continue;
                
                // Get room title - remove emoji if present
                let roomTitle = roomTitleElement.textContent.trim();
                roomTitle = roomTitle.replace(/[🍽️🛋️🛏️🧸🛡️🚿🍴🏠]/g, '').trim();
                
                // Map room titles to categories
                let category = 'אחר';
                if (roomTitle.includes('מטבח')) category = 'מטבח';
                else if (roomTitle.includes('סלון')) category = 'סלון';
                else if (roomTitle.includes('חדר שינה ראשי') || (roomTitle.includes('חדר שינה') && !roomTitle.includes('ילדים'))) {
                    category = 'חדר שינה ראשי';
                }
                else if (roomTitle.includes('חדר ילדים')) category = 'חדר ילדים';
                else if (roomTitle.includes('ממ"ד')) category = 'ממ"ד';
                else if (roomTitle.includes('שירותים')) category = 'שירותים';
                else if (roomTitle.includes('חדר אוכל')) category = 'חדר אוכל';
                else if (roomTitle.includes('כלליות') || roomTitle.includes('כללי')) category = 'משימות כלליות';
                
                const categoryInfo = this.getCategories()[category];
                const color = categoryInfo ? categoryInfo.color : null;
                
                // Get all task inputs
                const taskItems = roomCard.querySelectorAll('.task-item');
                for (const taskItem of taskItems) {
                    const input = taskItem.querySelector('.task-input');
                    const checkbox = taskItem.querySelector('.task-checkbox');
                    
                    // Get task text - check value first, then placeholder
                    let taskText = '';
                    if (input) {
                        // Try value first (for filled inputs)
                        taskText = input.value || input.getAttribute('value') || '';
                        
                        // If empty, use placeholder as task text (common in Passover checklist)
                        if (!taskText.trim() && input.placeholder) {
                            const placeholder = input.placeholder.trim();
                            // Use placeholder if it's not a generic placeholder
                            if (placeholder && 
                                !placeholder.includes('הזן') && 
                                !placeholder.includes('הכנס') && 
                                !placeholder.includes('אופציונלי') &&
                                !placeholder.includes('...')) {
                                taskText = placeholder;
                            }
                        }
                    }
                    
                    // Only import if there's actual task text
                    if (taskText.trim()) {
                        const task = {
                            id: this.generateId(),
                            title: taskText.trim(),
                            description: null,
                            date: null,
                            hour: -1,
                            isCompleted: checkbox ? checkbox.checked : false,
                            reminderDate: null,
                            createdAt: Date.now(),
                            originalDate: null,
                            category,
                            priority: null,
                            color,
                            isUnscheduled: true
                        };
                        
                        await this.saveTaskToDB(task);
                        importedCount++;
                    }
                }
            }
            
            closeImportModal();
            await this.loadTasks();
            
            if (importedCount > 0) {
                this.showFeedback(`יובאו ${importedCount} משימות בהצלחה! המשימות נמצאות ב-"משימות מחכות לשיבוץ"`);
            } else {
                this.showFeedback('לא נמצאו משימות לייבוא. ודא שהקובץ מכיל משימות עם טקסט', 'error');
            }
        } catch (error) {
            console.error('Import error:', error);
            this.showFeedback('שגיאה בייבוא הקובץ. ודא שזה קובץ HTML תקין', 'error');
        }
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
    document.getElementById('task-unscheduled').checked = false;
    document.getElementById('hour-group').style.display = 'none';
    document.getElementById('reminder-group').style.display = 'none';
    document.getElementById('delete-task-section').style.display = 'none';
    document.getElementById('task-date').value = taskPlanner.currentDate.toISOString().split('T')[0];
    document.getElementById('task-date').disabled = false;
    document.getElementById('task-date').required = true;
    document.getElementById('task-modal').style.display = 'flex';
}

function showEditTaskModal(taskId) {
    taskPlanner.getTask(taskId).then(task => {
        if (!task) return;
        
        taskPlanner.currentTask = task;
        document.getElementById('modal-title').textContent = 'ערוך משימה';
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-description').value = task.description || '';
        
        if (task.date) {
            document.getElementById('task-date').value = new Date(task.date).toISOString().split('T')[0];
        }
        
        const hasHour = task.hour !== null && task.hour !== -1;
        document.getElementById('has-hour').checked = hasHour;
        document.getElementById('hour-group').style.display = hasHour ? 'block' : 'none';
        if (hasHour) {
            document.getElementById('task-hour').value = task.hour;
        }
        
        // Set category and priority
        if (document.getElementById('task-category')) {
            document.getElementById('task-category').value = task.category || '';
        }
        if (document.getElementById('task-priority')) {
            document.getElementById('task-priority').value = task.priority || '';
        }
        if (document.getElementById('task-unscheduled')) {
            document.getElementById('task-unscheduled').checked = task.isUnscheduled || false;
            const dateInput = document.getElementById('task-date');
            if (task.isUnscheduled) {
                dateInput.disabled = true;
                dateInput.required = false;
            } else {
                dateInput.disabled = false;
                dateInput.required = true;
            }
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

function showImportModal() {
    document.getElementById('import-modal').style.display = 'flex';
}

function closeImportModal() {
    document.getElementById('import-modal').style.display = 'none';
    document.getElementById('import-file').value = '';
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
