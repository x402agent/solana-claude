FROM python:3.12-slim
ENV III_CONTAINER=docker
ENV III_ENV=development
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "data_worker.py"]
