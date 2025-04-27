// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBmfpV_ntzb8JXd7vsOPtK0TYfYTGH2LlQ",
    authDomain: "revathi-duba.firebaseapp.com",
    projectId: "revathi-duba",
    storageBucket: "revathi-duba.firebasestorage.app",
    messagingSenderId: "243138013755",
    appId: "1:243138013755:web:42a4584d140a872e12ca1e",
    measurementId: "G-B063KWXXDB"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
let currentUser = {
    uid: localStorage.getItem('userToken') || generateUserToken()
};
let currentCollection = "all";
let currentTab = "all";
let currentEditId = null;
let selectedColor = "#6366f1";
let isEditMode = false;
let items = [];
let collections = [];

// DOM Elements
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menu-toggle');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const createBtn = document.getElementById('create-btn');
const emptyCreateBtn = document.getElementById('empty-create-btn');
const createModal = document.getElementById('create-modal');
const createModalClose = document.getElementById('create-modal-close');
const saveBtn = document.getElementById('save-btn');
const cancelBtn = document.getElementById('cancel-btn');
const modalTabs = document.querySelectorAll('.modal-tabs .tab');
const noteForm = document.getElementById('note-form');
const taskForm = document.getElementById('task-form');
const addCollectionBtn = document.getElementById('add-collection-btn');
const collectionModal = document.getElementById('collection-modal');
const collectionModalClose = document.getElementById('collection-modal-close');
const collectionSaveBtn = document.getElementById('collection-save-btn');
const collectionCancelBtn = document.getElementById('collection-cancel-btn');
const viewModal = document.getElementById('view-modal');
const viewModalClose = document.getElementById('view-modal-close');
const viewCloseBtn = document.getElementById('view-close-btn');
const viewEditBtn = document.getElementById('view-edit-btn');
const searchInput = document.getElementById('search-input');
const tabs = document.querySelectorAll('#tabs .tab');
const cardsContainer = document.getElementById('cards-container');
const addTaskBtn = document.getElementById('add-task-btn');
const newTaskInput = document.getElementById('new-task-input');
const taskList = document.getElementById('task-list');
const loadingSpinner = document.getElementById('loading-spinner');
const emptyState = document.getElementById('empty-state');
const collectionsListContainer = document.getElementById('collections-list');
const navLinks = document.querySelectorAll('.nav-link');
const colorOptions = document.querySelectorAll('.color-option');
const editorButtons = document.querySelectorAll('.editor-btn');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

function generateUserToken() {
    const token = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('userToken', token);
    return token;
}

firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }
    currentUser = user;
    loadUserData();
});

function loadUserData() {
    db.collection('users').doc(currentUser.uid).get()
        .then((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                // Store user data or update UI as needed
                loadCollections();
                loadItems();
            } else {
                console.error('No user data found');
            }
        })
        .catch((error) => {
            console.error('Error loading user data:', error);
        });
}

function initializeApp() {
    // Check for saved theme preference
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    // Only load data if user is authenticated
    if (currentUser) {
        showLoading();
        loadCollections();
        loadItems();
    }
}

function setupEventListeners() {
    // Mobile menu toggle
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    // Dark mode toggle
    darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('darkMode', 'true');
            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            localStorage.setItem('darkMode', 'false');
            darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
    });

    // Create button
    createBtn.addEventListener('click', () => openCreateModal());
    emptyCreateBtn.addEventListener('click', () => openCreateModal());

    // Modal close buttons
    createModalClose.addEventListener('click', () => closeCreateModal());
    cancelBtn.addEventListener('click', () => closeCreateModal());
    collectionModalClose.addEventListener('click', () => closeCollectionModal());
    collectionCancelBtn.addEventListener('click', () => closeCollectionModal());
    viewModalClose.addEventListener('click', () => closeViewModal());
    viewCloseBtn.addEventListener('click', () => closeViewModal());

    // Save buttons
    saveBtn.addEventListener('click', saveItem);
    collectionSaveBtn.addEventListener('click', saveCollection);

    // Edit button
    viewEditBtn.addEventListener('click', editCurrentItem);

    // Modal tabs
    modalTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            modalTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            if (tab.dataset.target === 'note') {
                noteForm.style.display = 'block';
                taskForm.style.display = 'none';
            } else {
                noteForm.style.display = 'none';
                taskForm.style.display = 'block';
            }
        });
    });

    // Collection button
    addCollectionBtn.addEventListener('click', () => openCollectionModal());

    // Filter tabs
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.dataset.filter;
            filterItems();
        });
    });

    // Search input
    searchInput.addEventListener('input', debounce(() => {
        filterItems();
    }, 300));

    // Add task button
    addTaskBtn.addEventListener('click', addNewTask);
    newTaskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addNewTask();
        }
    });

    // Nav links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            currentCollection = link.dataset.section;
            filterItems();
        });
    });

    // Color options
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            colorOptions.forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            selectedColor = option.dataset.color;
        });
    });

    // Editor buttons
    editorButtons.forEach(button => {
        button.addEventListener('click', () => {
            const command = button.dataset.command;
            if (command === 'createLink') {
                const url = prompt('Enter the link URL:');
                if (url) document.execCommand(command, false, url);
            } else {
                document.execCommand(command, false, null);
            }
        });
    });

    // Add logout button event listener
    document.getElementById('logout-btn').addEventListener('click', () => {
        firebase.auth().signOut()
            .then(() => {
                window.location.href = 'auth.html';
            })
            .catch((error) => {
                console.error('Error signing out:', error);
            });
    });
}

