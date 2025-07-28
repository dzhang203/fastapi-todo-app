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
        
        // Apply initial ordering (incomplete first, then completed)
        reorderTodos();
        
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
        
        // Add new todo at the end of incomplete tasks (before completed tasks)
        const incompleteCount = todos.filter(todo => !todo.completed).length;
        todos.splice(incompleteCount, 0, newTodo);
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
async function updateTodo(todoId, updates, skipRender = false) {
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
            // Preserve frontend-specific fields like originalPosition before updating
            const originalPosition = todos[index].originalPosition;
            todos[index] = updatedTodo;
            
            // Restore frontend-specific fields
            if (originalPosition !== undefined) {
                todos[index].originalPosition = originalPosition;
            }
            
            // Only render if not skipping (when called from completion toggle, we skip to avoid double rendering)
            if (!skipRender) {
                renderTodos();
                updateStats();
            }
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
        const todoIndex = todos.findIndex(todo => todo.id === parseInt(todoId));
        const todo = todos[todoIndex];
        
        if (!todo) return;
        
        // If marking as complete, store the position among INCOMPLETE tasks only
        if (completed) {
            // Count how many incomplete tasks come before this one
            const incompleteBefore = todos.slice(0, todoIndex).filter(t => !t.completed).length;
            todo.originalPosition = incompleteBefore;
            console.log(`Marking task "${todo.content}" complete. Original position among incomplete: ${incompleteBefore}`);
        }
        
        // Update the todo in backend (skip rendering since reorderTodos will handle it)
        await updateTodo(todoId, { completed: completed }, true);
        
        // Reorder todos after successful update
        reorderTodos();
        
    } catch (error) {
        // Revert the checkbox if the update failed
        const completionIcon = document.querySelector(`[data-todo-id="${todoId}"] .completion-icon`);
        if (completionIcon) {
            // Revert the visual state
            const todoItem = completionIcon.closest('.todo-item');
            if (completed) {
                todoItem.classList.remove('completed');
            } else {
                todoItem.classList.add('completed');
            }
        }
    }
}

// Handle editing a todo item
function handleEditTodo(todoId) {
    const todoElement = document.querySelector(`[data-todo-id="${todoId}"]`);
    const todoText = todoElement.querySelector('.todo-text');
    const editInput = todoElement.querySelector('.todo-edit-input');
    
    // Hide the todo text and show the edit input
    todoText.classList.add('hidden');
    editInput.classList.remove('hidden');
    
    // Populate the edit input with current text and focus it
    editInput.value = todoText.textContent;
    editInput.focus();
    editInput.select();  // Select all text for easy editing
    
    // Function to save changes
    async function saveChanges() {
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
    }
    
    // Function to cancel editing
    function cancelEdit() {
        hideEditForm(todoElement);
    }
    
    // Handle Enter key to save, Escape key to cancel
    editInput.onkeydown = function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveChanges();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
    };
    
    // Handle click outside to save changes
    function handleClickOutside(e) {
        // Check if click is outside the edit input
        if (!editInput.contains(e.target) && e.target !== todoText) {
            saveChanges();
            // Remove the event listener after use
            document.removeEventListener('click', handleClickOutside);
        }
    }
    
    // Add click outside listener after a short delay to prevent immediate trigger
    setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
    }, 100);
    
    // Handle blur event (when input loses focus) as backup
    editInput.onblur = function() {
        // Small delay to allow click events to process first
        setTimeout(() => {
            if (!editInput.classList.contains('hidden')) {
                saveChanges();
            }
        }, 150);
    };
}

// Helper function to hide edit input and show todo text
function hideEditForm(todoElement) {
    const todoText = todoElement.querySelector('.todo-text');
    const editInput = todoElement.querySelector('.todo-edit-input');
    
    todoText.classList.remove('hidden');
    editInput.classList.add('hidden');
    
    // Clean up event listeners to prevent memory leaks
    editInput.onkeydown = null;
    editInput.onblur = null;
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
TODO REORDERING FUNCTION
Implements smart task ordering: incomplete tasks first, then completed tasks
When marking complete: moves to top of completed section
When marking incomplete: restores to original position
*/

function reorderTodos() {
    // Create arrays to track todos by status
    let incomplete = [];
    let completed = [];
    let toRestore = []; // Tasks that need to be restored to specific positions
    
    // Separate todos and identify those that need position restoration
    todos.forEach(todo => {
        if (todo.completed) {
            completed.push(todo);
        } else {
            // If this todo has an originalPosition, it needs to be restored
            if (todo.originalPosition !== undefined) {
                toRestore.push({
                    todo: todo,
                    targetPosition: todo.originalPosition
                });
                delete todo.originalPosition;
            } else {
                incomplete.push(todo);
            }
        }
    });
    
    // Insert restored todos back into their original positions
    toRestore.forEach(({ todo, targetPosition }) => {
        // Insert at the correct position among incomplete tasks
        incomplete.splice(targetPosition, 0, todo);
    });
    
    // Sort completed todos by most recently completed first
    completed.sort((a, b) => {
        // For now, maintain the order they were completed
        return 0;
    });
    
    // Combine: incomplete tasks first, then completed tasks
    todos = [...incomplete, ...completed];
    
    // Re-render the UI with new order
    renderTodos();
    updateStats();
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
    const completionIcon = todoElement.querySelector('.completion-icon');
    const todoText = todoElement.querySelector('.todo-text');
    const todoEditInput = todoElement.querySelector('.todo-edit-input');
    const deleteBtn = todoElement.querySelector('.delete-btn');
    
    // Set up the todo item with data
    listItem.setAttribute('data-todo-id', todo.id);  // For easy lookup later
    todoText.textContent = todo.content;
    
    // Add completed class if todo is done - for CSS styling
    if (todo.completed) {
        listItem.classList.add('completed');
    }
    
    // Set up event listeners for this specific todo
    completionIcon.addEventListener('click', () => {
        handleToggleComplete(todo.id, !todo.completed);
    });
    
    // Click-to-edit functionality - click on text to start editing
    todoText.addEventListener('click', () => {
        handleEditTodo(todo.id);
    });
    
    deleteBtn.addEventListener('click', () => {
        handleDeleteTodo(todo.id);
    });
    
    return todoElement;
}

// Update the statistics display - like calculating summary statistics
function updateStats() {
    // Stats removed from new design
    // Could be used for other purposes like updating document title
    const total = todos.length;
    const completed = todos.filter(todo => todo.completed).length;
    
    // Update document title with stats
    document.title = `Todo List App (${completed}/${total})`;
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