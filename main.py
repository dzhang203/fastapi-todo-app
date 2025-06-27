from fastapi import FastAPI

# Create the FastAPI app instance
app = FastAPI()

# Define a "path operation" for the root URL
@app.get("/")
def read_root():
    # FastAPI decorator turns this Python dictionary into a JSON response
    return {"message": "Welcome to your To-Do List App!"}