// Firebase Functions
function loadCollections() {
    db.collection('collections')
        .where('userId', '==', currentUser.uid)
        .orderBy('createdAt', 'desc')
        .get()
        .then((querySnapshot) => {
            collections = [];
            collectionsListContainer.innerHTML = '';

            querySnapshot.forEach((doc) => {
                const collection = { id: doc.id, ...doc.data() };
                collections.push(collection);

                const collectionEl = document.createElement('div');
                collectionEl.className = 'collection-item';
                collectionEl.dataset.id = collection.id;
                collectionEl.innerHTML = `
                    <div class="collection-color" style="background-color: ${collection.color}"></div>
                    <div class="collection-name">${collection.name}</div>
                `;
                collectionEl.addEventListener('click', () => {
                    currentCollection = collection.id;
                    navLinks.forEach(l => l.classList.remove('active'));
                    filterItems();
                });

                collectionsListContainer.appendChild(collectionEl);
            });
        })
        .catch((error) => {
            console.error('Error loading collections:', error);
            hideLoading();
        });
}

function loadItems() {
    showLoading();

    db.collection('items')
        .where('userId', '==', currentUser.uid)
        .where('isDeleted', '==', false)
        .orderBy('updatedAt', 'desc')
        .get()
        .then((querySnapshot) => {
            items = [];

            querySnapshot.forEach((doc) => {
                const item = { id: doc.id, ...doc.data() };
                items.push(item);
            });

            filterItems();
            hideLoading();
        })
        .catch((error) => {
            console.error('Error loading items:', error);
            hideLoading();
        });
}

function saveItem() {
    saveItemToFirebase();
}

function saveItemToFirebase() {
    const data = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: currentUser.displayName,
        type: document.querySelector('.modal-tabs .tab.active').dataset.target,
        color: selectedColor,
        isArchived: false,
        isDeleted: false,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (data.type === 'note') {
        const title = document.getElementById('note-title').value;
        const content = document.getElementById('note-content').innerHTML;
        const tags = document.getElementById('note-tags').value.split(',')
            .map(tag => tag.trim())
            .filter(tag => tag);

        if (!title) {
            showToast('Please enter a title for your note', 'error');
            return;
        }

        data.title = title;
        data.content = content;
        data.tags = tags;
    } else {
        const title = document.getElementById('task-title').value;
        const tags = document.getElementById('task-tags').value.split(',')
            .map(tag => tag.trim())
            .filter(tag => tag);

        if (!title) {
            showToast('Please enter a title for your task list', 'error');
            return;
        }

        const taskItems = [];
        document.querySelectorAll('#task-list .task-item').forEach(taskItem => {
            taskItems.push({
                text: taskItem.querySelector('.task-text').textContent,
                completed: taskItem.querySelector('.task-checkbox').classList.contains('checked')
            });
        });

        data.title = title;
        data.tasks = taskItems;
        data.tags = tags;
    }

    showLoading();

    if (isEditMode && currentEditId) {
        // Update existing item
        db.collection('items').doc(currentEditId).update(data)
            .then(() => {
                loadItems();
                closeCreateModal();
            })
            .catch((error) => {
                console.error('Error updating item:', error);
                hideLoading();
            });
    } else {
        // Create new item
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();

        db.collection('items').add(data)
            .then(() => {
                loadItems();
                closeCreateModal();
            })
            .catch((error) => {
                console.error('Error saving item:', error);
                hideLoading();
            });
    }
}

