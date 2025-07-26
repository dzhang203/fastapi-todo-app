/*
JAVASCRIPT LEARNING NOTES FOR PYTHON DEVELOPERS:
- JavaScript is like Python but runs in the browser
- async/await works similarly to Python's asyncio
- DOM manipulation is like modifying HTML elements programmatically
- fetch() is like requests.get()/post() for API calls
- Event listeners are like callback functions responding to user actions
*/

// API Configuration - like setting base URLs in Python requests
const API_BASE_URL = 'http://localhost:8000';

// DOM Element References - like getting handles to UI components
// Think of these as references to specific HTML elements we'll manipulate
const todoForm = document.getElementById('add-todo-form');
const todoInput = document.getElementById('todo-input');
const todosList = document.getElementById('todos-list');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error-message');
const emptyState = document.getElementById('empty-state');
const totalCountSpan = document.getElementById('total-count');
const completedCountSpan = document.getElementById('completed-count');
const todoTemplate = document.getElementById('todo-item-template');

// Application State - like global variables in Python
let todos = [];  // Array to store all todo items (like a list in Python)

/*
INITIALIZATION FUNCTION
This runs when the page loads - like if __name__ == "__main__" in Python
*/
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Todo app initialized');
    
    // Set up event listeners (like binding functions to UI events)
    setupEventListeners();
    
    // Load initial data from the API
    loadTodos();
});

/*
EVENT LISTENERS SETUP
Think of this like setting up callback functions for user interactions
Similar to how you might bind functions to button clicks in a GUI framework
*/
function setupEventListeners() {
    // Form submission - when user adds a new todo
    todoForm.addEventListener('submit', handleAddTodo);
}

/*
API FUNCTIONS
These functions communicate with your FastAPI backend
Think of them like Python functions that use the requests library
*/

