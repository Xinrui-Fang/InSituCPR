# LLM-based In-situ Thought Exchanges for Critical Paper Reading (IUI' 26)


## How to start
### Start with Docker
```docker
docker compose build
docker compose up -d
Visit http://localhost
```

### Start Manually
Start Frontend
```javascript
cd frontend
npm install
npm run dev
Visit http://localhost:3000 
```

Start Backend
```python
cd backend
python install -r requirements.txt
python server.py
```
For reference feature, enter your semantic scholar API key into /backend/.env
