from fastapi import FastAPI

# Create the FastAPI app instance
app = FastAPI()

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