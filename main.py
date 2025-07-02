from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI
from sqlmodel import Field, SQLModel, create_engine

# Define our data model for a to-do item
class TodoItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    content: str = Field(index=True)
    completed: bool = Field(default=False)

# Define the database connection
DATABASE_URL = "sqlite:///todo.db"
engine = create_engine(DATABASE_URL, echo=True)

# Function to create the database and table
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

# Define lifespan event handler to run code upon app startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Code to run on app startup
    print("App is starting up...")
    create_db_and_tables()
    yield
    # Code to run on app shutdown
    print("App is shutting down...")

# Create the FastAPI app instance
app = FastAPI(lifespan=lifespan)

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