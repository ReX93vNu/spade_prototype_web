# Final_PIT submission of a prototype website based on our capstone
Just a group of students' proj for their subj

We're dying

Live deployment links:
Frontend: https://spade-prototype-web-1.onrender.com/
Backend: https://spade-prototype-web.onrender.com/

Gdrive presentation video link: https://drive.google.com/drive/folders/1pS6LU5AAj0AXqlUw5L5kfAWoI1PBTRQh?usp=sharing

Running the backend server: 
1. in terminal, open the project folder.
2. Run the backend in a venv environment. 
3. install requirements before running the server.
4. needs the db.sqlite3 file to work.
5. in order for the esp32 to work properly, set it up according to the firmware comments.
6. run the backend server with: "daphne -b 0.0.0.0 -p 8000 spade_prototype_web.asgi:application"

Running the frontend server: 
1. in terminal, open the frontend folder inside the project folder.
2. run npm install in the frontend folder.
3. have the backend running.
4. use npm run dev to run the frontend.


Changes done for deployment to Render:

1. Backend Deployment (Django on Render)
- Data Prep: Exported local database to a JSON file using: python manage.py dumpdata core auth --exclude=auth.Permission --exclude=contenttypes --indent 4 > complete_backup.json
- Render Setup: Create a New Web Service on Render and connect the GitHub repo.

Web Service configuration:
- Build Command: pip install -r requirements.txt && python manage.py migrate && python manage.py loaddata complete_backup.json
- Environment Variables: Add DEBUG and set its value to False.

2. Frontend Deployment (React Vite on Render)
- Code Revisions for deployment: Changed URLs in Dashboard.jsx and axiosConfig.js to the live backend link (https:// and wss://).
- Render Setup: Create a New Static Site on Render.

Static Website configuration
- Root Directory: Set to SPADE-frontend
- Build Command: npm install; npm run build
- Publish Directory: Set to dist.
- Routing Rule: Added a Rewrite rule from /* to /index.html to prevent 404 errors on page refresh.

3. ESP32 Cloud Connection
- Secure Library: Include <WiFiClientSecure.h> at the top of the sketch.
- Update URLs: Change token_url and ingest_url to the live https:// endpoints.
- Initialize: Add "WiFiClientSecure secureClient;" globally.
- Disable Strict Checking: Add "secureClient.setInsecure();" inside setup().
- Route Requests: Update HTTPClient to use the wrapper: http.begin(secureClient, token_url);

These changes enable the esp32 to connect securely to the live system.

By:
Sturdevant, David F.
Amaro, Florence Kate A.
Catalan, Ma. Contessa A.
Oblimar, Marymarc C.