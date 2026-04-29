URL: https://comp307project.onrender.com

Admin Login:
Email: system.admin@mcgill.ca
Password: McgillAdminPassword

TA code: mcgill-ta-2026

Name          |Student Number  |30% of Code not coded by programmer(description)                     |Contribution (Detailed description of roles + Specific Code Contribution + Not Code-related Contribution)
Ruihan Zhang  |261164830       |We built the backend entirely from scratch using Express.js          | Code: built the full study-session backend feature from model to routes.
                               |and Mongoose, leveraging AI assistants strictly for debugging and    | Designed the StudySession schema with validation, user links, timestamps, and auto-expiry after end time.
                               |syntax verification rather than code generation.                     | Implemented APIs to create, update, delete, view, join, and leave sessions.
                                                                                                     | Added key safety checks: time validation, organizer/course authorization, and double-booking prevention.
                                                                                                     | Moreoever, I was responsible for UI design and deployment, creating a clean, user-friendly interface for browsing and joining study sessions.
                                                                                                     | I also handled launching and configuring the website so it was live and accessible for users. (The detail is in the report)
Xiejun Shen   |261090272       |We built the backend entirely from scratch using Express.js          | For the backend infrastructure, I was responsible for designing and implementing the user database architecture within the User.js model, 
                               |and Mongoose, leveraging AI assistants strictly for debugging and    | as well as building the core server foundation, MongoDB Atlas connection, and environment variable security in server.js. Additionally, I developed the complete User REST API (routes/users.js), which included secure authentication, role-based access control for Students, Organizers, 
                               |syntax verification rather than code generation.                     | and Admins, the in-app tutor request workflow, and the automated database initialization for System Admin seeding.                                               



Nick Grichine |261145115       |AI tools were used mostly for CSS/layout polish and faster          | Built and wired the frontend, client-side flows for navigation and view switching, reservations display and actions, tutor-request experiences for both students and organizers.
                               |iteration in public/styles.css.                                     | Also implemented admin-facing table presentation.
                                                                                                    | Connected all these screens to the existing backend APIs with validation and user feedback messaging.
                                                                                                    | Also improved UI consistency and usability (added dropdowns, forms, tables and other user friendly UI layout implementations)
                                                                                                    
