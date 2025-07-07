from contextlib import asynccontextmanager
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException
from sqlmodel import Field, Session, SQLModel, create_engine, select


# --- Database Models ---

# Model for creation. User doesn't have to provide
# an ID or completion status for a new item, just content
class TodoItemCreate(SQLModel):
    content: str

# Model for updating an existing item; all fields are optional
class TodoItemUpdate(SQLModel):
    content: Optional[str] = None
    completed: Optional[bool] = None

# Define our main data model for a to-do item
# Inherits from the TodoItemCreate model to get the 'content' field
class TodoItem(TodoItemCreate, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    completed: bool = Field(default=False)


# --- Database Connection and Lifespan ---

# Define the database connection
DATABASE_URL = "sqlite:///todo.db"
engine = create_engine(DATABASE_URL, echo=True)

# Function to create the database and table
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

# Define lifespan event handler to run code upon app startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler.

    Code placed before the yield statement is executed during app startup.
    Code placed after the yield statement (if any) is executed during app shutdown.
    """
    # Code to run on app startup
    print("App is starting up...")
    create_db_and_tables()
    yield
    # Code to run on app shutdown (if needed)
    # Note, SQLite is a "serverless" database where the entire database is a single
    # file on disk. So when our FastAPI application (the Python process) shuts down,
    # there is no persistent database connection to clean up.
    print("App is shutting down...")

# Create the FastAPI app instance
app = FastAPI(lifespan=lifespan)


# --- Dependency for Database Session ---

def get_session():
    """Dependency to get a database session.

    We'll use this with Depends from FastAPI to get a session for each request.
    """
    with Session(engine) as session:
        yield session

# --- API Endpoints ---

# Define a "path operation" for the root URL
@app.get("/")
def read_root():
    # This function is called when the root URL is requested
    # FastAPI decorator turns this Python dictionary into a JSON response
    
    return {"message": "Welcome to your To-Do List App!"}

# Define a path operation for an about page
@app.get("/about")
def read_about():
    return {"message": "This to-do list app was created using FastAPI by @dzhang203."}

@app.post("/todos/", response_model=TodoItem)
def create_todo(
    todo_item_create: TodoItemCreate,
    session: Session = Depends(get_session),
):
    """Create a new to-do item.
    """
    db_todo_item = TodoItem.model_validate(todo_item_create)

    # session.add(.) adds the Python object, db_todo_item, to the session's staging area
    # it's like putting an item in my online shopping cart; we haven't checked out yet
    session.add(db_todo_item)  

    # session.commit() tells the session to take all the pending changes it has tracked
    # and execute them on the actual database in a single, efficient transaction.
    # it's analogous to clicking the "confirm order and pay" button
    # this DOES modify the database (i.e. todo.db), and during this save,
    # the database automatically generates the id for this new row
    # this ALSO updates the session's knowledge of the object;
    # for example, it asks the database for the primary key for the committed row(s)
    session.commit()

    # session.refresh() goes back to the database and finds the row corresponding to this
    # Python object; it updates the Python object with the values from the database
    # for example, if the database has an id of 1, this will set db_todo_item.id = 1
    session.refresh(db_todo_item)
    return db_todo_item

@app.get("/todos/", response_model=list[TodoItem])
def read_todos(session: Session = Depends(get_session)):
    """Read all to-do items from the database.

    select(TodoItem) is a Python function from SQLModel/SQLAlchey that does not touch the database;
    it creates a Select object in memory which is a blueprint of the query we intend to run.
        * It sees that TodoItem has table=True, so it knows to use the TodoItem table in todo.db
        * It sees the fields defined in TodoItem, so it knows to select those fields from the table
    
    session.exec(...) translates the Python Select object into a raw SQL string;
    it uses the engine (which the session holds) to send the SQL tring to the todo.db file
    it returns a Result object, which is an efficient "iterator" that's ready to be consumed.

    .all() is a method on the Result object that was returned by session.exec().
    it iterates through every raw row of the Result object and performs a crucial ORM task called
    "hydration" -- converting the raw row into a Python TodoItem object
    """
    return session.exec(select(TodoItem)).all()

@app.put("/todos/{todo_id}", response_model=TodoItem)
def update_todo(
    todo_id: int,
    todo_item_update: TodoItemUpdate,
    session: Session = Depends(get_session),
):
    """Updates a to-do item in the database.
    """
    db_todo_item = session.get(TodoItem, todo_id)

    if db_todo_item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    todo_data = todo_item_update.model_dump(exclude_unset=True)
    for key, value in todo_data.items():
        setattr(db_todo_item, key, value)

    session.add(db_todo_item)
    session.commit()
    session.refresh(db_todo_item)
    return db_todo_item

@app.delete("todos/{todo_id}")
def delete_todo(
    todo_id: int,
    session: Session = Depends(get_session)
):
    db_todo_item = session.get(TodoItem, todo_id)

    if db_todo_item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    session.delete(db_todo_item)
    session.commit()
    return {"message": "Todo item deleted successfully"}