// Load all todos from the API - like requests.get()
async function loadTodos() {
    try {
        showLoading(true);
        
        // fetch() is JavaScript's equivalent to requests.get()
        const response = await fetch(`${API_BASE_URL}/todos/`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Parse JSON response - like response.json() in Python requests
        const todosData = await response.json();
        
        // Update our local state
        todos = todosData;
        
        // Update the UI to show the todos
        renderTodos();
        updateStats();
        
    } catch (error) {
        console.error('❌ Error loading todos:', error);
        showError('Failed to load todos. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Create a new todo - like requests.post()
async function createTodo(content) {
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/todos/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // Convert JavaScript object to JSON - like json.dumps() in Python
            body: JSON.stringify({ content: content })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const newTodo = await response.json();
        
        // Add to local state and update UI
        todos.push(newTodo);
        renderTodos();
        updateStats();
        
        return newTodo;
        
    } catch (error) {
        console.error('❌ Error creating todo:', error);
        showError('Failed to create todo. Please try again.');
        throw error;
    } finally {
        showLoading(false);
    }
}

// Update an existing todo - like requests.put()
async function updateTodo(todoId, updates) {
    try {
        const response = await fetch(`${API_BASE_URL}/todos/${todoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const updatedTodo = await response.json();
        
        // Update local state - like updating a dictionary in a list
        const index = todos.findIndex(todo => todo.id === todoId);
        if (index !== -1) {
            todos[index] = updatedTodo;
            renderTodos();
            updateStats();
        }
        
        return updatedTodo;
        
    } catch (error) {
        console.error('❌ Error updating todo:', error);
        showError('Failed to update todo. Please try again.');
        throw error;
    }
}

// Delete a todo - like requests.delete()
async function deleteTodo(todoId) {
    try {
        const response = await fetch(`${API_BASE_URL}/todos/${todoId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Remove from local state - like list.remove() in Python
        todos = todos.filter(todo => todo.id !== todoId);
        renderTodos();
        updateStats();
        
    } catch (error) {
        console.error('❌ Error deleting todo:', error);
        showError('Failed to delete todo. Please try again.');
        throw error;
    }
}

/*
EVENT HANDLERS
These functions respond to user interactions - like callback functions
*/

// Handle form submission for adding new todos
async function handleAddTodo(event) {
    // Prevent the default form submission behavior (page refresh)
    event.preventDefault();
    
    const content = todoInput.value.trim();
    
    // Validation - like input validation in Python
    if (!content) {
        showError('Please enter a todo item.');
        return;
    }
    
    try {
        await createTodo(content);
        
        // Clear the input field - like resetting a variable
        todoInput.value = '';
        
        // Clear any previous error messages
        hideError();
        
    } catch (error) {
        // Error already handled in createTodo function
    }
}

// Handle checkbox toggle for completing todos
async function handleToggleComplete(todoId, completed) {
    try {
        await updateTodo(todoId, { completed: completed });
    } catch (error) {
        // Revert the checkbox if the update failed
        const checkbox = document.querySelector(`[data-todo-id="${todoId}"] .todo-checkbox`);
        if (checkbox) {
            checkbox.checked = !completed;
        }
    }
}

// Handle editing a todo item
function handleEditTodo(todoId) {
    const todoElement = document.querySelector(`[data-todo-id="${todoId}"]`);
    const todoText = todoElement.querySelector('.todo-text');
    const editForm = todoElement.querySelector('.edit-form');
    const editInput = todoElement.querySelector('.edit-input');
    
    // Hide the todo text and show the edit form
    todoText.style.display = 'none';
    editForm.style.display = 'block';
    
    // Populate the edit input with current text and focus it
    editInput.value = todoText.textContent;
    editInput.focus();
    editInput.select();  // Select all text for easy editing
    
    // Set up event listeners for the edit form
    const saveBtn = editForm.querySelector('.save-btn');
    const cancelBtn = editForm.querySelector('.cancel-btn');
    
    // Save changes
    saveBtn.onclick = async function(e) {
        e.preventDefault();
        const newContent = editInput.value.trim();
        
        if (!newContent) {
            showError('Todo content cannot be empty.');
            return;
        }
        
        try {
            await updateTodo(todoId, { content: newContent });
            hideEditForm(todoElement);
        } catch (error) {
            // Error already handled in updateTodo
        }
    };
    
    // Cancel editing
    cancelBtn.onclick = function(e) {
        e.preventDefault();
        hideEditForm(todoElement);
    };
    
    // Save on Enter key, cancel on Escape key
    editInput.onkeydown = function(e) {
        if (e.key === 'Enter') {
            saveBtn.click();
        } else if (e.key === 'Escape') {
            cancelBtn.click();
        }
    };
}

// Helper function to hide edit form and show todo text
function hideEditForm(todoElement) {
    const todoText = todoElement.querySelector('.todo-text');
    const editForm = todoElement.querySelector('.edit-form');
    
    todoText.style.display = '';
    editForm.style.display = 'none';
}

// Handle deleting a todo item
async function handleDeleteTodo(todoId) {
    // Show confirmation dialog - like input() in Python for user confirmation
    const confirmed = confirm('Are you sure you want to delete this todo?');
    
    if (confirmed) {
        await deleteTodo(todoId);
    }
}

/*
UI RENDERING FUNCTIONS
These functions update the HTML based on our data - like updating a GUI
Think of them as functions that translate Python data structures into visual elements
*/

// Main function to render all todos - like updating a display table
function renderTodos() {
    // Clear the current list
    todosList.innerHTML = '';
    
    if (todos.length === 0) {
        // Show empty state when no todos
        emptyState.style.display = 'block';
        return;
    }
    
    // Hide empty state when we have todos
    emptyState.style.display = 'none';
    
    // Create HTML for each todo - like iterating through a list in Python
    todos.forEach(todo => {
        const todoElement = createTodoElement(todo);
        todosList.appendChild(todoElement);
    });
}

// Create HTML element for a single todo - like creating a row in a table
function createTodoElement(todo) {
    // Clone the template - modern way to create consistent HTML structure
    const todoElement = todoTemplate.content.cloneNode(true);
    
    // Get references to elements within the cloned template
    const listItem = todoElement.querySelector('.todo-item');
    const checkbox = todoElement.querySelector('.todo-checkbox');
    const todoText = todoElement.querySelector('.todo-text');
    const editBtn = todoElement.querySelector('.edit-btn');
    const deleteBtn = todoElement.querySelector('.delete-btn');
    
    // Set up the todo item with data
    listItem.setAttribute('data-todo-id', todo.id);  // For easy lookup later
    checkbox.checked = todo.completed;
    todoText.textContent = todo.content;
    
    // Add completed class if todo is done - for CSS styling
    if (todo.completed) {
        listItem.classList.add('completed');
    }
    
    // Set up event listeners for this specific todo
    checkbox.addEventListener('change', () => {
        handleToggleComplete(todo.id, checkbox.checked);
    });
    
    editBtn.addEventListener('click', () => {
        handleEditTodo(todo.id);
    });
    
    deleteBtn.addEventListener('click', () => {
        handleDeleteTodo(todo.id);
    });
    
    return todoElement;
}

// Update the statistics display - like calculating summary statistics
function updateStats() {
    const total = todos.length;
    const completed = todos.filter(todo => todo.completed).length;
    
    totalCountSpan.textContent = `${total} total`;
    completedCountSpan.textContent = `${completed} completed`;
}

/*
UI STATE MANAGEMENT FUNCTIONS
These control the visibility and state of UI elements
*/

// Show/hide loading indicator
function showLoading(show) {
    if (show) {
        loadingDiv.classList.remove('hidden');
    } else {
        loadingDiv.classList.add('hidden');
    }
}

// Show error message
function showError(message) {
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    
    // Auto-hide error after 5 seconds
    setTimeout(hideError, 5000);
}

// Hide error message
function hideError() {
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';
}

/*
UTILITY FUNCTIONS
Helper functions for common tasks
*/

// Log function for debugging - like print() in Python
function log(message, data = null) {
    if (data) {
        console.log(`📝 ${message}:`, data);
    } else {
        console.log(`📝 ${message}`);
    }
}