function saveCollection() {
    const name = document.getElementById('collection-name').value;

    if (!name) {
        showToast('Please enter a name for your collection', 'error');
        return;
    }

    showLoading();

    db.collection('collections').add({
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: currentUser.displayName,
        name: name,
        color: selectedColor,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
        .then(() => {
            showToast('Collection created successfully', 'success');
            loadCollections();
            closeCollectionModal();
        })
        .catch((error) => {
            console.error('Error creating collection:', error);
            hideLoading();
        });
}

function addNewTask() {
    const taskText = newTaskInput.value.trim();

    if (!taskText) return;

    const taskItem = document.createElement('li');
    taskItem.className = 'task-item';
    taskItem.innerHTML = `
        <div class="task-checkbox"></div>
        <div class="task-text">${taskText}</div>
        <button class="task-delete" style="background: none; border: none; color: var(--gray-400); cursor: pointer;">
            <i class="fas fa-times"></i>
        </button>
    `;

    taskItem.querySelector('.task-checkbox').addEventListener('click', function () {
        this.classList.toggle('checked');
    });

    taskItem.querySelector('.task-delete').addEventListener('click', function () {
        taskItem.remove();
    });

    taskList.appendChild(taskItem);
    newTaskInput.value = '';
}

function filterItems() {
    const searchTerm = searchInput.value.toLowerCase();
    let filteredItems = items.filter(item => {
        // Filter by collection/section
        if (currentCollection !== 'all') {
            if (currentCollection === 'archive' && !item.isArchived) return false;
            if (currentCollection === 'trash' && !item.isDeleted) return false;
            if (currentCollection === 'notes' && item.type !== 'note') return false;
            if (currentCollection === 'tasks' && item.type !== 'task') return false;
        }

        // Filter by tab
        if (currentTab !== 'all') {
            if (currentTab === 'notes' && item.type !== 'note') return false;
            if (currentTab === 'tasks' && item.type !== 'task') return false;
        }

        // Filter by search term
        if (searchTerm) {
            const matchTitle = item.title.toLowerCase().includes(searchTerm);
            const matchContent = item.type === 'note' ?
                item.content.toLowerCase().includes(searchTerm) : false;
            const matchTags = item.tags ?
                item.tags.some(tag => tag.toLowerCase().includes(searchTerm)) : false;

            return matchTitle || matchContent || matchTags;
        }

        return true;
    });

    renderItems(filteredItems);
}

function renderItems(itemsToRender) {
    cardsContainer.innerHTML = '';

    if (itemsToRender.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    itemsToRender.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'card animate-slide';
        card.style.animationDelay = `${index * 0.05}s`;
        card.dataset.id = item.id;
        card.dataset.type = item.type;

        if (item.type === 'note') {
            // Create note card
            card.innerHTML = `
                <div class="card-color-tag" style="background-color: ${item.color}"></div>
                <div class="card-header">
                    <div>
                        <h3 class="card-title">${item.title}</h3>
                        <div class="card-date">${formatDate(item.createdAt?.toDate() || new Date())}</div>
                    </div>
                    <div class="card-menu">
                        <i class="fas fa-ellipsis-v"></i>
                    </div>
                </div>
                <div class="card-content">${stripHtml(item.content)}</div>
                <div class="card-footer">
                    <div class="card-tags">
                        ${item.tags && item.tags.length > 0 ?
                    item.tags.slice(0, 2).map(tag => `<div class="tag">${tag}</div>`).join('') :
                    '<div class="tag">No tags</div>'}
                    </div>
                </div>
            `;
        } else {
            // Create task card
            const completedTasks = item.tasks ? item.tasks.filter(task => task.completed).length : 0;
            const totalTasks = item.tasks ? item.tasks.length : 0;

            card.innerHTML = `
                <div class="card-color-tag" style="background-color: ${item.color}"></div>
                <div class="card-header">
                    <div>
                        <h3 class="card-title">${item.title}</h3>
                        <div class="card-date">${completedTasks}/${totalTasks} tasks completed</div>
                    </div>
                    <div class="card-menu">
                        <i class="fas fa-ellipsis-v"></i>
                    </div>
                </div>
                <ul class="task-list">
                    ${item.tasks ? item.tasks.slice(0, 3).map(task => `
                        <li class="task-item">
                            <div class="task-checkbox ${task.completed ? 'checked' : ''}"></div>
                            <div class="task-text">${task.text}</div>
                        </li>
                    `).join('') : ''}
                    ${item.tasks && item.tasks.length > 3 ? `
                        <li class="task-item" style="justify-content: center; color: var(--gray-400);">
                            ${item.tasks.length - 3} more tasks...
                        </li>
                    ` : ''}
                </ul>
                <div class="card-footer">
                    <div class="card-tags">
                        ${item.tags && item.tags.length > 0 ?
                    item.tags.slice(0, 2).map(tag => `<div class="tag">${tag}</div>`).join('') :
                    '<div class="tag">No tags</div>'}
                    </div>
                </div>
            `;
        }

        card.addEventListener('click', () => {
            viewItem(item);
        });

        cardsContainer.appendChild(card);
    });

    // Add animations
    gsap.from('.card', {
        y: 20,
        opacity: 0,
        stagger: 0.05,
        ease: 'power2.out',
        duration: 0.5
    });
}

function viewItem(item) {
    currentEditId = item.id;

    const modalBody = document.getElementById('view-modal-body');
    document.getElementById('view-modal-title').textContent = item.title;

    if (item.type === 'note') {
        modalBody.innerHTML = `
            <div style="color: ${item.color}; margin-bottom: 1rem;">
                <i class="far fa-sticky-note"></i> Note
            </div>
            <div style="margin-bottom: 1.5rem;">
                ${item.content}
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem;">
                ${item.tags && item.tags.length > 0 ?
                item.tags.map(tag => `<div class="tag">${tag}</div>`).join('') :
                '<div class="tag">No tags</div>'}
            </div>
            <div style="margin-top: 1.5rem; color: var(--gray-500); font-size: 0.9rem;">
                Created: ${formatDate(item.createdAt?.toDate() || new Date())}
            </div>
        `;
    } else {
        const completedTasks = item.tasks ? item.tasks.filter(task => task.completed).length : 0;
        const totalTasks = item.tasks ? item.tasks.length : 0;

        modalBody.innerHTML = `
            <div style="color: ${item.color}; margin-bottom: 1rem;">
                <i class="far fa-check-square"></i> Task List
            </div>
            <div style="margin-bottom: 1rem;">
                ${completedTasks}/${totalTasks} tasks completed
            </div>
            <ul class="task-list view-task-list">
                ${item.tasks ? item.tasks.map(task => `
                    <li class="task-item">
                        <div class="task-checkbox ${task.completed ? 'checked' : ''}"></div>
                        <div class="task-text">${task.text}</div>
                    </li>
                `).join('') : ''}
            </ul>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem;">
                ${item.tags && item.tags.length > 0 ?
                item.tags.map(tag => `<div class="tag">${tag}</div>`).join('') :
                '<div class="tag">No tags</div>'}
            </div>
            <div style="margin-top: 1.5rem; color: var(--gray-500); font-size: 0.9rem;">
                Created: ${formatDate(item.createdAt?.toDate() || new Date())}
            </div>
        `;
    }

    viewModal.classList.add('active');
}

function editCurrentItem() {
    const item = items.find(i => i.id === currentEditId);
    if (!item) return;

    isEditMode = true;
    closeViewModal();
    openCreateModal();

    // Set form values
    modalTabs.forEach(tab => {
        if (tab.dataset.target === item.type) {
            tab.click();
        }
    });

    if (item.type === 'note') {
        document.getElementById('note-title').value = item.title;
        document.getElementById('note-content').innerHTML = item.content;
        document.getElementById('note-tags').value = item.tags ? item.tags.join(', ') : '';
    } else {
        document.getElementById('task-title').value = item.title;
        document.getElementById('task-tags').value = item.tags ? item.tags.join(', ') : '';
        taskList.innerHTML = '';
        item.tasks.forEach(task => {
            const taskItem = document.createElement('li');
            taskItem.className = 'task-item';
            taskItem.innerHTML = `
                <div class="task-checkbox ${task.completed ? 'checked' : ''}"></div>
                <div class="task-text">${task.text}</div>
                <button class="task-delete">
                    <i class="fas fa-times"></i>
                </button>
            `;
            taskList.appendChild(taskItem);
        });
    }

    // Set color
    colorOptions.forEach(option => {
        if (option.dataset.color === item.color) {
            option.click();
        }
    });
}

// Helper Functions
function showToast(message, type = 'info') {
    // Log errors to console
    if (type === 'error') {
        console.error(message);
        return; // Don't show error toasts to user
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }, 100);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showLoading() {
    loadingSpinner.style.display = 'flex';
}

function hideLoading() {
    loadingSpinner.style.display = 'none';
}

function openCreateModal() {
    if (!isEditMode) {
        document.getElementById('note-title').value = '';
        document.getElementById('note-content').innerHTML = '';
        document.getElementById('note-tags').value = '';
        document.getElementById('task-title').value = '';
        document.getElementById('task-tags').value = '';
        taskList.innerHTML = '';
        currentEditId = null;
    }
    createModal.classList.add('active');
}

function closeCreateModal() {
    createModal.classList.remove('active');
    isEditMode = false;
}

function openCollectionModal() {
    document.getElementById('collection-name').value = '';
    collectionModal.classList.add('active');
}

function closeCollectionModal() {
    collectionModal.classList.remove('active');
}

function closeViewModal() {
    viewModal.classList.remove('active');
}