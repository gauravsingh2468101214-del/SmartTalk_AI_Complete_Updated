SmartTalk AI SQL Server integration
===================================

The application now includes optional SQL Server chat-history persistence and an authenticated local admin history page.

1. Install Microsoft ODBC Driver 18 for SQL Server on Windows.
2. Install the optional Python driver: python -m pip install -r requirements-sqlserver.txt
3. Copy .env.example to .env.
4. Set SQLSERVER_CONNECTION_STRING, ADMIN_USERNAME, ADMIN_PASSWORD and APP_SECRET_KEY in .env.
5. Start the app and open http://127.0.0.1:8000/admin.
6. Sign in and click "Check SQL Server & initialize history table". This creates dbo.SmartTalkChatHistory if missing.

Example trusted Windows connection string (adjust server/database):
DRIVER={ODBC Driver 18 for SQL Server};SERVER=localhost;DATABASE=SmartTalkAI;Trusted_Connection=yes;TrustServerCertificate=yes;

The SQL Server database itself must exist and the configured login must have CREATE TABLE and INSERT/SELECT permissions. The app does not create databases or change SQL Server security settings. Chat history is persisted only when SQLSERVER_CONNECTION_STRING is configured and reachable.

Security: use a strong unique APP_SECRET_KEY and ADMIN_PASSWORD. Do not expose the development server directly to the public internet. Use HTTPS, a reverse proxy, rate limiting, backups, and proper user authorization before production deployment.
