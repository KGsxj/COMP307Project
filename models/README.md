/**
 * IMPORTANT: TIMEZONE & DATE HANDLING
 * * 1. DATABASE STORAGE: 
 * MongoDB Atlas stores all 'Date' objects in UTC (Coordinated Universal Time) 
 * by default. Even if we send a local time, it will be converted to UTC.
 * * 2. OUR LOCAL CONTEXT: 
 * Our project is based in EDT (Eastern Daylight Time), which is UTC-4.
 * * 3. FRONTEND SUBMISSION (POST): 
 * When creating a session, the frontend should include the timezone offset.
 * Format example: "2026-04-18T17:00:00.000-04:00"
 * * 4. FRONTEND DISPLAY (GET): 
 * The API will return UTC strings (ending in 'Z'). 
 * The frontend must convert these to the user's local time for display:
 * Example: new Date(session.startTime).toLocaleString();
 */