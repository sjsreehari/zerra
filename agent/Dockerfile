FROM python:3.13-slim

WORKDIR /app
COPY agent /app/agent
RUN pip install --no-cache-dir fastapi uvicorn pydantic networkx

EXPOSE 8000
CMD ["python", "-m", "uvicorn", "agent.api:app", "--host", "0.0.0.0", "--port", "8000"]
